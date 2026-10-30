import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { SalesReport } from "@/components/sales-report";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Sales report",
};

export default function SalesPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <SalesContent />
    </Suspense>
  );
}

async function SalesContent() {
  await getCurrentUser();

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Sales</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Sales report</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Fully paid and partially paid only.</p>
      <SalesReport />
    </div>
  );
}
