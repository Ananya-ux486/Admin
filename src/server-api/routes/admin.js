import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import PDFDocument from "pdfkit";
import {
  clientMeta,
  clearAdminCookie,
  createAdminSession,
  requireAdmin,
  requireTrustedOrigin,
  revokeAdminSession,
  setAdminCookie,
} from "../auth.js";
import { config } from "../config.js";
import { getModels } from "../models.js";
import { isSafePublicUrl } from "../security.js";

const router = Router();
const {
  User,
  Activity,
  ContactMessage,
  QuoteRequest,
  AuditRequest,
  Service,
  Project,
  Payment,
  PaymentLink,
  Admin,
  AdminAudit,
} = getModels();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function strings(value, max = 30) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim().slice(0, 250))
    .filter(Boolean)
    .slice(0, max);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serviceInput(body) {
  const sections = new Set([
    "web-development",
    "digital-marketing",
    "crm",
    "cloud-solutions",
    "other",
  ]);
  const accents = new Set(["", "amber", "coral", "sky", "mint"]);
  const pricingTypes = new Set(["", "fixed", "custom"]);
  const section = sections.has(body?.section) ? body.section : "other";
  const slug = normalizeSlug(body?.slug || body?.title);
  return {
    section,
    slug,
    title: String(body?.title || "").trim().slice(0, 120),
    tagline: String(body?.tagline || "").trim().slice(0, 240),
    description: String(body?.description || "").trim().slice(0, 1200),
    details: String(body?.details || "").trim().slice(0, 4000),
    features: strings(body?.features),
    subServices: Array.isArray(body?.subServices)
      ? body.subServices
          .map((item) => ({
            name: String(item?.name || "").trim().slice(0, 100),
            description: String(item?.description || "").trim().slice(0, 500),
          }))
          .filter((item) => item.name)
          .slice(0, 20)
      : [],
    pricingType: pricingTypes.has(body?.pricingType) ? body.pricingType : "custom",
    indiaPrice: String(body?.indiaPrice || "").trim().slice(0, 50),
    foreignPrice: String(body?.foreignPrice || "").trim().slice(0, 50),
    indiaNote: String(body?.indiaNote || "").trim().slice(0, 250),
    foreignNote: String(body?.foreignNote || "").trim().slice(0, 250),
    accent: accents.has(body?.accent) ? body.accent : "amber",
    image: String(body?.image || "").trim().slice(0, 1000),
    order: Number.isFinite(Number(body?.order)) ? Number(body.order) : 0,
    published: body?.published !== false,
  };
}

function projectInput(body) {
  return {
    slug: normalizeSlug(body?.slug || body?.title),
    title: String(body?.title || "").trim().slice(0, 120),
    url: String(body?.url || "").trim().slice(0, 1000),
    category: String(body?.category || "").trim().slice(0, 100),
    description: String(body?.description || "").trim().slice(0, 2000),
    tags: strings(body?.tags, 20),
    preview: String(body?.preview || "").trim().slice(0, 1000),
    order: Number.isFinite(Number(body?.order)) ? Number(body.order) : 0,
    published: body?.published !== false,
  };
}

async function audit(req, action, resource, resourceId, metadata = {}) {
  const meta = clientMeta(req);
  await AdminAudit.create({
    adminId: req.admin.adminId,
    action,
    resource,
    resourceId: resourceId ? String(resourceId) : undefined,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata,
  });
}

router.post("/login", loginLimiter, requireTrustedOrigin, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const admin = await Admin.findOne({ email }).select("+passwordHash");
  if (
    !admin ||
    !admin.active ||
    !(await bcrypt.compare(password, admin.passwordHash))
  ) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  const meta = clientMeta(req);
  const token = await createAdminSession(admin, meta);
  setAdminCookie(res, token);
  await AdminAudit.create({
    adminId: admin._id,
    action: "login",
    resource: "session",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return res.json({
    ok: true,
    admin: {
      id: String(admin._id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
});

router.post("/logout", requireTrustedOrigin, async (req, res) => {
  await revokeAdminSession(req);
  clearAdminCookie(res);
  return res.json({ ok: true });
});

router.get("/session", requireAdmin, (req, res) => {
  return res.json({ authenticated: true, admin: req.admin });
});

router.use(requireAdmin, requireTrustedOrigin);

router.get("/overview", async (_req, res) => {
  const [
    users,
    services,
    projects,
    contactMessages,
    quoteRequests,
    auditRequests,
    payments,
    paidPayments,
    recentUsers,
    recentActivities,
  ] = await Promise.all([
    User.countDocuments(),
    Service.countDocuments(),
    Project.countDocuments(),
    ContactMessage.countDocuments(),
    QuoteRequest.countDocuments(),
    AuditRequest.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email phone createdAt")
      .lean(),
    Activity.find().sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  return res.json({
    counts: {
      users,
      services,
      projects,
      contactMessages,
      quoteRequests,
      auditRequests,
      payments,
      paidPayments,
    },
    recentUsers,
    recentActivities,
  });
});

router.get("/users", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const search = String(req.query.search || "").trim();
  const safeSearch = escapeRegex(search.slice(0, 100));
  const query = search
    ? {
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
          { phone: { $regex: safeSearch, $options: "i" } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-passwordHash -passwordSalt")
      .lean(),
    User.countDocuments(query),
  ]);
  return res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.get("/inquiries", async (_req, res) => {
  const [contacts, quotes, audits] = await Promise.all([
    ContactMessage.find().sort({ createdAt: -1 }).limit(200).lean(),
    QuoteRequest.find().sort({ createdAt: -1 }).limit(200).lean(),
    AuditRequest.find().sort({ createdAt: -1 }).limit(200).lean(),
  ]);
  return res.json({ contacts, quotes, audits });
});

router.get("/services", async (_req, res) => {
  const items = await Service.find().sort({ section: 1, order: 1 }).lean();
  return res.json({ items });
});

router.post("/services", async (req, res) => {
  const input = serviceInput(req.body);
  if (!input.title || !input.slug) {
    return res.status(400).json({ error: "Title and slug are required." });
  }
  if (!isSafePublicUrl(input.image, { allowRelative: true })) {
    return res.status(400).json({ error: "Service image must be a safe public URL or relative path." });
  }
  const item = await Service.create(input);
  await audit(req, "create", "service", item._id, { title: item.title });
  return res.status(201).json({ item });
});

router.put("/services/:id", async (req, res) => {
  const input = serviceInput(req.body);
  if (!input.title || !input.slug) {
    return res.status(400).json({ error: "Title and slug are required." });
  }
  if (!isSafePublicUrl(input.image, { allowRelative: true })) {
    return res.status(400).json({ error: "Service image must be a safe public URL or relative path." });
  }
  const item = await Service.findByIdAndUpdate(req.params.id, input, {
    new: true,
    runValidators: true,
  });
  if (!item) return res.status(404).json({ error: "Service not found." });
  await audit(req, "update", "service", item._id, { title: item.title });
  return res.json({ item });
});

router.delete("/services/:id", async (req, res) => {
  const item = await Service.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: "Service not found." });
  await audit(req, "delete", "service", item._id, { title: item.title });
  return res.json({ ok: true });
});

router.get("/projects", async (_req, res) => {
  const items = await Project.find().sort({ order: 1, createdAt: 1 }).lean();
  return res.json({ items });
});

router.post("/projects", async (req, res) => {
  const input = projectInput(req.body);
  if (!input.title || !input.slug || !input.url) {
    return res.status(400).json({ error: "Title, slug and URL are required." });
  }
  if (
    !isSafePublicUrl(input.url) ||
    !isSafePublicUrl(input.preview, { allowRelative: true })
  ) {
    return res.status(400).json({ error: "Project and preview URLs must be safe public URLs." });
  }
  const item = await Project.create(input);
  await audit(req, "create", "project", item._id, { title: item.title });
  return res.status(201).json({ item });
});

router.put("/projects/:id", async (req, res) => {
  const input = projectInput(req.body);
  if (!input.title || !input.slug || !input.url) {
    return res.status(400).json({ error: "Title, slug and URL are required." });
  }
  if (
    !isSafePublicUrl(input.url) ||
    !isSafePublicUrl(input.preview, { allowRelative: true })
  ) {
    return res.status(400).json({ error: "Project and preview URLs must be safe public URLs." });
  }
  const item = await Project.findByIdAndUpdate(req.params.id, input, {
    new: true,
    runValidators: true,
  });
  if (!item) return res.status(404).json({ error: "Project not found." });
  await audit(req, "update", "project", item._id, { title: item.title });
  return res.json({ item });
});

router.delete("/projects/:id", async (req, res) => {
  const item = await Project.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: "Project not found." });
  await audit(req, "delete", "project", item._id, { title: item.title });
  return res.json({ ok: true });
});

function streamAdminReceipt(res, payment) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 54,
    info: {
      Title: `Payment receipt ${payment.reference}`,
      Author: "TasmaFive Solutions",
      Subject: "Admin copy of verified payment receipt",
    },
  });
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="TasmaFive-receipt-${payment.reference}.pdf"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  doc.pipe(res);
  doc.rect(0, 0, 595.28, 126).fill("#0f172a");
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#ffffff").text("PAYMENT RECEIPT", 54, 42);
  doc.font("Helvetica").fontSize(10).fillColor("#cbd5e1").text("TasmaFive Solutions · Admin copy", 54, 78);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#047857").text("PAID", 54, 160);
  doc
    .fillColor("#0f172a")
    .text(
      `${payment.currency} ${(payment.amountMinor / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      250,
      160,
      { width: 291, align: "right" },
    );
  const rows = [
    ["Reference", payment.reference],
    ["Provider", String(payment.provider || "").toUpperCase()],
    ["Provider payment ID", payment.providerPaymentId || "Not supplied"],
    ["Provider order ID", payment.providerOrderId || "Not supplied"],
    ["Service", payment.serviceTitle || "Not supplied"],
    ["Customer", payment.customer?.name || "Not supplied"],
    ["Email", payment.customer?.email || "Not supplied"],
    ["Payment date", new Date(payment.paidAt || payment.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
  ];
  rows.forEach(([label, value], index) => {
    const y = 230 + index * 32;
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(label, 54, y);
    doc.font("Helvetica-Bold").fillColor("#0f172a").text(String(value), 205, y, {
      width: 336,
      align: "right",
    });
  });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text("Generated from the server-verified shared payment record.", 54, 742, {
      width: 487,
      align: "center",
    });
  doc.end();
}

router.get("/payments", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const status = cleanPaymentStatus(req.query.status);
  const search = String(req.query.search || "").trim();
  const safeSearch = escapeRegex(search.slice(0, 100));
  const query = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          $or: [
            { reference: { $regex: safeSearch, $options: "i" } },
            { "customer.name": { $regex: safeSearch, $options: "i" } },
            { "customer.email": { $regex: safeSearch, $options: "i" } },
            { providerPaymentId: { $regex: safeSearch, $options: "i" } },
          ],
        }
      : {}),
  };
  const [items, total, links] = await Promise.all([
    Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
    PaymentLink.find().sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return res.json({
    items: items.map((item) => ({
      ...item,
      receiptUrl:
        item.status === "paid"
          ? `/api/admin/payments/${encodeURIComponent(item.reference)}/receipt`
          : "",
    })),
    links,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

function cleanPaymentStatus(value) {
  const statuses = new Set([
    "created",
    "pending",
    "paid",
    "failed",
    "cancelled",
    "refunded",
    "disputed",
  ]);
  const status = String(value || "").trim().toLowerCase();
  return statuses.has(status) ? status : "";
}

router.get("/payments/:reference/receipt", async (req, res) => {
  const reference = String(req.params.reference || "").trim().slice(0, 120);
  const payment = await Payment.findOne({ reference, status: "paid" }).lean();
  if (!payment) {
    return res.status(404).json({ error: "A successful payment receipt was not found." });
  }
  await audit(req, "download", "payment-receipt", payment._id, { reference });
  streamAdminReceipt(res, payment);
});

router.post("/payment-links", async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 160);
  const currency = String(req.body?.currency || "").trim().toUpperCase();
  const amount = Number(req.body?.amount);
  const allowedByCurrency =
    currency === "INR"
      ? ["razorpay", "ccavenue"]
      : currency === "USD"
        ? ["stripe", "paypal"]
        : [];
  const requested = Array.isArray(req.body?.allowedProviders)
    ? req.body.allowedProviders.map((value) => String(value).toLowerCase())
    : allowedByCurrency;
  const allowedProviders = requested.filter((value) =>
    allowedByCurrency.includes(value),
  );
  if (
    !title ||
    !allowedByCurrency.length ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 10_000_000 ||
    !allowedProviders.length
  ) {
    return res.status(400).json({
      error: "Title, valid amount, INR/USD currency and provider are required.",
    });
  }
  const expiresInDays = Math.min(
    90,
    Math.max(1, Number(req.body?.expiresInDays) || 14),
  );
  const item = await PaymentLink.create({
    token: crypto.randomBytes(24).toString("base64url"),
    title,
    amountMinor: Math.round(amount * 100),
    currency,
    customerName: String(req.body?.customerName || "").trim().slice(0, 120),
    customerEmail: normalizeEmail(req.body?.customerEmail),
    customerPhone: String(req.body?.customerPhone || "").trim().slice(0, 30),
    quoteRequestId: req.body?.quoteRequestId || null,
    allowedProviders,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    createdBy: req.admin.email,
  });
  await audit(req, "create", "payment-link", item._id, {
    title,
    amountMinor: item.amountMinor,
    currency,
  });
  return res.status(201).json({
    item,
    url: `${config.publicSiteUrl}/payment?link=${item.token}`,
  });
});

router.delete("/payment-links/:id", async (req, res) => {
  const item = await PaymentLink.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true },
  );
  if (!item) return res.status(404).json({ error: "Payment link not found." });
  await audit(req, "disable", "payment-link", item._id, { title: item.title });
  return res.json({ ok: true });
});

export default router;
