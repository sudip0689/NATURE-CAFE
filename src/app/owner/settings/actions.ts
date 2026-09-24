"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/storage";
import type { Database } from "@/lib/supabase/types";

// Type-only: a "use server" module may export async functions and nothing else.
import type { FormState } from "@/lib/form-state";

type SettingsUpdate = Database["public"]["Tables"]["settings"]["Update"];

const BUCKET = "cafe-assets";

/** A UPI ID looks like name@bank. Keep it permissive — handles vary by PSP. */
const UPI_ID_PATTERN = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$/;
const PHONE_PATTERN = /^[0-9+\s-]{6,20}$/;

export async function updateSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const cafeName = String(formData.get("cafe_name") ?? "").trim();
  if (!cafeName) return { error: "The café needs a name.", success: null };

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone && !PHONE_PATTERN.test(phone)) {
    return { error: "That phone number doesn't look right.", success: null };
  }

  const upiId = String(formData.get("upi_id") ?? "").trim();
  if (upiId && !UPI_ID_PATTERN.test(upiId)) {
    return {
      error: "A UPI ID looks like naturecaffe@okhdfcbank — check the spelling.",
      success: null,
    };
  }

  const supabase = await createClient();

  const patch: SettingsUpdate = {
    cafe_name: cafeName,
    tagline: String(formData.get("tagline") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    phone,
    upi_id: upiId,
    upi_name: String(formData.get("upi_name") ?? "").trim(),
    receipt_footer: String(formData.get("receipt_footer") ?? "").trim(),
  };

  // The QR is optional in both directions: no file leaves upi_qr_url alone, so
  // the receipt keeps generating a QR from the UPI ID above, and ticking
  // "remove" clears it and hands the receipt back to that generated one.
  const file = formData.get("upi_qr");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadImage(supabase, BUCKET, file, "upi-qr-");
    if ("error" in uploaded) return { error: uploaded.error, success: null };
    patch.upi_qr_url = uploaded.url;
  } else if (formData.get("remove_qr") === "on") {
    patch.upi_qr_url = null;
  }

  const { error } = await supabase.from("settings").update(patch).eq("id", 1);

  if (error) return { error: "Could not save settings. Try again.", success: null };

  // The café name and UPI details show up in the shell and on every receipt.
  revalidatePath("/owner", "layout");
  revalidatePath("/pos");
  return { error: null, success: "Settings saved." };
}
