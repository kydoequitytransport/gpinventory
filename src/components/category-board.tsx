"use client";

import { useActionState, useState } from "react";
import { deleteCategory, saveCategory } from "@/app/actions/catalog";
import { CloudinaryField } from "@/components/cloudinary-field";
import type { Category, Role } from "@/lib/types";

const fieldClass =
  "h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-[#98a0aa] focus:border-copper focus:ring-4 focus:ring-copper/15";

export function CategoryBoard({
  categories,
  role,
}: {
  categories: Category[];
  role: Role;
}) {
  const admin = role === "admin";
  const [saveState, saveAction, savePending] = useActionState(saveCategory, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCategory, null);

  return (
    <div className="mt-8 grid gap-6">
      {saveState?.message ? <Note tone="ok" text={saveState.message} /> : null}
      {saveState?.error ? <Note tone="bad" text={saveState.error} /> : null}
      {deleteState?.message ? <Note tone="ok" text={deleteState.message} /> : null}
      {deleteState?.error ? <Note tone="bad" text={deleteState.error} /> : null}

      {admin ? (
        <form action={saveAction} className="desk-card rounded-[28px] p-5 sm:p-6">
          <h2 className="font-display text-3xl tracking-tight">New category</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Turn on Shown in list and this category becomes a tab above the products.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2 text-sm sm:col-span-2">
              Name
              <input name="name" required className={fieldClass} />
            </label>
            <label className="grid gap-2 text-sm">
              Order sequence
              <input name="order_sequence" type="number" min={0} defaultValue={0} className={fieldClass} />
            </label>
            <div className="grid gap-2 text-sm">
              Picture
              <CloudinaryField name="picture_url" kind="category" currentUrl="" shape="circle" />
            </div>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="shown_in_list" defaultChecked className="h-4 w-4 accent-copper-deep" />
            Shown in list
          </label>
          <button
            type="submit"
            disabled={savePending}
            className="mt-5 inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white hover:bg-[#9b0c18] disabled:opacity-70"
          >
            {savePending ? "Saving…" : "Add category"}
          </button>
        </form>
      ) : null}

      <section className="desk-card overflow-hidden rounded-[28px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[11px] tracking-[0.14em] text-muted uppercase">
              <tr>
                <th className="bg-paper px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Picture</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Order sequence</th>
                <th className="px-4 py-3 font-medium">Shown in list</th>
                <th className="px-4 py-3 font-medium">Products</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted">
                    No categories yet.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <CategoryRow
                    key={`${category.id}-${category.name}-${category.orderSequence}-${category.shownInList}-${category.pictureUrl}`}
                    category={category}
                    admin={admin}
                    saveAction={saveAction}
                    deleteAction={deleteAction}
                    pending={savePending || deletePending}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  admin,
  saveAction,
  deleteAction,
  pending,
}: {
  category: Category;
  admin: boolean;
  saveAction: (payload: FormData) => void;
  deleteAction: (payload: FormData) => void;
  pending: boolean;
}) {
  const [shown, setShown] = useState(category.shownInList);

  if (!admin) {
    return (
      <tr className="border-t border-line">
        <td className="bg-paper px-4 py-4 text-muted">{category.id}</td>
        <td className="px-4 py-4">
          <Picture url={category.pictureUrl} />
        </td>
        <td className="px-4 py-4 font-medium">{category.name}</td>
        <td className="px-4 py-4">{category.orderSequence}</td>
        <td className="px-4 py-4">
          <Mark on={category.shownInList} />
        </td>
        <td className="px-4 py-4">{category.productCount}</td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-line align-top">
      <td className="bg-paper px-4 py-4 text-muted">{category.id}</td>
      <td className="px-4 py-4" colSpan={5}>
        <form action={saveAction} className="grid gap-3 lg:grid-cols-[148px_minmax(0,1.4fr)_120px_150px_80px_auto] lg:items-center">
          <input type="hidden" name="id" value={category.id} />
          <CloudinaryField
            name="picture_url"
            kind="category"
            currentUrl={category.pictureUrl}
            shape="circle"
          />
          <input name="name" required defaultValue={category.name} aria-label="Name" className={fieldClass} />
          <input
            name="order_sequence"
            type="number"
            min={0}
            defaultValue={category.orderSequence}
            aria-label="Order sequence"
            className={fieldClass}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="shown_in_list"
              checked={shown}
              onChange={(event) => setShown(event.target.checked)}
              className="h-4 w-4 accent-copper-deep"
            />
            <Mark on={shown} />
          </label>
          <p className="text-sm">{category.productCount}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center rounded-2xl bg-ink px-3 text-sm text-white hover:bg-black disabled:opacity-70"
            >
              Save
            </button>
            <button
              type="submit"
              formAction={deleteAction}
              disabled={pending || category.productCount > 0}
              title={category.productCount > 0 ? "Move the products out of this category first." : undefined}
              onClick={(event) => {
                if (!window.confirm(`Delete ${category.name}?`)) event.preventDefault();
              }}
              className="inline-flex h-11 items-center rounded-2xl border border-line px-3 text-sm text-danger hover:border-danger disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

function Picture({ url }: { url: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-12 w-12 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-deep text-[10px] text-muted">
      50 x 50
    </div>
  );
}

function Mark({ on }: { on: boolean }) {
  return <span className={on ? "text-moss" : "text-danger"}>{on ? "✓" : "✕"}</span>;
}

function Note({ tone, text }: { tone: "ok" | "bad"; text: string }) {
  const className =
    tone === "ok"
      ? "border-moss/20 bg-moss/10 text-moss"
      : "border-danger/20 bg-danger/5 text-danger";
  return <p className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{text}</p>;
}
