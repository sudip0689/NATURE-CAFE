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

const TABS = [
  { href: "/owner", label: "Home", Icon: HomeIcon },
  { href: "/owner/products", label: "Items", Icon: CutleryIcon },
  { href: "/owner/sales", label: "Sales", Icon: ChartIcon },
  { href: "/owner/bills", label: "Bills", Icon: ReceiptIcon },
  { href: "/owner/settings", label: "Settings", Icon: GearIcon },
] as const;

export function OwnerBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Management sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-brandline bg-ivory/95 backdrop-blur-sm"
    >
      {/* The inset padding keeps the row clear of the Android gesture bar and
          the iOS home indicator; without it the last 20-30px of tap target sit
          under the system chrome. */}
      <ul className="mx-auto flex w-full max-w-[32rem] items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon }) => {
          // /owner must match exactly or it would light up on every child route.
          const active =
            href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-1.5"
              >
                <span
                  className={[
                    "flex h-8 w-full max-w-[4.5rem] items-center justify-center rounded-full transition-colors",
                    active ? "bg-mint text-forest" : "text-brandmuted",
                  ].join(" ")}
                >
                  <Icon className="size-5" />
                </span>
                <span
                  className={[
                    "text-[0.68rem] leading-none",
                    active ? "font-semibold text-forest" : "text-brandmuted",
                  ].join(" ")}
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
