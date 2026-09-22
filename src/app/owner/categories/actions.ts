"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
// Type-only: a "use server" module may export async functions and nothing else.
import type { FormState } from "@/lib/form-state";

/** Postgres codes we translate into something a shopkeeper can act on. */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * One entry point per row, branching on an `intent` field, so a row needs a
 * single form and a single piece of state instead of three of each.
 */
export async function categoryRowAction(
  prev: FormState,
  formData: FormData,
): Promise<FormState> {
  switch (String(formData.get("intent") ?? "")) {
    case "rename":
      return renameCategory(prev, formData);
    case "toggle":
      return toggleCategory(prev, formData);
    case "delete":
      return deleteCategory(prev, formData);
    default:
      return { error: "Unknown action.", success: null };
  }
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a category name.", success: null };
  if (name.length > 40) {
    return { error: "Category name is too long (40 characters max).", success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `"${name}" already exists.`, success: null };
    }
    return { error: "Could not add the category. Try again.", success: null };
  }

  revalidatePath("/owner/categories");
  revalidatePath("/owner/products");
  return { error: null, success: `Added "${name}".` };
}

export async function renameCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Enter a category name.", success: null };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `"${name}" already exists.`, success: null };
    }
    return { error: "Could not rename the category.", success: null };
  }

  revalidatePath("/owner/categories");
  revalidatePath("/owner/products");
  return { error: null, success: "Renamed." };
}

export async function toggleCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("is_active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: nextActive })
    .eq("id", id);

  if (error) return { error: "Could not update the category.", success: null };

  revalidatePath("/owner/categories");
  revalidatePath("/owner/products");
  return {
    error: null,
    success: nextActive ? "Category is visible again." : "Category hidden.",
  };
}

export async function deleteCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    // products.category_id is ON DELETE RESTRICT, so Postgres refuses rather
    // than orphaning the menu. Say what to do about it instead of showing SQL.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return {
        error:
          "This category still has items in it. Move or delete those items first, or just hide the category instead.",
        success: null,
      };
    }
    return { error: "Could not delete the category.", success: null };
  }

  revalidatePath("/owner/categories");
  revalidatePath("/owner/products");
  return { error: null, success: "Category deleted." };
}
