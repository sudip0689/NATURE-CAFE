import Link from "next/link";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { CrownIcon, MenuIcon } from "@/components/icons";
import { NatureCaffeMark } from "@/app/login/welcome-art";
import { OwnerBottomNav } from "./owner-bottom-nav";

/**
 * The management shell.
 *
 * requireOwner() runs once here and every nested route inherits it, so no child
 * page can ship without the guard. The chrome — header, bottom tabs, ivory
 * ground — is shared too, which is what keeps Products and Sales looking like
 * the same product as the dashboard rather than three separate screens.
 */
export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const user = await requireOwner();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("cafe_name, tagline")
    .eq("id", 1)
    .maybeSingle();

  const cafeName = settings?.cafe_name || "Nature Caffe";

  return (
    <div className="min-h-dvh bg-ivory text-brandink">
      <header className="sticky top-0 z-20 border-b border-brandline/70 bg-ivory/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[32rem] items-center gap-2 px-3 py-2.5">
          {/* <details> rather than a JS menu: it works before hydration and
              costs nothing on a page that is mostly links anyway. */}
          <details className="relative shrink-0">
            <summary
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-brandink transition-colors hover:bg-mint [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="size-6" />
            </summary>

            <div className="absolute left-0 top-12 z-30 w-56 overflow-hidden rounded-2xl border border-brandline bg-white shadow-[0_8px_28px_rgba(90,46,18,0.14)]">
              <MenuLink href="/owner">Dashboard</MenuLink>
              <MenuLink href="/owner/products">Food Items</MenuLink>
              <MenuLink href="/owner/categories">Categories</MenuLink>
              <MenuLink href="/owner/sales">Sales Report</MenuLink>
              <MenuLink href="/owner/reports">Reports</MenuLink>
              <MenuLink href="/owner/bills">Bills</MenuLink>
              <MenuLink href="/owner/settings">Settings</MenuLink>
              <MenuLink href="/pos">Open Billing</MenuLink>
              <form action={signOut} className="border-t border-brandline">
                <button
                  type="submit"
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-coffee transition-colors hover:bg-sand"
                >
                  Sign out
                </button>
              </form>
            </div>
          </details>

          <Link href="/owner" className="flex min-w-0 flex-1 items-center gap-2">
            <NatureCaffeMark className="w-8 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[1.05rem] font-bold leading-none tracking-[-0.01em]">
                <span className="text-forest">Nature</span>{" "}
                <span className="text-caramel">Caffe</span>
              </span>
              <span className="mt-0.5 block truncate text-[0.53rem] font-medium uppercase tracking-[0.16em] text-brandmuted">
                {settings?.tagline || "Good Food · Good Mood"}
              </span>
            </span>
          </Link>

          {/* Hidden below 380px, where the row would otherwise push the avatar
              off the edge. Visible on 390 and 430, as the reference shows. */}
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brandline bg-white/70 px-2 py-1 min-[380px]:flex">
            <CrownIcon className="size-4 text-caramel" />
            <span className="leading-tight">
              <span className="block text-[0.7rem] font-semibold text-brandink">
                Management
              </span>
              <span className="block text-[0.6rem] text-brandmuted">Owner Panel</span>
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">
              {cafeName.slice(0, 1).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-ivory bg-leaf" />
            </span>
            <span className="text-[0.55rem] leading-none text-brandmuted">Online</span>
          </span>
        </div>
      </header>

      {/* pb clears the fixed bottom bar plus the device safe area. */}
      <main className="mx-auto w-full max-w-[32rem] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
        {children}
      </main>

      <OwnerBottomNav />

      <p className="sr-only">Signed in as {user.profile.full_name}</p>
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-3 text-sm font-medium text-brandink transition-colors hover:bg-mint"
    >
      {children}
    </Link>
  );
}
