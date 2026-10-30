import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { InvoiceBoard } from "@/components/invoice-board";
import { getCurrentUser } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { sampleFromCatalog, type InvoiceCatalogProduct } from "@/lib/invoices";
import { manilaToday } from "@/lib/purchase-math";
import { loadStock } from "@/lib/stock";

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
  const products = await loadInvoiceProducts();
  const sample = sampleFromCatalog(products, profile.full_name, manilaToday());

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Sales</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Invoice</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Employees write the draft. An admin is the only one who can approve it or void it.
      </p>
      <div className="mt-8">
        <InvoiceBoard
          role={profile.role}
          actorName={profile.full_name}
          products={products}
          sample={sample}
        />
      </div>
    </div>
  );
}

async function loadInvoiceProducts(): Promise<InvoiceCatalogProduct[]> {
  const catalog = await loadCatalog();
  if (catalog.missing) return [];
  const stock = await loadStock();
  const byProduct = new Map(
    stock.missing ? [] : stock.lines.map((line) => [line.productId, line] as const),
  );

  return catalog.products.map((product) => {
    const line = byProduct.get(product.id);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unit: line?.uom ?? "",
      onHand: line ? line.onHand : null,
      sellingPrice: product.sellingPrice,
      imageUrl: product.imageUrl,
    };
  });
}
