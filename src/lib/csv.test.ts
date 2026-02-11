import { describe, it, expect } from "vitest";
import { parseCsv, parseFile } from "./csv";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// parseCsv — column aliases
// ---------------------------------------------------------------------------
describe("parseCsv — column aliases", () => {
  it("parses standard headers", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Membership Expires
ABC123,Alice,F,2024-01-15,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      studentId: "ABC123",
      name: "Alice",
      gender: "F",
      joiningDate: "2024-01-15",
      membershipExpires: "2026-12-31",
    });
  });

  it("maps Card Number alias to studentId", () => {
    const csv = `Card Number,Name,Gender,Joining Date,Membership Expires
CARD001,Bob,M,2024-01-01,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0].studentId).toBe("CARD001");
  });

  it("maps Joined alias to joiningDate", () => {
    const csv = `Student ID,Name,Gender,Joined,Membership Expires
S1,Test,M,2024-06-01,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0].joiningDate).toBe("2024-06-01");
  });

  it("maps Full Name alias to name", () => {
    const csv = `Student ID,Full Name,Gender,Joining Date,Membership Expires
S1,Jane Doe,F,2024-01-01,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0].name).toBe("Jane Doe");
  });

  it("maps FullName (no space) alias to name", () => {
    const csv = `Student ID,FullName,Gender,Joining Date,Membership Expires
S1,Jane Doe,F,2024-01-01,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0].name).toBe("Jane Doe");
  });

  it("maps Expires alias to membershipExpires", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Expires
S1,Test,M,2024-01-01,2026-06-30`;
    const rows = parseCsv(csv);
    expect(rows[0].membershipExpires).toBe("2026-06-30");
  });

  it("handles underscore variants (student_id, joining_date, membership_expires)", () => {
    const csv = `student_id,name,gender,joining_date,membership_expires
U1,Under Score,,2024-03-10,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0]).toMatchObject({
      studentId: "U1",
      name: "Under Score",
      joiningDate: "2024-03-10",
      membershipExpires: "2026-12-31",
    });
  });

  it("handles no-space variants (studentid, joiningdate, membershipexpires)", () => {
    const csv = `studentid,name,gender,joiningdate,membershipexpires
NS1,No Space,,2024-03-10,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0]).toMatchObject({
      studentId: "NS1",
      name: "No Space",
      joiningDate: "2024-03-10",
      membershipExpires: "2026-12-31",
    });
  });

  it("handles mixed case headers (transformHeader lowercases)", () => {
    const csv = `STUDENT ID,NAME,GENDER,JOINING DATE,MEMBERSHIP EXPIRES
MC1,Mixed Case,M,2024-01-01,2026-12-31`;
    const rows = parseCsv(csv);
    expect(rows[0].studentId).toBe("MC1");
    expect(rows[0].name).toBe("Mixed Case");
  });
});

// ---------------------------------------------------------------------------
// parseCsv — date normalization
// ---------------------------------------------------------------------------
describe("parseCsv — date normalization", () => {
  function makeCsv(joiningDate: string, expires: string) {
    return `Student ID,Name,Gender,Joining Date,Membership Expires\nS1,Test,,${joiningDate},${expires}`;
  }

  it("passes through ISO YYYY-MM-DD", () => {
    const rows = parseCsv(makeCsv("2024-01-15", "2026-12-31"));
    expect(rows[0].joiningDate).toBe("2024-01-15");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("normalizes DD/MM/YYYY", () => {
    const rows = parseCsv(makeCsv("15/01/2024", "31/12/2026"));
    expect(rows[0].joiningDate).toBe("2024-01-15");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("normalizes DD-MM-YYYY", () => {
    const rows = parseCsv(makeCsv("15-01-2024", "31-12-2026"));
    expect(rows[0].joiningDate).toBe("2024-01-15");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("normalizes DD/MM/YY (2-digit year)", () => {
    const rows = parseCsv(makeCsv("15/01/24", "31/12/26"));
    expect(rows[0].joiningDate).toBe("2024-01-15");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("normalizes DD-MM-YY (2-digit year)", () => {
    const rows = parseCsv(makeCsv("15-01-24", "31-12-26"));
    expect(rows[0].joiningDate).toBe("2024-01-15");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("normalizes DD.MM.YYYY (dot separator)", () => {
    const rows = parseCsv(makeCsv("15.01.2024", "31.12.2026"));
    expect(rows[0].joiningDate).toBe("2024-01-15");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("strips time portion from date", () => {
    const rows = parseCsv(makeCsv("27/10/2025 17:28", "31/12/2026 09:00"));
    expect(rows[0].joiningDate).toBe("2025-10-27");
    expect(rows[0].membershipExpires).toBe("2026-12-31");
  });

  it("pads single-digit day/month", () => {
    const rows = parseCsv(makeCsv("1/2/2024", "3/4/2026"));
    expect(rows[0].joiningDate).toBe("2024-02-01");
    expect(rows[0].membershipExpires).toBe("2026-04-03");
  });

  it("throws on missing date", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Membership Expires\nS1,Test,,,"2026-12-31"`;
    expect(() => parseCsv(csv)).toThrow("date is required");
  });

  it("throws on unparseable date", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Membership Expires\nS1,Test,,not-a-date,2026-12-31`;
    expect(() => parseCsv(csv)).toThrow("cannot parse date");
  });
});

// ---------------------------------------------------------------------------
// parseCsv — gender normalization
// ---------------------------------------------------------------------------
describe("parseCsv — gender normalization", () => {
  function makeCsv(gender: string) {
    return `Student ID,Name,Gender,Joining Date,Membership Expires\nS1,Test,${gender},2024-01-01,2026-12-31`;
  }

  it.each([
    ["M", "M"],
    ["MALE", "M"],
    ["BROTHER", "M"],
  ])("normalizes %s to M", (input, expected) => {
    const rows = parseCsv(makeCsv(input));
    expect(rows[0].gender).toBe(expected);
  });

  it.each([
    ["F", "F"],
    ["FEMALE", "F"],
    ["SISTER", "F"],
  ])("normalizes %s to F", (input, expected) => {
    const rows = parseCsv(makeCsv(input));
    expect(rows[0].gender).toBe(expected);
  });

  it("returns null for empty gender", () => {
    const rows = parseCsv(makeCsv(""));
    expect(rows[0].gender).toBeNull();
  });

  it("handles lowercase input (brother → M)", () => {
    const rows = parseCsv(makeCsv("brother"));
    expect(rows[0].gender).toBe("M");
  });

  it("throws on unknown gender value", () => {
    expect(() => parseCsv(makeCsv("X"))).toThrow("Unknown gender");
  });
});

// ---------------------------------------------------------------------------
// parseCsv — validation
// ---------------------------------------------------------------------------
describe("parseCsv — validation", () => {
  it("throws on missing studentId", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Membership Expires\n,Test,,2024-01-01,2026-12-31`;
    expect(() => parseCsv(csv)).toThrow("missing required fields");
  });

  it("throws on missing name", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Membership Expires\nS1,,,2024-01-01,2026-12-31`;
    expect(() => parseCsv(csv)).toThrow("missing required fields");
  });

  it("parses multiple rows correctly", () => {
    const csv = `Student ID,Name,Gender,Joining Date,Membership Expires
S1,Alice,F,2024-01-01,2026-12-31
S2,Bob,M,2024-02-15,2026-06-30`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].studentId).toBe("S1");
    expect(rows[1].studentId).toBe("S2");
  });
});

// ---------------------------------------------------------------------------
// parseFile — XLSX preamble detection
// ---------------------------------------------------------------------------
describe("parseFile — XLSX preamble detection", () => {
  function buildXlsx(rows: (string | number | null)[][]): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return out;
  }

  it("detects header on row 3 (preamble rows 0–2)", () => {
    const buf = buildXlsx([
      ["Some title"],
      [],
      ["106 members"],
      ["Student ID", "Name", "Gender", "Joining Date", "Membership Expires"],
      ["S1", "Alice", "F", "2024-01-01", "2026-12-31"],
    ]);
    const rows = parseFile(buf, "test.xlsx");
    expect(rows).toHaveLength(1);
    expect(rows[0].studentId).toBe("S1");
    expect(rows[0].name).toBe("Alice");
  });

  it("works when header is on row 0 (no preamble)", () => {
    const buf = buildXlsx([
      ["Student ID", "Name", "Gender", "Joining Date", "Membership Expires"],
      ["S1", "Bob", "M", "2024-01-01", "2026-12-31"],
    ]);
    const rows = parseFile(buf, "data.xlsx");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Bob");
  });

  it("parses CSV via parseFile", () => {
    const csvText = `Student ID,Name,Gender,Joining Date,Membership Expires\nS1,Carol,,2024-01-01,2026-12-31`;
    const buf = new TextEncoder().encode(csvText).buffer;
    const rows = parseFile(buf, "data.csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Carol");
  });

  it("throws for unsupported file extension", () => {
    const buf = new ArrayBuffer(10);
    expect(() => parseFile(buf, "data.pdf")).toThrow("Unsupported file format");
  });
});

// ---------------------------------------------------------------------------
// parseFile — real-world ISOC format
// ---------------------------------------------------------------------------
describe("parseFile — real-world ISOC format", () => {
  it("parses ISOC XLSX with preamble + Card Number/Joined aliases", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Standard Membership"],
      [],
      ["106 members"],
      ["Name", "Card Number", "Joined", "Membership expires"],
      ["Alice Smith", "CARD001", "15/01/2024", "31/12/2026"],
      ["Bob Jones", "CARD002", "01/06/2024", "30/06/2026"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const rows = parseFile(buf, "isoc-members.xlsx");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      studentId: "CARD001",
      name: "Alice Smith",
      gender: null,
      joiningDate: "2024-01-15",
      membershipExpires: "2026-12-31",
    });
    expect(rows[1]).toEqual({
      studentId: "CARD002",
      name: "Bob Jones",
      gender: null,
      joiningDate: "2024-06-01",
      membershipExpires: "2026-06-30",
    });
  });
});
