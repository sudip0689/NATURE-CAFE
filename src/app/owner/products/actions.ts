"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/storage";
import { toAmountString, toPaisa } from "@/lib/money";
import type { Database } from "@/lib/supabase/types";
// Type-only: a "use server" module may export async functions and nothing else,
// so the shared state shape and its initial value live in @/lib/form-state.
import type { FormState } from "@/lib/form-state";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

const UNIQUE_VIOLATION = "23505";
const BUCKET = "product-images";

interface ParsedProduct {
  name: string;
  category_id: string | null;
  price: string;
  is_active: boolean;
}

/** Shared validation. Returns a Bangla-free, jargon-free message or the row. */
function parseProduct(formData: FormData): ParsedProduct | string {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Enter the item name.";
  if (name.length > 80) return "Item name is too long (80 characters max).";

  const rawPrice = String(formData.get("price") ?? "").trim();
  if (!rawPrice) return "Enter a price.";

  let price: string;
  try {
    const paisa = toPaisa(rawPrice);
    if (paisa < 0) return "Price cannot be negative.";
    if (paisa > 99_999_999) return "That price is too large.";
    price = toAmountString(paisa);
  } catch {
    return "Price must be a number, like 120 or 120.50.";
  }

  const categoryId = String(formData.get("category_id") ?? "").trim();

  return {
    name,
    category_id: categoryId || null,
    price,
    is_active: formData.get("is_active") === "on",
  };
}

// Upload lives in @/lib/storage — shared with the UPI QR, which was failing
// for exactly the same reason.

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = parseProduct(formData);
  if (typeof parsed === "string") return { error: parsed, success: null };

  const supabase = await createClient();

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadImage(supabase, BUCKET, file);
    if ("error" in uploaded) return { error: uploaded.error, success: null };
    imageUrl = uploaded.url;
  }

  const { error } = await supabase
    .from("products")
    .insert({ ...parsed, image_url: imageUrl });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `"${parsed.name}" is already on the menu.`, success: null };
    }
    return { error: "Could not save the item. Try again.", success: null };
  }

  revalidatePath("/owner/products");
  revalidatePath("/pos");
  redirect("/owner/products");
}

export async function updateProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing item.", success: null };

  const parsed = parseProduct(formData);
  if (typeof parsed === "string") return { error: parsed, success: null };

  const supabase = await createClient();

  const patch: ProductUpdate = { ...parsed };

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadImage(supabase, BUCKET, file);
    if ("error" in uploaded) return { error: uploaded.error, success: null };
    patch.image_url = uploaded.url;
  } else if (formData.get("remove_image") === "on") {
    patch.image_url = null;
  }

  const { error } = await supabase.from("products").update(patch).eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `"${parsed.name}" is already on the menu.`, success: null };
    }
    return { error: "Could not save the item. Try again.", success: null };
  }

  // A price change must never reach into history — bill_items keep their own
  // snapshot, so old receipts still show what was actually charged.
  revalidatePath("/owner/products");
  revalidatePath("/pos");
  redirect("/owner/products");
}

export async function productRowAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id) return { error: "Missing item.", success: null };

  const supabase = await createClient();

  if (intent === "toggle") {
    const nextActive = formData.get("is_active") === "true";
    const { error } = await supabase
      .from("products")
      .update({ is_active: nextActive })
      .eq("id", id);

    if (error) return { error: "Could not update the item.", success: null };

    revalidatePath("/owner/products");
    revalidatePath("/pos");
    return {
      error: null,
      success: nextActive ? "Item is back on the menu." : "Item hidden from the till.",
    };
  }

  if (intent === "delete") {
    // "Delete if safe" — safe means never sold. bill_items would survive via
    // ON DELETE SET NULL, but an owner deleting a product they've been selling
    // almost always means "take it off the menu", so make them say so.
    const { count } = await supabase
      .from("bill_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);

    if ((count ?? 0) > 0) {
      return {
        error:
          "This item has already been sold, so it can't be deleted — its sales history depends on it. Hide it instead.",
        success: null,
      };
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: "Could not delete the item.", success: null };

    revalidatePath("/owner/products");
    revalidatePath("/pos");
    return { error: null, success: "Item deleted." };
  }

  return { error: "Unknown action.", success: null };
}
