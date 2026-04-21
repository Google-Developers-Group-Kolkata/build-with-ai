/**
 * One-time migration script: copies participants.json → Google Sheet
 *
 * Usage:
 *   npx tsx scripts/init-sheet.ts
 *
 * Prerequisites:
 *   1. Set GOOGLE_SHEET_ID in .env
 *   2. Share the sheet with FIREBASE_CLIENT_EMAIL (Editor access)
 *   3. The sheet may be empty — this script sets the header + all data rows
 */

import { google } from "googleapis";
import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

// Load .env
config({ path: path.join(process.cwd(), ".env") });

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME ?? "Sheet1";

if (!SHEET_ID || SHEET_ID === "your_sheet_id_here") {
  console.error("❌  Please set GOOGLE_SHEET_ID in your .env file first.");
  process.exit(1);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!privateKey || !clientEmail) {
  console.error("❌  Missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL.");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ─── Load JSON ───────────────────────────────────────────────────────────────

const jsonPath = path.join(process.cwd(), "src", "data", "participants.json");
const participants = JSON.parse(readFileSync(jsonPath, "utf8")) as Array<{
  id: string;
  name: string;
  email: string;
  company: string;
  ticketType: string;
  present: boolean;
  checkedInAt: string | null;
}>;

// ─── Write to Sheet ──────────────────────────────────────────────────────────

async function main() {
  const sheets = google.sheets({ version: "v4", auth });

  const header = ["id", "name", "email", "company", "ticketType", "present", "checkedInAt"];
  const rows = participants.map((p) => [
    p.id,
    p.name,
    p.email,
    p.company,
    p.ticketType,
    p.present ? "TRUE" : "FALSE",
    p.checkedInAt ?? "",
  ]);

  const values = [header, ...rows];

  console.log(`📋  Migrating ${participants.length} participants to Google Sheet...`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  console.log(`✅  Done! Wrote ${participants.length} rows to '${TAB_NAME}' tab.`);
  console.log(`🔗  https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
}

main().catch((err) => {
  console.error("❌  Migration failed:", err.message ?? err);
  process.exit(1);
});
