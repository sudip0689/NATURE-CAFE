import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { readSession, type Username } from "@/lib/session";
import type { Profile, UserRole } from "@/lib/supabase/types";

/**
 * Server-side authorization.
 *
 * With Supabase Auth gone, the database can no longer tell who is calling, so
 * every role decision is made here and only here. These guards are the whole of
 * the owner/cashier separation — there is no second line behind them.
 *
 * What the database still enforces, regardless of this file: bills and
 * bill_items have no write policy, so no route can fabricate or edit a sale.
 */

export interface SessionUser {
  id: string;
  username: Username;
  profile: Profile;
}

/** The signed-in user, resolved from the cookie. Never redirects. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const username = await readSession();
  if (!username) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return { id: profile.id, username, profile };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Owner-only routes. A cashier who guesses the URL lands back at the till. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.profile.role !== "owner") redirect("/pos");
  return user;
}

export function homeRouteFor(role: UserRole): "/owner" | "/pos" {
  return role === "owner" ? "/owner" : "/pos";
}
