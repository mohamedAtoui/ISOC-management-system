import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface CsvMemberRow {
  studentId: string;
  name: string;
  gender: "M" | "F" | null;
  joiningDate: string;
  membershipExpires: string;
}

export function parseFile(buffer: ArrayBuffer, fileName: string): CsvMemberRow[] {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    // Detect header row by scanning for a row with "name" column
    const json = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
    let headerRow = 0;
    for (let i = 0; i < Math.min(json.length, 10); i++) {
      const row = json[i];
      if (Array.isArray(row) && row.some(cell =>
        typeof cell === "string" && cell.trim().toLowerCase() === "name"
      )) {
        headerRow = i;
        break;
      }
    }

    // Skip preamble rows by adjusting the sheet range
    if (headerRow > 0 && firstSheet["!ref"]) {
      const range = XLSX.utils.decode_range(firstSheet["!ref"]);
      range.s.r = headerRow;
      firstSheet["!ref"] = XLSX.utils.encode_range(range);
    }
    const csvText = XLSX.utils.sheet_to_csv(firstSheet);
    return parseCsv(csvText);
  }

  if (ext === "csv") {
    const decoder = new TextDecoder("utf-8");
    const csvText = decoder.decode(buffer);
    return parseCsv(csvText);
  }

  throw new Error("Unsupported file format. Please upload a .csv, .xlsx, or .xls file.");
}

export function parseCsv(csvText: string): CsvMemberRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  return result.data.map((row, i) => {
    const studentId = (row["student id"] || row["studentid"] || row["student_id"] || row["card number"] || "").trim();
    const name = (row["name"] || row["full name"] || row["fullname"] || "").trim();
    const rawGender = (row["gender"] || "").trim().toUpperCase();
    const rawJoiningDate = (row["joining date"] || row["joiningdate"] || row["joining_date"] || row["joined"] || "").trim();
    const rawExpires = (row["membership expires"] || row["membershipexpires"] || row["membership_expires"] || row["expires"] || "").trim();

    if (!studentId || !name) {
      throw new Error(`Row ${i + 1}: missing required fields (studentId, name)`);
    }

    const gender = normalizeGender(rawGender);
    const joiningDate = normalizeDate(rawJoiningDate, `Row ${i + 1} joining date`);
    const membershipExpires = normalizeDate(rawExpires, `Row ${i + 1} membership expires`);

    return { studentId, name, gender, joiningDate, membershipExpires };
  });
}

function normalizeGender(raw: string): "M" | "F" | null {
  if (raw === "M" || raw === "MALE" || raw === "BROTHER") return "M";
  if (raw === "F" || raw === "FEMALE" || raw === "SISTER") return "F";
  if (!raw) return null;
  throw new Error(`Unknown gender: "${raw}". Expected M or F.`);
}

function normalizeDate(raw: string, context: string): string {
  if (!raw) {
    throw new Error(`${context}: date is required`);
  }

  // Strip time portion if present (e.g., "27/10/2025 17:28" -> "27/10/2025")
  const dateOnly = raw.split(" ")[0].trim();

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;

  // Try DD/MM/YYYY or DD-MM-YYYY (4-digit year)
  const dmy4 = dateOnly.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy4) {
    return `${dmy4[3]}-${dmy4[2].padStart(2, "0")}-${dmy4[1].padStart(2, "0")}`;
  }

  // Try DD/MM/YY or DD-MM-YY (2-digit year, assume 20xx)
  const dmy2 = dateOnly.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmy2) {
    const year = `20${dmy2[3]}`;
    return `${year}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`;
  }

  // Try DD.MM.YYYY (dot separator)
  const dmyDot4 = dateOnly.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyDot4) {
    return `${dmyDot4[3]}-${dmyDot4[2].padStart(2, "0")}-${dmyDot4[1].padStart(2, "0")}`;
  }

  throw new Error(`${context}: cannot parse date "${raw}". Use DD/MM/YYYY or YYYY-MM-DD.`);
}
