import type { NextRequest } from "next/server";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kolkataDayAfter, kolkataDayStart } from "@/lib/datetime";
import {
  buildBillsWorkbook,
  exportFilename,
  type ExportItem,
} from "@/lib/bills-export";

/**
 * The bills the café is looking at, as a real .xlsx.
 *
 * Built on the server rather than in the page. The filters are already
 * expressed as a query here, the rows never have to reach the browser just to
 * be written back out, and — the reason that decided it — a WebView cannot
 * save a Blob it assembled itself. A plain URL with Content-Disposition is
 * something Android's download machinery already understands, which is what
 * lets one button work on the phone and on a desktop.
 */

/** The same ceiling the list uses, so an export matches what is on screen. */
const MAX_ROWS = 5000;

export async function GET(request: NextRequest) {
  // Management only, and the same gate the page uses — a route handler is not
  // covered by the owner layout.
  await requireOwner();

  const supabase = await createClient();
  const params = request.nextUrl.searchParams;

  const q = (params.get("q") ?? "").trim();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  // "Export All" just drops the filters rather than being a second route.
  const all = params.get("all") === "1";

  let query = supabase
    .from("bills")
    .select(
      "id, bill_number, customer_name, customer_mobile, subtotal, discount, total, payment_method, created_at",
    )
    // Deleted bills are still rows; every read has to say it wants live ones.
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (!all) {
    const needle = q.replace(/[%,()]/g, "");
    if (needle) {
      query = query.or(
        `bill_number.ilike.%${needle}%,customer_mobile.ilike.%${needle}%`,
      );
    }
    if (from) query = query.gte("created_at", kolkataDayStart(from));
    if (to) query = query.lt("created_at", kolkataDayAfter(to));
  }

  const { data: bills, error } = await query;
  if (error) {
    return new Response("The bills could not be read.", { status: 500 });
  }

  const rows = bills ?? [];

  // One round trip for the lines of every bill in the export, rather than one
  // per bill. An empty `in` list is not worth asking the database about.
  const ids = rows.map((bill) => bill.id);
  const items: ExportItem[] = ids.length
    ? ((
        await supabase
          .from("bill_items")
          .select("bill_id, product_name, quantity, unit_price, line_total, created_at")
          .in("bill_id", ids)
          .order("created_at")
      ).data ?? [])
    : [];

  const buffer = await buildBillsWorkbook(rows, items);
  const name = exportFilename(all ? "" : from, all ? "" : to);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(buffer.byteLength),
      // A spreadsheet of the day's takings has no business in a shared cache.
      "Cache-Control": "no-store",
    },
  });
}
