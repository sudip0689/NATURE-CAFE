import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { formatPlacedAt, formatWaited } from "@/lib/datetime";

/**
 * The hold workflow, in the two places it can go quietly wrong: the waiting
 * label a cashier reads off the screen, and the question of which orders count
 * as sales.
 */

describe("how long an order has been waiting", () => {
  const at = (iso: string) => new Date(iso);

  it("counts in minutes, then in hours", () => {
    const held = "2026-09-27T06:00:00.000Z";
    expect(formatWaited(held, at("2026-09-27T06:00:20.000Z"))).toBe("just now");
    expect(formatWaited(held, at("2026-09-27T06:01:00.000Z"))).toBe("1 min");
    expect(formatWaited(held, at("2026-09-27T06:12:00.000Z"))).toBe("12 min");
    expect(formatWaited(held, at("2026-09-27T06:59:00.000Z"))).toBe("59 min");
    expect(formatWaited(held, at("2026-09-27T07:00:00.000Z"))).toBe("1h");
    expect(formatWaited(held, at("2026-09-27T08:15:00.000Z"))).toBe("2h 15m");
  });

  it("never shows a negative wait", () => {
    // The timestamp comes from the database and the clock from the device.
    // They disagree by a second or two often enough that without the clamp an
    // order would appear to have been placed in the future.
    const held = "2026-09-27T06:00:00.000Z";
    expect(formatWaited(held, at("2026-09-27T05:59:55.000Z"))).toBe("just now");
    expect(formatWaited(held, at("2026-09-27T05:30:00.000Z"))).toBe("just now");
  });

  it("survives a timestamp it cannot read", () => {
    expect(formatWaited("not a date")).toBe("just now");
  });

  it("recomputes from the stored time, so closing the app changes nothing", () => {
    // Same held_at, two different "nows" — the label follows the clock rather
    // than any counter the app was keeping in memory.
    const held = "2026-09-27T06:00:00.000Z";
    expect(formatWaited(held, at("2026-09-27T06:05:00.000Z"))).toBe("5 min");
    expect(formatWaited(held, at("2026-09-27T09:20:00.000Z"))).toBe("3h 20m");
  });
});

describe("when the order was placed", () => {
  it("shows only the time for today, and the date for anything older", () => {
    const now = new Date("2026-09-27T12:00:00.000Z");
    // 06:12 UTC is 11:42 in Kolkata on the same day.
    expect(formatPlacedAt("2026-09-27T06:12:00.000Z", now)).not.toMatch(/Sep/);
    // Yesterday has to say so, or nobody can tell 12:42 from 12:42.
    expect(formatPlacedAt("2026-09-26T06:12:00.000Z", now)).toMatch(/Sep/);
  });
});

/**
 * A sale is a delivered order.
 *
 * The same problem as soft delete, one step further on: a held order is a row
 * in bills, so every read that means "sales" has to say so. The one that
 * forgets puts food still on the pass into the day's takings.
 */
const SOURCE_ROOT = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("reads that mean 'sales'", () => {
  // Where a bill is read as a completed sale. The hold list is deliberately
  // absent: it wants the opposite.
  //
  // The list of those reads used to be written out here, and it was wrong:
  // it named five screens and missed the two receipt pages and the receipt
  // builder, all of which would happily render a cancelled order. What walks
  // the source instead now lives in sales-reads.test.ts, which cannot be out
  // of date by construction.
  it("asks for held orders in exactly one place", () => {
    // If a second hold query appears it should be because someone meant it,
    // not because the filter was copied and flipped by accident.
    const holdReads = sourceFiles(SOURCE_ROOT).filter((path) =>
      readFileSync(path, "utf8").includes('.eq("status", "hold")'),
    );
    expect(holdReads.map((p) => p.replace(SOURCE_ROOT, "src"))).toEqual([
      join("src", "app", "pos", "hold-actions.ts"),
    ]);
  });

  it("still excludes deleted bills from the hold list", () => {
    const source = readFileSync(
      join(SOURCE_ROOT, "app", "pos", "hold-actions.ts"),
      "utf8",
    );
    const at = source.indexOf('.from("bills")');
    expect(source.slice(at, at + 700)).toContain('.is("deleted_at", null)');
  });
});
