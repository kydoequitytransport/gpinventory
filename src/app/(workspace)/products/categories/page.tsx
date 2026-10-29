import { Suspense } from "react";
import { CategoryBoard } from "@/components/category-board";
import { ContentFallback } from "@/components/content-fallback";
import { SchemaSetup } from "@/components/schema-setup";
import { getCurrentUser } from "@/lib/auth";
import { loadCatalog, readCatalogMigration, sqlEditorUrl } from "@/lib/catalog";

export const metadata = {
  title: "Categories",
};

export default function CategoriesPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <CategoryContent />
    </Suspense>
  );
}

async function CategoryContent() {
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
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Categories</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        These groups are the tabs on the product list. Order sequence decides which tab comes
        first when the numbers differ. A category cannot be removed while a product still uses it.
      </p>
      <CategoryBoard categories={catalog.categories} role={profile.role} />
    </div>
  );
}
