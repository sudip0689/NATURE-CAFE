import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Must be created per-request — never hoisted to a module-level singleton, or
 * one user's session would be served to the next request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session refresh in src/proxy.ts already wrote these, so ignoring
          // the throw here is correct rather than merely convenient.
        }
      },
    },
  });
}
