"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { buildDashboard, type ChartPoint } from "@/lib/dashboard-metrics";
import { formatMoney } from "@/lib/invoices";
import { getSeedInvoices, readStoredInvoices, subscribeInvoices } from "@/lib/invoice-store";

export function DashboardCharts({ today }: { today: string }) {
  const invoices = useSyncExternalStore(subscribeInvoices, readStoredInvoices, getSeedInvoices);
  const metrics = buildDashboard(invoices, today);

  return (
    <div className="mt-10 grid gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Daily sales" figure={formatMoney(metrics.todaySales)} note="Today">
          <Bars points={metrics.daily} />
        </ChartCard>
        <ChartCard
          title="Month sales"
          figure={formatMoney(metrics.monthSales)}
          note={`${metrics.monthName} ${metrics.year}`}
        >
          <Bars points={metrics.monthDays} compact />
        </ChartCard>
      </div>

      <ChartCard title="Monthly sales comparison" figure={formatMoney(metrics.monthSales)} note="Last 6 months">
        <Bars points={metrics.comparison} />
      </ChartCard>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Today's expenses" figure={formatMoney(0)} note="Nothing recorded">
          <EmptyAxis />
        </ChartCard>
        <ChartCard title="Month expenses" figure={formatMoney(0)} note={`${metrics.monthName} has no expenses yet`}>
          <EmptyAxis />
        </ChartCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StockCard
          title="Low stocks inventory"
          rows={metrics.lowStocks}
          empty={
            metrics.stockTracked
              ? "Nothing is at 3 or below."
              : "Stock counts are not on the floor yet."
          }
        />
        <StockCard
          title="High stocks inventory"
          rows={metrics.highStocks}
          empty={
            metrics.stockTracked
              ? "Nothing is at 10 or above."
              : "Stock counts are not on the floor yet."
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="desk-card rounded-[28px] p-6">
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase">
            Client debts or pending payments
          </p>
          {metrics.debts.length === 0 ? (
            <p className="mt-8 text-sm text-muted">No open balances.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {metrics.debts.map((debt) => (
                <DebtRow
                  key={debt.customer}
                  customer={debt.customer}
                  remaining={debt.remaining}
                  max={metrics.debts[0]?.remaining ?? 1}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="desk-card rounded-[28px] p-6">
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Payment due date</p>
          {metrics.dues.length === 0 ? (
            <p className="mt-8 text-sm text-muted">No payments are waiting.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {metrics.dues.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.customer}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.voucherNo} · due {item.dueLabel}
                      {item.overdue ? " · overdue" : ""}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold tabular-nums ${item.overdue ? "text-danger" : "text-ink"}`}
                  >
                    {formatMoney(item.remaining)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  figure,
  note,
  children,
}: {
  title: string;
  figure: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="desk-card rounded-[28px] p-6">
      <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{title}</p>
      <p className="mt-3 font-display text-4xl tracking-tight tabular-nums">{figure}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Bars({ points, compact = false }: { points: ChartPoint[]; compact?: boolean }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className={`flex items-end gap-1 ${compact ? "h-24" : "h-36"}`}>
      {points.map((point) => (
        <div key={point.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
          <div className="flex h-[calc(100%-1.25rem)] items-end">
            <div
              className={`w-full rounded-t-md ${point.value > 0 ? "bg-copper-deep" : "bg-line"}`}
              style={{ height: `${point.value > 0 ? Math.max((point.value / max) * 100, 8) : 6}%` }}
              title={`${point.label}: ${formatMoney(point.value)}`}
            />
          </div>
          {compact ? null : (
            <p className="mt-2 truncate text-center text-[10px] text-muted">{point.label}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyAxis() {
  return (
    <div className="flex h-24 items-end">
      <div className="h-px w-full bg-line" />
    </div>
  );
}

function StockCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { name: string; onHand: number }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.onHand), 1);
  return (
    <section className="desk-card rounded-[28px] p-6">
      <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{title}</p>
      {rows.length === 0 ? (
        <>
          <EmptyAxis />
          <p className="mt-3 text-sm text-muted">{empty}</p>
        </>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.name}>
              <div className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <span className="tabular-nums text-muted">{row.onHand}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep">
                <div
                  className="h-full rounded-full bg-moss"
                  style={{ width: `${(row.onHand / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DebtRow({
  customer,
  remaining,
  max,
}: {
  customer: string;
  remaining: number;
  max: number;
}) {
  return (
    <li>
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{customer}</span>
        <span className="shrink-0 tabular-nums">{formatMoney(remaining)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep">
        <div
          className="h-full rounded-full bg-copper-deep"
          style={{ width: `${(remaining / max) * 100}%` }}
        />
      </div>
    </li>
  );
}
