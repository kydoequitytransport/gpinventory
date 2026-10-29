import { readFile } from "node:fs/promises";
import { cloudinaryUrl } from "@/lib/cloudinary";
import path from "node:path";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";

type CategoryRow = {
  id: number | string;
  name: string;
  picture_url: string;
  order_sequence: number | string;
  shown_in_list: boolean;
  created_at: string;
};

type ProductRow = {
  id: number | string;
  category_id: number | string;
  name: string;
  sku: string;
  description: string;
  image_url: string;
  supplier: string;
  barcode: string;
  selling_price: number | string;
  cost: number | string;
  net_price: number | string;
  loyalty_points: number | string;
  commission: number | string;
  weight_kg: number | string;
  dimension_w_cm: number | string;
  dimension_h_cm: number | string;
  vat_exempted: boolean;
  visible_to_customer: boolean;
  track_quantity: boolean;
  sell_without_stock: boolean;
  is_rental: boolean;
  is_addon: boolean;
  total_qty_sold: number | string;
  created_at: string;
  gp_categories: { name: string } | { name: string }[] | null;
};

export type CatalogData = {
  missing: false;
  categories: Category[];
  products: Product[];
};

export type CatalogResult = CatalogData | { missing: true };

const categorySelect = "id, name, picture_url, order_sequence, shown_in_list, created_at";

const productSelect = `
  id, category_id, name, sku, description, image_url, supplier, barcode,
  selling_price, cost, net_price, loyalty_points, commission, weight_kg,
  dimension_w_cm, dimension_h_cm, vat_exempted, visible_to_customer,
  track_quantity, sell_without_stock, is_rental, is_addon, total_qty_sold,
  created_at, gp_categories ( name )
`;

export async function loadCatalog(): Promise<CatalogResult> {
  const supabase = await createClient();
  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from("gp_categories").select(categorySelect).order("order_sequence").order("id"),
    supabase.from("gp_products").select(productSelect).order("created_at", { ascending: false }),
  ]);

  if (categoriesResult.error) {
    if (isMissingTable(categoriesResult.error.message, categoriesResult.error.code)) {
      return { missing: true };
    }
    throw new Error(categoriesResult.error.message);
  }

  if (productsResult.error) {
    if (isMissingTable(productsResult.error.message, productsResult.error.code)) {
      return { missing: true };
    }
    throw new Error(productsResult.error.message);
  }

  const products = ((productsResult.data ?? []) as ProductRow[]).map(toProduct);
  const counts = new Map<number, number>();
  for (const product of products) {
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
  }

  const categories = ((categoriesResult.data ?? []) as CategoryRow[]).map((row) =>
    toCategory(row, counts.get(Number(row.id)) ?? 0),
  );

  return { missing: false, categories, products };
}

export async function readCatalogMigration() {
  return readFile(path.join(process.cwd(), "supabase/migrations/002_gp_catalog.sql"), "utf8");
}

export function sqlEditorUrl() {
  const ref = new URL(supabaseUrl()).hostname.split(".")[0];
  return `https://supabase.com/dashboard/project/${ref}/sql/new`;
}

function toCategory(row: CategoryRow, productCount: number): Category {
  return {
    id: Number(row.id),
    name: row.name,
    pictureUrl: safeUrl(row.picture_url),
    orderSequence: Number(row.order_sequence) || 0,
    shownInList: row.shown_in_list,
    createdAt: row.created_at,
    productCount,
  };
}

function toProduct(row: ProductRow): Product {
  const related = Array.isArray(row.gp_categories) ? row.gp_categories[0] : row.gp_categories;
  return {
    id: Number(row.id),
    categoryId: Number(row.category_id),
    categoryName: related?.name ?? "",
    name: row.name,
    sku: row.sku,
    description: row.description,
    imageUrl: safeUrl(row.image_url),
    supplier: row.supplier,
    barcode: row.barcode,
    sellingPrice: num(row.selling_price),
    cost: num(row.cost),
    netPrice: num(row.net_price),
    loyaltyPoints: num(row.loyalty_points),
    commission: num(row.commission),
    weightKg: num(row.weight_kg),
    dimensionWCm: num(row.dimension_w_cm),
    dimensionHCm: num(row.dimension_h_cm),
    vatExempted: row.vat_exempted,
    visibleToCustomer: row.visible_to_customer,
    trackQuantity: row.track_quantity,
    sellWithoutStock: row.sell_without_stock,
    isRental: row.is_rental,
    isAddon: row.is_addon,
    totalQtySold: num(row.total_qty_sold),
    createdAt: row.created_at,
  };
}

function num(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeUrl(value: string) {
  return cloudinaryUrl(value) ?? "";
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
