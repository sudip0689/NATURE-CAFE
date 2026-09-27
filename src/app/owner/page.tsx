import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import {
  BoltIcon,
  CartIcon,
  ChartIcon,
  ChevronRight,
  CutleryIcon,
  GearIcon,
  LeafAccent,
  PeopleIcon,
  PlusIcon,
  PrinterIcon,
  QrIcon,
  ReceiptIcon,
  RupeeIcon,
  TagIcon,
} from "@/components/icons";

export const metadata = { title: "Management · Nature Caffe" };

export default async function ManagementDashboard() {
  const supabase = await createClient();

  const [{ data: summary }, { data: latestBill }] = await Promise.all([
    supabase.rpc("get_management_summary").single(),
    // Test Print needs something real to print; without a bill the action is
    // disabled rather than opening a broken receipt.
    supabase
      .from("bills")
      .select("id")
      // Deleted bills are still rows; every read has to say it wants live ones.
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const foodItems = summary?.food_items ?? 0;
  const todaysBills = summary?.todays_bills ?? 0;
  const todaysSales = summary?.todays_sales ?? "0";
  const customers = summary?.known_customers ?? 0;

  return (
    <div className="space-y-6">
      <HeroBanner />

      <section>
        <h2 className="sr-only">Today at a glance</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            href="/owner/products"
            tone="green"
            icon={<CutleryIcon className="size-5" />}
            value={String(foodItems)}
            label="Food Items"
            note={foodItems === 0 ? "No items yet" : undefined}
          />
          <StatTile
            href="/owner/bills"
            tone="sand"
            icon={<ReceiptIcon className="size-5" />}
            value={String(todaysBills)}
            label="Today's Bills"
            note={todaysBills === 0 ? "No bills yet" : undefined}
          />
          <StatTile
            href="/owner/sales"
            tone="green"
            icon={<RupeeIcon className="size-5" />}
            value={formatMoneyShort(todaysSales)}
            label="Today's Sales"
            note={todaysBills === 0 ? "No sales yet" : undefined}
          />
          <StatTile
            href="/owner/reports"
            tone="sand"
            icon={<PeopleIcon className="size-5" />}
            value={String(customers)}
            label="Happy Customers"
            note={customers === 0 ? "No customers yet" : "With a mobile on file"}
          />
        </div>
      </section>

      <section>
        <h2 className="sr-only">Manage the café</h2>
        {/* Two columns from 430px — the width the reference was drawn at, where
            they read exactly as designed. Below that a column is under 175px
            and both the titles and the descriptions wrap, so narrower phones
            get one readable column instead. The brief allows this: "a clean
            two-column grid on mobile where appropriate". */}
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 lg:grid-cols-3">
          <ManageCard
            href="/owner/products"
            tone="green"
            icon={<CutleryIcon className="size-6" />}
            title="Food Items"
            description="Add, edit or remove menu items"
          />
          <ManageCard
            href="/owner/categories"
            tone="brown"
            icon={<TagIcon className="size-6" />}
            title="Categories"
            description="Manage food categories"
          />
          <ManageCard
            href="/owner/sales"
            tone="brown"
            icon={<ChartIcon className="size-6" />}
            title="Sales Report"
            description="View daily, weekly & monthly sales"
          />
          <ManageCard
            href="/owner/bills"
            tone="green"
            icon={<ReceiptIcon className="size-6" />}
            title="Bills"
            description="View & reprint bills"
          />
          <ManageCard
            href="/owner/settings"
            tone="green"
            icon={<QrIcon className="size-6" />}
            title="UPI & Payment"
            description="Manage UPI QR and payment settings"
          />
          <ManageCard
            href="/owner/settings"
            tone="brown"
            icon={<GearIcon className="size-6" />}
            title="Settings"
            description="Café name, printer, preferences"
          />
        </div>
      </section>

      <KeepGrowingBanner />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[1.05rem] font-bold text-forest">
          <BoltIcon className="size-5 text-caramel" />
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-3">
          {/* The one a counter reaches for most, so it gets the solid fill. */}
          <QuickAction
            href="/pos"
            emphasis
            icon={<CartIcon className="size-5" />}
            title="Open Billing"
            subtitle="Go to POS Counter"
          />
          <QuickAction
            href={latestBill ? `/bills/${latestBill.id}/print` : undefined}
            icon={<PrinterIcon className="size-5" />}
            title="Test Print"
            subtitle={latestBill ? "Print latest bill" : "No bills to print yet"}
          />
          <QuickAction
            href="/owner/products/new"
            icon={<PlusIcon className="size-5" />}
            title="Add New Item"
            subtitle="Quick Add Food"
          />
        </div>
      </section>
    </div>
  );
}

/** ₹2,340 rather than ₹2,340.00 — the tile has room for one, not the other. */
function formatMoneyShort(amount: string): string {
  const full = formatMoney(amount);
  return full.endsWith(".00") ? full.slice(0, -3) : full;
}

function HeroBanner() {
  return (
    // Bleeds to the screen edge on a phone, where the banner is the whole
    // width; from lg it sits inside the content column as a card, because a
    // full-bleed strip across 1280px is a billboard, not a greeting. The
    // negative margin tracks <main>'s own padding at each step — mismatch it
    // and a few pixels of ivory show down each side.
    <section className="relative -mx-4 overflow-hidden border-y border-brandline/60 bg-sand/60 px-4 py-5 sm:-mx-5 sm:px-5 lg:mx-0 lg:rounded-3xl lg:border lg:px-8 lg:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(28rem 14rem at 88% 40%, rgba(184,117,50,0.18), transparent 70%)," +
            "radial-gradient(22rem 12rem at 2% 10%, rgba(31,138,76,0.16), transparent 70%)",
        }}
      />

      {/* Leaves top-left, cup bottom-right: atmosphere at low contrast, never
          competing with the text. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        className="pointer-events-none absolute -left-6 -top-8 w-28 text-leaf/35"
        fill="currentColor"
      >
        <ellipse cx="34" cy="26" rx="22" ry="12" transform="rotate(32 34 26)" />
        <ellipse cx="72" cy="58" rx="24" ry="13" transform="rotate(38 72 58)" />
        <ellipse cx="18" cy="66" rx="18" ry="10" transform="rotate(-22 18 66)" />
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 120 100"
        className="pointer-events-none absolute -bottom-3 right-1 w-24 text-caramel/25"
        fill="currentColor"
      >
        <path d="M18 34h62v26a31 31 0 0 1-62 0V34Z" />
        <path d="M80 42h10a13 13 0 0 1 0 26H80z" />
        <ellipse cx="49" cy="34" rx="31" ry="9" opacity="0.55" />
      </svg>

      <div className="relative">
        <p className="font-script text-[clamp(2rem,9vw,2.6rem)] leading-tight text-coffee">
          Welcome Back!
        </p>
        <p className="mt-0.5 text-[0.95rem] text-brandmuted">
          Let&apos;s make today amazing
        </p>

        <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-brandline bg-white/80 px-3 py-1.5 text-[0.78rem] text-brandink backdrop-blur-sm">
          <LeafAccent className="size-3.5 shrink-0 text-leaf" />
          <span className="truncate">
            &ldquo;Great Coffee Brings People Together&rdquo;
          </span>
        </p>
      </div>
    </section>
  );
}

function KeepGrowingBanner() {
  return (
    <section
      aria-hidden="true"
      className="relative overflow-hidden rounded-3xl border border-brandline bg-sand/70 px-5 py-6 text-center"
    >
      <svg
        viewBox="0 0 120 100"
        className="pointer-events-none absolute -right-2 bottom-0 w-24 text-caramel/20"
        fill="currentColor"
      >
        <path d="M18 34h62v26a31 31 0 0 1-62 0V34Z" />
        <path d="M80 42h10a13 13 0 0 1 0 26H80z" />
      </svg>
      <svg
        viewBox="0 0 80 80"
        className="pointer-events-none absolute -left-3 bottom-0 w-20 text-leaf/25"
        fill="currentColor"
      >
        <ellipse cx="26" cy="30" rx="17" ry="9" transform="rotate(-28 26 30)" />
        <ellipse cx="44" cy="46" rx="18" ry="9" transform="rotate(26 44 46)" />
        <rect x="30" y="52" width="4" height="26" rx="2" />
      </svg>

      <p className="font-script relative text-[clamp(1.9rem,8vw,2.4rem)] leading-tight text-coffee">
        Keep Growing
      </p>
      <p className="relative mt-1 text-[0.68rem] font-semibold uppercase leading-relaxed tracking-[0.18em] text-brandmuted">
        Good Management
        <br />
        Better Tomorrow
      </p>
      <div className="relative mx-auto mt-3 flex w-40 items-center gap-2">
        <span className="h-px flex-1 bg-brandline" />
        <LeafAccent className="size-3.5 shrink-0 text-leaf" />
        <span className="h-px flex-1 bg-brandline" />
      </div>
    </section>
  );
}

function StatTile({
  href,
  tone,
  icon,
  value,
  label,
  note,
}: {
  href: string;
  tone: "green" | "sand";
  icon: React.ReactNode;
  value: string;
  label: string;
  note?: string;
}) {
  const green = tone === "green";

  return (
    <Link
      href={href}
      className={[
        "group flex min-h-[7rem] flex-col items-center justify-center rounded-2xl border px-2 py-4 text-center",
        "shadow-[0_1px_6px_rgba(90,46,18,0.05)] transition-shadow hover:shadow-[0_4px_14px_rgba(90,46,18,0.10)]",
        green ? "border-leaf/20 bg-mint" : "border-caramel/20 bg-sand",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-10 items-center justify-center rounded-full",
          green ? "bg-leaf/15 text-forest" : "bg-caramel/15 text-coffee",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="tabular mt-2 block text-[1.5rem] font-bold leading-none text-brandink">
        {value}
      </span>
      <span className="mt-1 block text-[0.72rem] leading-tight text-brandmuted">
        {label}
      </span>
      {note ? (
        <span className="mt-0.5 block text-[0.62rem] leading-tight text-brandmuted/80">
          {note}
        </span>
      ) : null}

      <ChevronRight
        className={[
          "mt-1 size-3.5 transition-transform group-hover:translate-x-0.5",
          green ? "text-forest/50" : "text-coffee/50",
        ].join(" ")}
      />
    </Link>
  );
}

function ManageCard({
  href,
  tone,
  icon,
  title,
  description,
}: {
  href: string;
  tone: "green" | "brown";
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const green = tone === "green";

  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-2.5 rounded-2xl border p-2.5",
        "shadow-[0_1px_6px_rgba(90,46,18,0.05)] transition-shadow hover:shadow-[0_4px_14px_rgba(90,46,18,0.10)]",
        green ? "border-leaf/20 bg-mint" : "border-caramel/20 bg-sand",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-11 shrink-0 items-center justify-center rounded-xl text-white",
          green ? "bg-forest" : "bg-coffee",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={[
            "block text-[0.92rem] font-bold leading-tight",
            green ? "text-forest" : "text-coffee",
          ].join(" ")}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[0.72rem] leading-snug text-brandmuted">
          {description}
        </span>
      </span>

      <ChevronRight
        className={[
          "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
          green ? "text-forest/50" : "text-coffee/50",
        ].join(" ")}
      />
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  emphasis = false,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <span
        className={[
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          emphasis ? "bg-white/20 text-white" : "bg-caramel/15 text-coffee",
        ].join(" ")}
      >
        {icon}
      </span>
      {/* No chevron here: across three columns on a phone it costs the ~20px
          that the subtitle needs, and clipped text is worse than a missing
          affordance on a card that is entirely a link. */}
      <span className="min-w-0 flex-1">
        <span
          className={[
            "block text-[0.86rem] font-semibold leading-tight",
            emphasis ? "text-white" : "text-brandink",
          ].join(" ")}
        >
          {title}
        </span>
        <span
          className={[
            "mt-0.5 block text-[0.68rem] leading-tight",
            emphasis ? "text-white/80" : "text-brandmuted",
          ].join(" ")}
        >
          {subtitle}
        </span>
      </span>
    </>
  );

  const shell = [
    "flex min-h-[3.5rem] items-center gap-2.5 rounded-2xl border p-2.5",
    emphasis
      ? "border-forest bg-forest shadow-[0_4px_14px_rgba(14,90,53,0.22)]"
      : "border-brandline bg-white",
  ].join(" ");

  // No bill to print yet: shown, explained, and not clickable.
  if (!href) {
    return (
      <div className={`${shell} opacity-60`} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link href={href} className={`${shell} transition-shadow hover:shadow-md`}>
      {body}
    </Link>
  );
}
