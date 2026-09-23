import { redirect } from "next/navigation";

import { getSessionRole, homeRouteFor } from "@/lib/auth";

/**
 * `/` is a signpost, not a page. Owners land on the dashboard, cashiers at the
 * till, and everyone else at login.
 *
 * Reads the role from the cookie rather than the database: this route renders
 * nothing and redirects immediately, so a profile lookup only added a round
 * trip in front of the page the visitor actually wanted. The destination
 * guards the real check.
 */
export default async function RootPage() {
  const role = await getSessionRole();

  if (!role) redirect("/login");
  redirect(homeRouteFor(role));
}
