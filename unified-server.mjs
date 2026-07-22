import { createServer } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export function isApiRequest(requestUrl = "") {
  try {
    const pathname = new URL(requestUrl, "http://localhost").pathname;
    return pathname === "/api" || pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function createUnifiedRequestHandler(apiHandler, nextHandler) {
  return (req, res) => {
    if (isApiRequest(req.url)) {
      return apiHandler(req, res);
    }
    return nextHandler(req, res);
  };
}

async function start() {
  const productionFlag = process.argv.includes("--production");
  const developmentFlag = process.argv.includes("--development");
  if (productionFlag && developmentFlag) {
    throw new Error("Choose either --production or --development.");
  }
  if (productionFlag) process.env.NODE_ENV = "production";
  if (developmentFlag) process.env.NODE_ENV = "development";

  const dev = process.env.NODE_ENV !== "production";
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const rootRequire = createRequire(path.join(rootDir, "package.json"));
  const next = rootRequire("next");
  const apiModule = await import("./src/server-api/app.js");
  const nextApp = next({ dev, dir: rootDir });

  let apiApp;
  let server;
  let shuttingDown = false;
  try {
    await nextApp.prepare();
    apiApp = await apiModule.initializeAdminApi();
    server = createServer(
      createUnifiedRequestHandler(apiApp, nextApp.getRequestHandler()),
    );
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, resolve);
    });
  } catch (error) {
    await Promise.allSettled([
      apiModule.closeAdminApi(),
      nextApp.close?.(),
    ]);
    throw error;
  }

  console.log(
    `[tasmafive-admin] ${dev ? "development" : "production"} server listening on http://localhost:${port}`,
  );

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[tasmafive-admin] ${signal}; shutting down`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    await new Promise((resolve) => server.close(resolve));
    await Promise.allSettled([
      apiModule.closeAdminApi(),
      nextApp.close?.(),
    ]);
    clearTimeout(forceExit);
    process.exit(0);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

const entryUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === entryUrl) {
  start().catch((error) => {
    console.error(
      "[tasmafive-admin] startup failed",
      process.env.NODE_ENV === "production"
        ? error?.name || "Error"
        : error,
    );
    process.exitCode = 1;
  });
}
