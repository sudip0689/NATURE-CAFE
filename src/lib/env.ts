/**
 * Supabase connection details.
 *
 * Read lazily, at request time, rather than at module load. The eager version
 * threw while `next build` was collecting page data — before any request
 * exists — so a deploy failed purely because the build machine had no values:
 *
 *   Error: Failed to collect configuration for /
 *   [cause]: Missing NEXT_PUBLIC_SUPABASE_URL
 *
 * Every route here is dynamic (server-rendered on demand), so nothing is
 * needed at build time. Reading on demand also means changing the values on
 * the host takes effect on the next request instead of requiring a rebuild.
 *
 * These are *publishable* values and ship to no one: this module is imported
 * only by src/lib/supabase/server.ts, which runs on the server. The
 * NEXT_PUBLIC_ names are kept because they are what the docs and .env.example
 * use, but the unprefixed spellings work too — nothing is inlined into the
 * browser bundle either way.
 *
 * The service-role key is deliberately absent and must never appear here.
 */

function read(primary: string | undefined, fallback: string | undefined, name: string): string {
  const value = (primary ?? fallback ?? "").trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in your hosting provider's environment ` +
        `variables (or copy .env.example to .env.local for local work). ` +
        `The app cannot reach its database without it.`,
    );
  }

  return value;
}

/**
 * Written out in full rather than looked up dynamically so that the values
 * still resolve if this module is ever imported from a client component —
 * Next.js substitutes NEXT_PUBLIC_* by literal text match, not at runtime.
 */
export function supabaseUrl(): string {
  return read(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
}

export function supabasePublishableKey(): string {
  return read(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}
