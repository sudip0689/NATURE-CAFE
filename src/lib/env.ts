/**
 * Supabase public configuration.
 *
 * These two values are *publishable* — they ship to the browser by design and
 * are safe there, because every table is behind RLS. The service-role key is
 * deliberately absent from this file and from the client bundle entirely; if a
 * future server-only task needs it, read it from `process.env` inside a server
 * module, never here.
 *
 * The references below are written out in full rather than looked up
 * dynamically: Next.js inlines `NEXT_PUBLIC_*` at build time by static text
 * substitution, so `process.env[name]` would silently evaluate to undefined in
 * the browser.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your ` +
        `Supabase project values, then restart the dev server.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
