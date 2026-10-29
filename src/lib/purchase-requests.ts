import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCatalog } from "@/lib/catalog";
import { manilaToday } from "@/lib/purchase-math";
import { loadStock } from "@/lib/stock";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type RequestProduct = {
  id: number;
  name: string;
  sku: string;
  uom: string;
  onHand: number | null;
  minOnHand: number | null;
};

export type PurchaseLine = {
  id: number;
  productId: number;
  productName: string;
  qtySold: number;
  leadTimeDays: number;
  suggestedQty: number;
  qtyRequest: number;
};

export type PurchaseRequest = {
  id: number;
  prNo: string;
  prDate: string;
  shipDateFrom: string;
  shipDateTo: string;
  notes: string;
  lines: PurchaseLine[];
};

type ProductEmbed =
  | { name: string; sku: string }
  | { name: string; sku: string }[]
  | null;

type LineRow = {
  id: number | string;
  line_no: number | string;
  product_id: number | string;
  qty_sold: number | string;
  lead_time_days: number | string;
  suggested_qty: number | string;
  qty_request: number | string;
  gp_products: ProductEmbed;
};

type RequestRow = {
  id: number | string;
  pr_no: string;
  pr_date: string;
  ship_date_from: string;
  ship_date_to: string;
  notes: string;
  gp_purchase_request_lines: LineRow[] | LineRow | null;
};

const requestSelect =
  "id, pr_no, pr_date, ship_date_from, ship_date_to, notes, gp_purchase_request_lines ( id, line_no, product_id, qty_sold, lead_time_days, suggested_qty, qty_request, gp_products ( name, sku ) )";

export async function loadPurchaseRequests(): Promise<
  { missing: true } | { missing: false; requests: PurchaseRequest[] }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gp_purchase_requests")
    .select(requestSelect)
    .order("pr_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    if (isMissingTable(error.message, error.code)) return { missing: true };
    throw new Error(error.message);
  }

  return { missing: false, requests: ((data ?? []) as RequestRow[]).map(toRequest) };
}

export async function loadRequestProducts(): Promise<
  { missing: true } | { missing: false; products: RequestProduct[] }
> {
  const catalog = await loadCatalog();
  if (catalog.missing) return { missing: true };
  const stock = await loadStock();
  const byProduct = new Map(
    stock.missing ? [] : stock.lines.map((line) => [line.productId, line] as const),
  );

  const products = catalog.products
    .map((product) => {
      const line = byProduct.get(product.id);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        uom: line?.uom ?? "",
        onHand: line ? line.onHand : null,
        minOnHand: line ? line.minOnHand : null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return { missing: false, products };
}

export function shopToday() {
  return manilaToday();
}

export async function loadPurchaseScreen(): Promise<
  | { missing: "catalog" }
  | { missing: "purchase" }
  | {
      missing: false;
      products: RequestProduct[];
      requests: PurchaseRequest[];
      takenPrNos: string[];
      today: string;
    }
> {
  const products = await loadRequestProducts();
  if (products.missing) return { missing: "catalog" };
  const board = await loadPurchaseRequests();
  if (board.missing) return { missing: "purchase" };
  return {
    missing: false,
    products: products.products,
    requests: board.requests,
    takenPrNos: board.requests.map((request) => request.prNo),
    today: shopToday(),
  };
}

export async function readPurchaseMigration() {
  return readFile(path.join(process.cwd(), "supabase/migrations/004_gp_purchase_requests.sql"), "utf8");
}

export function purchaseEditorUrl() {
  const ref = new URL(supabaseUrl()).hostname.split(".")[0];
  return `https://supabase.com/dashboard/project/${ref}/sql/new`;
}

function toRequest(row: RequestRow): PurchaseRequest {
  const rawLines = (
    Array.isArray(row.gp_purchase_request_lines)
      ? row.gp_purchase_request_lines
      : row.gp_purchase_request_lines
        ? [row.gp_purchase_request_lines]
        : []
  ).sort((left, right) => Number(left.line_no) - Number(right.line_no));

  return {
    id: Number(row.id),
    prNo: row.pr_no,
    prDate: row.pr_date,
    shipDateFrom: row.ship_date_from,
    shipDateTo: row.ship_date_to,
    notes: row.notes,
    lines: rawLines.map((line) => {
      const product = Array.isArray(line.gp_products) ? line.gp_products[0] : line.gp_products;
      return {
        id: Number(line.id),
        productId: Number(line.product_id),
        productName: product?.name ?? "",
        qtySold: num(line.qty_sold),
        leadTimeDays: num(line.lead_time_days),
        suggestedQty: num(line.suggested_qty),
        qtyRequest: num(line.qty_request),
      };
    }),
  };
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
