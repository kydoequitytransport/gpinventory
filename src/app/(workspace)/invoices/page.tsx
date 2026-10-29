import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { InvoiceBoard } from "@/components/invoice-board";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Invoice",
};

export default function InvoicesPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <InvoiceContent />
    </Suspense>
  );
}

async function InvoiceContent() {
  const profile = await getCurrentUser();

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Sales</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Invoice</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Employees write the draft. An admin is the only one who can approve it or void it.
      </p>
      <div className="mt-8">
        <InvoiceBoard role={profile.role} actorName={profile.full_name} />
      </div>
    </div>
  );
}
