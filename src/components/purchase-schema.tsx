import { SchemaSetup } from "@/components/schema-setup";
import { readCatalogMigration, sqlEditorUrl } from "@/lib/catalog";
import { purchaseEditorUrl, readPurchaseMigration } from "@/lib/purchase-requests";

export async function PurchaseSchema({ missing }: { missing: "catalog" | "purchase" }) {
  if (missing === "catalog") {
    return (
      <SchemaSetup
        sql={await readCatalogMigration()}
        editorUrl={sqlEditorUrl()}
        title="Add the catalog tables"
        detail="Run the catalog migration first, then refresh."
      />
    );
  }

  return (
    <SchemaSetup
      sql={await readPurchaseMigration()}
      editorUrl={purchaseEditorUrl()}
      title="Add the purchase request tables"
      detail="gp_purchase_requests keeps the header. gp_purchase_request_lines keeps each product row. Run this migration in the SQL editor, then refresh."
    />
  );
}
