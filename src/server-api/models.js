import mongoose from "mongoose";
import { getConnections } from "./db.js";

const { Schema } = mongoose;
let models;

const serviceFields = {
  section: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  title: { type: String, required: true, trim: true },
  tagline: { type: String, default: "" },
  description: { type: String, default: "" },
  details: { type: String, default: "" },
  features: { type: [String], default: [] },
  subServices: {
    type: [{ name: String, description: String, _id: false }],
    default: [],
  },
  pricingType: { type: String, enum: ["", "fixed", "custom"], default: "" },
  indiaPrice: { type: String, default: "" },
  foreignPrice: { type: String, default: "" },
  indiaNote: { type: String, default: "" },
  foreignNote: { type: String, default: "" },
  accent: { type: String, enum: ["", "amber", "coral", "sky", "mint"], default: "" },
  image: { type: String, default: "" },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: true, index: true },
};

const projectFields = {
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  category: { type: String, default: "" },
  description: { type: String, default: "" },
  tags: { type: [String], default: [] },
  preview: { type: String, default: "" },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: true, index: true },
};

export function getModels() {
  if (models) return models;
  const { sharedConnection, adminConnection } = getConnections();

  models = {
    User: sharedConnection.model(
      "User",
      new Schema(
        {
          name: String,
          email: String,
          phone: String,
          passwordHash: { type: String, select: false },
          passwordSalt: { type: String, select: false },
        },
        { timestamps: true, collection: "users" },
      ),
    ),
    Activity: sharedConnection.model(
      "Activity",
      new Schema(
        {
          type: String,
          name: String,
          email: String,
          phone: String,
          ip: String,
          userAgent: String,
          createdAt: String,
        },
        { collection: "activities" },
      ),
    ),
    ContactMessage: sharedConnection.model(
      "ContactMessage",
      new Schema({}, { strict: false, collection: "contactmessages" }),
    ),
    QuoteRequest: sharedConnection.model(
      "QuoteRequest",
      new Schema({}, { strict: false, collection: "quoterequests" }),
    ),
    AuditRequest: sharedConnection.model(
      "AuditRequest",
      new Schema({}, { strict: false, collection: "auditrequests" }),
    ),
    Service: sharedConnection.model(
      "Service",
      new Schema(serviceFields, { timestamps: true, collection: "services" }),
    ),
    Project: sharedConnection.model(
      "Project",
      new Schema(projectFields, { timestamps: true, collection: "projects" }),
    ),
    Payment: sharedConnection.model(
      "Payment",
      new Schema({}, { strict: false, collection: "payments" }),
    ),
    PaymentLink: sharedConnection.model(
      "PaymentLink",
      new Schema(
        {
          token: { type: String, required: true, unique: true, index: true },
          title: { type: String, required: true },
          amountMinor: { type: Number, required: true, min: 1 },
          currency: { type: String, required: true, uppercase: true },
          customerName: { type: String, default: "" },
          customerEmail: { type: String, default: "" },
          customerPhone: { type: String, default: "" },
          quoteRequestId: { type: Schema.Types.ObjectId, default: null },
          allowedProviders: { type: [String], default: [] },
          active: { type: Boolean, default: true, index: true },
          expiresAt: { type: Date, required: true, index: true },
          createdBy: { type: String, default: "" },
        },
        { timestamps: true, collection: "paymentlinks" },
      ),
    ),
    Admin: adminConnection.model(
      "Admin",
      new Schema(
        {
          email: { type: String, required: true, unique: true, lowercase: true },
          name: { type: String, default: "Administrator" },
          passwordHash: { type: String, required: true, select: false },
          role: { type: String, enum: ["owner", "editor"], default: "owner" },
          active: { type: Boolean, default: true },
          lastLoginAt: Date,
        },
        { timestamps: true, collection: "admins" },
      ),
    ),
    AdminAudit: adminConnection.model(
      "AdminAudit",
      new Schema(
        {
          adminId: { type: Schema.Types.ObjectId, required: true },
          action: { type: String, required: true },
          resource: { type: String, required: true },
          resourceId: String,
          ip: String,
          userAgent: String,
          metadata: { type: Schema.Types.Mixed, default: {} },
        },
        { timestamps: true, collection: "adminaudits" },
      ),
    ),
    AdminSession: adminConnection.model(
      "AdminSession",
      new Schema(
        {
          adminId: { type: Schema.Types.ObjectId, required: true, index: true },
          tokenHash: { type: String, required: true, unique: true, index: true },
          expiresAt: { type: Date, required: true, index: { expires: 0 } },
          revokedAt: { type: Date, default: null },
          ip: String,
          userAgent: String,
        },
        { timestamps: true, collection: "adminsessions" },
      ),
    ),
  };
  return models;
}
