import { readFile } from "node:fs/promises";
import path from "node:path";
import type { StockLine } from "@/lib/stock-status";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type { StockLine } from "@/lib/stock-status";

type StockRow = {
  product_id: number | string;
  uom: string;
  on_hand: number | string;
  min_on_hand: number | string | null;
  gp_products:
    | {
        name: string;
        sku: string;
        category_id: number | string;
      }
    | {
        name: string;
        sku: string;
        category_id: number | string;
      }[]
    | null;
};

export async function loadStock(): Promise<{ missing: true } | { missing: false; lines: StockLine[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gp_product_stock")
    .select("product_id, uom, on_hand, min_on_hand, gp_products ( name, sku, category_id )")
    .order("product_id", { ascending: true });

  if (error) {
    if (isMissingTable(error.message, error.code)) return { missing: true };
    throw new Error(error.message);
  }

  const lines = ((data ?? []) as StockRow[]).flatMap((row) => {
    const product = Array.isArray(row.gp_products) ? row.gp_products[0] : row.gp_products;
    if (!product) return [];
    return [
      {
        productId: Number(row.product_id),
        categoryId: Number(product.category_id),
        name: product.name,
        sku: product.sku,
        uom: row.uom,
        onHand: num(row.on_hand),
        minOnHand: row.min_on_hand === null ? null : num(row.min_on_hand),
      },
    ];
  });

  return { missing: false, lines };
}

export async function readStockMigration() {
  return readFile(path.join(process.cwd(), "supabase/migrations/003_gp_stock.sql"), "utf8");
}

export function stockEditorUrl() {
  const ref = new URL(supabaseUrl()).hostname.split(".")[0];
  return `https://supabase.com/dashboard/project/${ref}/sql/new`;
}

function num(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMissingTable(message: string, code?: string) {
  const text = message.toLowerCase();
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}
