import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { closeDatabases, connectDatabases } from "./db.js";

let app;

export async function initializeAdminApi() {
  if (app) return app;

  await connectDatabases();
  const [{ default: adminRoutes }, { ensureInitialAdmin }] = await Promise.all([
    import("./routes/admin.js"),
    import("./auth.js"),
  ]);
  await ensureInitialAdmin();

  app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(config.production ? morgan("combined") : morgan("dev"));
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        const normalized = String(origin || "").replace(/\/$/, "");
        if (!origin || config.adminOrigins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(
          Object.assign(new Error("Origin is not allowed by CORS."), {
            status: 403,
          }),
        );
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  );
  app.use(express.json({ limit: "512kb" }));
  app.use(express.urlencoded({ extended: false, limit: "128kb" }));
  app.use(cookieParser());
  app.use(
    "/api/admin",
    rateLimit({
      windowMs: 60_000,
      limit: 180,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    (_req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    },
    adminRoutes,
  );
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "tasmafive-admin-backend" });
  });
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
  });
  app.use((error, _req, res, _next) => {
    if (error?.type === "entity.parse.failed" || error instanceof SyntaxError) {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ error: "A record with this value already exists." });
    }
    if (error?.name === "CastError") {
      return res.status(400).json({ error: "Invalid resource identifier." });
    }
    console.error("[admin-backend]", config.production ? error?.name : error);
    return res.status(error?.status || 500).json({
      error: error?.status ? error.message : "Internal server error.",
    });
  });
  return app;
}

export async function closeAdminApi() {
  app = undefined;
  await closeDatabases();
}
