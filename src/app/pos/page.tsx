import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { AppHeader, HeaderIconLink } from "@/components/shell/app-shell";
import { GearIcon, ReceiptIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui/states";
import { PosClient } from "./pos-client";
import { listHoldOrders } from "./hold-actions";
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
  // The held orders join the same batch as the menu, so the Hold Orders count
  // is right on first paint rather than appearing a moment later.
  const [user, { data: products, error: menuError }, { data: categories }, settings, heldOrders] =
    await Promise.all([
      requireUser(),
      supabase
        .from("products")
        .select("id, name, price, image_url, category_id")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      getSettings(),
      listHoldOrders(),
    ]);

  /**
   * Menu order, not alphabetical.
   *
   * The query already returns each category's items in the order the printed
   * menu lists them. This groups those runs by category so the "All" tab reads
   * down the board the same way — otherwise every category's first item would
   * come first, then every second item, which is nobody's menu.
   *
   * PostgREST cannot order parent rows by a joined column, hence sorting here.
   * Array.prototype.sort is stable, so comparing only the category keeps the
   * within-category order the database already established.
   */
  const categoryRank = new Map((categories ?? []).map((c, i) => [c.id, i]));
  const rankOf = (categoryId: string | null) =>
    categoryId === null ? Number.MAX_SAFE_INTEGER : (categoryRank.get(categoryId) ?? Number.MAX_SAFE_INTEGER);

  const menu: PosProduct[] = [...(products ?? [])].sort(
    (a, b) => rankOf(a.category_id) - rankOf(b.category_id),
  );
  const isOwner = user.profile.role === "owner";

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <AppHeader
        cafeName={settings?.cafe_name || "Nature Caffe"}
        eyebrow="Billing"
        wide
        variant="counter"
        headerExtra={
          <>
            <HeaderIconLink href="/bills" label="Bills">
              <ReceiptIcon className="size-5" />
            </HeaderIconLink>
            {isOwner ? (
              <HeaderIconLink href="/owner" label="Manage">
                <GearIcon className="size-5" />
              </HeaderIconLink>
            ) : null}
          </>
        }
      />

      {menuError ? (
        // A failed query and an empty menu are different problems with
        // different fixes, and telling a cashier the menu is empty when the
        // network dropped sends them looking in the wrong place.
        <div className="mx-auto w-full max-w-app px-4 py-10 sm:px-5">
          <EmptyState
            title="Unable to load menu"
            hint="Check the connection and try again."
            action={
              <Link
                href="/pos"
                className="inline-flex min-h-touch items-center rounded-control bg-forest px-5 text-base font-medium text-white hover:bg-leaf"
              >
                Retry
              </Link>
            }
          />
        </div>
      ) : menu.length === 0 ? (
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
        <PosClient
          products={menu}
          categories={categories ?? []}
          initialHoldOrders={heldOrders}
        />
      )}
    </div>
  );
}
