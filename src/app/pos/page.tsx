import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { EmptyState } from "@/components/ui/states";
import { PosClient } from "./pos-client";
import type { PosProduct } from "./product-grid";

export const metadata = { title: "Billing · Nature Caffe" };

export default async function PosPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Only active rows reach the till. RLS already hides inactive products from a
  // cashier; the filter keeps the owner's view of this screen identical to what
  // their staff see, rather than showing them items nobody else can sell.
  const [{ data: products }, { data: categories }, { data: settings }] =
    await Promise.all([
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
      supabase.from("settings").select("cafe_name").eq("id", 1).maybeSingle(),
    ]);

  const menu: PosProduct[] = products ?? [];
  const isOwner = user.profile.role === "owner";

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cream-300 bg-cream-50 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold tracking-[-0.02em] text-bean-800">
            {settings?.cafe_name || "Nature Caffe"}
          </span>
          <span className="text-xs uppercase tracking-[0.12em] text-ink-400">
            Billing
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="hidden px-2 text-sm text-ink-500 sm:inline">
            {user.profile.full_name}
          </span>
          <Link
            href="/bills"
            className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-ink-700 hover:bg-cream-200"
          >
            Bills
          </Link>
          {isOwner ? (
            <Link
              href="/owner"
              className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-ink-700 hover:bg-cream-200"
            >
              Dashboard
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </header>

      {menu.length === 0 ? (
        <div className="mx-auto w-full max-w-lg px-5 py-16">
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
                  className="inline-flex min-h-touch items-center rounded-control bg-bean-600 px-5 text-base font-medium text-cream-50 hover:bg-bean-700"
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
