import { describe, expect, it } from "vitest";

import {
  daysAgoInKolkata,
  formatDate,
  formatDateTime,
  formatTime,
  kolkataDayAfter,
  kolkataDayStart,
  todayInKolkata,
} from "@/lib/datetime";

/** Whole days between two YYYY-MM-DD strings. */
const dayNumber = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000;

describe("café day boundaries", () => {
  it("a day starts at IST midnight, not UTC midnight", () => {
    expect(kolkataDayStart("2026-09-22")).toBe("2026-09-22T00:00:00+05:30");
    // The next café day begins 18:30 UTC on the previous calendar date.
    expect(kolkataDayAfter("2026-09-22")).toBe("2026-09-22T18:30:00.000Z");
  });

  it("the end date of a range is inclusive", () => {
    // A 23:59 IST sale on the 22nd must fall inside a 22nd-to-22nd filter.
    const lateSale = new Date("2026-09-22T18:29:00Z"); // 23:59 IST on the 22nd
    expect(lateSale >= new Date(kolkataDayStart("2026-09-22"))).toBe(true);
    expect(lateSale < new Date(kolkataDayAfter("2026-09-22"))).toBe(true);
  });
});

describe("date formatting", () => {
  it("uses dashes, as the spec's receipt does", () => {
    // en-GB's own output is slash-separated; the separator has to be ours.
    expect(formatDate("2026-09-22T06:30:00Z")).toBe("22-09-2026");
    expect(formatDate("2026-09-22T06:30:00Z")).not.toContain("/");
  });

  it("bucket a late-night sale on the day the café had it", () => {
    // 18:00 UTC = 23:30 IST on the 22nd.
    expect(formatDate("2026-09-22T18:00:00Z")).toBe("22-09-2026");
    // 18:45 UTC = 00:15 IST on the 23rd.
    expect(formatDate("2026-09-22T18:45:00Z")).toBe("23-09-2026");
    // 23:30 UTC on the 21st = 05:00 IST on the 22nd — UTC would say the 21st.
    expect(formatDate("2026-09-21T23:30:00Z")).toBe("22-09-2026");
  });

  it("renders a 12-hour clock in IST", () => {
    const time = formatTime("2026-09-22T11:05:00Z"); // 16:35 IST
    expect(time).toContain("04:35");
    expect(time.toLowerCase()).toContain("pm");
  });

  it("combines date and time for list rows", () => {
    expect(formatDateTime("2026-09-22T06:30:00Z")).toContain("22-09-2026");
  });
});

describe("relative days", () => {
  it("zero days ago is today", () => {
    expect(daysAgoInKolkata(0)).toBe(todayInKolkata());
  });

  it("counts whole days, including across month and year ends", () => {
    expect(dayNumber(todayInKolkata()) - dayNumber(daysAgoInKolkata(6))).toBe(6);
    expect(dayNumber(todayInKolkata()) - dayNumber(daysAgoInKolkata(45))).toBe(45);
    expect(dayNumber(todayInKolkata()) - dayNumber(daysAgoInKolkata(400))).toBe(400);
  });

  it("always returns a parseable YYYY-MM-DD", () => {
    for (const n of [0, 1, 6, 30, 31, 365]) {
      expect(daysAgoInKolkata(n)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
