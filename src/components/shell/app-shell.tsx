import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { CrownIcon } from "@/components/icons";
import { NatureCaffeMark } from "@/app/login/welcome-art";
import { cn } from "@/lib/cn";
import { BottomNav, HeaderNav } from "./app-nav";

/**
 * The one application shell.
 *
 * Before this, four routes each rolled their own header and container —
 * max-w-[32rem], max-w-lg, max-w-3xl, with px-4/px-5 and py-8/py-16 — which is
 * why spacing looked arbitrary and why the bills pages had no navigation at
 * all. Every authenticated page now renders through here.
 *
 * Two things it guarantees that pages kept getting wrong on their own:
 *
 *   · The header is capped at 56px (--spacing-appheader), so it never eats a
 *     tenth of a phone screen.
 *   · <main> reserves exactly the bottom nav's height plus the device safe
 *     area, from the same token the nav is sized by. Content cannot end up
 *     underneath it.
 *
 * Not for the 58mm receipt — that route stays deliberately outside the shell.
 */
export function AppShell({
  cafeName,
  tagline,
  eyebrow,
  showNav = true,
  wide = false,
  headerExtra,
  menu,
  children,
}: {
  cafeName: string;
  tagline?: string;
  /** Small label beside the wordmark: "Owner", "Billing". */
  eyebrow?: string;
  /** Owner section tabs. Off for the till and for cashier-facing pages. */
  showNav?: boolean;
  /** Desktop content width: wide for tables and grids. */
  wide?: boolean;
  headerExtra?: React.ReactNode;
  menu?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-brandink">
      <AppHeader
        cafeName={cafeName}
        tagline={tagline}
        eyebrow={eyebrow}
        showNav={showNav}
        wide={wide}
        headerExtra={headerExtra}
        menu={menu}
      />

      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pt-4 sm:px-5 lg:px-6 lg:pt-6",
          wide ? "max-w-wide" : "max-w-app lg:max-w-wide",
          // The nav's own height, from the nav's own token, plus safe area.
          // Zeroed at lg where the bottom bar is gone.
          showNav
            ? "pb-[calc(var(--spacing-navclear)+env(safe-area-inset-bottom))] lg:pb-10"
            : "pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>

      {showNav ? <BottomNav /> : null}
    </div>
  );
}

/**
 * The 56px bar, on its own so the till can use it too.
 *
 * /pos owns its vertical layout — a menu pane that scrolls independently above
 * a pinned cart bar — so it cannot live inside AppShell's <main>. It used to
 * hand-roll a header instead, which wrapped onto two rows at 360px. Both
 * surfaces now render this, and there is one header in the app.
 */
export function AppHeader({
  cafeName,
  tagline,
  eyebrow,
  showNav = false,
  wide = false,
  headerExtra,
  menu,
}: {
  cafeName: string;
  tagline?: string;
  eyebrow?: string;
  showNav?: boolean;
  wide?: boolean;
  headerExtra?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  return (
    // no-print: /bills/[id]/print renders inside this shell, and app chrome
    // must never reach the thermal printer.
    <header className="no-print sticky top-0 z-20 shrink-0 border-b border-brandline/70 bg-ivory/95 backdrop-blur-sm">
      <div
        className={cn(
          "mx-auto flex h-appheader w-full items-center gap-2 px-4 sm:px-5 lg:px-6",
          wide ? "max-w-wide" : "max-w-app lg:max-w-wide",
        )}
      >
        {menu ?? null}

        {/* min-h-touch: the wordmark is a link home and was 31px tall. */}
        <Link
          href="/"
          className="flex min-h-touch min-w-0 flex-1 items-center gap-2 rounded-xl transition-colors duration-150 active:bg-mint/60"
        >
          <NatureCaffeMark className="w-7 shrink-0" />
          <span className="min-w-0">
            {/* The two-tone wordmark is the brand; a café that renamed itself
                in Settings gets its own name instead, or the header would
                quietly ignore that setting. */}
            <span className="block truncate text-[0.98rem] font-bold leading-none tracking-[-0.01em]">
              {cafeName.trim().toLowerCase() === "nature caffe" ? (
                <>
                  <span className="text-forest">Nature</span>{" "}
                  <span className="text-caramel">Caffe</span>
                </>
              ) : (
                <span className="text-forest">{cafeName}</span>
              )}
            </span>
            {eyebrow ? (
              <span className="mt-0.5 block truncate text-[0.55rem] font-medium uppercase tracking-[0.16em] text-brandmuted">
                {eyebrow}
              </span>
            ) : tagline ? (
              <span className="mt-0.5 hidden truncate text-[0.55rem] font-medium uppercase tracking-[0.16em] text-brandmuted sm:block">
                {tagline}
              </span>
            ) : null}
          </span>
        </Link>

        {showNav ? <HeaderNav /> : null}

        {headerExtra}

        <form action={signOut} className="shrink-0">
          <button
            type="submit"
            className="flex min-h-touch items-center rounded-full px-3 text-xs font-medium text-brandmuted transition-colors duration-150 hover:bg-mint hover:text-forest active:bg-mint active:text-forest sm:px-3.5"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

/** A header link sized to sit beside the wordmark without wrapping. */
export function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-touch shrink-0 items-center rounded-full px-3 text-xs font-medium text-brandink transition-colors duration-150 hover:bg-mint hover:text-forest active:bg-mint active:text-forest sm:text-sm"
    >
      {children}
    </Link>
  );
}

/** Owner badge + online dot, shown on the management surface only. */
export function OwnerBadge({ initial }: { initial: string }) {
  return (
    <>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brandline bg-white/70 px-2 py-1 min-[420px]:flex lg:hidden xl:flex">
        <CrownIcon className="size-3.5 text-caramel" />
        <span className="text-[0.65rem] font-semibold leading-none text-brandink">
          Owner
        </span>
      </span>
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-white">
        {initial}
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-ivory bg-leaf" />
      </span>
    </>
  );
}
