import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * A number with a label. 90-120px tall per the brief, via min-height rather
 * than a fixed one, so a long note wraps instead of being clipped.
 *
 * Replaces the old StatCard, which was a 7rem-tall centred block with an icon
 * circle and a chevron — fine as a dashboard feature, far too tall when four
 * of them stack above a list on a phone.
 */
export function StatTile({
  label,
  value,
  note,
  tone = "plain",
  href,
  icon,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "plain" | "green" | "sand";
  href?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const shell = cn(
    "flex min-h-[4.5rem] flex-col justify-center rounded-2xl border px-3 py-2.5",
    tone === "green" && "border-leaf/20 bg-mint",
    tone === "sand" && "border-caramel/20 bg-sand",
    tone === "plain" && "border-brandline bg-white",
    className,
  );

  const body = (
    <>
      <span className="flex items-center gap-1.5 text-meta text-brandmuted">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "tabular mt-0.5 block truncate text-[1.3rem] font-bold leading-tight",
          tone === "green" ? "text-forest" : "text-brandink",
        )}
      >
        {value}
      </span>
      {note ? (
        <span className="mt-0.5 block truncate text-[0.68rem] leading-tight text-brandmuted">
          {note}
        </span>
      ) : null}
    </>
  );

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link href={href} className={cn(shell, "transition-colors hover:border-leaf/40")}>
      {body}
    </Link>
  );
}
