import type { Invoice } from "@/lib/invoices";

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
};

export type DebtBar = {
  customer: string;
  remaining: number;
};

export type DueItem = {
  id: string;
  customer: string;
  voucherNo: string;
  due: string;
  dueLabel: string;
  remaining: number;
  overdue: boolean;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeap(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  if (month === 2 && isLeap(year)) return 29;
  return monthLengths[month - 1];
}

function shiftDate(iso: string, delta: number) {
  let [year, month, day] = iso.split("-").map(Number);
  day += delta;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += daysInMonth(year, month);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(monthKey: string, delta: number) {
  const [yearText, monthText] = monthKey.split("-");
  const index = Number(yearText) * 12 + (Number(monthText) - 1) + delta;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dayLabel(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${monthNames[month - 1]}`;
}

function monthLabel(monthKey: string) {
  const [, month] = monthKey.split("-").map(Number);
  return monthNames[month - 1];
}

function invoiceDay(invoice: Invoice) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(invoice.saleDate)) return invoice.saleDate;
  return invoice.actedAt.slice(0, 10);
}

function termDays(terms: string) {
  if (/cod/i.test(terms)) return 0;
  const match = terms.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function sum(invoices: Invoice[]) {
  return Math.round(invoices.reduce((total, invoice) => total + invoice.net, 0) * 100) / 100;
}

export function buildDashboard(invoices: Invoice[], today: string) {
  const open = invoices.filter((invoice) => invoice.status !== "voided");
  const monthKey = today.slice(0, 7);
  const [year, month, todayNumber] = today.split("-").map(Number);

  const daily = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDate(today, index - 6);
    return {
      key,
      label: String(Number(key.slice(8, 10))),
      value: sum(open.filter((invoice) => invoiceDay(invoice) === key)),
    };
  });

  const monthDays = Array.from({ length: todayNumber }, (_, index) => {
    const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
    return {
      key,
      label: String(index + 1),
      value: sum(open.filter((invoice) => invoiceDay(invoice) === key)),
    };
  });

  const comparison = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonth(monthKey, index - 5);
    return {
      key,
      label: monthLabel(key),
      value: sum(open.filter((invoice) => invoiceDay(invoice).startsWith(key))),
    };
  });

  const debtMap = new Map<string, number>();
  const dues: DueItem[] = [];
  for (const invoice of open) {
    const remaining = Math.round(Math.max(invoice.net - invoice.paid, 0) * 100) / 100;
    if (remaining <= 0) continue;
    debtMap.set(invoice.customer, (debtMap.get(invoice.customer) ?? 0) + remaining);
    const due = shiftDate(invoiceDay(invoice), termDays(invoice.terms));
    dues.push({
      id: invoice.id,
      customer: invoice.customer,
      voucherNo: invoice.voucherNo,
      due,
      dueLabel: dayLabel(due),
      remaining,
      overdue: due < today,
    });
  }

  const debts = [...debtMap.entries()]
    .map(([customer, remaining]) => ({ customer, remaining }))
    .sort((a, b) => b.remaining - a.remaining);

  dues.sort((a, b) => a.due.localeCompare(b.due));

  const counted = open.flatMap((invoice) =>
    invoice.lines.filter((line) => line.name && line.onHand != null),
  );
  const lowStocks = counted
    .filter((line) => (line.onHand ?? 0) <= 3)
    .map((line) => ({ name: line.name, onHand: line.onHand ?? 0 }));
  const highStocks = counted
    .filter((line) => (line.onHand ?? 0) >= 10)
    .map((line) => ({ name: line.name, onHand: line.onHand ?? 0 }))
    .sort((a, b) => b.onHand - a.onHand);

  return {
    todaySales: daily[daily.length - 1]?.value ?? 0,
    monthSales: sum(open.filter((invoice) => invoiceDay(invoice).startsWith(monthKey))),
    daily,
    monthDays,
    comparison,
    debts,
    dues,
    lowStocks,
    highStocks,
    stockTracked: counted.length > 0,
    monthName: monthNames[month - 1],
    year,
  };
}
