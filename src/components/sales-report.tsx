"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { getSeedInvoices, readStoredInvoices, subscribeInvoices } from "@/lib/invoice-store";
import { formatMoney } from "@/lib/invoices";
import { paidSales, salesNet, salesRows, type SalesRow, type SalesView } from "@/lib/sales-report";

const views: { id: SalesView; label: string; heads: string[] }[] = [
  { id: "daily", label: "Daily sales", heads: ["Date", "Invoices", "Qty", "Net"] },
  { id: "monthly", label: "Monthly sales", heads: ["Month", "Invoices", "Qty", "Net"] },
  { id: "product", label: "By product", heads: ["Product", "SKU", "Qty", "Invoices", "Net"] },
  { id: "transaction", label: "By transactions", heads: ["Date", "Voucher", "Customer", "Status", "Qty", "Net"] },
];

export function SalesReport() {
  const invoices = useSyncExternalStore(subscribeInvoices, readStoredInvoices, getSeedInvoices);
  const [view, setView] = useState<SalesView>("daily");
  const [query, setQuery] = useState("");
  const active = views.find((item) => item.id === view) ?? views[0];
  const rows = useMemo(() => salesRows(invoices, view, query), [invoices, query, view]);
  const total = salesNet(invoices);
  const empty = view === "product" && query.trim() ? "No product matches." : "No paid invoices yet.";

  return (
    <section className="desk-card mt-8 overflow-hidden rounded-[28px]">
      <div className="grid grid-cols-2 border-b border-line sm:flex sm:flex-wrap">
        {views.map((item) => {
          const selected = item.id === view;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`border-b-2 px-3 py-3 text-left text-[11px] tracking-[0.12em] uppercase transition sm:py-4 sm:tracking-[0.14em] ${
                selected ? "border-copper-deep text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 px-4 py-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <p className="text-sm text-muted">
          {paidSales(invoices).length} paid · Net {formatMoney(total)}
        </p>
        {view === "product" ? (
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a product"
            aria-label="Search a product"
            className="h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15 sm:w-64"
          />
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-line px-4 py-8 text-sm text-muted">{empty}</p>
      ) : (
        <>
          <ul className="divide-y divide-line border-t border-line sm:hidden">
            {rows.map((row) => (
              <li key={row.key} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-medium">{row.title}</p>
                  <p className="shrink-0 tabular-nums font-medium">{row.net}</p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  {row.details.map((detail) => (
                    <div key={detail.label} className="min-w-0">
                      <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{detail.label}</dt>
                      <dd className="mt-0.5 break-words text-sm">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block sm:overflow-x-auto">
            <table className="w-full min-w-[760px] border-t border-line text-left text-sm">
              <thead className="text-[11px] tracking-[0.14em] text-muted uppercase">
                <tr>
                  {active.heads.map((head) => (
                    <th key={head} className="px-4 py-3 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-line">
                    {desktopCells(view, row).map((cell, index, cells) => (
                      <td
                        key={`${row.key}-${active.heads[index]}`}
                        className={`px-4 py-3 break-words ${index === 0 || index === cells.length - 1 ? "font-medium" : ""} ${
                          index === 0 ? "" : "tabular-nums"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function desktopCells(view: SalesView, row: SalesRow) {
  if (view !== "transaction") return [row.title, ...row.details.map((detail) => detail.value), row.net];
  const value = (label: string) => row.details.find((detail) => detail.label === label)?.value ?? "";
  return [value("Date"), row.title, value("Customer"), value("Status"), value("Qty"), row.net];
}
