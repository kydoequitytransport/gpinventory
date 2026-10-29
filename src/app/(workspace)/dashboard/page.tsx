import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { DashboardCharts } from "@/components/dashboard-charts";
import { getCurrentUser } from "@/lib/auth";
import { firstName, greeting, longDate } from "@/lib/format";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const profile = await getCurrentUser();
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">{longDate(now)}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">
        {greeting(now)}, {firstName(profile.full_name, profile.email)}.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
        Sales, balances, and due dates follow the invoices on the floor. Expenses and
        stock counts stay empty until those records exist.
      </p>
      <DashboardCharts today={today} />
    </div>
  );
}
