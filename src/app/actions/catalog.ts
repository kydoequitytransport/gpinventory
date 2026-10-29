"use server";

import { revalidatePath } from "next/cache";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { uploadCatalogImage } from "@/lib/cloudinary-upload";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const name = readText(formData, "name", 80);
  if (!name) return { error: "Enter a category name, up to 80 characters." };

  const orderSequence = readOrder(formData);
  if (orderSequence === null) return { error: "Order sequence is a whole number from 0 up." };

  const pictureUrl = cloudinaryUrl(String(formData.get("picture_url") ?? ""));
  if (pictureUrl === null) return { error: "Upload the picture through Cloudinary, or leave it blank." };

  const shownInList = formData.get("shown_in_list") === "on";
  const id = readOptionalId(formData);
  if (id === null) return { error: "That category could not be found." };

  const supabase = await createClient();
  const payload = {
    name,
    order_sequence: orderSequence,
    picture_url: pictureUrl,
    shown_in_list: shownInList,
  };

  const { error } = id
    ? await supabase.from("gp_categories").update(payload).eq("id", id)
    : await supabase.from("gp_categories").insert(payload);

  if (error) return friendly(error, "Could not save the category.");

  revalidatePath("/products");
  revalidatePath("/products/categories");
  return {
    message: id
      ? "Category updated."
      : shownInList
        ? "Category added. It is now a tab on the product list."
        : "Category added.",
  };
}

export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const id = readOptionalId(formData);
  if (!id) return { error: "That category could not be found." };

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("gp_products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) return { error: countError.message };
  if (count && count > 0) {
    return { error: "This category still has products. Move or delete those products first." };
  }

  const { error } = await supabase.from("gp_categories").delete().eq("id", id);
  if (error) return friendly(error, "Could not delete the category.");

  revalidatePath("/products");
  revalidatePath("/products/categories");
  return { message: "Category deleted." };
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const name = readText(formData, "name", 120);
  if (!name) return { error: "Enter a product name, up to 120 characters." };

  const categoryId = Number(formData.get("category_id"));
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { error: "Choose a category. Add one first if the list is empty." };
  }

  const sku = readText(formData, "sku", 80);
  const description = readBlock(formData, "description", 2000);
  const supplier = readText(formData, "supplier", 120);
  const barcode = readText(formData, "barcode", 80);
  if (sku === null || description === null || supplier === null || barcode === null) {
    return { error: "One of the text fields is too long." };
  }

  let imageUrl = cloudinaryUrl(String(formData.get("image_url") ?? ""));
  if (imageUrl === null) return { error: "The saved image address is not valid." };

  const sellingPrice = readAmount(formData, "selling_price", 2);
  const cost = readAmount(formData, "cost", 2);
  const netPrice = readAmount(formData, "net_price", 2);
  const loyaltyPoints = readAmount(formData, "loyalty_points", 2);
  const commission = readAmount(formData, "commission", 2);
  const weightKg = readAmount(formData, "weight_kg", 3);
  const dimensionWCm = readAmount(formData, "dimension_w_cm", 2);
  const dimensionHCm = readAmount(formData, "dimension_h_cm", 2);
  if (
    sellingPrice === null ||
    cost === null ||
    netPrice === null ||
    loyaltyPoints === null ||
    commission === null ||
    weightKg === null ||
    dimensionWCm === null ||
    dimensionHCm === null
  ) {
    return { error: "Amounts stay at zero or above." };
  }

  const id = readOptionalId(formData);
  if (id === null) return { error: "That product could not be found." };

  const supabase = await createClient();
  const { data: category, error: categoryError } = await supabase
    .from("gp_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError) return { error: categoryError.message };
  if (!category) return { error: "That category is no longer in the list." };

  const incoming = formData.get("image");
  if (incoming instanceof File && incoming.size > 0) {
    const uploaded = await uploadCatalogImage(incoming, "gp-inventory/products");
    if ("error" in uploaded) return uploaded;
    imageUrl = uploaded.url;
  }

  const payload = {
    category_id: categoryId,
    name,
    sku,
    description,
    image_url: imageUrl,
    supplier,
    barcode,
    selling_price: sellingPrice,
    cost,
    net_price: netPrice,
    loyalty_points: loyaltyPoints,
    commission,
    weight_kg: weightKg,
    dimension_w_cm: dimensionWCm,
    dimension_h_cm: dimensionHCm,
    vat_exempted: formData.get("vat_exempted") === "on",
    visible_to_customer: formData.get("visible_to_customer") === "on",
    track_quantity: formData.get("track_quantity") === "on",
    sell_without_stock: formData.get("sell_without_stock") === "on",
    is_rental: formData.get("is_rental") === "on",
    is_addon: formData.get("is_addon") === "on",
  };

  if (id) {
    const { error } = await supabase.from("gp_products").update(payload).eq("id", id);
    if (error) return friendly(error, "Could not save the product.");
  } else {
    const { data, error } = await supabase.from("gp_products").insert(payload).select("id").single();
    if (error || !data) return friendly(error ?? { message: "Could not save the product." }, "Could not save the product.");
    const { error: stockError } = await supabase.from("gp_product_stock").insert({
      product_id: data.id,
      uom: "1 Piece",
      on_hand: 0,
      min_on_hand: 0,
    });
    if (stockError) return friendly(stockError, "Could not open a stock row for the product.");
  }

  revalidatePath("/products");
  revalidatePath("/products/categories");
  revalidatePath("/inventory");
  return { message: id ? "Product updated." : "Product saved into that category." };
}

export async function deleteProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const id = readOptionalId(formData);
  if (!id) return { error: "That product could not be found." };

  const supabase = await createClient();
  const { error } = await supabase.from("gp_products").delete().eq("id", id);
  if (error) return friendly(error, "Could not delete the product.");

  revalidatePath("/products");
  revalidatePath("/products/categories");
  return { message: "Product deleted." };
}

async function denyUnlessAdmin(): Promise<ActionState | null> {
  const profile = await getCurrentUser();
  if (profile.role !== "admin") {
    return { error: "Only an admin can change the catalog." };
  }
  return null;
}

function readOptionalId(formData: FormData) {
  const raw = String(formData.get("id") ?? "").trim();
  if (!raw) return undefined;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function readText(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (value.length > max) return null;
  return value;
}

function readBlock(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) return null;
  return value;
}

function readOrder(formData: FormData) {
  const raw = String(formData.get("order_sequence") ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 9999) return null;
  return value;
}

function readAmount(formData: FormData, key: string, digits: number) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 999999999) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function friendly(error: { code?: string; message: string }, fallback: string): ActionState {
  if (error.code === "23505") return { error: "That name or SKU is already in the catalog." };
  if (error.code === "23503") {
    return { error: "This category still has products. Move or delete those products first." };
  }
  if (error.code === "23514") return { error: "Check the name and the amounts." };
  return { error: error.message || fallback };
}
