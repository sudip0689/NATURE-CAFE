"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { signOut } from "@/app/login/actions";
import {
  BoltIcon,
  CartIcon,
  ChartIcon,
  CloseIcon,
  CutleryIcon,
  GearIcon,
  HomeIcon,
  MenuIcon,
  ReceiptIcon,
  SignOutIcon,
  TagIcon,
} from "@/components/icons";
import { NatureCaffeMark } from "@/app/login/welcome-art";
import { cn } from "@/lib/cn";

/**
 * Icons are named, not passed.
 *
 * The layouts that build these lists are Server Components, and a function
 * cannot cross into a Client Component — React refuses the whole tree with
 * "Functions cannot be passed directly to Client Components". A string can,
 * so the mapping to an actual component happens on this side of the line.
 */
const ICONS = {
  home: HomeIcon,
  cutlery: CutleryIcon,
  tag: TagIcon,
  chart: ChartIcon,
  bolt: BoltIcon,
  receipt: ReceiptIcon,
  gear: GearIcon,
  cart: CartIcon,
} as const;

/** Subscribe half of the hydration check: a store that never emits. */
const NEVER_CHANGES = () => () => {};

export interface DrawerItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Exact match only — /owner would otherwise light up on every child route. */
  exact?: boolean;
}

/**
 * The management navigation drawer.
 *
 * Replaces a <details> dropdown: a 207px white panel hanging off the header,
 * with 40px rows and a 36px summary to open it. Both were under the 44px a
 * finger reliably hits, which is most of why this screen felt unresponsive —
 * taps were missing, not arriving late.
 *
 * Client state rather than <details> because a drawer has to do things markup
 * alone cannot: dim the page behind it, close when the page behind is tapped,
 * close on Escape, and answer the Android back button without also leaving the
 * page. The cost is a small client component; the header and every page around
 * it stay server-rendered.
 */
export function ShellDrawer({
  items,
  eyebrow = "Management",
  cafeName,
}: {
  items: DrawerItem[];
  eyebrow?: string;
  cafeName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * True only once hydrated. The portal needs a real `document`, which the
   * server render does not have, and the two snapshots keep the server and
   * first client render agreeing so hydration stays quiet.
   */
  const mounted = useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );

  // Android back closes the drawer instead of leaving the page.
  //
  // Opening pushes a history entry at the same URL; the system back button
  // pops it, which arrives here as popstate and simply closes the drawer.
  useEffect(() => {
    if (!open) return;

    window.history.pushState({ nc_drawer: true }, "");
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  /**
   * The X, the dimmed page and Escape.
   *
   * Goes back rather than setting state, so the entry added on open is
   * unwound and the user does not have to press Android back twice to leave
   * the page afterwards. popstate does the actual closing.
   */
  const dismiss = useCallback(() => {
    if (window.history.state?.nc_drawer) window.history.back();
    else setOpen(false);
  }, []);

  /**
   * Tapping a destination.
   *
   * Closes without unwinding: the router is about to push its own entry, and
   * racing history.back() against that navigation lands on the wrong page.
   * The leftover entry is the same URL, so Back from the new page still
   * returns where it should.
   */
  const close = useCallback(() => setOpen(false), []);

  // Escape, and the scroll lock that stops the page sliding behind the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, dismiss]);

  const isActive = (item: DrawerItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  /**
   * The panel is portalled to <body>, not rendered where it sits.
   *
   * It lives inside the app header, and that header carries backdrop-blur.
   * A backdrop-filter makes an element a containing block for `position:
   * fixed` descendants, so `fixed inset-0` resolved against the 56px header
   * instead of the viewport: the drawer measured the right width and the
   * right offset while actually being clipped to a strip at the top of the
   * screen, with the page showing straight through it.
   */
  const panel = (
    <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          // pointer-events, not just visibility. `invisible` is delayed by
          // 150ms so the panel can slide out, and for those 150ms this was
          // still visible and still hit-testable across the whole screen at
          // z-40 — an opacity-0 scrim swallows taps exactly like an opaque
          // one. Closing the menu left the app dead to the touch for a sixth
          // of a second afterwards.
          open ? "visible" : "pointer-events-none invisible delay-150",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={dismiss}
          className={cn(
            "absolute inset-0 bg-brandink/45 transition-opacity duration-150",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            // 82% of the screen, capped — a drawer, not a page. The cap keeps
            // it sane on a large phone in landscape.
            "absolute inset-y-0 left-0 flex w-[82%] max-w-[20rem] flex-col bg-ivory",
            "shadow-[8px_0_28px_rgba(90,46,18,0.18)] transition-transform duration-150 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-brandline/70 px-4 py-3">
            <NatureCaffeMark className="w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.02rem] font-bold leading-none tracking-[-0.01em]">
                {cafeName.trim().toLowerCase() === "nature caffe" ? (
                  <>
                    <span className="text-forest">Nature</span>{" "}
                    <span className="text-caramel">Caffe</span>
                  </>
                ) : (
                  <span className="text-forest">{cafeName}</span>
                )}
              </p>
              <p className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.16em] text-brandmuted">
                {eyebrow}
              </p>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={dismiss}
              aria-label="Close menu"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-brandmuted transition-colors duration-150 active:bg-mint active:text-forest"
            >
              <CloseIcon className="size-5" />
            </button>
          </header>

          <nav aria-label="Management" className="min-h-0 flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {items.map((item) => {
                const active = isActive(item);
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={close}
                      className={cn(
                        "flex min-h-[3rem] items-center gap-3 rounded-2xl px-3",
                        "text-[0.95rem] font-medium transition-colors duration-150",
                        active
                          ? "bg-mint text-forest"
                          : "text-brandink active:bg-mint/70",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5 shrink-0",
                          active ? "text-forest" : "text-caramel",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="shrink-0 border-t border-brandline/70 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-[3rem] w-full items-center gap-3 rounded-2xl px-3 text-[0.95rem] font-medium text-brandmuted transition-colors duration-150 active:bg-sand active:text-coffee"
              >
                <SignOutIcon className="size-5 shrink-0 text-caramel" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-brandink transition-colors duration-150 active:bg-mint lg:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      {/* Portalled only once mounted: document does not exist while the
          server renders this, and the button above is all the markup the
          first paint needs. */}
      {mounted ? createPortal(panel, document.body) : null}
    </>
  );
}
