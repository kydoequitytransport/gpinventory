import {
  floorGuide,
  sanitizeReply,
  type FloorFacts,
  type FloorReply,
} from "@/lib/floor-assistant";
import type { Role } from "@/lib/types";

const model = "qwen/qwen3.8-27b";

export async function askFloor(question: string, facts: FloorFacts, role: Role): Promise<FloorReply> {
  const key = process.env.GROQ_API_KEY?.trim() ?? "";
  if (!key || key.startsWith("your-")) {
    throw new Error("Groq is not set up.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are the floor assistant for GP Inventory, a gym equipment shop in Caloocan.",
            "Answer in the same language as the question. Name the voucher, customer, and amount when the question is about invoices.",
            "Use only the shop records. Never invent pesos, counts, names, or dates.",
            "Never say facts, JSON, packet, or nakalista. If a name is missing, say it is not on this floor.",
            floorGuide(),
            "Return JSON {\"answer\":\"...\",\"actions\":[{\"label\":\"...\",\"href\":\"...\",\"openDraft\":false}]}.",
            "At most 3 actions. href must be one of /dashboard /invoices /sales /products /products/categories /inventory /inventory/purchase-requests /inventory/purchase-requests/new /team.",
            "Set openDraft true only for a new invoice.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Shop records:\n${JSON.stringify(facts)}\n\nQuestion: ${question.slice(0, 500)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("The assistant could not answer.");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = (payload.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The assistant could not answer.");
  const parsed = JSON.parse(content.slice(start, end + 1)) as unknown;
  const reply = sanitizeReply(parsed, role);
  if (!reply) throw new Error("The assistant could not answer.");
  return reply;
}
