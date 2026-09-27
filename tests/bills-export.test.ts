import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildBillsWorkbook,
  exportFilename,
  type ExportBill,
  type ExportItem,
} from "@/lib/bills-export";

/**
 * The workbook is read back with exceljs rather than inspected as an object.
 *
 * Everything that goes wrong with a generated spreadsheet goes wrong on the
 * way out: money written as text so nothing sums, a header that scrolls away,
 * a second sheet that exists but is empty. None of that shows up until the
 * file is opened, so these open it.
 */

const BILLS: ExportBill[] = [
  {
    id: "bill-1",
    bill_number: "NC000009",
    customer_name: "Indra",
    customer_mobile: "9932010492",
    subtotal: "184.00",
    discount: "0.00",
    total: "184.00",
    payment_method: "cash",
    created_at: "2026-09-24T14:11:00.000Z",
  },
  {
    id: "bill-2",
    bill_number: "NC000010",
    // The café's default when nobody gave a name.
    customer_name: "Walk-in Customer",
    customer_mobile: null,
    subtotal: "300.00",
    discount: "0.00",
    total: "300.00",
    payment_method: "upi",
    created_at: "2026-09-25T05:48:00.000Z",
  },
  {
    id: "bill-3",
    bill_number: "NC000011",
    customer_name: "Card Payer",
    customer_mobile: null,
    subtotal: "1500.00",
    discount: "50.00",
    total: "1450.00",
    payment_method: "card",
    created_at: "2026-09-26T06:00:00.000Z",
  },
];

const ITEMS: ExportItem[] = [
  { bill_id: "bill-1", product_name: "Masala Soda", quantity: 1, unit_price: "35.00", line_total: "35.00" },
  { bill_id: "bill-1", product_name: "Butter Chicken Pizza", quantity: 1, unit_price: "149.00", line_total: "149.00" },
  { bill_id: "bill-2", product_name: "Chicken Chest (2 PCS)", quantity: 1, unit_price: "150.00", line_total: "150.00" },
  { bill_id: "bill-2", product_name: "Chicken Leg (2 PCS)", quantity: 1, unit_price: "150.00", line_total: "150.00" },
  { bill_id: "bill-3", product_name: "Party Platter", quantity: 3, unit_price: "500.00", line_total: "1500.00" },
];

async function open(bills: ExportBill[], items: ExportItem[]) {
  const buffer = await buildBillsWorkbook(bills, items);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe("the bills workbook", () => {
  it("is a real xlsx that opens", async () => {
    const buffer = await buildBillsWorkbook(BILLS, ITEMS);
    const bytes = new Uint8Array(buffer);
    // A zip container, which is what xlsx is — not CSV wearing a hat.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const workbook = await open(BILLS, ITEMS);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["Bills", "Bill Items"]);
  });

  it("writes money as numbers, so the café can sum a column", async () => {
    const sheet = (await open(BILLS, ITEMS)).getWorksheet("Bills")!;

    const total = sheet.getRow(2).getCell("H");
    expect(typeof total.value).toBe("number");
    expect(total.value).toBe(184);
    // And formatted as money rather than as a bare count.
    expect(sheet.getColumn("H").numFmt).toBe("#,##0.00");

    // The discount column is real data too, not always zero.
    expect(sheet.getRow(4).getCell("G").value).toBe(50);
    expect(sheet.getRow(4).getCell("H").value).toBe(1450);
  });

  it("keeps the header in view", async () => {
    const workbook = await open(BILLS, ITEMS);
    for (const name of ["Bills", "Bill Items"]) {
      const view = workbook.getWorksheet(name)!.views[0];
      expect(view.state).toBe("frozen");
      expect(view).toMatchObject({ ySplit: 1 });
    }
  });

  it("names the columns the report asked for", async () => {
    const sheet = (await open(BILLS, ITEMS)).getWorksheet("Bills")!;
    const headers = sheet.getRow(1).values as string[];
    expect(headers.slice(1)).toEqual([
      "Bill Number", "Date", "Time", "Customer", "Mobile",
      "Subtotal", "Discount", "Total", "Payment", "Items", "Status",
    ]);
    expect(sheet.getRow(1).font?.bold).toBe(true);
  });

  it("counts the items on each bill", async () => {
    const sheet = (await open(BILLS, ITEMS)).getWorksheet("Bills")!;
    expect(sheet.getRow(2).getCell("J").value).toBe(2); // two lines
    expect(sheet.getRow(4).getCell("J").value).toBe(3); // one line, quantity 3
  });

  it("spells out the payment method rather than the database's word", async () => {
    const sheet = (await open(BILLS, ITEMS)).getWorksheet("Bills")!;
    expect(sheet.getRow(2).getCell("I").value).toBe("Cash");
    expect(sheet.getRow(3).getCell("I").value).toBe("UPI");
    expect(sheet.getRow(4).getCell("I").value).toBe("Card");
  });

  it("leaves the mobile blank rather than writing null", async () => {
    const sheet = (await open(BILLS, ITEMS)).getWorksheet("Bills")!;
    const mobile = sheet.getRow(3).getCell("E").value;
    expect(mobile === null || mobile === "").toBe(true);
    expect(sheet.getRow(3).getCell("D").value).toBe("Walk-in Customer");
  });

  it("lists every line on the second sheet, against its bill", async () => {
    const sheet = (await open(BILLS, ITEMS)).getWorksheet("Bill Items")!;
    // Header plus one row per line.
    expect(sheet.rowCount).toBe(1 + ITEMS.length);
    expect(sheet.getRow(2).getCell("A").value).toBe("NC000009");
    expect(sheet.getRow(2).getCell("C").value).toBe("Masala Soda");
    expect(sheet.getRow(2).getCell("D").value).toBe(1);
    expect(sheet.getRow(2).getCell("E").value).toBe(35);
    expect(sheet.getColumn("F").numFmt).toBe("#,##0.00");
  });

  it("produces a usable file when there is nothing to export", async () => {
    // An empty filter result must still open, not throw or write a corrupt zip.
    const workbook = await open([], []);
    expect(workbook.getWorksheet("Bills")!.rowCount).toBe(1);
    expect(workbook.getWorksheet("Bill Items")!.rowCount).toBe(1);
  });
});

describe("the filename", () => {
  it("says what is in it", () => {
    expect(exportFilename("", "", new Date("2026-09-27T10:00:00Z"))).toBe(
      "Nature-Caffe-Bills-2026-09-27.xlsx",
    );
    expect(exportFilename("2026-09-01", "2026-09-27")).toBe(
      "Nature-Caffe-Bills-2026-09-01-to-2026-09-27.xlsx",
    );
    expect(exportFilename("2026-09-01", "")).toBe("Nature-Caffe-Bills-from-2026-09-01.xlsx");
    expect(exportFilename("", "2026-09-27")).toBe("Nature-Caffe-Bills-to-2026-09-27.xlsx");
  });
});
