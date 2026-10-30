import type { InvoiceAutofill } from "@/lib/invoices";

const model = "qwen/qwen3.8-27b";
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ReaderCatalogItem = {
  name: string;
  sku: string;
  sellingPrice: number;
};

export async function readInvoicePhoto(
  file: File,
  catalog: ReaderCatalogItem[],
): Promise<InvoiceAutofill> {
  const key = process.env.GROQ_API_KEY?.trim() ?? "";
  if (!key || key.startsWith("your-")) {
    throw new ReaderError("Groq is not set up.", 503);
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    throw new ReaderError("Use a photo of the invoice.", 400);
  }
  if (!imageTypes.has(file.type)) {
    throw new ReaderError("Use a JPEG, PNG, or WebP photo.", 400);
  }
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    throw new ReaderError("Use a photo under 8 MB.", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  const catalogText = catalog
    .slice(0, 80)
    .map((item) => `${item.sku}\t${item.name}\t${item.sellingPrice}`)
    .join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You read one photo of a sales invoice for a gym equipment shop. Return one JSON object and nothing else. Copy only what is printed. Match a line to the catalog when it is the same product and then use that catalog sku and name. Leave sku empty when nothing in the catalog matches. Prices and quantities are numbers. Omit a field when the photo does not show it.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Catalog, tab separated, sku name price:\n${catalogText || "(empty)"}\n\nJSON keys: customer, attention, deliverTo, tel, poNo, terms, siType, vatCode, lines. terms is one of 7 Days, 15 Days, 30 Days, COD. siType is Cash or Charge. vatCode is E or VE. lines is an array of {name, sku, qty, unitPrice}.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new ReaderError("The photo could not be read.", response.status === 401 ? 503 : 502);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = (payload.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "");
  return parseAutofill(content);
}

export function parseAutofill(content: string): InvoiceAutofill {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new ReaderError("The photo did not come back as an invoice.", 502);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(content.slice(start, end + 1));
  } catch {
    throw new ReaderError("The photo did not come back as an invoice.", 502);
  }
  if (!raw || typeof raw !== "object") {
    throw new ReaderError("The photo did not come back as an invoice.", 502);
  }
  const row = raw as Record<string, unknown>;
  const terms = oneOf(row.terms, ["7 Days", "15 Days", "30 Days", "COD"]);
  const siType = oneOf(row.siType, ["Cash", "Charge"]);
  const vatCode = oneOf(row.vatCode, ["E", "VE"]);
  return {
    customer: text(row.customer),
    attention: text(row.attention),
    deliverTo: text(row.deliverTo),
    tel: text(row.tel),
    poNo: text(row.poNo),
    terms,
    siType,
    vatCode: vatCode as "E" | "VE" | undefined,
    lines: lines(row.lines),
  };
}

export class ReaderError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function lines(value: unknown): InvoiceAutofill["lines"] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = text(row.name);
    if (!name) return [];
    const qty = Number(row.qty);
    const unitPrice = Number(row.unitPrice);
    return [
      {
        name,
        sku: text(row.sku),
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : null,
      },
    ];
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 240) : "";
}

function oneOf(value: unknown, allowed: string[]) {
  const next = text(value);
  return allowed.find((item) => item.toLowerCase() === next.toLowerCase());
}
