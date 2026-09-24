import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AppShell } from "@/components/shell/app-shell";
import { ShellDrawer, type DrawerItem } from "@/components/shell/shell-drawer";


/**
 * Bills are reached by both roles, so the chrome adapts rather than forking.
 *
 * An owner gets the management tabs; a cashier gets none, because Items /
 * Sales / Settings are routes they cannot open anyway — showing tabs that
 * bounce you back to the till is worse than showing no tabs.
 */
export default async function BillsLayout({ children }: LayoutProps<"/bills">) {
  // Both at once — see the note in owner/layout.tsx.
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  const isOwner = user.profile.role === "owner";

  return (
    <AppShell
      cafeName={settings?.cafe_name || "Nature Caffe"}
      eyebrow="Bills"
      showNav={isOwner}
      menu={
        <ShellDrawer
          cafeName={settings?.cafe_name || "Nature Caffe"}
          eyebrow="Bills"
          items={
            (isOwner
              ? [
                  { href: "/owner", label: "Dashboard", icon: "home", exact: true },
                  { href: "/owner/bills", label: "All Bills", icon: "receipt" },
                  { href: "/pos", label: "Open Billing", icon: "cart" },
                ]
              : [
                  { href: "/pos", label: "Open Billing", icon: "cart" },
                  { href: "/bills", label: "Recent Bills", icon: "receipt" },
                ]) as DrawerItem[]
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
