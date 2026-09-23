import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell, ShellMenu } from "@/components/shell/app-shell";

/**
 * Bills are reached by both roles, so the chrome adapts rather than forking.
 *
 * An owner gets the management tabs; a cashier gets none, because Items /
 * Sales / Settings are routes they cannot open anyway — showing tabs that
 * bounce you back to the till is worse than showing no tabs.
 */
export default async function BillsLayout({ children }: LayoutProps<"/bills">) {
  const user = await requireUser();
  const isOwner = user.profile.role === "owner";

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("cafe_name")
    .eq("id", 1)
    .maybeSingle();

  return (
    <AppShell
      cafeName={settings?.cafe_name || "Nature Caffe"}
      eyebrow="Bills"
      showNav={isOwner}
      menu={
        isOwner ? (
          <ShellMenu
            items={[
              { href: "/owner", label: "Dashboard" },
              { href: "/owner/bills", label: "All Bills" },
              { href: "/pos", label: "Open Billing" },
            ]}
          />
        ) : (
          <ShellMenu
            items={[
              { href: "/pos", label: "Open Billing" },
              { href: "/bills", label: "Recent Bills" },
            ]}
          />
        )
      }
    >
      {children}
    </AppShell>
  );
}
