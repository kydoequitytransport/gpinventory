import { Suspense } from "react";
import { ContentFallback } from "@/components/content-fallback";
import { InventoryBoard } from "@/components/inventory-board";
import { SchemaSetup } from "@/components/schema-setup";
import { getCurrentUser } from "@/lib/auth";
import { loadCatalog, readCatalogMigration, sqlEditorUrl } from "@/lib/catalog";
import { loadStock, readStockMigration, stockEditorUrl } from "@/lib/stock";

export const metadata = {
  title: "Inventory",
};

export default function InventoryPage() {
  return (
    <Suspense fallback={<ContentFallback />}>
      <InventoryContent />
    </Suspense>
  );
}

async function InventoryContent() {
  await getCurrentUser();
  const catalog = await loadCatalog();
  if (catalog.missing) {
    return (
      <SchemaSetup
        sql={await readCatalogMigration()}
        editorUrl={sqlEditorUrl()}
        title="Add the catalog tables"
        detail="Run the catalog migration first, then refresh."
      />
    );
  }

  const stock = await loadStock();
  if (stock.missing) {
    return (
      <SchemaSetup
        sql={await readStockMigration()}
        editorUrl={stockEditorUrl()}
        title="Add the stock table"
        detail="gp_product_stock keeps one count for each product. Run this migration in the SQL editor, then refresh."
      />
    );
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Inventory</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Product stocktake count list
      </h1>
      <InventoryBoard categories={catalog.categories} lines={stock.lines} />
    </div>
  );
}
