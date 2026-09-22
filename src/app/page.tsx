import { redirect } from "next/navigation";

import { getSessionUser, homeRouteFor } from "@/lib/auth";

/**
 * `/` is a signpost, not a page. Owners land on the dashboard, cashiers at the
 * till, and everyone else at login.
 */
export default async function RootPage() {
  const user = await getSessionUser();

  if (!user) redirect("/login");
  redirect(homeRouteFor(user.profile.role));
}
