import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell, OwnerBadge, ShellMenu } from "@/components/shell/app-shell";

const MENU = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/products", label: "Food Items" },
  { href: "/owner/categories", label: "Categories" },
  { href: "/owner/sales", label: "Sales Report" },
  { href: "/owner/reports", label: "Reports" },
  { href: "/owner/bills", label: "Bills" },
  { href: "/owner/settings", label: "Settings" },
  { href: "/pos", label: "Open Billing" },
];

/**
 * The management surface.
 *
 * requireOwner() runs once here, so no nested route can ship without the
 * guard. Everything visual now comes from AppShell — this file no longer
 * owns any header or container CSS of its own.
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
    <AppShell
      cafeName={cafeName}
      tagline={settings?.tagline ?? undefined}
      eyebrow="Management"
      showNav
      menu={<ShellMenu items={MENU} />}
      headerExtra={<OwnerBadge initial={cafeName.slice(0, 1).toUpperCase()} />}
    >
      {children}
      <p className="sr-only">Signed in as {user.profile.full_name}</p>
    </AppShell>
  );
}
