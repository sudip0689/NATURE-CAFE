"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ChartIcon,
  CutleryIcon,
  GearIcon,
  HomeIcon,
  ReceiptIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

export const NAV_TABS = [
  { href: "/owner", label: "Home", Icon: HomeIcon },
  { href: "/owner/products", label: "Items", Icon: CutleryIcon },
  { href: "/owner/sales", label: "Sales", Icon: ChartIcon },
  { href: "/owner/bills", label: "Bills", Icon: ReceiptIcon },
  { href: "/owner/settings", label: "Settings", Icon: GearIcon },
] as const;

/** /owner must match exactly or it lights up on every child route. */
function isActive(pathname: string, href: string) {
  return href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);
}

/**
 * Bottom tab bar — phones and small tablets only.
 *
 * Hidden from lg upward, where HeaderNav takes over: a 64px bar pinned across
 * a 1280px screen is wasted furniture, and the brief asks for a real desktop
 * layout rather than the mobile one stretched.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-brandline bg-ivory/95 backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto flex w-full max-w-app items-stretch pb-[env(safe-area-inset-bottom)]">
        {NAV_TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex h-appnav flex-col items-center justify-center gap-0.5 px-1"
              >
                <span
                  className={cn(
                    "flex h-7 w-full max-w-[4rem] items-center justify-center rounded-full transition-colors",
                    active ? "bg-mint text-forest" : "text-brandmuted",
                  )}
                >
                  <Icon className="size-[1.15rem]" />
                </span>
                <span
                  className={cn(
                    "text-[0.65rem] leading-none",
                    active ? "font-semibold text-forest" : "text-brandmuted",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Inline nav for desktop, sitting in the header where there is room for it. */
export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {NAV_TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-mint text-forest"
                    : "text-brandmuted hover:bg-mint/60 hover:text-forest",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
