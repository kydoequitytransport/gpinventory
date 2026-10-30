"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Role } from "@/lib/types";
import {
  blankLine,
  formatMoney,
  formatQty,
  lineAmounts,
  priceInvoice,
  type Invoice,
  type InvoiceCatalogProduct,
  type LineItem,
} from "@/lib/invoices";

const siTypes = ["", "Cash", "Charge"];
const terms = ["7 Days", "15 Days", "30 Days", "COD"];

export function InvoiceForm({
  invoice,
  role,
  actorName,
  products,
  onClose,
  onSave,
}: {
  invoice: Invoice;
  role: Role;
  actorName: string;
  products: InvoiceCatalogProduct[];
  onClose: () => void;
  onSave: (invoice: Invoice) => Invoice;
}) {
  const [draft, setDraft] = useState(invoice);
  const [error, setError] = useState("");
  const [sourceName, setSourceName] = useState(invoice.sourceFileName);
  const [productQuery, setProductQuery] = useState<{ id: string; text: string } | null>(null);
  const sourceFile = useRef<File | null>(null);

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

  function commit(next: Invoice) {
    setDraft(priceInvoice(next));
  }

  function updateLine(id: string, patch: Partial<LineItem>) {
    commit({
      ...draft,
      lines: draft.lines.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function pickProduct(id: string, product: InvoiceCatalogProduct) {
    updateLine(id, {
      name: product.name,
      sku: product.sku,
      unit: product.unit || "1 Piece",
      onHand: product.onHand,
      barcode: product.barcode,
      unitPrice: product.sellingPrice,
      serials: product.barcode ? [product.barcode] : [],
      imageUrl: product.imageUrl,
    });
    setProductQuery(null);
  }

  function save() {
    const customer = draft.customer.trim();
    const lines = draft.lines
      .map((item) => ({ ...item, name: item.name.trim(), sku: item.sku.trim() }))
      .filter((item) => item.name);
    if (!customer || lines.length === 0) {
      setError("A draft needs a client and at least one product.");
      return;
    }
    if (lines.some((item) => item.qty <= 0)) {
      setError("Each product needs a quantity above zero.");
      return;
    }
    const now = new Date();
    const stamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19);
    onSave(
      priceInvoice({
        ...draft,
        customer,
        attention: draft.attention.trim() || customer,
        lines,
        actor: actorName,
        preparedBy: draft.preparedBy || actorName,
        actedAt: stamp,
        sourceFileName: sourceName,
      }),
    );
  }

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
        aria-label="SI Manual Invoice"
        className="w-full max-w-[1180px]"
      >
        <div className="mb-3 flex items-center justify-between text-white">
          <p className="text-[11px] tracking-[0.18em] uppercase">New invoice</p>
          <button type="button" onClick={onClose} className="text-sm text-white/80 hover:text-white">
            Close
          </button>
        </div>

        <div className="bg-white text-ink shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="border-b border-line bg-paper px-5 py-3 text-sm font-medium">
            SI Manual Invoice
          </div>

          <div className="border-b border-line px-5 py-4">
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-line bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-medium">Upload for autofill</span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  Photo or PDF. The file stays on this draft and waits for the AI reader.
                  Nothing is sent yet.
                </span>
                {sourceName ? (
                  <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] tracking-wide text-moss uppercase">
                    Parked for AI · {sourceName}
                  </span>
                ) : null}
              </span>
              <span className="inline-flex h-9 items-center rounded-lg bg-ink px-3 text-sm text-white">
                Choose file
              </span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  sourceFile.current = file;
                  setSourceName(file.name);
                  setDraft({ ...draft, sourceFileName: file.name });
                }}
              />
            </label>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-3">
              <Field label="Sold to">
                <input
                  value={draft.customer}
                  onChange={(event) => commit({ ...draft, customer: event.target.value })}
                  placeholder="Client name"
                  className={control}
                />
              </Field>
              <Field label="Deliver to">
                <input
                  value={draft.deliverTo}
                  onChange={(event) => commit({ ...draft, deliverTo: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Attn">
                <input
                  value={draft.attention}
                  onChange={(event) => commit({ ...draft, attention: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Tel">
                <input
                  value={draft.tel}
                  onChange={(event) => commit({ ...draft, tel: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Shipping / delivery fee">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.shippingFee}
                  onChange={(event) =>
                    commit({ ...draft, shippingFee: Number(event.target.value) || 0 })
                  }
                  className={control}
                />
              </Field>
            </div>

            <div className="grid content-start gap-3">
              <Field label="SI no">
                <input
                  value={draft.voucherNo || "Auto-generated on save"}
                  readOnly
                  className={`${control} bg-paper text-muted`}
                />
              </Field>
              <Field label="Sale date">
                <input
                  type="date"
                  value={draft.saleDate}
                  onChange={(event) => commit({ ...draft, saleDate: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Fax">
                <input
                  value={draft.fax}
                  onChange={(event) => commit({ ...draft, fax: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Cut off">
                <input
                  type="date"
                  value={draft.cutOff}
                  onChange={(event) => commit({ ...draft, cutOff: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Terms">
                <select
                  value={draft.terms}
                  onChange={(event) => commit({ ...draft, terms: event.target.value })}
                  className={control}
                >
                  {options(terms, draft.terms).map((item) => (
                    <option key={item || "blank"} value={item}>
                      {item || "—"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Withholding tax (%)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.withholdingPct}
                  onChange={(event) =>
                    commit({ ...draft, withholdingPct: Number(event.target.value) || 0 })
                  }
                  className={control}
                />
              </Field>
            </div>

            <div className="grid content-start gap-3">
              <Field label="SI type">
                <select
                  value={draft.siType}
                  onChange={(event) => commit({ ...draft, siType: event.target.value })}
                  className={control}
                >
                  {siTypes.map((item) => (
                    <option key={item || "blank"} value={item}>
                      {item || "Select an item"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="PO no">
                <input
                  value={draft.poNo}
                  onChange={(event) => commit({ ...draft, poNo: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="PR no">
                <input
                  value={draft.prNo}
                  onChange={(event) => commit({ ...draft, prNo: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="DR no">
                <input
                  value={draft.drNo}
                  onChange={(event) => commit({ ...draft, drNo: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Sales representative">
                <input
                  value={draft.salesRep}
                  onChange={(event) => commit({ ...draft, salesRep: event.target.value })}
                  className={control}
                />
              </Field>
            </div>

            <div className="grid content-start gap-3">
              <Field label="Tax">
                <select
                  value={draft.vatCode}
                  onChange={(event) =>
                    commit({ ...draft, vatCode: event.target.value as "E" | "VE" })
                  }
                  className={control}
                >
                  <option value="E">VAT exempted (0%)</option>
                  <option value="VE">VAT 12%</option>
                </select>
              </Field>
              <Field label="Vat code">
                <input value={draft.vatCode} readOnly className={`${control} bg-paper`} />
              </Field>
              <Field label="Branch">
                <input
                  value={draft.branch}
                  onChange={(event) => commit({ ...draft, branch: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="QT no">
                <input
                  value={draft.qtNo}
                  onChange={(event) => commit({ ...draft, qtNo: event.target.value })}
                  className={control}
                />
              </Field>
              <Field label="Referred by">
                <input
                  value={draft.referredBy}
                  onChange={(event) => commit({ ...draft, referredBy: event.target.value })}
                  className={control}
                />
              </Field>
            </div>
          </div>

          <div className="px-5 pb-5">
            <p className="text-sm font-medium text-moss">Order details</p>
            <p className="mt-1 text-xs text-muted">
              Saved lines are replaced by editing them here, then saving the draft again.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead>
                  <tr className="bg-paper text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                    <th className="border border-line px-2 py-2 font-medium">#</th>
                    <th className="border border-line px-2 py-2 font-medium" />
                    <th className="border border-line px-2 py-2 font-medium">Product</th>
                    <th className="border border-line px-2 py-2 font-medium">Quantity</th>
                    <th className="border border-line px-2 py-2 font-medium">Code / serial</th>
                    <th className="border border-line px-2 py-2 font-medium">Price</th>
                    <th className="border border-line px-2 py-2 font-medium">% Discount</th>
                    <th className="border border-line px-2 py-2 font-medium">Discount amt</th>
                    <th className="border border-line px-2 py-2 font-medium">Gross amt</th>
                    <th className="border border-line px-2 py-2 font-medium">Vat amt</th>
                    <th className="border border-line px-2 py-2 font-medium">Net amt</th>
                    <th className="border border-line px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((item, index) => {
                    const amounts =
                      item.unitPrice == null ? null : lineAmounts(item, draft.vatCode);
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="border border-line px-2 py-2 tabular-nums">{index + 1}</td>
                        <td className="border border-line px-2 py-2 align-middle">
                          {item.imageUrl ? (
                            // The address was copied from the product when this line was chosen.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-24 w-auto max-w-48 rounded object-contain"
                            />
                          ) : null}
                        </td>
                        <td className="border border-line px-2 py-2">
                          <input
                            value={productQuery?.id === item.id ? productQuery.text : item.name}
                            onChange={(event) => setProductQuery({ id: item.id, text: event.target.value })}
                            onFocus={() => setProductQuery({ id: item.id, text: item.name })}
                            onBlur={() => setProductQuery(null)}
                            placeholder="Search for product"
                            className={control}
                          />
                          {productQuery?.id === item.id ? (
                            <ProductMatches
                              products={products}
                              query={productQuery.text}
                              onPick={(product) => pickProduct(item.id, product)}
                            />
                          ) : null}
                          <dl className="mt-2 space-y-1 text-[10px] tracking-wide text-muted uppercase">
                            <div className="break-words">Name: {item.name || "—"}</div>
                            <div className="flex items-center gap-2 normal-case">
                              SKU
                              <input
                                value={item.sku}
                                onChange={(event) => updateLine(item.id, { sku: event.target.value })}
                                className="h-6 w-24 border-b border-line bg-transparent text-ink outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 normal-case">
                              Unit
                              <input
                                value={item.unit}
                                onChange={(event) => updateLine(item.id, { unit: event.target.value })}
                                className="h-6 w-16 border-b border-line bg-transparent text-ink outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 normal-case">
                              On hand
                              <input
                                type="number"
                                value={item.onHand ?? ""}
                                onChange={(event) =>
                                  updateLine(item.id, {
                                    onHand: event.target.value === "" ? null : Number(event.target.value),
                                  })
                                }
                                className="h-6 w-16 border-b border-line bg-transparent text-ink outline-none"
                              />
                            </div>
                          </dl>
                        </td>
                        <td className="border border-line px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={(event) =>
                              updateLine(item.id, { qty: Number(event.target.value) || 0 })
                            }
                            className={`${control} w-20 text-right`}
                          />
                        </td>
                        <td className="border border-line px-2 py-2">
                          <input
                            value={item.barcode}
                            onChange={(event) => {
                              const barcode = event.target.value;
                              updateLine(item.id, {
                                barcode,
                                serials: barcode.trim() ? [barcode.trim()] : [],
                              });
                            }}
                            className={`${control} w-28`}
                          />
                        </td>
                        <td className="border border-line px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice ?? ""}
                            onChange={(event) => {
                              const raw = event.target.value;
                              updateLine(item.id, { unitPrice: raw === "" ? null : Number(raw) });
                            }}
                            className={`${control} w-24 text-right`}
                          />
                        </td>
                        <td className="border border-line px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.discountPct}
                            onChange={(event) =>
                              updateLine(item.id, { discountPct: Number(event.target.value) || 0 })
                            }
                            className={`${control} w-20 text-right`}
                          />
                        </td>
                        <MoneyCell value={amounts?.discountAmt} />
                        <MoneyCell value={amounts?.gross} />
                        <MoneyCell value={amounts?.vatAmt} />
                        <MoneyCell value={amounts?.netAmt} />
                        <td className="border border-line px-2 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                commit({
                                  ...draft,
                                  lines: [
                                    ...draft.lines,
                                    { ...blankLine(), qty: 0, unitPrice: 0 },
                                  ],
                                })
                              }
                              className="grid size-7 place-items-center rounded-md bg-moss text-lg leading-none text-white"
                              aria-label="Add product row"
                            >
                              +
                            </button>
                            {draft.lines.length > 1 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  commit({
                                    ...draft,
                                    lines: draft.lines.filter((row) => row.id !== item.id),
                                  })
                                }
                                className="px-1 text-[10px] tracking-wide text-danger uppercase"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:justify-end">
              <label className="grid min-h-36 flex-1 gap-2 bg-paper p-3 text-xs text-muted">
                Remark
                <textarea
                  value={draft.internalRemark}
                  onChange={(event) => setDraft({ ...draft, internalRemark: event.target.value })}
                  className="min-h-24 resize-none bg-transparent text-sm text-ink outline-none"
                />
              </label>
              <dl className="grid w-full grid-cols-[1fr_auto] gap-y-2 border border-line p-3 text-sm lg:w-72">
                <dt className="text-muted">Total qty</dt>
                <dd className="text-right tabular-nums">{formatQty(draft.totalQty)}</dd>
                <dt className="text-muted">Item discount</dt>
                <dd className="text-right tabular-nums">{formatMoney(draft.itemDiscount)}</dd>
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-right tabular-nums">{formatMoney(draft.subtotal)}</dd>
                <dt className="text-muted">VAT</dt>
                <dd className="text-right tabular-nums">{formatMoney(draft.vat)}</dd>
                <dt className="text-muted">W/holding amount</dt>
                <dd className="text-right tabular-nums">{formatMoney(draft.withholding)}</dd>
                <dt className="font-medium">Total amount</dt>
                <dd className="text-right font-semibold tabular-nums">{formatMoney(draft.net)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-ink px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/70">
            {error
              ? error
              : role === "admin"
                ? "Save the draft, then approve or void it from the invoice paper."
                : "You can write this draft. Approval and void stay with an admin."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-white/20 px-4 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="h-10 rounded-lg bg-copper-deep px-4 text-sm font-medium text-white"
            >
              Save draft
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

const control =
  "h-9 w-full rounded-md border border-line bg-white px-2 text-sm text-ink outline-none focus:border-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[11px] text-muted">
      {label}
      {children}
    </label>
  );
}

function MoneyCell({ value }: { value: number | undefined }) {
  return (
    <td className="border border-line bg-paper px-2 py-2 text-right text-sm tabular-nums">
      {value == null ? "—" : formatMoney(value)}
    </td>
  );
}

function options(list: string[], current: string) {
  return current && !list.includes(current) ? [current, ...list] : list;
}

function ProductMatches({
  products,
  query,
  onPick,
}: {
  products: InvoiceCatalogProduct[];
  query: string;
  onPick: (product: InvoiceCatalogProduct) => void;
}) {
  const needle = query.trim().toLowerCase();
  const matches = products
    .filter((product) => {
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle)
      );
    })
    .slice(0, 8);

  if (matches.length === 0) {
    return <p className="mt-2 text-xs text-muted normal-case">No product matches that search.</p>;
  }

  return (
    <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-line bg-white">
      {matches.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(product)}
            className="flex w-full items-start justify-between gap-3 px-2 py-2 text-left text-xs normal-case hover:bg-paper"
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" className="h-14 w-auto max-w-24 shrink-0 rounded object-contain" />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-5 break-words text-ink">{product.name}</span>
              <span className="text-muted">
                {product.sku || "No SKU"}
                {product.unit ? ` · ${product.unit}` : ""}
                {product.onHand == null ? "" : ` · ${formatQty(product.onHand)} on hand`}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-ink">{formatMoney(product.sellingPrice)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
