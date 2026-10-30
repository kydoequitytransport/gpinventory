import { askFloor } from "@/lib/floor-ask";
import { sanitizeFacts } from "@/lib/floor-assistant";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("gp_profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle();
  const role: Role = profile?.role === "admin" ? "admin" : "employee";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const question = typeof row.question === "string" ? row.question.trim().slice(0, 500) : "";
  const facts = sanitizeFacts(row.facts, role);
  if (!question || !facts) {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  try {
    const reply = await askFloor(question, facts, role);
    return Response.json(reply);
  } catch {
    return Response.json({ error: "The assistant could not answer." }, { status: 502 });
  }
}
