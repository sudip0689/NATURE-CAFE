import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The café's single settings row, fetched once per request.
 *
 * Settings is one row with id = 1. Before this, a request for the receipt
 * screen fetched it twice — once in the bills layout for the header, once in
 * the page for the receipt — and the till fetched it again alongside the menu.
 * Each of those is a round trip to a database in another region.
 *
 * cache() is React's per-request memo, not a cross-request cache: an owner who
 * changes the café name still sees it on the very next request. That matters
 * here, because the alternative (unstable_cache) would need invalidating from
 * the settings action and would go stale if anyone ever edited the row
 * directly in Supabase.
 */
export const getSettings = cache(async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return data;
});

/** Just the header bits, so callers don't reach past what they need. */
export async function getCafeName(): Promise<string> {
  const settings = await getSettings();
  return settings?.cafe_name || "Nature Caffe";
}
