"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoicePaper } from "@/components/invoice-paper";
import {
  getSeedInvoices,
  publishInvoices,
  readStoredInvoices,
  subscribeInvoices,
} from "@/lib/invoice-store";
import {
  attachProductImages,
  blankInvoice,
  formatActedAt,
  formatMoney,
  formatQty,
  invoiceStatuses,
  productNames,
  type Invoice,
  type InvoiceCatalogProduct,
  type InvoiceStatus,
} from "@/lib/invoices";
import type { Role } from "@/lib/types";

const pageSizes = [10, 25, 50];

type OpenPaper = { id: string; kind: "general" | "delivery" | "edit" };

export function InvoiceBoard({
  role,
  actorName,
  products,
  sample,
}: {
  role: Role;
  actorName: string;
  products: InvoiceCatalogProduct[];
  sample: Invoice | null;
}) {
  const records = useSyncExternalStore(subscribeInvoices, readStoredInvoices, getSeedInvoices);

  useEffect(() => {
    const current = readStoredInvoices();
    let next = current;
    if (sample && !next.some((item) => item.id === sample.id)) {
      next = [sample, ...next];
    }
    const withImages = next.map((invoice) => attachProductImages(invoice, products));
    if (next !== current || withImages.some((invoice, index) => invoice !== next[index])) {
      publishInvoices(withImages);
    }
  }, [products, sample]);
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [open, setOpen] = useState<OpenPaper | null>(null);

  const counts = useMemo(() => {
    return Object.fromEntries(
      invoiceStatuses.map((item) => [
        item.id,
        records.filter((invoice) => invoice.status === item.id).length,
      ]),
    ) as Record<InvoiceStatus, number>;
  }, [records]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((invoice) => {
      if (invoice.status !== status) return false;
      if (!needle) return true;
      const haystack = [
        invoice.id,
        invoice.voucherNo,
        invoice.customer,
        invoice.attention,
        invoice.actor,
        invoice.acquisition,
        invoice.internalRemark,
        ...productNames(invoice),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, records, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const visibleIds = rows.map((row) => row.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function changeStatus(next: InvoiceStatus) {
    setStatus(next);
    setPage(1);
    setSelected([]);
    setLogsFor(null);
  }

  function toggleAll() {
    setSelected((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  }

  function toggleOne(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function stamp() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  }

  function saveInvoice(next: Invoice): Invoice {
    const existing = next.id ? records.find((item) => item.id === next.id) : undefined;
    if (existing && existing.status !== "draft") return existing;

    if (existing) {
      const saved = { ...next, status: "draft" as const };
      publishInvoices(records.map((item) => (item.id === saved.id ? saved : item)));
      return saved;
    }

    const nextId = String(
      records.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
    );
    const nextVoucher =
      records.reduce((max, item) => {
        const digits = Number(item.voucherNo.replace(/\D/g, "")) || 0;
        return Math.max(max, digits);
      }, 0) + 1;
    const saved: Invoice = {
      ...next,
      id: nextId,
      voucherNo: `GRD${nextVoucher}`,
      status: "draft",
    };
    publishInvoices([saved, ...records]);
    setStatus("draft");
    setPage(1);
    setOpen({ id: saved.id, kind: "general" });
    return saved;
  }

  function approveInvoice(next: Invoice) {
    if (role !== "admin") return;
    const existing = records.find((item) => item.id === next.id);
    if (!existing || existing.status !== "draft") return;
    const saved: Invoice = {
      ...next,
      status: "approved",
      approvedBy: actorName,
      actor: actorName,
      actedAt: stamp(),
    };
    publishInvoices(records.map((item) => (item.id === saved.id ? saved : item)));
    setOpen(null);
    setStatus("approved");
    setPage(1);
  }

  function voidInvoice(next: Invoice) {
    if (role !== "admin") return;
    const existing = records.find((item) => item.id === next.id);
    if (!existing || (existing.status !== "draft" && existing.status !== "approved")) return;
    const saved: Invoice = {
      ...existing,
      status: "voided",
      actor: actorName,
      actedAt: stamp(),
    };
    publishInvoices(records.map((item) => (item.id === saved.id ? saved : item)));
    setOpen(null);
    setStatus("voided");
    setPage(1);
  }

  const activeLabel = invoiceStatuses.find((item) => item.id === status)?.label ?? "Draft";
  const paper =
    open?.id === "new" ? blankInvoice(actorName) : records.find((item) => item.id === open?.id);

  return (
    <>
    <div className="desk-card overflow-hidden rounded-[28px]">
      <div className="flex flex-wrap items-center gap-x-1 border-b border-line px-3">
        {invoiceStatuses.map((item) => {
          const active = item.id === status;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeStatus(item.id)}
              className={`shrink-0 border-b-2 px-3 py-4 text-[11px] tracking-[0.14em] uppercase transition ${
                active
                  ? "border-copper-deep text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item.label}
              <span
                className={`ml-2 inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] tracking-normal ${
                  active ? "bg-copper-deep text-white" : "bg-paper-deep text-muted"
                }`}
              >
                {counts[item.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-muted">
          Show
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-copper"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          entries
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen({ id: "new", kind: "general" })}
            className="h-9 rounded-lg bg-ink px-3 text-sm text-white"
          >
            New draft
          </button>
          <label className="flex items-center gap-2 text-sm text-muted">
          Search
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Voucher, customer, equipment"
            className="h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-[#98a0aa] focus:border-copper sm:w-64"
          />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.16em] text-muted uppercase">
              <th className="w-12 px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Select visible invoices"
                  className="size-4 accent-copper-deep"
                />
              </th>
              <th className="px-3 py-3 font-medium">ID</th>
              <th className="px-3 py-3 font-medium">Invoice</th>
              <th className="px-3 py-3 font-medium">Transaction</th>
              <th className="px-3 py-3 font-medium">Equipment</th>
              <th className="px-3 py-3 font-medium">Remark</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="font-display text-2xl tracking-tight text-ink">
                    No {activeLabel.toLowerCase()} invoices
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Drafts are the ones on the bench right now. The other stages fill in as
                    papers move.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line align-top last:border-b-0">
                  <td className="px-4 py-5">
                    <input
                      type="checkbox"
                      checked={selected.includes(invoice.id)}
                      onChange={() => toggleOne(invoice.id)}
                      aria-label={`Select ${invoice.voucherNo}`}
                      className="size-4 accent-copper-deep"
                    />
                  </td>
                  <td className="px-3 py-5 text-sm font-medium tabular-nums">{invoice.id}</td>
                  <td className="px-3 py-5">
                    <p className="text-sm font-semibold tracking-wide text-copper-deep">
                      {invoice.voucherNo}
                    </p>
                    <p className="mt-2 max-w-56 text-sm leading-5 text-ink">{invoice.customer}</p>
                    <p className="mt-1 text-xs text-muted">Attn: {invoice.attention}</p>
                  </td>
                  <td className="px-3 py-5">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      <dt className="text-muted">Qty</dt>
                      <dd className="text-right tabular-nums">{formatQty(invoice.totalQty)}</dd>
                      <dt className="text-muted">Subtotal</dt>
                      <dd className="text-right tabular-nums">{formatMoney(invoice.subtotal)}</dd>
                      <dt className="text-muted">Gross</dt>
                      <dd className="text-right tabular-nums">{formatMoney(invoice.gross)}</dd>
                      <dt className="text-muted">VAT</dt>
                      <dd className="text-right tabular-nums">
                        {formatMoney(invoice.vat)} ({invoice.vatCode})
                      </dd>
                      <dt className="font-medium text-ink">Net</dt>
                      <dd className="text-right font-semibold tabular-nums">
                        {formatMoney(invoice.net)}
                      </dd>
                    </dl>
                    <p className="mt-3 text-xs text-muted">Acquisition: {invoice.acquisition}</p>
                  </td>
                  <td className="px-3 py-5">
                    <ProductList products={productNames(invoice)} />
                  </td>
                  <td className="px-3 py-5 text-sm text-muted">
                    {invoice.internalRemark || "—"}
                  </td>
                  <td className="px-4 py-5">
                    <InvoiceActions
                      invoice={invoice}
                      logsOpen={logsFor === invoice.id}
                      onToggleLogs={() =>
                        setLogsFor((current) => (current === invoice.id ? null : invoice.id))
                      }
                      onOpen={(kind) => setOpen({ id: invoice.id, kind })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {filtered.length === 0
            ? "Showing 0 entries"
            : `Showing ${start + 1} to ${start + rows.length} of ${filtered.length}`}
          {selected.length > 0 ? ` · ${selected.length} selected` : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="h-8 rounded-lg border border-line bg-white px-3 text-ink disabled:opacity-40"
          >
            Previous
          </button>
          <span className="tabular-nums">
            {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            className="h-8 rounded-lg border border-line bg-white px-3 text-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
    {open && paper && (open.id === "new" || open.kind === "edit")
      ? createPortal(
          <InvoiceForm
            key={`${open.id}-edit`}
            invoice={paper}
            role={role}
            actorName={actorName}
            products={products}
            onClose={() => setOpen(null)}
            onSave={(next) => {
              const saved = saveInvoice(next);
              setOpen({ id: saved.id, kind: "general" });
              return saved;
            }}
          />,
          document.body,
        )
      : null}
    {open && paper && open.id !== "new" && open.kind !== "edit"
      ? createPortal(
          <InvoicePaper
            key={`${open.id}-${open.kind}`}
            invoice={paper}
            kind={open.kind}
            role={role}
            actorName={actorName}
            onClose={() => setOpen(null)}
            onSave={saveInvoice}
            onApprove={approveInvoice}
            onVoid={voidInvoice}
            onEdit={
              paper.status === "draft" ? () => setOpen({ id: paper.id, kind: "edit" }) : undefined
            }
          />,
          document.body,
        )
      : null}
    </>
  );
}

function ProductList({ products }: { products: string[] }) {
  const [open, setOpen] = useState(false);
  const visible = open ? products : products.slice(0, 4);
  const hidden = products.length - visible.length;

  return (
    <div className="max-w-64">
      <ul className="space-y-1">
        {visible.map((product) => (
          <li key={product} className="text-sm leading-5 break-words text-ink">
            {product}
          </li>
        ))}
      </ul>
      {products.length > 4 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-2 text-[11px] tracking-[0.14em] text-muted uppercase hover:text-ink"
        >
          {open ? "Show less" : `${hidden} more`}
        </button>
      ) : null}
    </div>
  );
}

function InvoiceActions({
  invoice,
  logsOpen,
  onToggleLogs,
  onOpen,
}: {
  invoice: Invoice;
  logsOpen: boolean;
  onToggleLogs: () => void;
  onOpen: (kind: "general" | "delivery") => void;
}) {
  return (
    <div className="w-44">
      <p className="text-sm font-medium text-ink">{invoice.actor}</p>
      <p className="mt-0.5 text-xs text-muted">{formatActedAt(invoice.actedAt)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onOpen("general")}
          className="inline-flex h-7 items-center rounded-md border border-line bg-white px-2 text-[11px] tracking-wide text-ink uppercase"
        >
          General
        </button>
        <button
          type="button"
          onClick={() => onOpen("delivery")}
          className="inline-flex h-7 items-center rounded-md bg-copper-deep px-2 text-[11px] tracking-wide text-white uppercase"
        >
          Delivery
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleLogs}
        className="mt-2 text-[11px] tracking-[0.14em] text-copper-deep uppercase underline-offset-4 hover:underline"
      >
        {logsOpen ? "Hide logs" : "View logs"}
      </button>
      {logsOpen ? (
        <p className="mt-2 rounded-lg bg-paper px-2.5 py-2 text-xs leading-5 text-muted">
          Last touch by {invoice.actor} on {formatActedAt(invoice.actedAt)}. The full paper
          trail opens with the general form.
        </p>
      ) : null}
    </div>
  );
}
