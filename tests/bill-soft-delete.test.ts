import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A deleted bill is still a row.
 *
 * That is the point of soft-deleting it — bill_items cascades, and the bill
 * number is unique and drawn from a sequence, so a real DELETE would take the
 * order lines with it and leave an unexplained hole in the numbering. The cost
 * of keeping the row is that every single read has to remember to exclude it,
 * and the one that forgets puts a deleted bill back into the day's takings.
 *
 * A helper would have been tidier than a test, and was tried: making it
 * generic over the select string so PostgREST could still infer the row type
 * sent tsc into a fatal out-of-memory. So the filter is written out at each
 * call site, and this walks the source to make sure it always is.
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
    // Far enough to cover the whole builder chain, which is a handful of
    // lines at most and always ends well before this.
    queries.push(source.slice(at, at + 600));
    at = source.indexOf('.from("bills")', at + 1);
  }
  return queries;
}

describe("every read of the bills table excludes deleted bills", () => {
  const files = sourceFiles(SOURCE_ROOT).filter((path) =>
    readFileSync(path, "utf8").includes('.from("bills")'),
  );

  it("finds the read paths it is supposed to be guarding", () => {
    // If this drops to zero the test has stopped testing anything — most
    // likely because the queries moved and nobody moved the guard.
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(files.map((path) => [path.replace(SOURCE_ROOT, "src"), path]))(
    "%s",
    (_label, path) => {
      for (const query of billQueries(readFileSync(path, "utf8"))) {
        expect(query).toContain('.is("deleted_at", null)');
      }
    },
  );
});

/**
 * The export route is the other way a bill can reach a person, and it reads
 * the table for a spreadsheet rather than for a page. Same rule.
 */
describe("the Excel export", () => {
  it("excludes deleted bills too", () => {
    const route = join(SOURCE_ROOT, "app", "owner", "bills", "export", "route.ts");
    const source = readFileSync(route, "utf8");
    for (const query of billQueries(source)) {
      expect(query).toContain('.is("deleted_at", null)');
    }
  });
});
