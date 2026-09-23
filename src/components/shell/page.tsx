import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Page-level building blocks, so vertical rhythm is decided once.
 *
 * The old pages used py-8 and py-16 with ad-hoc mb-6/mt-8 between sections;
 * on a 360px phone that spent a third of the screen on whitespace. Everything
 * here sticks to the 4/8/12/16/20/24 scale.
 */

/** Title, optional one-line description, optional trailing action. */
export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-4">
      {back ? (
        <Link
          href={back.href}
          className="mb-1 inline-block text-meta text-brandmuted transition-colors hover:text-forest"
        >
          ← {back.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-page font-bold tracking-[-0.02em] text-forest lg:text-[1.65rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 text-meta text-brandmuted sm:text-[0.8rem]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/** A titled block. Sections sit 20px apart — never 40-80. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-5", className)}>
      {title ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-section font-bold text-forest">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * A table that may exceed the viewport.
 *
 * Only this box scrolls sideways — never the page. A six-column numeric table
 * genuinely cannot collapse to cards without losing the row-to-row comparison
 * that is its whole purpose, so it scrolls inside its own frame instead.
 */
export function ScrollableTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-card sm:border sm:border-brandline">
      <div className="min-w-full px-4 sm:px-0">{children}</div>
    </div>
  );
}

/** Responsive grid: 1 column on small phones, more as width allows. */
export function ResponsiveGrid({
  cols = 2,
  children,
  className,
}: {
  cols?: 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 2
          ? "grid-cols-1 min-[420px]:grid-cols-2"
          : "grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Compact action button used in page headers. */
export function HeaderAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-full bg-forest px-4 text-sm font-semibold text-white transition-colors hover:bg-leaf"
    >
      {children}
    </Link>
  );
}
