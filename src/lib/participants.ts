import { google } from "googleapis";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Participant = {
  id: string;
  email: string;
  name: string;
  gender: string;
  phone: string;
  organization: string;
  dietaryPreference: string;
  attended: boolean;
  food: boolean;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME ?? "Sheet1";

/**
 * Maps each Participant field to the exact header name used in your sheet's Row 1.
 * Right-hand side must match the cell text in your header row exactly.
 */
const FIELD_TO_HEADER: Record<keyof Participant, string> = {
  id:               "id",
  email:            "Column 2",
  name:             "Column 3",
  gender:           "Column 4",
  phone:            "Column 5",
  organization:     "Column 6",
  dietaryPreference: "Column 11",
  attended:         "attended",
  food:             "food",
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL in environment variables."
    );
  }
  if (!SHEET_ID || SHEET_ID === "your_sheet_id_here") {
    throw new Error(
      "GOOGLE_SHEET_ID is not set. Add it to your .env file."
    );
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// ─── Header index resolution ──────────────────────────────────────────────────

type HeaderIndex = Record<string, number>; // { "Column 2": 1, "attended": 9, ... }

async function resolveHeaders(
  sheets: ReturnType<typeof google.sheets>,
): Promise<HeaderIndex> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!1:1`, // Only row 1
  });

  const headerRow = (res.data.values?.[0] as string[] | undefined) ?? [];
  const index: HeaderIndex = {};
  headerRow.forEach((cell, i) => {
    if (cell) index[cell.trim()] = i;
  });
  return index;
}

// ─── Row → Participant ────────────────────────────────────────────────────────

function rowToParticipant(row: string[], headerIndex: HeaderIndex): Participant {
  function get(field: keyof Participant): string {
    const header = FIELD_TO_HEADER[field];
    const colIdx = headerIndex[header];
    if (colIdx === undefined) return "";
    return (row[colIdx] ?? "").trim();
  }

  return {
    id:               get("id"),
    email:            get("email"),
    name:             get("name"),
    gender:           get("gender"),
    phone:            get("phone"),
    organization:     get("organization"),
    dietaryPreference: get("dietaryPreference"),
    attended:         get("attended").toUpperCase() === "TRUE",
    food:             get("food").toUpperCase() === "TRUE",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch all participants from the Google Sheet (skips the header row). */
export async function getParticipants(): Promise<Participant[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const headerIndex = await resolveHeaders(sheets);

  // Fetch all data rows starting from row 2
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A2:Z`,
  });

  const rows = (res.data.values as string[][] | undefined) ?? [];
  return rows
    .filter((row) => row.some((cell) => cell?.trim())) // skip blank rows
    .map((row) => rowToParticipant(row, headerIndex));
}

/**
 * Mark a participant as attended by email.
 * Updates the `attended` column to TRUE in the matching row.
 */
export async function markParticipantPresent(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const headerIndex = await resolveHeaders(sheets);

  // Fetch all data rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A2:Z`,
  });

  const rows = (res.data.values as string[][] | undefined) ?? [];

  const emailColIdx = headerIndex[FIELD_TO_HEADER.email];
  const rowIndex = rows.findIndex(
    (row) => (row[emailColIdx] ?? "").trim().toLowerCase() === normalizedEmail,
  );

  if (rowIndex === -1) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const participant = rowToParticipant(rows[rowIndex], headerIndex);

  if (participant.attended) {
    return {
      ok: false as const,
      reason: "already_present" as const,
      participant,
    };
  }

  // Write TRUE into the `attended` column for this row
  const attendedColIdx = headerIndex[FIELD_TO_HEADER.attended];
  if (attendedColIdx === undefined) {
    throw new Error(`Column "${FIELD_TO_HEADER.attended}" not found in sheet headers.`);
  }

  // Sheet row number = rowIndex (0-based data) + 2 (header row + 1-based)
  const sheetRow = rowIndex + 2;
  // Convert column index to A1 letter notation (0=A, 1=B, ...)
  const colLetter = indexToColumnLetter(attendedColIdx);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!${colLetter}${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [["TRUE"]] },
  });

  const updatedParticipant: Participant = { ...participant, attended: true };
  return { ok: true as const, participant: updatedParticipant };
}

/**
 * Mark a participant's food as given by email.
 * Updates the `food` column to TRUE in the matching row.
 * Only allowed if the participant has already been marked as attended.
 */
export async function markFoodGiven(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const headerIndex = await resolveHeaders(sheets);

  // Fetch all data rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A2:Z`,
  });

  const rows = (res.data.values as string[][] | undefined) ?? [];

  const emailColIdx = headerIndex[FIELD_TO_HEADER.email];
  const rowIndex = rows.findIndex(
    (row) => (row[emailColIdx] ?? "").trim().toLowerCase() === normalizedEmail,
  );

  if (rowIndex === -1) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const participant = rowToParticipant(rows[rowIndex], headerIndex);

  if (!participant.attended) {
    return { ok: false as const, reason: "not_attended" as const, participant };
  }

  if (participant.food) {
    return { ok: false as const, reason: "already_given" as const, participant };
  }

  // Write TRUE into the `food` column for this row
  const foodColIdx = headerIndex[FIELD_TO_HEADER.food];
  if (foodColIdx === undefined) {
    throw new Error(`Column "${FIELD_TO_HEADER.food}" not found in sheet headers.`);
  }

  const sheetRow = rowIndex + 2;
  const colLetter = indexToColumnLetter(foodColIdx);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!${colLetter}${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [["TRUE"]] },
  });

  const updatedParticipant: Participant = { ...participant, food: true };
  return { ok: true as const, participant: updatedParticipant };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts a 0-based column index to an A1 column letter (0→A, 25→Z, 26→AA, …). */
function indexToColumnLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}
