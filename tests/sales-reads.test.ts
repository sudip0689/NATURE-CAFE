import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A row in `bills` is not necessarily a sale.
 *
 * It was once: every bill was money taken, so the aggregates just counted
 * rows. Three changes since then each added a way for a bill to exist without
 * being a sale — soft delete (0012), the hold workflow (0013), cancellation
 * (0016) — and each time the filter had to be added to every function that
 * adds up money. Twice it was missed: 0014 caught get_management_summary
 * counting deleted and held bills, and 0017 caught get_daily_sales,
 * get_top_items and get_dashboard_today counting all three.
 *
 * The symptom is quiet and expensive: Reports showing ₹630 in its day rows
 * and ₹555 in the summary card above them, for the same day, with nothing to
 * say which one the owner should believe.
 *
 * These run in Postgres, so this cannot execute them. It reads the migrations
 * the way the database does — in order, last definition wins — and checks the
 * one that ends up live asks both questions.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

/** Everything that reports money taken, or counts the orders it came from. */
const SALES_FUNCTIONS = [
  "get_dashboard_today",
  "get_daily_sales",
  "get_top_items",
  "get_sales_summary",
  "get_management_summary",
];

/**
 * The definition the database is left with after every migration has run.
 *
 * Migrations are applied in filename order and a later one replaces an
 * earlier one, so the last file that defines a function is the one that
 * counts — which is exactly why reading only the migration that introduced
 * it would have missed all of these.
 */
function liveDefinition(name: string): { file: string; sql: string } | null {
  const pattern = new RegExp(
    String.raw`create\s+(?:or\s+replace\s+)?function\s+public\.${name}\s*\(`,
  );

  let found: { file: string; sql: string } | null = null;
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    const match = pattern.exec(sql);
    if (!match) continue;

    const end = sql.indexOf("$$;", match.index);
    found = {
      file,
      sql: sql.slice(match.index, end < 0 ? undefined : end),
    };
  }
  return found;
}

describe("every sales figure counts delivered, undeleted orders only", () => {
  it("finds a live definition for each of them", () => {
    // If a function is renamed and this is not, the loop below would pass by
    // checking nothing at all.
    const missing = SALES_FUNCTIONS.filter((name) => liveDefinition(name) === null);
    expect(missing).toEqual([]);
  });

  it.each(SALES_FUNCTIONS)("%s", (name) => {
    const live = liveDefinition(name);
    expect(live).not.toBeNull();

    expect(live!.sql).toContain("deleted_at is null");
    expect(live!.sql).toContain("status = 'delivered'");
  });
});

/**
 * The same question, asked of the application's own queries.
 *
 * The aggregates above are only half of it: the bills list, the export, the
 * receipt and the hold list all read the table directly, and each one has to
 * say which kind of order it means. A read that forgets puts a cancelled
 * order back on the sales list, or prints a receipt for food nobody has
 * handed over.
 */

const SOURCE_ROOT = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

/** The chain from `.from("bills")` up to the end of the statement. */
function billQueries(source: string): string[] {
  const queries: string[] = [];
  let at = source.indexOf('.from("bills")');
  while (at >= 0) {
    queries.push(source.slice(at, at + 700));
    at = source.indexOf('.from("bills")', at + 1);
  }
  return queries;
}

describe("every read of the bills table says which status it means", () => {
  const files = sourceFiles(SOURCE_ROOT).filter((path) =>
    readFileSync(path, "utf8").includes('.from("bills")'),
  );

  it("finds the read paths it is supposed to be guarding", () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files.map((path) => [path.replace(SOURCE_ROOT, "src"), path]))(
    "%s",
    (_label, path) => {
      for (const query of billQueries(readFileSync(path, "utf8"))) {
        expect(query).toMatch(/\.eq\("status", "(delivered|hold)"\)/);
      }
    },
  );
});
