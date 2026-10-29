import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContentFallback } from "@/components/content-fallback";
import { PurchaseRequestForm } from "@/components/purchase-request-form";
import { PurchaseSchema } from "@/components/purchase-schema";
import { getCurrentUser } from "@/lib/auth";
import { loadPurchaseScreen } from "@/lib/purchase-requests";

export const metadata = {
  title: "Purchase request",
};

export default function EditPurchaseRequestPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ContentFallback />}>
      <EditPurchaseContent params={params} />
    </Suspense>
  );
}

async function EditPurchaseContent({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser();
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) notFound();

  const ready = await loadPurchaseScreen();
  if (ready.missing) return <PurchaseSchema missing={ready.missing} />;

  const request = ready.requests.find((item) => item.id === requestId);
  if (!request) notFound();

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Inventory</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Purchase request</h1>
      <PurchaseRequestForm
        products={ready.products}
        takenPrNos={ready.takenPrNos}
        today={ready.today}
        request={request}
      />
    </div>
  );
}
