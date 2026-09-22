import { cookies } from "next/headers";

/**
 * Session for a password-less till.
 *
 * The cookie holds a username and nothing else. It is deliberately not signed,
 * and that is not an oversight: with no password, anyone can select "owner" on
 * the login screen, so a forged cookie grants exactly what the login form
 * already grants. Signing it would imply a guarantee that does not exist.
 *
 * If passwords are ever added, this is the file that has to change first —
 * sign the value, and stop treating the username as self-asserting.
 */

export const SESSION_COOKIE = "nc_session";

export const USERNAMES = ["owner", "cashier"] as const;
export type Username = (typeof USERNAMES)[number];

export function isUsername(value: string): value is Username {
  return (USERNAMES as readonly string[]).includes(value);
}

/** Roughly one long shift, so a counter tablet isn't logged out mid-service. */
const MAX_AGE_SECONDS = 12 * 60 * 60;

export async function readSession(): Promise<Username | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value && isUsername(value) ? value : null;
}

export async function startSession(username: Username): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, username, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
