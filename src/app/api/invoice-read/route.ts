import { readInvoicePhoto, ReaderError, type ReaderCatalogItem } from "@/lib/invoice-reader";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a photo of the invoice." }, { status: 400 });
  }

  let catalog: ReaderCatalogItem[] = [];
  try {
    const raw = JSON.parse(String(formData.get("catalog") ?? "[]")) as unknown;
    if (Array.isArray(raw)) {
      catalog = raw.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const name = typeof row.name === "string" ? row.name.trim() : "";
        if (!name) return [];
        return [
          {
            name: name.slice(0, 240),
            sku: typeof row.sku === "string" ? row.sku.trim().slice(0, 80) : "",
            sellingPrice: Number(row.sellingPrice) || 0,
          },
        ];
      });
    }
  } catch {
    catalog = [];
  }

  try {
    const fill = await readInvoicePhoto(file, catalog.slice(0, 80));
    return Response.json(fill);
  } catch (caught) {
    if (caught instanceof ReaderError) {
      return Response.json({ error: caught.message }, { status: caught.status });
    }
    return Response.json({ error: "The photo could not be read." }, { status: 502 });
  }
}
