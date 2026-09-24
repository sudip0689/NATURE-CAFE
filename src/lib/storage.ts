import "server-only";

import type { createClient } from "@/lib/supabase/server";

/**
 * The one image upload path.
 *
 * Product photos and the UPI QR were doing this separately, in near-identical
 * code against two buckets, and both broke together when the storage write
 * policies were lost — see migration 0010. One helper now, so the next change
 * to how images are stored happens in one place and cannot fix half the app.
 *
 * Both callers are server actions that have already run requireOwner(). This
 * function does not re-check: it is not exported to the client and has no way
 * to know who is asking.
 */

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Kept in step with the allowed_mime_types on both buckets. If these two lists
 * drift, the cashier gets a file accepted here and rejected by storage, which
 * looks like the bug this replaced.
 */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type UploadResult = { url: string } | { error: string };

function extensionFor(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  if (fromName) return fromName;
  // Some Android pickers hand over a name with no extension at all.
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: "product-images" | "cafe-assets",
  file: File,
  /** Prefix so QR files are recognisable in the bucket listing. */
  prefix = "",
): Promise<UploadResult> {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Use a JPG, PNG or WebP image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image is too large. Keep it under 2 MB." };
  }

  const path = `${prefix}${crypto.randomUUID()}.${extensionFor(file)}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    // The counter gets a sentence; the log gets the reason. Without this the
    // policy failure that broke both uploads was invisible — every failure
    // looked identical from the outside, which is why it went unexplained.
    console.error("[storage] upload failed", {
      bucket,
      path,
      type: file.type,
      bytes: file.size,
      message: error.message,
    });
    return { error: "Could not upload the image. Try again." };
  }

  return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}
