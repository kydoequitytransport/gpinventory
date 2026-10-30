"use client";

import { useState } from "react";
import Link from "next/link";
import { deletePurchaseRequest } from "@/app/actions/purchase-requests";
import type { PurchaseRequest } from "@/lib/purchase-requests";

export function PurchaseRequestBoard({ requests }: { requests: PurchaseRequest[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = requests.filter((request) => {
    if (!needle) return true;
    const names = request.lines.map((line) => line.productName).join(" ");
    return [request.prNo, request.notes, request.prDate, names].join(" ").toLowerCase().includes(needle);
  });

  return (
    <section className="desk-card mt-8 overflow-hidden rounded-[28px]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <p className="text-sm text-muted">{visible.length} entries</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            aria-label="Search purchase requests"
            className="h-11 w-56 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15"
          />
          <Link
            href="/inventory/purchase-requests/new"
            className="inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white hover:bg-[#9b0c18]"
          >
            New request
          </Link>
        </div>
      </div>

      <div className="sm:overflow-x-auto">
        <table className="gp-mobile-rows w-full min-w-[760px] border-t border-line text-left text-sm">
          <thead className="text-[11px] tracking-[0.14em] text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">PR No.</th>
              <th className="px-4 py-3 font-medium">PR Date</th>
              <th className="px-4 py-3 font-medium">Ship from</th>
              <th className="px-4 py-3 font-medium">Ship to</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted">
                  Nothing in this list yet.
                </td>
              </tr>
            ) : (
              visible.map((request) => (
                <tr key={request.id} className="border-t border-line">
                  <td className="px-4 py-4 font-medium" data-label="PR No.">
                    {request.prNo}
                  </td>
                  <td className="px-4 py-4" data-label="PR Date">
                    {request.prDate}
                  </td>
                  <td className="px-4 py-4" data-label="Ship from">
                    {request.shipDateFrom}
                  </td>
                  <td className="px-4 py-4" data-label="Ship to">
                    {request.shipDateTo}
                  </td>
                  <td className="px-4 py-4 break-words" data-label="Products">
                    {request.lines.map((line) => line.productName).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-3">
                      <Link href={`/inventory/purchase-requests/${request.id}`} className="text-sm underline-offset-4 hover:underline">
                        Open
                      </Link>
                      <form action={deletePurchaseRequest}>
                        <input type="hidden" name="id" value={request.id} />
                        <button
                          type="submit"
                          className="text-sm text-danger underline-offset-4 hover:underline"
                          onClick={(event) => {
                            if (!window.confirm(`Delete ${request.prNo}?`)) event.preventDefault();
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
