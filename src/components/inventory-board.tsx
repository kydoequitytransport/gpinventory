"use client";

import { useRef, useState, type RefObject } from "react";
import { stockStatus, type StockLine } from "@/lib/stock-status";
import type { Category } from "@/lib/types";

const qty = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function InventoryBoard({
  categories,
  lines,
}: {
  categories: Category[];
  lines: StockLine[];
}) {
  const [tab, setTab] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs = categories.filter((category) => category.shownInList);
  const activeTab = typeof tab === "number" && tabs.some((category) => category.id === tab) ? tab : "all";
  const needle = query.trim().toLowerCase();
  const visible = lines.filter((line) => {
    if (activeTab !== "all" && line.categoryId !== activeTab) return false;
    if (!needle) return true;
    return [line.name, line.sku, String(line.productId)].join(" ").toLowerCase().includes(needle);
  });
  const visibleIds = visible.map((line) => line.productId);
  const allPicked = visibleIds.length > 0 && visibleIds.every((id) => picked.includes(id));

  function toggleAll() {
    setPicked((current) => {
      if (allPicked) return current.filter((id) => !visibleIds.includes(id));
      return [...new Set([...current, ...visibleIds])];
    });
  }

  function toggleOne(id: number) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function countFor(categoryId: number) {
    return lines.filter((line) => line.categoryId === categoryId).length;
  }

  return (
    <section className="desk-card mt-8 overflow-hidden rounded-[28px]">
      <div className="flex items-center gap-2 border-b border-line px-3 py-3">
        <TabScroll label="Previous categories" direction={-1} scroller={tabsRef} />
        <div ref={tabsRef} className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          <TabButton active={activeTab === "all"} label={`All (${lines.length})`} onClick={() => setTab("all")} />
          {tabs.map((category) => (
            <TabButton
              key={category.id}
              active={activeTab === category.id}
              label={`${category.name} (${countFor(category.id)})`}
              onClick={() => setTab(category.id)}
            />
          ))}
        </div>
        <TabScroll label="Next categories" direction={1} scroller={tabsRef} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <p className="text-sm text-muted">{visible.length} entries</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          aria-label="Search stock"
          className="h-11 w-56 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-t border-line text-left text-sm">
          <thead className="text-[11px] tracking-[0.14em] text-muted uppercase">
            <tr>
              <th className="w-12 px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={toggleAll}
                  aria-label="Select visible rows"
                  className="h-4 w-4 accent-copper-deep"
                />
              </th>
              <th className="bg-paper px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">UOM</th>
              <th className="px-4 py-3 font-medium">Onhand</th>
              <th className="px-4 py-3 font-medium">Stock status</th>
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
              visible.map((line) => {
                const status = stockStatus(line);
                return (
                  <tr key={line.productId} className="border-t border-line">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={picked.includes(line.productId)}
                        onChange={() => toggleOne(line.productId)}
                        aria-label={`Select ${line.name}`}
                        className="h-4 w-4 accent-copper-deep"
                      />
                    </td>
                    <td className="bg-paper px-4 py-4 text-muted">{line.productId}</td>
                    <td className="px-4 py-4 font-medium">{line.name}</td>
                    <td className="px-4 py-4">{line.sku}</td>
                    <td className="px-4 py-4">{line.uom}</td>
                    <td className="px-4 py-4">{qty.format(line.onHand)}</td>
                    <td className={`px-4 py-4 ${statusClass(status)}`}>{status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statusClass(status: string) {
  if (status === "Normal") return "text-moss";
  if (status === "For Re-stock") return "text-danger";
  return "text-muted";
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
