import ExcelJS from "exceljs";

import { formatDate, formatTime } from "@/lib/datetime";

/**
 * Building the bills spreadsheet.
 *
 * Separate from the route handler so it can be tested: the things most likely
 * to be quietly wrong in a generated workbook — money arriving as text, a
 * header that does not stay put, a second sheet that silently holds nothing —
 * are all invisible until somebody opens the file, and "it downloaded" is not
 * the same as "it is usable".
 */

export interface ExportBill {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_mobile: string | null;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: string;
  created_at: string;
}

export interface ExportItem {
  bill_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

/** Two decimal places with thousands separators — money, not a count. */
const MONEY = "#,##0.00";

export async function buildBillsWorkbook(
  bills: ExportBill[],
  items: ExportItem[],
): Promise<ArrayBuffer> {
  const itemsByBill = new Map<string, ExportItem[]>();
  for (const item of items) {
    const list = itemsByBill.get(item.bill_id) ?? [];
    list.push(item);
    itemsByBill.set(item.bill_id, list);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nature Caffe";
  workbook.created = new Date();

  // ------------------------------------------------------------------ Bills

  const sheet = workbook.addWorksheet("Bills", {
    // Scrolling a month of sales past a header you can no longer see is how
    // the Total column gets mistaken for the Subtotal one.
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Bill Number", key: "number", width: 14 },
    { header: "Date", key: "date", width: 12 },
    { header: "Time", key: "time", width: 10 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Mobile", key: "mobile", width: 14 },
    { header: "Subtotal", key: "subtotal", width: 11 },
    { header: "Discount", key: "discount", width: 11 },
    { header: "Total", key: "total", width: 11 },
    { header: "Payment", key: "payment", width: 10 },
    { header: "Items", key: "items", width: 7 },
    { header: "Status", key: "status", width: 12 },
  ];

  for (const bill of bills) {
    const lines = itemsByBill.get(bill.id) ?? [];
    sheet.addRow({
      number: bill.bill_number,
      date: formatDate(bill.created_at),
      time: formatTime(bill.created_at),
      customer: bill.customer_name,
      mobile: bill.customer_mobile ?? "",
      // Numbers, not strings. A column of money nobody can sum is a picture
      // of a spreadsheet, and these arrive from Postgres as text.
      subtotal: Number(bill.subtotal),
      discount: Number(bill.discount),
      total: Number(bill.total),
      payment: PAYMENT_LABEL[bill.payment_method] ?? bill.payment_method,
      items: lines.reduce((sum, line) => sum + line.quantity, 0),
      status: "Completed",
    });
  }

  dress(sheet, ["F", "G", "H"]);

  // ------------------------------------------------------------- Bill Items

  const itemSheet = workbook.addWorksheet("Bill Items", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  itemSheet.columns = [
    { header: "Bill Number", key: "number", width: 14 },
    { header: "Date", key: "date", width: 12 },
    { header: "Product", key: "product", width: 30 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 12 },
    { header: "Line Total", key: "lineTotal", width: 12 },
  ];

  for (const bill of bills) {
    for (const line of itemsByBill.get(bill.id) ?? []) {
      itemSheet.addRow({
        number: bill.bill_number,
        date: formatDate(bill.created_at),
        product: line.product_name,
        quantity: line.quantity,
        unitPrice: Number(line.unit_price),
        lineTotal: Number(line.line_total),
      });
    }
  }

  dress(itemSheet, ["E", "F"]);

  return workbook.xlsx.writeBuffer();
}

function dress(sheet: ExcelJS.Worksheet, moneyColumns: string[]): void {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  for (const column of moneyColumns) {
    sheet.getColumn(column).numFmt = MONEY;
  }
}

/**
 * Nature-Caffe-Bills-2026-09-27.xlsx, or the range when one was chosen.
 *
 * Dated so a folder of these sorts and reads sensibly, rather than becoming
 * four copies of bills(3).xlsx.
 */
export function exportFilename(from: string, to: string, today = new Date()): string {
  if (from && to) return `Nature-Caffe-Bills-${from}-to-${to}.xlsx`;
  if (from) return `Nature-Caffe-Bills-from-${from}.xlsx`;
  if (to) return `Nature-Caffe-Bills-to-${to}.xlsx`;
  return `Nature-Caffe-Bills-${today.toISOString().slice(0, 10)}.xlsx`;
}
