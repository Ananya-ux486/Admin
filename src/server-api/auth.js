import { createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { getModels } from "./models.js";

const COOKIE_NAME = "tf_admin_session";
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

function tokenHash(token) {
  return createHmac("sha256", config.sessionSecret)
    .update(String(token || ""))
    .digest("hex");
}

export function clientMeta(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return {
    ip:
      (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0].trim()) ||
      req.socket?.remoteAddress ||
      "",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 1000),
  };
}

export async function ensureInitialAdmin() {
  const { Admin } = getModels();
  const existing = await Admin.findOne({ email: config.adminEmail }).select("+passwordHash");
  if (existing) {
    if (!(await bcrypt.compare(config.adminPassword, existing.passwordHash))) {
      existing.passwordHash = await bcrypt.hash(config.adminPassword, 12);
      existing.active = true;
      await existing.save();
      console.log(`[admin] credentials rotated for ${config.adminEmail}`);
    }
    return;
  }
  await Admin.create({
    email: config.adminEmail,
    passwordHash: await bcrypt.hash(config.adminPassword, 12),
    name: "TasmaFive Admin",
    role: "owner",
  });
  console.log(`[admin] initial account created for ${config.adminEmail}`);
}

export async function createAdminSession(admin, meta) {
  const { AdminSession } = getModels();
  const token = randomBytes(32).toString("base64url");
  await AdminSession.create({
    adminId: admin._id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + MAX_AGE_MS),
    ...meta,
  });
  return token;
}

export function setAdminCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.production,
    domain: config.cookieDomain,
    path: "/",
    maxAge: MAX_AGE_MS,
  });
}

export function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.production,
    domain: config.cookieDomain,
    path: "/",
  });
}

export async function revokeAdminSession(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return;
  const { AdminSession } = getModels();
  await AdminSession.updateOne(
    { tokenHash: tokenHash(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Admin authentication required." });
    const { Admin, AdminSession } = getModels();
    const session = await AdminSession.findOne({
      tokenHash: tokenHash(token),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!session) {
      clearAdminCookie(res);
      return res.status(401).json({ error: "Admin authentication required." });
    }
    const admin = await Admin.findOne({ _id: session.adminId, active: true })
      .select("email name role")
      .lean();
    if (!admin) {
      clearAdminCookie(res);
      return res.status(401).json({ error: "Admin authentication required." });
    }
    req.admin = {
      adminId: String(admin._id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireTrustedOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = String(req.get("origin") || "").replace(/\/$/, "");
  if ((!origin && config.production) || (origin && !config.adminOrigins.includes(origin))) {
    return res.status(403).json({ error: "Untrusted request origin." });
  }
  next();
}
