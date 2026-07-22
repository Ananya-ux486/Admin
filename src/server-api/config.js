import "./load-env.js";

function required(name, { minLength = 1 } = {}) {
  const value = String(process.env[name] || "").trim();
  if (value.length < minLength) {
    throw new Error(`[config] ${name} is required${minLength > 1 ? ` and must be at least ${minLength} characters` : ""}.`);
  }
  return value;
}

function url(name, fallback) {
  const value = String(process.env[name] || fallback || "").trim();
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`[config] ${name} must be a valid absolute URL.`);
  }
}

function csv(name, fallback) {
  const values = String(process.env[name] || fallback)
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (
    !values.length ||
    values.some((value) => {
      try {
        return value === "*" || new URL(value).origin !== value;
      } catch {
        return true;
      }
    })
  ) {
    throw new Error(`[config] ${name} must contain exact absolute origins.`);
  }
  return values;
}

function mongoUri(name) {
  const value = required(name);
  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    throw new Error(`[config] ${name} must be a MongoDB URI.`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";
const production = nodeEnv === "production";
const port = Number(process.env.PORT || 8081);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("[config] PORT must be a valid TCP port.");
}

const adminPassword = required("ADMIN_PASSWORD", { minLength: production ? 16 : 1 });
if (production && adminPassword === "admin") {
  throw new Error("[config] Refusing the default admin password in production.");
}
const adminEmail = required("ADMIN_EMAIL").toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  throw new Error("[config] ADMIN_EMAIL must be a valid email address.");
}
const sessionSecret = required("ADMIN_SESSION_SECRET", { minLength: 32 });
if (new Set(sessionSecret).size < 12) {
  throw new Error("[config] ADMIN_SESSION_SECRET must be high entropy.");
}

export const config = Object.freeze({
  nodeEnv,
  production,
  port,
  sharedMongoUri: mongoUri("MONGODB_SHARED_URI"),
  adminMongoUri: mongoUri("MONGODB_ADMIN_URI"),
  adminEmail,
  adminPassword,
  sessionSecret,
  adminOrigins: csv(
    "ADMIN_ORIGINS",
    "http://localhost:3001,https://admin.tasmafivesolutions.com",
  ),
  publicSiteUrl: url("PUBLIC_SITE_URL", "http://localhost:3000"),
  cookieDomain: String(process.env.ADMIN_COOKIE_DOMAIN || "").trim() || undefined,
});

if (
  production &&
  (config.adminOrigins.some((origin) => !origin.startsWith("https://")) ||
    !config.publicSiteUrl.startsWith("https://"))
) {
  throw new Error("[config] ADMIN_ORIGINS and PUBLIC_SITE_URL must use HTTPS in production.");
}
