-- 0006_revoke_anon_execute.sql — close an exposure the Supabase linter caught.
--
-- `REVOKE ALL ... FROM public` in 0005 removed only the implicit PUBLIC grant.
-- Supabase additionally carries ALTER DEFAULT PRIVILEGES granting EXECUTE on
-- new functions in the public schema to `anon` and `authenticated`, and that
-- explicit grant survived the revoke — so create_bill was reachable at
-- /rest/v1/rpc/create_bill without signing in.
--
-- It was not exploitable: auth.uid() is null for anon, so the first guard
-- raises NOT_SIGNED_IN before anything is read or written. But an unauthenticated
-- caller has no business reaching a SECURITY DEFINER function at all, and
-- "it fails safely" is a weaker guarantee than "it cannot be called".

revoke all on function public.create_bill(jsonb, text, text, text, numeric, uuid) from anon;

-- Same treatment for the read-only reporting functions. These are SECURITY
-- INVOKER so RLS would return nothing to anon anyway; this just removes a
-- pointless endpoint.
revoke all on function public.get_dashboard_today() from anon;
revoke all on function public.get_sales_summary(date, date) from anon;

-- Note on the remaining linter warning: create_bill stays SECURITY DEFINER and
-- stays executable by `authenticated`. That is the design — it is the only way
-- to write to bills/bill_items, which deliberately have no INSERT policy — and
-- the function authorises every caller itself before touching anything.
