"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { savePurchaseRequest } from "@/app/actions/purchase-requests";
import { nextPrNo, suggestedReorder } from "@/lib/purchase-math";
import { stockStatus } from "@/lib/stock-status";
import type { PurchaseRequest, RequestProduct } from "@/lib/purchase-requests";

type DraftLine = {
  key: string;
  productId: number | null;
  query: string;
  qtySold: number;
  leadTimeDays: number;
  suggestedQty: number;
  qtyRequest: number;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15";

const countFormat = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PurchaseRequestForm({
  products,
  takenPrNos,
  today,
  request,
}: {
  products: RequestProduct[];
  takenPrNos: string[];
  today: string;
  request?: PurchaseRequest;
}) {
  const [state, action, pending] = useActionState(savePurchaseRequest, null);
  const [prNo, setPrNo] = useState(request?.prNo ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    request && request.lines.length > 0
      ? request.lines.map((line) => ({
          key: `saved-${line.id}`,
          productId: line.productId,
          query: line.productName,
          qtySold: line.qtySold,
          leadTimeDays: line.leadTimeDays,
          suggestedQty: line.suggestedQty,
          qtyRequest: line.qtyRequest,
        }))
      : [blankLine("1")],
  );
  const nextKey = useRef(request ? request.lines.length + 1 : 2);

  const payload = lines
    .filter((line) => line.productId)
    .map((line) => ({
      productId: line.productId,
      qtySold: line.qtySold,
      leadTimeDays: line.leadTimeDays,
      suggestedQty: line.suggestedQty,
      qtyRequest: line.qtyRequest,
    }));

  function patchLine(key: string, patch: Partial<DraftLine>, recompute: boolean) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (!recompute) return next;
        const product = products.find((item) => item.id === next.productId);
        return {
          ...next,
          suggestedQty: next.productId
            ? suggestedReorder(next.qtySold, next.leadTimeDays, product?.minOnHand ?? null, product?.onHand ?? null)
            : 0,
        };
      }),
    );
  }

  function addLine() {
    const key = String(nextKey.current);
    nextKey.current += 1;
    setLines((current) => [...current, blankLine(key)]);
  }

  function addForRestock() {
    setLines((current) => {
      const used = new Set(current.flatMap((line) => (line.productId ? [line.productId] : [])));
      const room = 40 - current.filter((line) => line.productId).length;
      const added = products
        .filter((product) => forRestock(product) && !used.has(product.id))
        .slice(0, Math.max(0, room))
        .map((product) => {
          const key = String(nextKey.current);
          nextKey.current += 1;
          return lineForProduct(product, key);
        });
      if (added.length === 0) return current;
      return [...current.filter((line) => line.productId), ...added];
    });
  }

  const listedIds = new Set(lines.flatMap((line) => (line.productId ? [line.productId] : [])));
  const restockLeft = products.filter((product) => forRestock(product) && !listedIds.has(product.id)).length;

  function removeLine(key: string) {
    setLines((current) => {
      const next = current.filter((line) => line.key !== key);
      return next.length > 0 ? next : [blankLine(key)];
    });
  }

  return (
    <form action={action} className="desk-card mt-8 rounded-[28px] p-5 sm:p-6">
      {request ? <input type="hidden" name="id" value={request.id} /> : null}
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPrNo(nextPrNo(takenPrNos, today))}
            className="w-fit text-left text-sm text-ink"
          >
            PR No. <span className="text-muted">(Click to Auto-Generate)</span>
          </button>
          <input
            name="pr_no"
            value={prNo}
            onChange={(event) => setPrNo(event.target.value)}
            maxLength={40}
            required
            aria-label="PR No."
            className={fieldClass}
          />
        </div>
        <label className="grid gap-2 text-sm">
          PR Date
          <input name="pr_date" type="date" required defaultValue={request?.prDate ?? today} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Ship Date From
          <input
            name="ship_date_from"
            type="date"
            required
            defaultValue={request?.shipDateFrom ?? today}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-2 text-sm">
          Ship Date To
          <input
            name="ship_date_to"
            type="date"
            required
            defaultValue={request?.shipDateTo ?? today}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-copper-deep">Request Details</h2>
        <button
          type="button"
          onClick={addForRestock}
          disabled={restockLeft === 0}
          className="inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white hover:bg-[#9b0c18] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add for re-stock{restockLeft > 0 ? ` (${restockLeft})` : ""}
        </button>
      </div>
      <div className="mt-3 sm:overflow-x-auto">
        <table className="gp-mobile-rows w-full min-w-[1080px] border-t border-line text-left text-sm">
          <thead className="text-[11px] tracking-[0.08em] text-muted uppercase">
            <tr>
              <th className="w-10 px-2 py-3 font-medium">#</th>
              <th className="min-w-64 px-2 py-3 font-medium">Product Details</th>
              <th className="w-28 px-2 py-3 font-medium">Quantity Sold</th>
              <th className="w-32 px-2 py-3 font-medium">Del. Lead Time (Days)</th>
              <th className="w-44 px-2 py-3 font-medium">
                Suggested Re-order Qty
                <span className="mt-1 block text-[10px] tracking-normal normal-case">
                  Qty Sold × Lead time + Min Threshold − On-hand
                </span>
              </th>
              <th className="w-36 px-2 py-3 font-medium">Last Delivery Date</th>
              <th className="w-36 px-2 py-3 font-medium">Last Delivery Quantity</th>
              <th className="w-28 px-2 py-3 font-medium">Qty Request</th>
              <th className="w-28 px-2 py-3 font-medium">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const product = products.find((item) => item.id === line.productId) ?? null;
              return (
                <tr key={line.key} className="border-t border-line align-top">
                  <td className="px-2 py-3 text-muted" data-label="#">
                    {index + 1}
                  </td>
                  <td className="px-2 py-3" data-label="Product details">
                    <ProductSearch
                      products={products}
                      query={line.query}
                      onQuery={(query) => patchLine(line.key, { query, productId: null }, true)}
                      onPick={(picked) => {
                        const suggestedQty = suggestedReorder(
                          line.qtySold,
                          line.leadTimeDays,
                          picked.minOnHand,
                          picked.onHand,
                        );
                        patchLine(
                          line.key,
                          {
                            productId: picked.id,
                            query: picked.name,
                            suggestedQty,
                            qtyRequest: line.qtyRequest > 0 ? line.qtyRequest : Math.max(0, suggestedQty),
                          },
                          false,
                        );
                      }}
                    />
                    <dl className="mt-2 space-y-0.5 text-xs text-muted">
                      <div>SKU: {product?.sku || "—"}</div>
                      <div>UOM: {product?.uom || "—"}</div>
                      <div>On-hand Count: {countLabel(product ? product.onHand : null)}</div>
                      <div>Min Threshold: {countLabel(product ? product.minOnHand : null)}</div>
                      <div>Max Threshold: —</div>
                    </dl>
                  </td>
                  <td className="px-2 py-3" data-label="Quantity sold">
                    <QtyInput
                      label={`Quantity sold on row ${index + 1}`}
                      value={line.qtySold}
                      min={0}
                      onChange={(qtySold) => patchLine(line.key, { qtySold }, true)}
                    />
                  </td>
                  <td className="px-2 py-3" data-label="Del. lead time (days)">
                    <QtyInput
                      label={`Lead time on row ${index + 1}`}
                      value={line.leadTimeDays}
                      min={0}
                      onChange={(leadTimeDays) =>
                        patchLine(line.key, { leadTimeDays: Math.round(leadTimeDays) }, true)
                      }
                    />
                  </td>
                  <td className="px-2 py-3" data-label="Suggested re-order qty">
                    <QtyInput
                      label={`Suggested reorder on row ${index + 1}`}
                      value={line.suggestedQty}
                      onChange={(suggestedQty) => patchLine(line.key, { suggestedQty }, false)}
                    />
                  </td>
                  <td className="px-2 py-3" data-label="Last delivery date">
                    <input
                      type="date"
                      disabled
                      aria-label={`Last delivery date on row ${index + 1}`}
                      className={`${fieldClass} bg-paper text-muted`}
                    />
                  </td>
                  <td className="px-2 py-3" data-label="Last delivery quantity">
                    <input
                      type="number"
                      disabled
                      aria-label={`Last delivery quantity on row ${index + 1}`}
                      className={`${fieldClass} bg-paper text-muted`}
                    />
                  </td>
                  <td className="px-2 py-3" data-label="Qty request">
                    <QtyInput
                      label={`Quantity request on row ${index + 1}`}
                      value={line.qtyRequest}
                      min={0}
                      onChange={(qtyRequest) => patchLine(line.key, { qtyRequest }, false)}
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label="Add a row"
                        onClick={addLine}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-moss text-lg text-white"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() => removeLine(line.key)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-danger text-white"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <label className="mt-6 grid gap-2 text-sm">
        Notes
        <textarea
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={request?.notes ?? ""}
          className="w-full rounded-2xl border border-line px-3 py-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15"
        />
      </label>

      {state?.error ? <p className="mt-4 text-sm text-danger">{state.error}</p> : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href="/inventory/purchase-requests"
          className="inline-flex h-11 items-center rounded-2xl border border-line px-4 text-sm text-ink"
        >
          ← Back
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center rounded-2xl bg-ink px-5 text-sm text-white hover:bg-black disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function ProductSearch({
  products,
  query,
  onQuery,
  onPick,
}: {
  products: RequestProduct[];
  query: string;
  onQuery: (query: string) => void;
  onPick: (product: RequestProduct) => void;
}) {
  const listId = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, width: 280 });
  const needle = query.trim().toLowerCase();
  const matches = (needle
    ? products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(needle))
    : products
  ).slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return (
    <div ref={anchor}>
      <input
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search for product"
        autoComplete="off"
        onChange={(event) => {
          onQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={fieldClass}
      />
      {open && matches.length > 0
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-50 max-h-64 overflow-y-auto rounded-2xl border border-line bg-white py-1 shadow-lg"
            >
              {matches.map((product) => (
                <li key={product.id} role="option" aria-selected={query === product.name}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onPick(product);
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                  >
                    <span className="block font-medium">{product.name}</span>
                    <span className="text-xs text-muted">{product.sku || "No SKU"}</span>
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function QtyInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      step="1"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => {
        const next = event.target.value === "" ? 0 : Number(event.target.value);
        if (!Number.isFinite(next)) return;
        onChange(next);
      }}
      className={fieldClass}
    />
  );
}

function forRestock(product: RequestProduct) {
  if (product.onHand === null) return false;
  return stockStatus({ onHand: product.onHand, minOnHand: product.minOnHand }) === "For Re-stock";
}

function lineForProduct(product: RequestProduct, key: string): DraftLine {
  const suggestedQty = suggestedReorder(0, 1, product.minOnHand, product.onHand);
  return {
    key,
    productId: product.id,
    query: product.name,
    qtySold: 0,
    leadTimeDays: 1,
    suggestedQty,
    qtyRequest: Math.max(0, suggestedQty),
  };
}

function blankLine(key: string): DraftLine {
  return {
    key,
    productId: null,
    query: "",
    qtySold: 0,
    leadTimeDays: 1,
    suggestedQty: 0,
    qtyRequest: 0,
  };
}

function countLabel(value: number | null) {
  if (value === null) return "—";
  return countFormat.format(value);
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path
        d="M3 4.5h10M6.5 4.5V3.2A.7.7 0 0 1 7.2 2.5h1.6a.7.7 0 0 1 .7.7v1.3M4.5 4.5l.6 8.1a.8.8 0 0 0 .8.7h4.2a.8.8 0 0 0 .8-.7l.6-8.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
