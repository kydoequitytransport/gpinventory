"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const listPath = "/inventory/purchase-requests";

export async function savePurchaseRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getCurrentUser();
  const id = readOptionalId(formData);
  if (id === null) return { error: "That purchase request could not be found." };

  const prNo = readPrNo(formData);
  if (!prNo) return { error: "Enter a PR number, or click the label to generate one." };

  const prDate = readDate(formData, "pr_date");
  const shipFrom = readDate(formData, "ship_date_from");
  const shipTo = readDate(formData, "ship_date_to");
  if (!prDate || !shipFrom || !shipTo) return { error: "Fill in the PR date and both ship dates." };
  if (shipTo < shipFrom) return { error: "Ship date to is earlier than ship date from." };

  const notes = readNotes(formData);
  if (notes === null) return { error: "Notes can be up to 2000 characters." };

  const lines = readLines(formData);
  if (!lines) return { error: "Check the quantities on each product row." };
  if (lines.length === 0) return { error: "Choose a product on at least one row." };

  const supabase = await createClient();
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { data: products, error: productError } = await supabase
    .from("gp_products")
    .select("id")
    .in("id", productIds);

  if (productError) return { error: productError.message };
  if ((products ?? []).length !== productIds.length) {
    return { error: "One of those products is no longer in the catalog." };
  }

  const header = {
    pr_no: prNo,
    pr_date: prDate,
    ship_date_from: shipFrom,
    ship_date_to: shipTo,
    notes,
    updated_at: new Date().toISOString(),
  };

  let requestId = id;
  if (requestId) {
    const { error } = await supabase.from("gp_purchase_requests").update(header).eq("id", requestId);
    if (error) return friendly(error, "Could not update the purchase request.");
  } else {
    const { data, error } = await supabase
      .from("gp_purchase_requests")
      .insert({ ...header, created_by: profile.id })
      .select("id")
      .single();
    if (error) return friendly(error, "Could not save the purchase request.");
    requestId = Number(data.id);
  }

  const { data: previous, error: previousError } = await supabase
    .from("gp_purchase_request_lines")
    .select("id, line_no")
    .eq("request_id", requestId);

  if (previousError) return { error: previousError.message };

  const previousRows = previous ?? [];
  for (const line of previousRows) {
    const { error } = await supabase
      .from("gp_purchase_request_lines")
      .update({ line_no: 100000 + Number(line.id) })
      .eq("id", line.id);
    if (error) return { error: error.message };
  }

  const { error: insertError } = await supabase.from("gp_purchase_request_lines").insert(
    lines.map((line, index) => ({
      request_id: requestId,
      line_no: index + 1,
      product_id: line.productId,
      qty_sold: line.qtySold,
      lead_time_days: line.leadTimeDays,
      suggested_qty: line.suggestedQty,
      qty_request: line.qtyRequest,
    })),
  );

  if (insertError) {
    for (const line of previousRows) {
      await supabase
        .from("gp_purchase_request_lines")
        .update({ line_no: line.line_no })
        .eq("id", line.id);
    }
    if (!id) await supabase.from("gp_purchase_requests").delete().eq("id", requestId);
    return friendly(insertError, "Could not save the product rows.");
  }

  const previousIds = previousRows.map((line) => line.id);
  if (previousIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("gp_purchase_request_lines")
      .delete()
      .in("id", previousIds);
    if (deleteError) return { error: deleteError.message };
  }

  revalidatePath(listPath);
  redirect(listPath);
}

export async function deletePurchaseRequest(formData: FormData) {
  await getCurrentUser();
  const id = readOptionalId(formData);
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("gp_purchase_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(listPath);
}

function readLines(formData: FormData) {
  const raw = String(formData.get("lines") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 40) return null;

  const lines: {
    productId: number;
    qtySold: number;
    leadTimeDays: number;
    suggestedQty: number;
    qtyRequest: number;
  }[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const productId = Number(record.productId);
    if (!Number.isInteger(productId) || productId <= 0) continue;

    const qtySold = readAmount(record.qtySold, false);
    const qtyRequest = readAmount(record.qtyRequest, false);
    const suggestedQty = readAmount(record.suggestedQty, true);
    const leadTimeDays = Number(record.leadTimeDays);
    if (
      qtySold === null ||
      qtyRequest === null ||
      suggestedQty === null ||
      !Number.isInteger(leadTimeDays) ||
      leadTimeDays < 0 ||
      leadTimeDays > 3650
    ) {
      return null;
    }

    lines.push({ productId, qtySold, leadTimeDays, suggestedQty, qtyRequest });
  }

  return lines;
}

function readAmount(value: unknown, allowNegative: boolean) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!allowNegative && parsed < 0) return null;
  if (parsed > 999999999 || parsed < -999999999) return null;
  return Math.round(parsed * 1000) / 1000;
}

function readPrNo(formData: FormData) {
  const value = String(formData.get("pr_no") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!value || value.length > 40) return null;
  return value;
}

function readDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function readNotes(formData: FormData) {
  const value = String(formData.get("notes") ?? "").trim();
  if (value.length > 2000) return null;
  return value;
}

function readOptionalId(formData: FormData) {
  const raw = String(formData.get("id") ?? "").trim();
  if (!raw) return undefined;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function friendly(error: { code?: string; message: string }, fallback: string): ActionState {
  if (error.code === "23505") return { error: "That PR number is already used." };
  if (error.code === "23503") return { error: "One of those products is no longer in the catalog." };
  if (error.code === "23514") return { error: "Check the dates and the quantities." };
  return { error: error.message || fallback };
}
