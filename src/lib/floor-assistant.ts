import { buildDashboard } from "@/lib/dashboard-metrics";
import { formatMoney, type Invoice } from "@/lib/invoices";
import type { Role } from "@/lib/types";

export type FloorStock = {
  name: string;
  sku: string;
  onHand: number;
  status: "For Re-stock" | "Normal" | "No Min Threshold";
};

export type FloorAction = {
  label: string;
  href: string;
  openDraft?: boolean;
  invoiceStatus?: "draft" | "approved" | "voided";
};

export type FloorReply = {
  answer: string;
  actions: FloorAction[];
};

export type FloorInvoice = {
  status: string;
  voucher: string;
  customer: string;
  net: number;
};

export type FloorFacts = {
  today: string;
  role: Role;
  salesToday: number;
  salesMonth: number;
  monthName: string;
  drafts: number;
  approved: number;
  invoices: FloorInvoice[];
  unpaid: { customer: string; remaining: number }[];
  dues: { customer: string; voucher: string; due: string; remaining: number; overdue: boolean }[];
  lowStock: { name: string; sku: string; onHand: number }[];
  stockCount: number;
  invoiceCount: number;
};

const pages = [
  "/dashboard",
  "/invoices",
  "/products",
  "/products/categories",
  "/inventory",
  "/inventory/purchase-requests",
  "/inventory/purchase-requests/new",
  "/team",
] as const;

export function buildFloorFacts(
  invoices: Invoice[],
  stock: FloorStock[],
  today: string,
  role: Role,
): FloorFacts {
  const metrics = buildDashboard(invoices, today);
  const open = invoices.filter((invoice) => invoice.status !== "voided");
  return {
    today,
    role,
    salesToday: metrics.todaySales,
    salesMonth: metrics.monthSales,
    monthName: metrics.monthName,
    drafts: invoices.filter((invoice) => invoice.status === "draft").length,
    approved: invoices.filter((invoice) => invoice.status === "approved").length,
    invoices: invoices.slice(0, 40).map((invoice) => ({
      status: invoice.status,
      voucher: invoice.voucherNo,
      customer: invoice.customer,
      net: invoice.net,
    })),
    unpaid: metrics.debts.slice(0, 8),
    dues: metrics.dues.slice(0, 6).map((item) => ({
      customer: item.customer,
      voucher: item.voucherNo,
      due: item.dueLabel,
      remaining: item.remaining,
      overdue: item.overdue,
    })),
    lowStock: stock
      .filter((line) => line.status === "For Re-stock")
      .slice(0, 12)
      .map((line) => ({ name: line.name, sku: line.sku, onHand: line.onHand })),
    stockCount: stock.length,
    invoiceCount: open.length,
  };
}

export function answerFloorQuestion(question: string, facts: FloorFacts): FloorReply | null {
  const text = question.trim().toLowerCase();
  if (!text) return null;
  const local = prefersTagalog(text);

  if (/(invoice|draft|resibo|\bsi\b)/.test(text) && /(create|new|gawa|bagong|gumawa)/.test(text)) {
    return draftReply(local);
  }
  if (/(approved|na-approve)/.test(text) && !/(pano|paano|\bhow\b|\bsaan\b)/.test(text)) {
    return statusReply(facts, "approved", local);
  }
  if (/\bvoid/.test(text) && !/(pano|paano|\bhow\b|\bsaan\b)/.test(text)) {
    return statusReply(facts, "voided", local);
  }
  if (/\bdrafts?\b/.test(text)) return statusReply(facts, "draft", local);
  if (/(sale|sales|benta|kita|revenue)/.test(text)) return salesReply(facts, local);
  if (/(low|restock|re-stock|reorder|kulang|stock|inventory)/.test(text)) return stockReply(facts, local);
  if (/(utang|unpaid|balance|debt|due|bayad|kolek)/.test(text)) return balanceReply(facts, local);
  if (/(purchase request|\bpr\b)/.test(text)) return purchaseReply(local);
  if (/(category|categories|kategorya)/.test(text)) return productsReply(local, true);
  if (/(product|catalog)/.test(text)) return productsReply(local, false);
  if (/(team|employee|staff)/.test(text)) return teamReply(facts, local);
  if (/(saan|where|pano|paano|how|nasaan)/.test(text)) return guideReply(local);
  return null;
}

export function quickReplies(facts: FloorFacts) {
  return {
    invoice: draftReply(false),
    sales: salesReply(facts, false),
    stock: stockReply(facts, false),
  };
}

export function sanitizeFacts(value: unknown, role: Role): FloorFacts | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const today = typeof row.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.today) ? row.today : "";
  if (!today) return null;
  return {
    today,
    role,
    salesToday: money(row.salesToday),
    salesMonth: money(row.salesMonth),
    monthName: clip(row.monthName, 12),
    drafts: count(row.drafts),
    approved: count(row.approved),
    invoices: objects(row.invoices, 40).flatMap((item) => {
      const voucher = clip(item.voucher, 40);
      const customer = clip(item.customer, 80);
      if (!voucher || !customer) return [];
      return [
        {
          status: clip(item.status, 20),
          voucher,
          customer,
          net: money(item.net),
        },
      ];
    }),
    unpaid: objects(row.unpaid, 8).map((item) => ({
      customer: clip(item.customer, 80),
      remaining: money(item.remaining),
    })),
    dues: objects(row.dues, 6).map((item) => ({
      customer: clip(item.customer, 80),
      voucher: clip(item.voucher, 40),
      due: clip(item.due, 20),
      remaining: money(item.remaining),
      overdue: item.overdue === true,
    })),
    lowStock: objects(row.lowStock, 12).map((item) => ({
      name: clip(item.name, 120),
      sku: clip(item.sku, 40),
      onHand: money(item.onHand),
    })),
    stockCount: count(row.stockCount),
    invoiceCount: count(row.invoiceCount),
  };
}

export function sanitizeReply(value: unknown, role: Role): FloorReply | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const answer = clip(row.answer, 900).replace(/\bfacts\b/gi, "listahan");
  if (!answer) return null;
  const actions = objects(row.actions, 3).flatMap((item) => {
    const href = typeof item.href === "string" ? item.href : "";
    if (!(pages as readonly string[]).includes(href)) return [];
    if (href === "/team" && role !== "admin") return [];
    const label = clip(item.label, 40);
    if (!label) return [];
    const invoiceStatus = clip(item.invoiceStatus, 20);
    const tab =
      href === "/invoices" && (invoiceStatus === "draft" || invoiceStatus === "approved" || invoiceStatus === "voided")
        ? invoiceStatus
        : undefined;
    return [{ label, href, openDraft: href === "/invoices" && item.openDraft === true, invoiceStatus: tab }];
  });
  return { answer, actions };
}

export function floorGuide() {
  return [
    "Dashboard shows sales, balances, and due dates from the invoices on this floor.",
    "Invoice holds drafts. An admin approves or voids. New draft can be filled from a photo.",
    "Products is the catalog. Categories sit under Products.",
    "Inventory is the on-hand count. For Re-stock means on hand is at or under the minimum.",
    "Purchase Request, under Inventory, is the restock list.",
    "Team is where an admin registers an employee.",
  ].join(" ");
}

function statusReply(facts: FloorFacts, status: "draft" | "approved" | "voided", local: boolean): FloorReply {
  const rows = facts.invoices.filter((invoice) => invoice.status === status);
  const title = status === "approved" ? "Approved" : status === "voided" ? "Voided" : "Draft";
  if (rows.length === 0) {
    return {
      answer: local ? `Walang ${title.toLowerCase()} na invoice.` : `No ${title.toLowerCase()} invoices.`,
      actions: [{ label: "Open invoices", href: "/invoices", invoiceStatus: status }],
    };
  }
  const lines = rows.map((invoice) => `${invoice.voucher} · ${invoice.customer} · ${formatMoney(invoice.net)}`).join("\n");
  return {
    answer: local ? `Ito ang ${title.toLowerCase()}:\n${lines}` : `${title}:\n${lines}`,
    actions: [{ label: "Open invoices", href: "/invoices", invoiceStatus: status }],
  };
}

function draftReply(local: boolean): FloorReply {
  return {
    answer: local
      ? "Bagong draft ang Invoice. Puwede ring punuin mula sa photo ng paper invoice."
      : "A new draft is on Invoice. A photo of the paper invoice can fill it.",
    actions: [{ label: "Create invoice", href: "/invoices", openDraft: true }],
  };
}

function salesReply(facts: FloorFacts, local: boolean): FloorReply {
  const today = formatMoney(facts.salesToday);
  const month = formatMoney(facts.salesMonth);
  return {
    answer: local
      ? `Benta ngayong araw: ${today}. Benta ngayong ${facts.monthName}: ${month}. Hindi kasama ang voided.`
      : `Today's sales are ${today}. ${facts.monthName} sales are ${month}. Voided invoices are left out.`,
    actions: [{ label: "Open dashboard", href: "/dashboard" }],
  };
}

function stockReply(facts: FloorFacts, local: boolean): FloorReply {
  if (facts.stockCount === 0) {
    return {
      answer: local ? "Wala pang stock list." : "The stock list is empty.",
      actions: [{ label: "Open inventory", href: "/inventory" }],
    };
  }
  if (facts.lowStock.length === 0) {
    return {
      answer: local
        ? "Walang product na For Re-stock."
        : "Nothing is marked For Re-stock.",
      actions: [{ label: "Open inventory", href: "/inventory" }],
    };
  }
  const list = facts.lowStock.map((line) => `${line.name} (${countLabel(line.onHand)} on hand)`).join(", ");
  return {
    answer: `For re-stock: ${list}.`,
    actions: [
      { label: "Open inventory", href: "/inventory" },
      { label: "New purchase request", href: "/inventory/purchase-requests/new" },
    ],
  };
}

function balanceReply(facts: FloorFacts, local: boolean): FloorReply {
  if (facts.unpaid.length === 0) {
    return {
      answer: local ? "Walang bukas na balance sa mga invoice." : "No open balance on the invoices.",
      actions: [{ label: "Open dashboard", href: "/dashboard" }],
    };
  }
  const list = facts.unpaid
    .map((item) => `${item.customer} ${formatMoney(item.remaining)}`)
    .join(", ");
  const due = facts.dues
    .slice(0, 3)
    .map((item) => `${item.voucher} due ${item.due}`)
    .join(", ");
  return {
    answer: local
      ? `Bukas na balance: ${list}.${due ? ` Due: ${due}.` : ""}`
      : `Open balance: ${list}.${due ? ` Due: ${due}.` : ""}`,
    actions: [{ label: "Open dashboard", href: "/dashboard" }],
  };
}

function purchaseReply(local: boolean): FloorReply {
  return {
    answer: local
      ? "Purchase Request ang listahan ng ire-restock. Nasa ilalim ito ng Inventory."
      : "Purchase Request is the restock list. It sits under Inventory.",
    actions: [
      { label: "Purchase requests", href: "/inventory/purchase-requests" },
      { label: "New purchase request", href: "/inventory/purchase-requests/new" },
    ],
  };
}

function productsReply(local: boolean, categories: boolean): FloorReply {
  return {
    answer: categories
      ? local
        ? "Categories ay nasa ilalim ng Products."
        : "Categories sit under Products."
      : local
        ? "Ang catalog ay nasa Products."
        : "The catalog is on Products.",
    actions: [
      categories
        ? { label: "Open categories", href: "/products/categories" }
        : { label: "Open products", href: "/products" },
    ],
  };
}

function teamReply(facts: FloorFacts, local: boolean): FloorReply {
  if (facts.role !== "admin") {
    return {
      answer: local
        ? "Ang Team page ay para sa admin."
        : "The Team page is for an admin.",
      actions: [],
    };
  }
  return {
    answer: local
      ? "Sa Team nagre-register ang admin ng employee."
      : "Team is where an admin registers an employee.",
    actions: [{ label: "Open team", href: "/team" }],
  };
}

function guideReply(local: boolean): FloorReply {
  return {
    answer: local
      ? "Invoice para sa benta, Inventory para sa on-hand, Products para sa catalog, Purchase Request para sa restock."
      : "Invoice is for a sale, Inventory for on-hand counts, Products for the catalog, and Purchase Request for a restock.",
    actions: [
      { label: "Create invoice", href: "/invoices", openDraft: true },
      { label: "Open inventory", href: "/inventory" },
    ],
  };
}

function prefersTagalog(text: string) {
  return /\b(ano|saan|pano|paano|ilan|magkano|bakit|pwede|meron|yung|ung|mga|benta|kita|kulang|utang|nasaan|gumawa|bagong)\b/i.test(
    text,
  );
}

function countLabel(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function money(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function count(value: unknown) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 10000);
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function objects(value: unknown, max: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).flatMap((item) => (item && typeof item === "object" ? [item as Record<string, unknown>] : []));
}
