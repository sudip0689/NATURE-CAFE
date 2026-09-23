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
 * needed at build time.
 *
 * ---------------------------------------------------------------------------
 * Why the names are looked up through an array instead of written out
 *
 * Next.js replaces `process.env.NEXT_PUBLIC_ANYTHING` with the build-time
 * value as literal text, and it does this in the server bundle too — not just
 * the browser one. Writing the expression out therefore does NOT read the
 * environment at runtime; it reads whatever string the compiler pasted in.
 *
 * On Vercel the two values are marked Sensitive, so the build step saw
 * nothing and pasted in empty strings. Every request to /owner then died with
 * "Missing NEXT_PUBLIC_SUPABASE_URL" even though the variables were set,
 * because by then the code was no longer asking the environment at all.
 *
 * Indexing `process.env` with a name the compiler cannot see as a literal
 * defeats that substitution, so these become genuine runtime reads. That is
 * what we want regardless: nothing here is used in the browser (the only
 * consumer is src/lib/supabase/server.ts), and reading on demand means
 * changing a value on the host takes effect on the next request rather than
 * requiring a rebuild.
 *
 * Do not "simplify" this back to `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 *
 * The service-role key is deliberately absent and must never appear here.
 */

/** Indexed access — opaque to Next.js's literal NEXT_PUBLIC_* substitution. */
function fromEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * First name is canonical and the one .env.example documents; the unprefixed
 * spelling is accepted so a host that dislikes NEXT_PUBLIC_ on a server-only
 * value still works.
 */
function read(names: readonly [string, string]): string {
  for (const name of names) {
    const value = fromEnv(name);
    if (value) return value;
  }

  throw new Error(
    `Missing ${names[0]}. Set it in your hosting provider's environment ` +
      `variables (or copy .env.example to .env.local for local work). ` +
      `The app cannot reach its database without it.`,
  );
}

export function supabaseUrl(): string {
  return read(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
}

export function supabasePublishableKey(): string {
  return read([
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]);
}
