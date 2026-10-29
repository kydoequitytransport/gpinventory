import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { PurchaseRequestBoard } from "@/components/purchase-request-board";
import { PurchaseSchema } from "@/components/purchase-schema";
import { getCurrentUser } from "@/lib/auth";
import { loadPurchaseScreen } from "@/lib/purchase-requests";

export const metadata = {
  title: "Purchase request",
};

export default function PurchaseRequestsPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <PurchaseContent />
    </Suspense>
  );
}

async function PurchaseContent() {
  await getCurrentUser();
  const ready = await loadPurchaseScreen();
  if (ready.missing) return <PurchaseSchema missing={ready.missing} />;

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Inventory</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Purchase request</h1>
      <PurchaseRequestBoard requests={ready.requests} />
    </div>
  );
}
