import { cache } from "react";
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

/** Only the columns anything actually reads. */
export type SessionProfile = Pick<
  Profile,
  "id" | "username" | "full_name" | "role" | "is_active"
>;

export interface SessionUser {
  id: string;
  username: Username;
  profile: SessionProfile;
}

/**
 * The signed-in user, resolved from the cookie. Never redirects.
 *
 * Wrapped in React's cache() so it runs once per request no matter how many
 * callers ask. A layout and the page inside it both call requireUser(), and
 * /bills/[id] did so twice on every render — two identical round trips to a
 * database on another continent, for a row that cannot change mid-request.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const username = await readSession();
  if (!username) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, is_active")
    .eq("username", username)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return { id: profile.id, username, profile };
});

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

/**
 * The role, with no database round trip.
 *
 * The two usernames *are* the two roles — see USERNAMES in lib/session.ts —
 * so a screen that only needs to know where to send someone can read the
 * cookie and stop. Used by `/` and `/login`, which were each spending a
 * cross-continent query to learn something the cookie already said.
 *
 * Anything that acts on the user's behalf must still use requireUser(), which
 * checks the profile row really exists and is active.
 */
export async function getSessionRole(): Promise<UserRole | null> {
  return readSession();
}

export function homeRouteFor(role: UserRole): "/owner" | "/pos" {
  return role === "owner" ? "/owner" : "/pos";
}
