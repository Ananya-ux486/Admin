"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BriefcaseBusiness,
  ChevronRight,
  CircleUserRound,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Tab =
  | "overview"
  | "users"
  | "inquiries"
  | "payments"
  | "services"
  | "projects";

type Overview = {
  counts: Record<string, number>;
  recentUsers: Array<Record<string, string>>;
  recentActivities: Array<Record<string, string>>;
};

type Service = {
  _id?: string;
  section: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  details: string;
  features: string[];
  subServices: { name: string; description: string }[];
  pricingType: "" | "fixed" | "custom";
  indiaPrice: string;
  foreignPrice: string;
  indiaNote: string;
  foreignNote: string;
  accent: "" | "amber" | "coral" | "sky" | "mint";
  image: string;
  order: number;
  published: boolean;
};

type Project = {
  _id?: string;
  slug: string;
  title: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
  preview: string;
  order: number;
  published: boolean;
};

type Payment = {
  _id: string;
  reference: string;
  provider: string;
  status: string;
  displayAmount: string;
  currency: string;
  serviceTitle: string;
  customer: { name: string; email: string; phone: string };
  providerPaymentId: string;
  providerOrderId: string;
  providerSessionId: string;
  failureCode: string;
  failureMessage: string;
  receiptUrl: string;
  metadata: Record<string, string>;
  createdAt: string;
  paidAt?: string;
};

type PaymentLink = {
  _id: string;
  token: string;
  title: string;
  amountMinor: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  allowedProviders: string[];
  active: boolean;
  expiresAt: string;
  createdAt: string;
};

const publicSiteUrl =
  process.env.NEXT_PUBLIC_USER_SITE_URL || "http://localhost:3000";

const emptyService: Service = {
  section: "web-development",
  slug: "",
  title: "",
  tagline: "",
  description: "",
  details: "",
  features: [],
  subServices: [],
  pricingType: "custom",
  indiaPrice: "",
  foreignPrice: "",
  indiaNote: "",
  foreignNote: "",
  accent: "amber",
  image: "",
  order: 0,
  published: true,
};

const emptyProject: Project = {
  slug: "",
  title: "",
  url: "",
  category: "",
  description: "",
  tags: [],
  preview: "",
  order: 0,
  published: true,
};

const nav = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "users" as const, label: "Users", icon: Users },
  { id: "inquiries" as const, label: "Inquiries", icon: Mail },
  { id: "payments" as const, label: "Payments", icon: CreditCard },
  { id: "services" as const, label: "Services", icon: BriefcaseBusiness },
  { id: "projects" as const, label: "Projects", icon: FolderKanban },
];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="login-card"
      >
        <div className="brand-mark">
          <Sparkles size={26} />
        </div>
        <p className="eyebrow">TasmaFive Control Center</p>
        <h1>Welcome back, Admin</h1>
        <p className="login-copy">
          Sign in to manage services, projects, users and enquiries.
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-button" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
            Secure sign in
          </button>
        </form>
        <div className="security-note">
          <ShieldCheck size={16} /> Protected session · private admin database
        </div>
      </motion.section>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  index,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.28 }}
      className="stat-card"
    >
      <span className="stat-icon"><Icon size={20} /></span>
      <div>
        <strong>{value ?? 0}</strong>
        <span>{label}</span>
      </div>
    </motion.div>
  );
}

function OverviewPanel({ data }: { data: Overview | null }) {
  const cards = [
    ["Users", data?.counts.users || 0, Users],
    ["Services", data?.counts.services || 0, BriefcaseBusiness],
    ["Projects", data?.counts.projects || 0, FolderKanban],
    [
      "Inquiries",
      (data?.counts.contactMessages || 0) +
        (data?.counts.quoteRequests || 0) +
        (data?.counts.auditRequests || 0),
      Mail,
    ],
  ] as const;
  return (
    <div>
      <div className="stats-grid">
        {cards.map(([label, value, Icon], index) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            icon={Icon}
            index={index}
          />
        ))}
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Audience</p><h2>Recent users</h2></div>
            <CircleUserRound size={20} />
          </div>
          <div className="activity-list">
            {(data?.recentUsers || []).map((user, index) => (
              <motion.div
                key={user._id || index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.025, duration: 0.22 }}
                className="activity-row"
              >
                <span className="avatar">{user.name?.slice(0, 1) || "U"}</span>
                <div><strong>{user.name}</strong><span>{user.email}</span></div>
                <small>{new Date(user.createdAt).toLocaleDateString()}</small>
              </motion.div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Security stream</p><h2>Recent activity</h2></div>
            <Activity size={20} />
          </div>
          <div className="activity-list">
            {(data?.recentActivities || []).map((item, index) => (
              <div className="activity-row" key={item._id || index}>
                <span className="event-dot" />
                <div><strong>{item.type?.replaceAll("_", " ")}</strong><span>{item.email}</span></div>
                <small>{new Date(item.createdAt).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function UsersPanel({
  users,
  search,
  setSearch,
}: {
  users: Array<Record<string, string>>;
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-toolbar">
        <div><p className="eyebrow">Shared database</p><h2>Registered users</h2></div>
        <label className="search-box">
          <Search size={16} />
          <input
            placeholder="Search name, email, phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>{user.phone || "—"}</td>
                <td>{new Date(user.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InquiriesPanel({
  inquiries,
}: {
  inquiries: Record<string, Array<Record<string, string>>>;
}) {
  return (
    <div className="inquiry-grid">
      {Object.entries(inquiries).map(([type, items]) => (
        <section className="panel" key={type}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{items.length} received</p>
              <h2>{type}</h2>
            </div>
            <FileText size={20} />
          </div>
          <div className="inquiry-list">
            {items.map((item) => (
              <article key={item._id}>
                <div><strong>{item.name}</strong><span>{item.email}</span></div>
                <p>{item.message || item.details || item.focus || "No message"}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PaymentsPanel({
  payments,
  links,
  onRefresh,
}: {
  payments: Payment[];
  links: PaymentLink[];
  onRefresh: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");

  const createLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreatedUrl("");
    try {
      const result = await api<{ url: string }>("/api/admin/payment-links", {
        method: "POST",
        body: JSON.stringify({
          title,
          amount: Number(amount),
          currency,
          customerName,
          customerEmail,
          allowedProviders:
            currency === "INR"
              ? ["razorpay", "ccavenue"]
              : ["stripe", "paypal"],
          expiresInDays: 14,
        }),
      });
      setCreatedUrl(result.url);
      setTitle("");
      setAmount("");
      await onRefresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create link.");
    } finally {
      setSaving(false);
    }
  };

  const disableLink = async (link: PaymentLink) => {
    if (!window.confirm(`Disable payment link “${link.title}”?`)) return;
    await api(`/api/admin/payment-links/${link._id}`, { method: "DELETE" });
    await onRefresh();
  };

  return (
    <div className="payments-layout">
      <section className="panel payment-link-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Custom quote collection</p>
            <h2>Create secure payment link</h2>
          </div>
          <CreditCard size={20} />
        </div>
        <form className="payment-link-form" onSubmit={createLink}>
          <label className="wide">
            Description
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Website redesign — milestone 1"
              required
            />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>
          <label>
            Currency
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as "INR" | "USD")}
            >
              <option value="INR">INR — Razorpay / CCAvenue</option>
              <option value="USD">USD — Stripe / PayPal</option>
            </select>
          </label>
          <label>
            Customer name
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label>
            Customer email
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
          {error && <p className="form-error wide">{error}</p>}
          <button className="primary-button wide" disabled={saving}>
            {saving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Create 14-day payment link
          </button>
        </form>
        {createdUrl && (
          <div className="created-link">
            <input value={createdUrl} readOnly />
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(createdUrl)}
            >
              <Copy size={15} /> Copy
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{links.length} generated</p>
            <h2>Payment links</h2>
          </div>
          <ExternalLink size={20} />
        </div>
        <div className="compact-list">
          {links.map((link) => {
            const url = `${publicSiteUrl}/payment?link=${link.token}`;
            const expired = new Date(link.expiresAt) <= new Date();
            return (
              <article key={link._id}>
                <div>
                  <strong>{link.title}</strong>
                  <span>
                    {link.currency} {(link.amountMinor / 100).toLocaleString()} ·{" "}
                    {link.active && !expired ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mini-actions">
                  <button
                    title="Copy link"
                    onClick={() => void navigator.clipboard.writeText(url)}
                  >
                    <Copy size={14} />
                  </button>
                  {link.active && (
                    <button title="Disable link" onClick={() => void disableLink(link)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!links.length && <p className="empty-copy">No custom payment links yet.</p>}
        </div>
      </section>

      <section className="panel payment-ledger">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{payments.length} recent records</p>
            <h2>Payment ledger</h2>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>
                    <strong>{payment.reference}</strong>
                    {payment.providerPaymentId && (
                      <small className="cell-sub">{payment.providerPaymentId}</small>
                    )}
                  </td>
                  <td>
                    <strong>{payment.customer.name}</strong>
                    <small className="cell-sub">{payment.customer.email}</small>
                    {payment.customer.phone && (
                      <small className="cell-sub">{payment.customer.phone}</small>
                    )}
                  </td>
                  <td>{payment.serviceTitle}</td>
                  <td className="capitalize">{payment.provider}</td>
                  <td><strong>{payment.displayAmount}</strong></td>
                  <td>
                    <span className={`payment-status status-${payment.status}`}>
                      {payment.status}
                    </span>
                    {payment.failureMessage && (
                      <small className="cell-sub">{payment.failureMessage}</small>
                    )}
                  </td>
                  <td>{new Date(payment.createdAt).toLocaleString()}</td>
                  <td>
                    {payment.receiptUrl ? (
                      <a
                        className="table-action"
                        href={payment.receiptUrl}
                        title="Download verified receipt"
                      >
                        <Download size={15} /> Download
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payments.length && <p className="empty-copy">No payments recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}

function ContentCards<T extends { _id?: string; title: string; published: boolean }>({
  items,
  type,
  onEdit,
  onDelete,
}: {
  items: T[];
  type: "service" | "project";
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  return (
    <div className="content-grid">
      {items.map((item, index) => (
        <motion.article
          key={item._id}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02, duration: 0.22 }}
          whileHover={{ y: -4 }}
          className="content-card"
        >
          <div className="content-card-glow" />
          <div className="content-card-top">
            <span>{type === "service" ? <BriefcaseBusiness size={19} /> : <FolderKanban size={19} />}</span>
            <small className={item.published ? "published" : "draft"}>
              {item.published ? "Published" : "Draft"}
            </small>
          </div>
          <h3>{item.title}</h3>
          <p>
            {"description" in item
              ? String(item.description || "")
              : ""}
          </p>
          <div className="card-actions">
            <button onClick={() => onEdit(item)}><Pencil size={15} /> Edit</button>
            <button className="danger" onClick={() => onDelete(item)}><Trash2 size={15} /> Delete</button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function EditorModal({
  kind,
  value,
  onClose,
  onSave,
}: {
  kind: "service" | "project";
  value: Service | Project;
  onClose: () => void;
  onSave: (value: Service | Project) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isService = kind === "service";

  const set = (key: string, next: unknown) =>
    setDraft((current) => ({ ...current, [key]: next }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="editor-modal"
        onSubmit={save}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Content Studio</p>
            <h2>{value._id ? "Edit" : "Create"} {kind}</h2>
          </div>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="form-grid">
          <label>Title<input value={draft.title} onChange={(e) => set("title", e.target.value)} required /></label>
          <label>Slug<input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-from-title" /></label>
          {isService ? (
            <>
              <label>Section
                <select value={(draft as Service).section} onChange={(e) => set("section", e.target.value)}>
                  <option value="web-development">Web Development</option>
                  <option value="digital-marketing">Digital Marketing</option>
                  <option value="crm">CRM</option>
                  <option value="cloud-solutions">Cloud Solutions</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>Accent
                <select value={(draft as Service).accent} onChange={(e) => set("accent", e.target.value)}>
                  <option value="">Keep current style</option>
                  <option value="amber">Amber</option><option value="coral">Coral</option>
                  <option value="sky">Sky</option><option value="mint">Mint</option>
                </select>
              </label>
              <label className="wide">Tagline<input value={(draft as Service).tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
            </>
          ) : (
            <>
              <label>Category<input value={(draft as Project).category} onChange={(e) => set("category", e.target.value)} /></label>
              <label>Project URL<input type="url" value={(draft as Project).url} onChange={(e) => set("url", e.target.value)} required /></label>
            </>
          )}
          <label className="wide">Description<textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} /></label>
          {isService && (
            <label className="wide">Full details<textarea value={(draft as Service).details} onChange={(e) => set("details", e.target.value)} rows={4} /></label>
          )}
          <label className="wide">{isService ? "Image URL / path" : "Preview image URL / path"}
            <input value={isService ? (draft as Service).image : (draft as Project).preview} onChange={(e) => set(isService ? "image" : "preview", e.target.value)} placeholder="/images/... or https://..." />
          </label>
          <label className="wide">{isService ? "Features (one per line)" : "Tags (comma separated)"}
            <textarea
              value={isService ? (draft as Service).features.join("\n") : (draft as Project).tags.join(", ")}
              onChange={(e) => set(isService ? "features" : "tags", isService ? e.target.value.split("\n").filter(Boolean) : e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
              rows={4}
            />
          </label>
          {isService && (
            <>
              <label>Pricing
                <select value={(draft as Service).pricingType} onChange={(e) => set("pricingType", e.target.value)}>
                  <option value="">Keep current pricing style</option>
                  <option value="custom">Custom quote</option><option value="fixed">Fixed</option>
                </select>
              </label>
              <label>India price<input value={(draft as Service).indiaPrice} onChange={(e) => set("indiaPrice", e.target.value)} placeholder="₹15k" /></label>
              <label>International price<input value={(draft as Service).foreignPrice} onChange={(e) => set("foreignPrice", e.target.value)} placeholder="$249" /></label>
            </>
          )}
          <label>Order<input type="number" value={draft.order} onChange={(e) => set("order", Number(e.target.value))} /></label>
          <label className="toggle-label">
            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
            Published on user site
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={saving}>
            {saving ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
            Save changes
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function AdminApp() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<Array<Record<string, string>>>([]);
  const [inquiries, setInquiries] = useState<Record<string, Array<Record<string, string>>>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<{ kind: "service" | "project"; value: Service | Project } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        overviewData,
        usersData,
        inquiryData,
        serviceData,
        projectData,
        paymentData,
      ] =
        await Promise.all([
          api<Overview>("/api/admin/overview"),
          api<{ items: Array<Record<string, string>> }>("/api/admin/users?limit=100"),
          api<Record<string, Array<Record<string, string>>>>("/api/admin/inquiries"),
          api<{ items: Service[] }>("/api/admin/services"),
          api<{ items: Project[] }>("/api/admin/projects"),
          api<{ items: Payment[]; links: PaymentLink[] }>("/api/admin/payments"),
        ]);
      setOverview(overviewData);
      setUsers(usersData.items);
      setInquiries(inquiryData);
      setServices(serviceData.items);
      setProjects(projectData.items);
      setPayments(paymentData.items);
      setPaymentLinks(paymentData.links);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void api("/api/admin/session")
      .then(() => {
        setAuthenticated(true);
        void load();
      })
      .catch(() => setAuthenticated(false));
  }, [load]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(term),
    );
  }, [search, users]);

  if (authenticated === null) {
    return <div className="page-loader"><Loader2 className="spin" /><span>Securing control center…</span></div>;
  }
  if (!authenticated) {
    return <Login onSuccess={() => { setAuthenticated(true); void load(); }} />;
  }

  const saveContent = async (value: Service | Project) => {
    const kind = editor?.kind;
    if (!kind) return;
    const root = kind === "service" ? "services" : "projects";
    const method = value._id ? "PUT" : "POST";
    const url = value._id ? `/api/admin/${root}/${value._id}` : `/api/admin/${root}`;
    await api(url, { method, body: JSON.stringify(value) });
    await load();
  };

  const deleteContent = async (kind: "service" | "project", item: Service | Project) => {
    if (!item._id || !window.confirm(`Delete “${item.title}”?`)) return;
    await api(`/api/admin/${kind === "service" ? "services" : "projects"}/${item._id}`, { method: "DELETE" });
    await load();
  };

  const currentLabel = nav.find((item) => item.id === tab)?.label || "Overview";

  return (
    <div className="admin-shell">
      <aside className={mobileOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="sidebar-brand">
          <div className="mini-logo"><Sparkles size={20} /></div>
          <div><strong>TasmaFive</strong><span>Admin Studio</span></div>
          <button className="sidebar-close" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "nav-active" : ""}
              onClick={() => { setTab(item.id); setMobileOpen(false); }}
            >
              <item.icon size={18} /><span>{item.label}</span><ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div><ShieldCheck size={17} /><span>Secure control</span></div>
          <button
            onClick={async () => {
              await api("/api/admin/logout", { method: "POST" });
              setAuthenticated(false);
            }}
          ><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-shade" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

      <main className="dashboard-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div>
            <p className="eyebrow">Control Center</p>
            <h1>{currentLabel}</h1>
          </div>
          <div className="top-actions">
            <a href={publicSiteUrl} target="_blank" rel="noreferrer">
              User site <ExternalLink size={15} />
            </a>
            <button onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "spin" : ""} size={17} />
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {(tab === "services" || tab === "projects") && (
            <div className="content-heading">
              <div>
                <p className="eyebrow">Live content management</p>
                <h2>Manage {tab}</h2>
                <p>New and updated content automatically keeps the user-site animation style.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => setEditor({
                  kind: tab === "services" ? "service" : "project",
                  value: tab === "services" ? { ...emptyService } : { ...emptyProject },
                })}
              ><Plus size={18} /> Add {tab === "services" ? "service" : "project"}</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {tab === "overview" && <OverviewPanel data={overview} />}
              {tab === "users" && <UsersPanel users={filteredUsers} search={search} setSearch={setSearch} />}
              {tab === "inquiries" && <InquiriesPanel inquiries={inquiries} />}
              {tab === "payments" && (
                <PaymentsPanel
                  payments={payments}
                  links={paymentLinks}
                  onRefresh={load}
                />
              )}
              {tab === "services" && (
                <ContentCards
                  items={services}
                  type="service"
                  onEdit={(value) => setEditor({ kind: "service", value })}
                  onDelete={(value) => void deleteContent("service", value)}
                />
              )}
              {tab === "projects" && (
                <ContentCards
                  items={projects}
                  type="project"
                  onEdit={(value) => setEditor({ kind: "project", value })}
                  onDelete={(value) => void deleteContent("project", value)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {editor && (
          <EditorModal
            kind={editor.kind}
            value={editor.value}
            onClose={() => setEditor(null)}
            onSave={saveContent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
