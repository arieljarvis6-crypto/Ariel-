/**
 * CyberTrade TPS/MIS Google Sheets "API" (Google Apps Script)
 *
 * What it does:
 * - doPost: accepts JSON transaction payload and appends a new row to the active sheet
 * - doGet?mode=list: returns all transactions as JSON
 * - doGet?mode=csv: returns all rows as CSV (for Power BI)
 *
 * How to use:
 * - Create a Google Sheet (e.g. "CyberTrade-Transactions")
 * - Extensions → Apps Script → paste this file → Save
 * - Deploy → New deployment → Type: Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 * - Copy the Web App URL and paste into the CyberTrade web app
 */

const SHEET_NAME = "Transactions";

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const header = [
    "transactionId",
    "dateTime",
    "itemCode",
    "itemName",
    "quantity",
    "unitPrice",
    "totalPrice",
    "staffName",
  ];

  const firstRow = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  const needsHeader = header.some((h, i) => String(firstRow[i] || "").trim() !== h);
  if (needsHeader) sheet.getRange(1, 1, 1, header.length).setValues([header]);
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function csv_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.CSV);
}

function escapeCsv_(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function sheetToCsv_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return "";
  return values.map((row) => row.map(escapeCsv_).join(",")).join("\n");
}

function readBody_(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function doPost(e) {
  const sheet = ensureSheet_();
  const body = readBody_(e);

  const tx = {
    transactionId: String(body.transactionId || ""),
    dateTime: String(body.dateTime || ""),
    itemCode: String(body.itemCode || ""),
    itemName: String(body.itemName || ""),
    quantity: Number(body.quantity || 0),
    unitPrice: Number(body.unitPrice || 0),
    totalPrice: Number(body.totalPrice || 0),
    staffName: String(body.staffName || ""),
  };

  if (!tx.transactionId || !tx.dateTime || !tx.itemCode || !tx.itemName || !tx.staffName) {
    return json_({ ok: false, error: "Missing required fields." });
  }
  if (!tx.quantity || tx.quantity < 1) return json_({ ok: false, error: "Quantity must be >= 1." });

  sheet.appendRow([
    tx.transactionId,
    tx.dateTime,
    tx.itemCode,
    tx.itemName,
    tx.quantity,
    tx.unitPrice,
    tx.totalPrice,
    tx.staffName,
  ]);

  return json_({ ok: true });
}

function doGet(e) {
  const mode = (e && e.parameter && e.parameter.mode) || "";
  const sheet = ensureSheet_();

  if (mode === "csv" || mode === "export") {
    return csv_(sheetToCsv_(sheet));
  }

  if (mode === "list") {
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return json_({ ok: true, transactions: [] });

    const header = values[0].map(String);
    const rows = values.slice(1);

    const transactions = rows
      .filter((r) => r.some((c) => String(c || "").trim() !== ""))
      .map((r) => {
        const obj = {};
        for (let i = 0; i < header.length; i++) obj[header[i]] = r[i];
        return obj;
      });

    return json_({ ok: true, transactions });
  }

  return json_({
    ok: true,
    message: "CyberTrade API is running.",
    modes: ["list", "csv"],
  });
}

