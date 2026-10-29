import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { ProductList } from "@/components/product-list";
import { SchemaSetup } from "@/components/schema-setup";
import { getCurrentUser } from "@/lib/auth";
import { loadCatalog, readCatalogMigration, sqlEditorUrl } from "@/lib/catalog";

export const metadata = {
  title: "Product list",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <ProductContent />
    </Suspense>
  );
}

async function ProductContent() {
  const profile = await getCurrentUser();
  const catalog = await loadCatalog();

  if (catalog.missing) {
    return (
      <SchemaSetup
        sql={await readCatalogMigration()}
        editorUrl={sqlEditorUrl()}
        title="Add the catalog tables"
        detail="gp_categories holds each group. gp_products.category_id points at one category, so a product belongs to exactly one. Run this migration in the SQL editor, then refresh."
      />
    );
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Catalog</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Product list</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Each product sits in one category. A category with Shown in list turned on appears here
        as its own tab. All still includes every product.
      </p>
      <ProductList categories={catalog.categories} products={catalog.products} role={profile.role} />
    </div>
  );
}
