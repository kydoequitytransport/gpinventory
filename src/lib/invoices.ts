export const invoiceStatuses = [
  { id: "draft", label: "Draft" },
  { id: "approved", label: "Approved" },
  { id: "posted", label: "Posted" },
  { id: "invoice_sent", label: "Invoice sent" },
  { id: "in_transit", label: "In transit" },
  { id: "delivered", label: "Delivered" },
  { id: "unpaid", label: "Unpaid" },
  { id: "partially_paid", label: "Partially paid" },
  { id: "fully_paid", label: "Fully paid" },
  { id: "voided", label: "Voided" },
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number]["id"];

export type LineItem = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  onHand: number | null;
  barcode: string;
  qty: number;
  unitPrice: number | null;
  discountPct: number;
  serials: string[];
};

export type InvoiceAutofill = {
  customer?: string;
  attention?: string;
  deliverTo?: string;
  tel?: string;
  fax?: string;
  poNo?: string;
  prNo?: string;
  drNo?: string;
  qtNo?: string;
  branch?: string;
  terms?: string;
  siType?: string;
  vatCode?: "E" | "VE";
  shippingFee?: number;
  withholdingPct?: number;
  salesRep?: string;
  referredBy?: string;
  internalRemark?: string;
  lines?: Array<{
    name: string;
    sku?: string;
    qty?: number;
    unitPrice?: number | null;
    discountPct?: number;
    barcode?: string;
  }>;
};

export type Invoice = {
  id: string;
  voucherNo: string;
  customer: string;
  attention: string;
  deliverTo: string;
  tel: string;
  fax: string;
  saleDate: string;
  cutOff: string;
  poNo: string;
  prNo: string;
  drNo: string;
  qtNo: string;
  branch: string;
  terms: string;
  siType: string;
  shippingFee: number;
  withholdingPct: number;
  salesRep: string;
  referredBy: string;
  sourceFileName: string;
  itemDiscount: number;
  withholding: number;
  totalQty: number;
  subtotal: number;
  gross: number;
  vat: number;
  vatCode: "E" | "VE";
  net: number;
  paid: number;
  acquisition: string;
  lines: LineItem[];
  internalRemark: string;
  preparedBy: string;
  approvedBy: string;
  actor: string;
  actedAt: string;
  status: InvoiceStatus;
};

export const shop = {
  name: "Grand Primex - INEED",
  country: "Philippines",
  address: "149 Makabud Street, Amparo Village, Caloocan City",
  contact: "09175066792",
};

function line(
  id: string,
  name: string,
  sku: string,
  qty: number,
  unitPrice: number | null,
): LineItem {
  return {
    id,
    name,
    sku,
    unit: "",
    onHand: null,
    barcode: "",
    qty,
    unitPrice,
    discountPct: 0,
    serials: [],
  };
}

const manualSale = {
  deliverTo: "",
  tel: "",
  fax: "",
  saleDate: "2026-10-28",
  cutOff: "2026-10-28",
  poNo: "",
  prNo: "",
  drNo: "",
  qtNo: "",
  branch: "",
  terms: "7 Days",
  siType: "",
  shippingFee: 0,
  withholdingPct: 0,
  salesRep: "",
  referredBy: "",
  sourceFileName: "",
  itemDiscount: 0,
  withholding: 0,
};

export const invoices: Invoice[] = [
  {
    id: "153077",
    voucherNo: "GRD1002862",
    customer: "Shakespeare Harley Elias",
    attention: "Shakespeare Harley Elias",
    totalQty: 4,
    subtotal: 6200,
    gross: 6200,
    vat: 0,
    vatCode: "E",
    net: 6200,
    paid: 0,
    acquisition: "Marketing-Generated",
    ...manualSale,
    lines: [
      line("l1", "Hex dumbbells 5lbs", "HXD-5", 1, 450),
      line("l2", "Hex dumbbells 10lbs", "HXD-10", 1, 900),
      line("l3", "Hex dumbbells 15lbs", "HXD-15", 1, 1350),
      line("l4", "Basic Olympic bar 7ft", "BSC-BAR", 1, 3500),
    ],
    internalRemark: "",
    preparedBy: "Ian Laurence Ramiro",
    approvedBy: "",
    actor: "Ian Laurence Ramiro",
    actedAt: "2026-10-28T18:31:42",
    status: "draft",
  },
  {
    id: "153066",
    voucherNo: "GRD1002861",
    customer: "Armed Forces & Police Mutual Benefit Association, Inc.",
    attention: "AFPMBAI",
    totalQty: 11,
    subtotal: 217270,
    gross: 217270,
    vat: 26072.4,
    vatCode: "VE",
    net: 243342.4,
    paid: 0,
    acquisition: "Marketing-Generated",
    ...manualSale,
    lines: [
      line("a1", "Adjustable decline bench v2", "ADB-V2", 1, null),
      line("a2", "TPE yoga mats", "TPE-MAT", 1, null),
      line("a3", "Punching bag", "PCH-BAG", 1, null),
      line("a4", "Stairmaster", "STR-01", 1, null),
      line("a5", "Medicine ball 3kg", "MED-3", 1, null),
      line("a6", "Medicine ball 4kg", "MED-4", 1, null),
      line("a7", "Medicine ball 5kg", "MED-5", 1, null),
      line("a8", "Medicine ball 6kg", "MED-6", 1, null),
      line("a9", "Medicine ball 7kg", "MED-7", 1, null),
      line("a10", "Medicine ball 8kg", "MED-8", 1, null),
      line("a11", "Compact cable crossover", "CCC-01", 1, null),
    ],
    internalRemark: "",
    preparedBy: "Justine Alabata",
    approvedBy: "",
    actor: "Justine Alabata",
    actedAt: "2026-10-28T18:49:34",
    status: "draft",
  },
  {
    id: "152906",
    voucherNo: "GRD1002858",
    customer: "Rose Genevieve C. Simborios",
    attention: "Rose Genevieve C. Simborios",
    totalQty: 3,
    subtotal: 155000,
    gross: 155000,
    vat: 0,
    vatCode: "E",
    net: 155000,
    paid: 0,
    acquisition: "Marketing-Generated",
    ...manualSale,
    lines: [
      line("r1", "Abductor/adductor", "ABD-01", 1, null),
      line("r2", "Curve treadmill", "TRD-CRV", 1, null),
      line("r3", "Leg curl/leg extension bench", "LEG-01", 1, null),
    ],
    internalRemark: "",
    preparedBy: "Joshua Ladwingon",
    approvedBy: "",
    actor: "Joshua Ladwingon",
    actedAt: "2026-10-28T11:06:38",
    status: "draft",
  },
];

const money = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qty = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatMoney(value: number) {
  return money.format(value);
}

export function formatQty(value: number) {
  return qty.format(value);
}

export function formatActedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPaperDate(value: string) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatPaperDateTime(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${formatPaperDate(value)} ${hours}:${minutes}:${seconds}`;
}

export function productNames(invoice: Invoice) {
  return invoice.lines.map((item) => item.name).filter(Boolean);
}

export function lineAmounts(item: LineItem, vatCode: "E" | "VE") {
  const gross = roundMoney(item.qty * (item.unitPrice ?? 0));
  const discountAmt = roundMoney((gross * (item.discountPct || 0)) / 100);
  const taxable = roundMoney(gross - discountAmt);
  const vatAmt = vatCode === "VE" ? roundMoney(taxable * 0.12) : 0;
  return {
    gross,
    discountAmt,
    taxable,
    vatAmt,
    netAmt: roundMoney(taxable + vatAmt),
  };
}

export function priceInvoice(invoice: Invoice): Invoice {
  const totalQty = invoice.lines.reduce((sum, item) => sum + item.qty, 0);
  const complete =
    invoice.lines.length > 0 && invoice.lines.every((item) => item.unitPrice != null);
  if (!complete) return { ...invoice, totalQty };

  let itemDiscount = 0;
  let subtotal = 0;
  let vat = 0;
  let gross = 0;
  for (const item of invoice.lines) {
    const amounts = lineAmounts(item, invoice.vatCode);
    gross += amounts.gross;
    itemDiscount += amounts.discountAmt;
    subtotal += amounts.taxable;
    vat += amounts.vatAmt;
  }
  const withholding = roundMoney((subtotal * (invoice.withholdingPct || 0)) / 100);
  const net = roundMoney(subtotal + vat + (invoice.shippingFee || 0) - withholding);

  return {
    ...invoice,
    totalQty,
    itemDiscount: roundMoney(itemDiscount),
    withholding,
    subtotal: roundMoney(subtotal),
    gross: roundMoney(gross),
    vat: roundMoney(vat),
    net,
  };
}

export function blankInvoice(actor: string): Invoice {
  const now = new Date();
  const stamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);

  return priceInvoice({
    id: "",
    voucherNo: "",
    customer: "",
    attention: "",
    totalQty: 0,
    subtotal: 0,
    gross: 0,
    vat: 0,
    vatCode: "E",
    net: 0,
    paid: 0,
    acquisition: "Marketing-Generated",
    ...manualSale,
    saleDate: stamp.slice(0, 10),
    cutOff: stamp.slice(0, 10),
    lines: [{ ...blankLine(), qty: 0, unitPrice: 0 }],
    internalRemark: "",
    preparedBy: actor,
    approvedBy: "",
    actor,
    actedAt: stamp,
    status: "draft",
  });
}

export function blankLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    sku: "",
    unit: "",
    onHand: null,
    barcode: "",
    qty: 1,
    unitPrice: 0,
    discountPct: 0,
    serials: [],
  };
}

export function normalizeInvoice(raw: Invoice): Invoice {
  const day = (raw.actedAt || "").slice(0, 10);
  return {
    ...manualSale,
    ...raw,
    saleDate: raw.saleDate || day,
    cutOff: raw.cutOff || day,
    terms: raw.terms || "7 Days",
    shippingFee: Number(raw.shippingFee) || 0,
    withholdingPct: Number(raw.withholdingPct) || 0,
    itemDiscount: Number(raw.itemDiscount) || 0,
    withholding: Number(raw.withholding) || 0,
    lines: (raw.lines ?? []).map((item) => ({
      ...blankLine(),
      ...item,
      unit: item.unit ?? "",
      onHand: item.onHand ?? null,
      discountPct: Number(item.discountPct) || 0,
      serials: Array.isArray(item.serials) ? item.serials : [],
    })),
  };
}

export function applyInvoiceAutofill(invoice: Invoice, fill: InvoiceAutofill): Invoice {
  const named = (fill.lines ?? []).filter((item) => item.name.trim());
  const lines = named.length
    ? named.map((item) => ({
        ...blankLine(),
        name: item.name.trim(),
        sku: item.sku?.trim() ?? "",
        qty: item.qty ?? 1,
        unitPrice: item.unitPrice ?? 0,
        discountPct: item.discountPct ?? 0,
        barcode: item.barcode?.trim() ?? "",
        serials: item.barcode?.trim() ? [item.barcode.trim()] : [],
      }))
    : invoice.lines;

  return priceInvoice({
    ...invoice,
    customer: filled(fill.customer, invoice.customer),
    attention: filled(fill.attention, invoice.attention),
    deliverTo: filled(fill.deliverTo, invoice.deliverTo),
    tel: filled(fill.tel, invoice.tel),
    fax: filled(fill.fax, invoice.fax),
    poNo: filled(fill.poNo, invoice.poNo),
    prNo: filled(fill.prNo, invoice.prNo),
    drNo: filled(fill.drNo, invoice.drNo),
    qtNo: filled(fill.qtNo, invoice.qtNo),
    branch: filled(fill.branch, invoice.branch),
    terms: filled(fill.terms, invoice.terms),
    siType: filled(fill.siType, invoice.siType),
    salesRep: filled(fill.salesRep, invoice.salesRep),
    referredBy: filled(fill.referredBy, invoice.referredBy),
    internalRemark: filled(fill.internalRemark, invoice.internalRemark),
    vatCode: fill.vatCode ?? invoice.vatCode,
    shippingFee: fill.shippingFee ?? invoice.shippingFee,
    withholdingPct: fill.withholdingPct ?? invoice.withholdingPct,
    lines,
  });
}

function filled(next: string | undefined, current: string) {
  const value = next?.trim();
  return value ? value : current;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
