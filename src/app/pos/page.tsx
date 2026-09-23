import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { AppHeader, HeaderLink } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/ui/states";
import { PosClient } from "./pos-client";
import type { PosProduct } from "./product-grid";

export const metadata = { title: "Billing · Nature Caffe" };

export default async function PosPage() {
  const supabase = await createClient();

  // Only active rows reach the till. RLS already hides inactive products from a
  // cashier; the filter keeps the owner's view of this screen identical to what
  // their staff see, rather than showing them items nobody else can sell.
  // The guard joins the same batch rather than gating it. Waiting for the
  // profile before even asking for the menu meant the till opened two round
  // trips slow, every time — and this is the screen that must open fastest.
  const [user, { data: products }, { data: categories }, settings] =
    await Promise.all([
      requireUser(),
      supabase
        .from("products")
        .select("id, name, price, image_url, category_id")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      getSettings(),
    ]);

  const menu: PosProduct[] = products ?? [];
  const isOwner = user.profile.role === "owner";

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader
        cafeName={settings?.cafe_name || "Nature Caffe"}
        eyebrow="Billing"
        wide
        headerExtra={
          <>
            <HeaderLink href="/bills">Bills</HeaderLink>
            {isOwner ? <HeaderLink href="/owner">Manage</HeaderLink> : null}
          </>
        }
      />

      {menu.length === 0 ? (
        <div className="mx-auto w-full max-w-app px-4 py-10 sm:px-5">
          <EmptyState
            title="The menu is empty"
            hint={
              isOwner
                ? "Add items and they appear here immediately."
                : "Ask the owner to add items before billing."
            }
            action={
              isOwner ? (
                <Link
                  href="/owner/products/new"
                  className="inline-flex min-h-touch items-center rounded-control bg-forest px-5 text-base font-medium text-white hover:bg-leaf"
                >
                  Add item
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <PosClient products={menu} categories={categories ?? []} />
      )}
    </div>
  );
}
