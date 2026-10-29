"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";
import {
  blankLine,
  formatMoney,
  formatPaperDate,
  formatPaperDateTime,
  formatQty,
  priceInvoice,
  shop,
  type Invoice,
  type LineItem,
} from "@/lib/invoices";

export function InvoicePaper({
  invoice,
  kind,
  role,
  actorName,
  onClose,
  onSave,
  onApprove,
  onVoid,
  onEdit,
}: {
  invoice: Invoice;
  kind: "general" | "delivery";
  role: Role;
  actorName: string;
  onClose: () => void;
  onSave: (invoice: Invoice) => Invoice;
  onApprove: (invoice: Invoice) => void;
  onVoid: (invoice: Invoice) => void;
  onEdit?: () => void;
}) {
  const [draft, setDraft] = useState(invoice);
  const [editing, setEditing] = useState(invoice.id === "");
  const [error, setError] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);
  const canWrite = draft.status === "draft";
  const isAdmin = role === "admin";
  const canApprove = isAdmin && kind === "general" && canWrite && draft.id !== "";
  const canVoid =
    isAdmin &&
    kind === "general" &&
    draft.id !== "" &&
    (draft.status === "draft" || draft.status === "approved");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setDraft((current) =>
      priceInvoice({
        ...current,
        lines: current.lines.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }),
    );
  }

  function save() {
    const customer = draft.customer.trim();
    const lines = draft.lines
      .map((item) => ({ ...item, name: item.name.trim(), sku: item.sku.trim() }))
      .filter((item) => item.name);
    if (!customer || lines.length === 0) {
      setError("A draft needs a customer and at least one piece of equipment.");
      return;
    }
    const now = new Date();
    const stamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19);
    const saved = onSave(
      priceInvoice({
        ...draft,
        customer,
        attention: draft.attention.trim() || customer,
        lines,
        actor: actorName,
        preparedBy: draft.preparedBy || actorName,
        actedAt: stamp,
      }),
    );
    setDraft(saved);
    setEditing(false);
    setError("");
  }

  const title = kind === "general" ? "General form" : "Delivery receipt";
  const statusLabel =
    draft.status === "draft" ? "Pending" : draft.status === "voided" ? "Void" : "Approved";
  const remaining = Math.max(draft.net - draft.paid, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/75">
      <div
        className="flex min-h-full items-start justify-center px-4 py-8"
        onMouseDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const scroller = event.currentTarget.parentElement;
          const start = scroller?.scrollTop ?? 0;
          function onUp() {
            window.removeEventListener("mouseup", onUp);
            if ((scroller?.scrollTop ?? 0) !== start) return;
            onClose();
          }
          window.addEventListener("mouseup", onUp);
        }}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[860px]"
      >
        <div className="mb-3 flex items-center justify-between text-white">
          <p className="text-[11px] tracking-[0.18em] uppercase">
            {kind === "general" ? "Invoice" : "Delivery form"}
          </p>
          <button type="button" onClick={onClose} className="text-sm text-white/80 hover:text-white">
            Close
          </button>
        </div>

        <article className="min-h-[980px] bg-white px-8 py-10 text-ink shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:px-12">
          <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-6">
            <div>
              <p className="text-lg font-semibold tracking-tight">{shop.name}</p>
              <p className="text-sm font-medium tracking-[0.14em] uppercase">{shop.country}</p>
              <p className="mt-3 max-w-xs text-sm leading-5 text-neutral-600">{shop.address}</p>
              <p className="text-sm text-neutral-600">Contact: {shop.contact}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-medium tracking-tight text-neutral-700">{title}</h2>
              <p className="mt-4 text-sm">
                Voucher no: <span className="font-semibold">{draft.voucherNo || "—"}</span>
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                Cut-off date: {formatPaperDate(draft.actedAt)}
              </p>
              <p className="text-sm text-neutral-600">
                Date generated: {formatPaperDateTime(draft.actedAt)}
              </p>
              <p className="mt-3 text-sm font-semibold tracking-[0.16em] uppercase">
                Status:{" "}
                <span
                  className={
                    draft.status === "voided"
                      ? "text-danger"
                      : draft.status === "approved"
                        ? "text-moss"
                        : "text-[#0f8f7a]"
                  }
                >
                  {statusLabel}
                </span>
              </p>
            </div>
          </header>

          <section className="border-b border-neutral-200 py-6">
            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <PaperField
                  label="Customer"
                  value={draft.customer}
                  onChange={(customer) => setDraft({ ...draft, customer })}
                />
                <PaperField
                  label="Attention"
                  value={draft.attention}
                  onChange={(attention) => setDraft({ ...draft, attention })}
                />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold">{draft.customer || "Customer"}</h3>
                <p className="mt-2 text-sm text-neutral-600">{draft.attention || draft.customer}</p>
              </>
            )}
          </section>

          {kind === "general" ? (
            <GeneralTable
              invoice={draft}
              editing={editing}
              onChange={updateLine}
              onAdd={() => setDraft({ ...draft, lines: [...draft.lines, blankLine()] })}
              onRemove={(id) =>
                setDraft(
                  priceInvoice({
                    ...draft,
                    lines: draft.lines.filter((item) => item.id !== id),
                  }),
                )
              }
              onVat={(vatCode) => setDraft(priceInvoice({ ...draft, vatCode }))}
            />
          ) : (
            <DeliveryTable
              invoice={draft}
              canWrite={canWrite}
              onSerial={(id, serial) => {
                const next = {
                  ...draft,
                  lines: draft.lines.map((item) =>
                    item.id === id ? { ...item, serials: [...item.serials, serial] } : item,
                  ),
                };
                if (!next.id || next.status !== "draft") {
                  setDraft(next);
                  return;
                }
                setDraft(onSave(next));
              }}
            />
          )}

          <section className="mt-8">
            <p className="text-sm font-semibold">Note:</p>
            {editing ? (
              <textarea
                value={draft.internalRemark}
                onChange={(event) => setDraft({ ...draft, internalRemark: event.target.value })}
                rows={2}
                className="mt-2 w-full resize-none border-b border-neutral-300 bg-transparent text-sm outline-none"
              />
            ) : (
              <p className="mt-2 min-h-8 text-sm text-neutral-700">
                {draft.internalRemark || ""}
              </p>
            )}
          </section>

          {kind === "general" ? (
            <dl className="mt-6 ml-auto grid w-full max-w-xs grid-cols-2 gap-y-2 text-sm">
              <dt className="text-neutral-600">Subtotal:</dt>
              <dd className="text-right tabular-nums">{formatMoney(draft.subtotal)}</dd>
              <dt className="text-neutral-600">Total amount:</dt>
              <dd className="text-right font-medium tabular-nums">{formatMoney(draft.net)}</dd>
              <dt className="text-[#0f8f7a]">Paid amount:</dt>
              <dd className="text-right text-[#0f8f7a] tabular-nums">{formatMoney(draft.paid)}</dd>
              <dt className="text-danger">Remaining bal:</dt>
              <dd className="text-right font-semibold text-danger tabular-nums">
                {formatMoney(remaining)}
              </dd>
            </dl>
          ) : null}

          <footer className="mt-16 grid grid-cols-3 gap-6 text-sm">
            <Signature label="Prepared by:" name={draft.preparedBy} />
            <Signature label="Approved by:" name={draft.approvedBy} />
            <Signature label="Received by:" name="" />
          </footer>
        </article>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-ink px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/70">
            {error ? <p className="text-[#ffb4b8]">{error}</p> : null}
            {canWrite && !isAdmin && kind === "general" ? (
              <p>You can write this draft. Approval and void stay with an admin.</p>
            ) : null}
            {(canApprove || canVoid) && !error ? (
              <p>Approve sends it forward. Void pulls it off the floor.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canWrite && kind === "general" && !editing ? (
              <button
                type="button"
                onClick={() => (onEdit ? onEdit() : setEditing(true))}
                className="h-10 rounded-lg border border-white/20 px-4 text-sm"
              >
                Edit draft
              </button>
            ) : null}
            {editing ? (
              <button
                type="button"
                onClick={save}
                className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-ink"
              >
                Save draft
              </button>
            ) : null}
            {canVoid && confirmVoid ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmVoid(false)}
                  className="h-10 rounded-lg border border-white/20 px-4 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onVoid(draft)}
                  className="h-10 rounded-lg bg-danger px-4 text-sm font-medium text-white"
                >
                  Confirm void
                </button>
              </>
            ) : null}
            {canVoid && !confirmVoid ? (
              <button
                type="button"
                onClick={() => setConfirmVoid(true)}
                className="h-10 rounded-lg border border-[#ffb4b8] px-4 text-sm text-[#ffb4b8]"
              >
                Void
              </button>
            ) : null}
            {canApprove && !confirmVoid ? (
              <button
                type="button"
                onClick={() => onApprove(priceInvoice({ ...draft, approvedBy: actorName }))}
                className="h-10 rounded-lg bg-copper-deep px-4 text-sm font-medium text-white"
              >
                Approve
              </button>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function GeneralTable({
  invoice,
  editing,
  onChange,
  onAdd,
  onRemove,
  onVat,
}: {
  invoice: Invoice;
  editing: boolean;
  onChange: (id: string, patch: Partial<LineItem>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onVat: (code: "E" | "VE") => void;
}) {
  return (
    <div className="pt-6">
      {editing ? (
        <label className="mb-3 flex items-center gap-2 text-xs tracking-[0.14em] text-neutral-500 uppercase">
          VAT
          <select
            value={invoice.vatCode}
            onChange={(event) => onVat(event.target.value as "E" | "VE")}
            className="h-8 rounded border border-neutral-300 bg-white px-2 text-sm tracking-normal text-ink normal-case"
          >
            <option value="E">Exempt</option>
            <option value="VE">12% VAT</option>
          </select>
        </label>
      ) : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100 text-left text-[11px] tracking-[0.14em] text-neutral-500 uppercase">
            <th className="border border-neutral-200 px-2 py-2 font-medium">#</th>
            <th className="border border-neutral-200 px-2 py-2 font-medium">Item desc</th>
            <th className="border border-neutral-200 px-2 py-2 text-right font-medium">Qty</th>
            <th className="border border-neutral-200 px-2 py-2 text-right font-medium">Unit price</th>
            <th className="border border-neutral-200 px-2 py-2 text-right font-medium">Extended</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((item, index) => {
            const extended = item.unitPrice == null ? null : item.qty * item.unitPrice;
            return (
              <tr key={item.id}>
                <td className="border border-neutral-200 px-2 py-2 tabular-nums">{index + 1}</td>
                <td className="border border-neutral-200 px-2 py-2">
                  {editing ? (
                    <input
                      value={item.name}
                      onChange={(event) => onChange(item.id, { name: event.target.value })}
                      className="w-full bg-transparent outline-none"
                    />
                  ) : (
                    item.name
                  )}
                </td>
                <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
                  {editing ? (
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(event) =>
                        onChange(item.id, { qty: Math.max(1, Number(event.target.value) || 1) })
                      }
                      className="w-16 bg-transparent text-right outline-none"
                    />
                  ) : (
                    item.qty
                  )}
                </td>
                <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        onChange(item.id, { unitPrice: raw === "" ? null : Number(raw) });
                      }}
                      className="w-24 bg-transparent text-right outline-none"
                    />
                  ) : item.unitPrice == null ? (
                    "—"
                  ) : (
                    formatMoney(item.unitPrice)
                  )}
                </td>
                <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
                  <span className="inline-flex items-center justify-end gap-2">
                    {extended == null ? "—" : formatMoney(extended)}
                    {editing && invoice.lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-[10px] tracking-wide text-danger uppercase"
                      >
                        Remove
                      </button>
                    ) : null}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr className="font-semibold">
            <td className="border border-neutral-200 px-2 py-2" colSpan={2}>
              Total
            </td>
            <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
              {formatQty(invoice.totalQty)}
            </td>
            <td className="border border-neutral-200 px-2 py-2" />
            <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
              {formatMoney(invoice.subtotal)}
            </td>
          </tr>
        </tbody>
      </table>
      {editing ? (
        <button type="button" onClick={onAdd} className="mt-3 text-xs tracking-[0.14em] uppercase">
          Add equipment
        </button>
      ) : null}
      <p className="mt-3 text-xs text-neutral-500">
        VAT {formatMoney(invoice.vat)} ({invoice.vatCode}) · Gross {formatMoney(invoice.gross)}
      </p>
    </div>
  );
}

function DeliveryTable({
  invoice,
  canWrite,
  onSerial,
}: {
  invoice: Invoice;
  canWrite: boolean;
  onSerial: (id: string, serial: string) => void;
}) {
  return (
    <table className="mt-6 w-full border-collapse text-sm">
      <thead>
        <tr className="bg-neutral-100 text-left text-[11px] tracking-[0.14em] text-neutral-500 uppercase">
          <th className="border border-neutral-200 px-2 py-2 font-medium">#</th>
          <th className="border border-neutral-200 px-2 py-2 font-medium">Item</th>
          <th className="border border-neutral-200 px-2 py-2 font-medium">SKU</th>
          <th className="border border-neutral-200 px-2 py-2 font-medium">Barcode</th>
          <th className="border border-neutral-200 px-2 py-2 text-right font-medium">Qty</th>
          <th className="border border-neutral-200 px-2 py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {invoice.lines.map((item, index) => (
          <tr key={item.id}>
            <td className="border border-neutral-200 px-2 py-2 tabular-nums">{index + 1}</td>
            <td className="border border-neutral-200 px-2 py-2">
              {item.name}
              {item.serials.length > 0 ? (
                <p className="mt-1 text-xs text-neutral-500">S/N {item.serials.join(", ")}</p>
              ) : null}
            </td>
            <td className="border border-neutral-200 px-2 py-2">{item.sku || "—"}</td>
            <td className="border border-neutral-200 px-2 py-2">{item.barcode || ""}</td>
            <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
              {item.qty}
            </td>
            <td className="border border-neutral-200 px-2 py-2 text-right">
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => {
                    const serial = window.prompt("Serial number");
                    if (!serial?.trim()) return;
                    onSerial(item.id, serial.trim());
                  }}
                  className="rounded bg-[#0f8f7a] px-2 py-1 text-[11px] font-medium text-white"
                >
                  Add S/N
                </button>
              ) : null}
            </td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="border border-neutral-200 px-2 py-2" colSpan={4}>
            Total
          </td>
          <td className="border border-neutral-200 px-2 py-2 text-right tabular-nums">
            {formatQty(invoice.totalQty)}
          </td>
          <td className="border border-neutral-200" />
        </tr>
      </tbody>
    </table>
  );
}

function PaperField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs tracking-[0.14em] text-neutral-500 uppercase">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 border-b border-neutral-300 bg-transparent text-base tracking-normal text-ink normal-case outline-none"
      />
    </label>
  );
}

function Signature({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <p className="min-h-6 font-medium">{name}</p>
      <p className="text-neutral-500 italic">{label}</p>
    </div>
  );
}
