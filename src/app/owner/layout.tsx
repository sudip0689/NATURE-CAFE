import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AppShell, OwnerBadge } from "@/components/shell/app-shell";
import { ShellDrawer, type DrawerItem } from "@/components/shell/shell-drawer";

const MENU: DrawerItem[] = [
  { href: "/owner", label: "Dashboard", icon: "home", exact: true },
  { href: "/owner/products", label: "Food Items", icon: "cutlery" },
  { href: "/owner/categories", label: "Categories", icon: "tag" },
  { href: "/owner/sales", label: "Sales Report", icon: "chart" },
  { href: "/owner/reports", label: "Top Items", icon: "bolt" },
  { href: "/owner/bills", label: "Bills", icon: "receipt" },
  { href: "/owner/settings", label: "Settings", icon: "gear" },
  { href: "/pos", label: "Open Billing", icon: "cart" },
];

/**
 * The management surface.
 *
 * requireOwner() runs once here, so no nested route can ship without the
 * guard. Everything visual now comes from AppShell — this file no longer
 * owns any header or container CSS of its own.
 */
export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  // Together, not one after the other. The settings row does not depend on who
  // is asking, so awaiting the guard first just put a round trip to Mumbai in
  // front of another one. If the guard redirects, the settings promise is
  // discarded — which costs nothing, because it was already in flight.
  const [user, settings] = await Promise.all([requireOwner(), getSettings()]);

  const cafeName = settings?.cafe_name || "Nature Caffe";

  return (
    <AppShell
      cafeName={cafeName}
      tagline={settings?.tagline ?? undefined}
      eyebrow="Management"
      showNav
      menu={<ShellDrawer items={MENU} cafeName={cafeName} eyebrow="Management" />}
      headerExtra={<OwnerBadge initial={cafeName.slice(0, 1).toUpperCase()} />}
    >
      {children}
      <p className="sr-only">Signed in as {user.profile.full_name}</p>
    </AppShell>
  );
}
