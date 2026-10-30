import { formatMoney, formatQty, invoiceStatuses, lineAmounts, type Invoice, type InvoiceStatus } from "@/lib/invoices";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type SalesView = "daily" | "monthly" | "product" | "transaction";

export type SalesRow = {
  key: string;
  title: string;
  net: string;
  details: { label: string; value: string }[];
};

const paidStatuses = new Set<InvoiceStatus>(["partially_paid", "fully_paid"]);

export function saleDay(invoice: Invoice) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.saleDate)) return invoice.saleDate;
  return (invoice.actedAt || "").slice(0, 10);
}

export function paidSales(invoices: Invoice[]) {
  return invoices.filter((invoice) => paidStatuses.has(invoice.status) && saleDay(invoice).length === 10);
}

export function salesRows(invoices: Invoice[], view: SalesView, productQuery: string): SalesRow[] {
  const open = paidSales(invoices);
  if (view === "daily") return dailyRows(open);
  if (view === "monthly") return monthlyRows(open);
  if (view === "product") return productRows(open, productQuery);
  return transactionRows(open);
}

export function salesNet(invoices: Invoice[]) {
  return round(paidSales(invoices).reduce((sum, invoice) => sum + invoice.net, 0));
}

function dailyRows(invoices: Invoice[]): SalesRow[] {
  const groups = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    const day = saleDay(invoice);
    groups.set(day, [...(groups.get(day) ?? []), invoice]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([day, rows]) => ({
      key: day,
      title: dayLabel(day),
      net: formatMoney(netOf(rows)),
      details: [
        { label: "Invoices", value: String(rows.length) },
        { label: "Qty", value: formatQty(qtyOf(rows)) },
      ],
    }));
}

function monthlyRows(invoices: Invoice[]): SalesRow[] {
  const groups = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    const month = saleDay(invoice).slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), invoice]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, rows]) => ({
      key: month,
      title: monthLabel(month),
      net: formatMoney(netOf(rows)),
      details: [
        { label: "Invoices", value: String(rows.length) },
        { label: "Qty", value: formatQty(qtyOf(rows)) },
      ],
    }));
}

function productRows(invoices: Invoice[], query: string): SalesRow[] {
  const needle = query.trim().toLowerCase();
  const groups = new Map<string, { name: string; sku: string; qty: number; net: number; invoices: Set<string> }>();
  for (const invoice of invoices) {
    for (const item of invoice.lines) {
      const name = item.name.trim();
      if (!name) continue;
      const sku = item.sku.trim();
      const key = `${sku.toLowerCase()}|${name.toLowerCase()}`;
      const current = groups.get(key) ?? { name, sku, qty: 0, net: 0, invoices: new Set<string>() };
      current.qty += item.qty;
      current.net += lineAmounts(item, invoice.vatCode).netAmt;
      current.invoices.add(invoice.id);
      groups.set(key, current);
    }
  }
  return [...groups.values()]
    .filter((row) => !needle || `${row.name} ${row.sku}`.toLowerCase().includes(needle))
    .sort((left, right) => right.net - left.net || left.name.localeCompare(right.name))
    .map((row) => ({
      key: `${row.sku}|${row.name}`,
      title: row.name,
      net: formatMoney(round(row.net)),
      details: [
        { label: "SKU", value: row.sku || "—" },
        { label: "Qty", value: formatQty(row.qty) },
        { label: "Invoices", value: String(row.invoices.size) },
      ],
    }));
}

function transactionRows(invoices: Invoice[]): SalesRow[] {
  return [...invoices]
    .sort((left, right) => saleDay(right).localeCompare(saleDay(left)) || right.voucherNo.localeCompare(left.voucherNo))
    .map((invoice) => ({
      key: invoice.id,
      title: invoice.voucherNo,
      net: formatMoney(invoice.net),
      details: [
        { label: "Date", value: dayLabel(saleDay(invoice)) },
        { label: "Customer", value: invoice.customer },
        { label: "Status", value: statusLabel(invoice.status) },
        { label: "Qty", value: formatQty(invoice.lines.reduce((sum, item) => sum + item.qty, 0)) },
      ],
    }));
}

function qtyOf(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + invoice.lines.reduce((lineSum, item) => lineSum + item.qty, 0), 0);
}

function netOf(invoices: Invoice[]) {
  return round(invoices.reduce((sum, invoice) => sum + invoice.net, 0));
}

function statusLabel(status: InvoiceStatus) {
  return invoiceStatuses.find((item) => item.id === status)?.label ?? status;
}

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${months[month - 1]} ${year}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${months[month - 1]} ${year}`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
