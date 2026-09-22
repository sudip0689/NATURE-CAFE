# Nature Caffe — Billing / POS

> Good Food · Good Mood

Café billing and point of sale: an owner manages the menu and sees the day's
takings, a cashier rings up orders at the counter and prints a 58 mm receipt.

Built to the specification in [`docs/SPEC.md`](docs/SPEC.md).

## Status — Phases 1–7 complete

| Phase | | |
|---|---|---|
| **1 — Foundation** | ✅ | Next.js, Tailwind, Supabase wiring, auth, schema, RLS |
| **2 — Owner** | ✅ | Dashboard, categories, product CRUD, settings, UPI, cashiers |
| **3 — Cashier** | ✅ | POS layout, search, category tabs, product grid, cart, customer, payment |
| **4 — Billing** | ✅ | `create_bill` RPC, bill numbers, item snapshots, idempotency, history, sales |
| **5 — Printing** | ✅ | 58 mm receipt, preview, UPI QR, browser print, printer abstraction |
| **6 — Reports** | ✅ | Day-by-day breakdown, top items, payment-method totals |
| **7 — Testing** | ◑ | 52 logic tests green; the DB acceptance suite is written but unrun |

`/owner` and `/pos` currently render an authenticated placeholder. They prove the
role split works end to end; Phases 2 and 3 fill them in.

## The rules this is built around

**A bill is immutable.** Bill lines store a *snapshot* of the product name and
price, and there is no `UPDATE` or `DELETE` policy on `bills` or `bill_items`.
Re-pricing a coffee tomorrow cannot rewrite what a customer was charged today.

**A cashier cannot set a price.** Enforced in Row Level Security, not by hiding
a button. There is no cashier-writable path to `products` at all — and no direct
`INSERT` path to `bills` either, so a bill cannot be POSTed to PostgREST with a
made-up `unit_price`. Bills will be created only by a `SECURITY DEFINER` RPC
that re-reads prices server-side (Phase 4).

**No stock module.** Deliberately. v1 is items, prices, categories, availability
and billing. No quantity-on-hand column exists anywhere in the schema.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |
| Database / Auth | Supabase (Postgres, RLS, GoTrue) |
| Money | `numeric(10,2)` in Postgres; integer paisa for any JS arithmetic |

Money is converted in exactly one place — [`src/lib/money.ts`](src/lib/money.ts).
Amounts cross the wire as strings and are never touched with `parseFloat`,
because `0.1 + 0.2 !== 0.3` and a till that is off by a paisa is a till nobody
trusts.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both are publishable and safe in the browser — every table is behind RLS. The
service-role key is never used by this app and must never appear in a
`NEXT_PUBLIC_*` variable.

## Database setup

Run these in the Supabase SQL Editor, in order:

| File | What it does |
|---|---|
| `supabase/migrations/0001_foundation.sql` | Profiles/roles, categories, products, bills, bill_items, settings, bill-number sequence, RLS on every table |
| `supabase/migrations/0002_owner_module.sql` | `product-images` storage bucket, `get_dashboard_today()` (bucketed on the Kolkata day) |
| `supabase/migrations/0003_cafe_assets.sql` | `cafe-assets` storage bucket for the UPI QR |
| `supabase/migrations/0004_profile_email.sql` | Mirrors the login email onto `profiles`, kept in sync by trigger |
| `supabase/migrations/0005_billing.sql` | `create_bill` (the only way a bill exists), idempotency key, `get_sales_summary()` |
| `supabase/migrations/0006_revoke_anon_execute.sql` | Removes the default `anon` EXECUTE grant on the RPCs |
| `supabase/migrations/0007_reports.sql` | `get_daily_sales()` and `get_top_items()`, both bucketed on the Kolkata day |
| `supabase/seed/001_categories.sql` | Starter menu categories (optional) |
| `supabase/seed/002_demo_menu.sql` | Demo items at the spec's example prices (optional; delete before going live) |

### Create the first owner

Every new auth user gets a profile automatically, defaulting to `cashier`. The
first owner has to be promoted deliberately:

1. Supabase Dashboard → **Authentication → Add user**, with a real email and
   password. Confirm the email.
2. Then in the SQL Editor:

```sql
update public.profiles
set role = 'owner', full_name = 'Owner name'
where id = (select id from auth.users where email = 'owner@example.com');
```

From Phase 2 on, the owner creates cashier accounts from within the app.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest, 52 checks
npm run test:watch # vitest in watch mode
```

## Tests

**`npm test`** covers the logic that doesn't need a database — money arithmetic,
cart behaviour, mobile validation, UPI links, café-day boundaries, the printer
abstraction, and the error catalogue. It runs in about a second.

**`supabase/tests/acceptance.sql`** covers what only the database can answer:
owner and cashier permissions, duplicate billing, price changes not rewriting
old receipts, and each payment method. Paste it into the Supabase SQL Editor.
It needs one active owner and one active cashier to exist, reports which are
missing rather than passing vacuously, and deletes every bill it creates.

## Deployment

Deploy to Vercel, setting the same two environment variables in the project's
settings. The Supabase project should sit in a region near the café — for
India, Mumbai (`ap-south-1`) — and Vercel's region set to match (`bom1`), so the
counter isn't waiting on a round trip across an ocean while a customer stands
there.

## Known limitations

- **Billing is not built yet.** Phase 1 ships the foundation only; a cashier
  cannot ring up a sale until Phase 4.
- **Printing goes through the browser only.** `printReceipt(receipt)` in
  `src/lib/printing/` picks the best registered printer and today that's the
  browser's own print dialog, styled to 58 mm. A Bluetooth or USB ESC/POS
  driver registers itself ahead of it and nothing in the billing UI changes —
  which is why the payload is structured data rather than a DOM node.
- **The receipt has not been run through a real thermal printer.** The layout
  is verified at 58 mm and 32 characters per line, but paper feed, cut, and
  codepage behaviour are untested on hardware.
- **A static UPI QR does not prove payment.** By design the cashier confirms
  receipt manually. This app makes no automatic payment verification claim, and
  should not until a real gateway or bank integration exists.
- **No offline mode.** The counter needs working connectivity.
