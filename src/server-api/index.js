import { config } from "./config.js";
import { closeAdminApi, initializeAdminApi } from "./app.js";

const app = await initializeAdminApi();
const server = app.listen(config.port, () => {
  console.log(`[admin-backend] http://localhost:${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[admin-backend] ${signal}; shutting down`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  await new Promise((resolve) => server.close(resolve));
  await closeAdminApi();
  clearTimeout(forceExit);
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
