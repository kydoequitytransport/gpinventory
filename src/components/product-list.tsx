"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { deleteProduct, saveProduct } from "@/app/actions/catalog";
import { CloudinaryField } from "@/components/cloudinary-field";
import { shortDate } from "@/lib/format";
import type { Category, Product, Role } from "@/lib/types";

const fieldClass =
  "h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-[#98a0aa] focus:border-copper focus:ring-4 focus:ring-copper/15";

const money = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qty = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function ProductList({
  categories,
  products,
  role,
}: {
  categories: Category[];
  products: Product[];
  role: Role;
}) {
  const [tab, setTab] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState<"closed" | "new" | number>("closed");
  const [saveState, saveAction, savePending] = useActionState(saveProduct, null);
  const [seenState, setSeenState] = useState(saveState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProduct, null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const admin = role === "admin";

  if (saveState?.message && saveState !== seenState) {
    setSeenState(saveState);
    setFormMode("closed");
  }

  const tabs = categories.filter((category) => category.shownInList);
  const activeTab = typeof tab === "number" && tabs.some((category) => category.id === tab) ? tab : "all";

  const needle = query.trim().toLowerCase();
  const visible = products.filter((product) => {
    if (activeTab !== "all" && product.categoryId !== activeTab) return false;
    if (!needle) return true;
    return [product.name, product.sku, product.barcode, product.categoryName, product.supplier, String(product.id)]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const editing = typeof formMode === "number" ? products.find((product) => product.id === formMode) : undefined;
  const showForm = admin && (formMode === "new" || editing !== undefined);

  return (
    <div className="mt-8">
      {saveState?.message ? (
        <p className="mb-4 rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">
          {saveState.message}
        </p>
      ) : null}
      {saveState?.error && !showForm ? (
        <p className="mb-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {saveState.error}
        </p>
      ) : null}
      {deleteState?.error ? (
        <p className="mb-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {deleteState.error}
        </p>
      ) : null}
      {deleteState?.message ? (
        <p className="mb-4 rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">
          {deleteState.message}
        </p>
      ) : null}

      {showForm ? (
        <ProductForm
          key={editing?.id ?? "new"}
          categories={categories}
          product={editing}
          pending={savePending}
          error={saveState?.error}
          action={saveAction}
          onCancel={() => setFormMode("closed")}
        />
      ) : null}

      <section className="desk-card overflow-hidden rounded-[28px]">
        <div className="flex items-center gap-2 border-b border-line px-3 py-3">
          <TabScroll label="Previous categories" direction={-1} scroller={tabsRef} />
          <div ref={tabsRef} className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            <TabButton
              active={activeTab === "all"}
              label={`All (${products.length})`}
              onClick={() => setTab("all")}
            />
            {tabs.map((category) => (
              <TabButton
                key={category.id}
                active={activeTab === category.id}
                label={`${category.name} (${category.productCount})`}
                onClick={() => setTab(category.id)}
              />
            ))}
          </div>
          <TabScroll label="Next categories" direction={1} scroller={tabsRef} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p className="text-sm text-muted">{visible.length} entries</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              aria-label="Search products"
              className="h-11 w-56 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15"
            />
            {admin ? (
              <button
                type="button"
                onClick={() => setFormMode("new")}
                className="inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white hover:bg-[#9b0c18]"
              >
                New product
              </button>
            ) : null}
          </div>
        </div>

        <div className="sm:overflow-x-auto">
          <table className="gp-mobile-rows w-full min-w-[980px] border-t border-line text-left text-sm">
            <thead className="text-[11px] tracking-[0.14em] text-muted uppercase">
              <tr>
                <th className="bg-paper px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Image</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Basic settings</th>
                <th className="px-4 py-3 font-medium">Created since</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    Nothing in this tab yet.
                  </td>
                </tr>
              ) : (
                visible.map((product) => (
                  <tr key={product.id} className="border-t border-line align-top">
                    <td className="bg-paper px-4 py-5 text-muted" data-label="ID">
                      {product.id}
                    </td>
                    <td className="px-4 py-5" data-label="Image">
                      {product.imageUrl ? (
                        // Arbitrary catalog URLs are not in the image allowlist.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-28 w-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-28 w-20 items-center justify-center rounded-xl bg-paper-deep text-[10px] text-muted">
                          80 x 110
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5" data-label="Name">
                      <p className="font-medium">{product.name}</p>
                      {product.description ? (
                        <p className="mt-1 max-w-xs text-xs leading-5 text-muted">{product.description}</p>
                      ) : null}
                      <dl className="mt-3 grid gap-1 text-xs text-muted">
                        <div>SKU: {product.sku || "—"}</div>
                        <div>Barcode: {product.barcode || "—"}</div>
                        <div>Loyalty points: {money.format(product.loyaltyPoints)}</div>
                        <div>Weight: {product.weightKg.toFixed(2)} kg</div>
                        <div>
                          Dimension: {product.dimensionWCm.toFixed(2)} x {product.dimensionHCm.toFixed(2)} cm
                        </div>
                      </dl>
                    </td>
                    <td className="px-4 py-5" data-label="Description">
                      <dl className="grid gap-1 text-xs leading-5">
                        <div>
                          <span className="text-muted">Category: </span>
                          <span className="font-medium">{product.categoryName}</span>
                        </div>
                        <div>
                          <span className="text-muted">Supplier: </span>
                          {product.supplier || "N/A"}
                        </div>
                        <div className="text-muted">Variants: 0</div>
                        <div className="text-muted">Add-ons: 0</div>
                      </dl>
                    </td>
                    <td className="px-4 py-5" data-label="Price">
                      <dl className="grid gap-1 text-xs leading-5">
                        <PriceLine label="Selling price" value={money.format(product.sellingPrice)} />
                        <PriceLine label="Cost" value={money.format(product.cost)} />
                        <PriceLine label="Commission" value={money.format(product.commission)} />
                        <div className="text-moss">{product.vatExempted ? "VAT exempted" : "VAT 12%"}</div>
                        <PriceLine label="Net price" value={money.format(product.netPrice)} />
                        <PriceLine label="Total qty sold" value={qty.format(product.totalQtySold)} />
                      </dl>
                    </td>
                    <td className="px-4 py-5" data-label="Basic settings">
                      <div className="grid gap-1.5 text-xs">
                        <Flag on={product.visibleToCustomer} label="Visible to customer" />
                        <Flag on={product.trackQuantity} label="Track quantity" />
                        <Flag on={product.sellWithoutStock} label="Sell without stock" />
                        <Flag on={product.isRental} label="Is rental" />
                        <Flag on={product.isAddon} label="Is add-on" />
                      </div>
                    </td>
                    <td className="px-4 py-5" data-label="Created since">
                      <p>{shortDate(product.createdAt)}</p>
                      {admin ? (
                        <div className="mt-3 flex flex-col items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setFormMode(product.id)}
                            className="text-xs text-ink underline-offset-4 hover:underline"
                          >
                            Edit
                          </button>
                          <form action={deleteAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <button
                              type="submit"
                              disabled={deletePending}
                              onClick={(event) => {
                                if (!window.confirm(`Delete ${product.name}?`)) event.preventDefault();
                              }}
                              className="text-xs text-danger underline-offset-4 hover:underline disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProductForm({
  categories,
  product,
  pending,
  error,
  action,
  onCancel,
}: {
  categories: Category[];
  product?: Product;
  pending: boolean;
  error?: string;
  action: (payload: FormData) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const title = product ? "Edit product" : "New product";

  return createPortal(
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
            onCancel();
          }
          window.addEventListener("mouseup", onUp);
        }}
      >
    <form
      action={action}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="desk-card w-full max-w-[980px] rounded-[28px] p-5 sm:p-6"
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-3xl tracking-tight">{title}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-ink">
          Close
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" className="sm:col-span-2">
          <input name="name" required defaultValue={product?.name ?? ""} className={fieldClass} />
        </Field>
        <Field label="Category">
          <select
            name="category_id"
            required
            defaultValue={product?.categoryId ?? ""}
            className={fieldClass}
          >
            <option value="" disabled>
              Choose
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SKU">
          <input name="sku" defaultValue={product?.sku ?? ""} className={fieldClass} />
        </Field>
        <Field label="Selling price">
          <input name="selling_price" inputMode="decimal" defaultValue={product?.sellingPrice ?? 0} className={fieldClass} />
        </Field>
        <Field label="Cost">
          <input name="cost" inputMode="decimal" defaultValue={product?.cost ?? 0} className={fieldClass} />
        </Field>
        <Field label="Net price">
          <input name="net_price" inputMode="decimal" defaultValue={product?.netPrice ?? 0} className={fieldClass} />
        </Field>
        <Field label="Commission">
          <input name="commission" inputMode="decimal" defaultValue={product?.commission ?? 0} className={fieldClass} />
        </Field>
        <Field label="Loyalty points">
          <input name="loyalty_points" inputMode="decimal" defaultValue={product?.loyaltyPoints ?? 0} className={fieldClass} />
        </Field>
        <Field label="Barcode">
          <input name="barcode" defaultValue={product?.barcode ?? ""} className={fieldClass} />
        </Field>
        <Field label="Weight, kg">
          <input name="weight_kg" inputMode="decimal" defaultValue={product?.weightKg ?? 0} className={fieldClass} />
        </Field>
        <Field label="Width, cm">
          <input name="dimension_w_cm" inputMode="decimal" defaultValue={product?.dimensionWCm ?? 0} className={fieldClass} />
        </Field>
        <Field label="Height, cm">
          <input name="dimension_h_cm" inputMode="decimal" defaultValue={product?.dimensionHCm ?? 0} className={fieldClass} />
        </Field>
        <Field label="Supplier">
          <input name="supplier" defaultValue={product?.supplier ?? ""} className={fieldClass} />
        </Field>
        <div className="grid gap-2 text-sm sm:col-span-2">
          Image
          <CloudinaryField
            name="image_url"
            kind="product"
            currentUrl={product?.imageUrl ?? ""}
            holdUntilSave
          />
        </div>
      </div>
      <label className="mt-4 grid gap-2 text-sm">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
          className="w-full rounded-2xl border border-line px-3 py-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
        <Check name="vat_exempted" label="VAT exempted" defaultChecked={product?.vatExempted ?? true} />
        <Check name="visible_to_customer" label="Visible to customer" defaultChecked={product?.visibleToCustomer ?? true} />
        <Check name="track_quantity" label="Track quantity" defaultChecked={product?.trackQuantity ?? false} />
        <Check name="sell_without_stock" label="Sell without stock" defaultChecked={product?.sellWithoutStock ?? false} />
        <Check name="is_rental" label="Is rental" defaultChecked={product?.isRental ?? false} />
        <Check name="is_addon" label="Is add-on" defaultChecked={product?.isAddon ?? false} />
      </div>
      <button
        type="submit"
        disabled={pending || categories.length === 0}
        className="mt-5 inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white hover:bg-[#9b0c18] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Saving…" : "Save product"}
      </button>
      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Add a category before saving a product.</p>
      ) : null}
    </form>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-2 text-sm ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-copper-deep"
      />
      {label}
    </label>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium tracking-wide ${
        active ? "bg-copper-deep text-white" : "text-muted hover:bg-paper hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function TabScroll({
  label,
  direction,
  scroller,
}: {
  label: string;
  direction: -1 | 1;
  scroller: RefObject<HTMLDivElement | null>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => scroller.current?.scrollBy({ left: direction * 220, behavior: "smooth" })}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-ink"
    >
      {direction < 0 ? "‹" : "›"}
    </button>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className={on ? "text-moss" : "text-danger"} aria-hidden>
        {on ? "✓" : "✕"}
      </span>
      <span className="text-muted">{label}</span>
    </p>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted">{label}: </span>
      {value}
    </div>
  );
}
