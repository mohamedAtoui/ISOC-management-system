/**
 * Seed script to import members from CSV and set an admin
 *
 * Usage: npx tsx scripts/seed.ts [ADMIN_STUDENT_ID]
 *
 * If no admin student ID is provided, defaults to 101044692 (Qamar, Jazib)
 */

import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

// Import schema and CSV parser
import { members } from "../src/db/schema";
import { parseCsv } from "../src/lib/csv";

const DEFAULT_ADMIN_STUDENT_ID = "101044692";

async function seed() {
  const adminStudentId = process.argv[2] || DEFAULT_ADMIN_STUDENT_ID;

  console.log("Starting database seed...\n");

  // Verify environment variables
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("Error: TURSO_DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  // Create database client
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  // Read CSV file
  const csvPath = path.resolve(process.cwd(), "members_clean.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csvText);

  console.log(`Found ${rows.length} members in CSV\n`);

  // Check if admin student ID exists in CSV
  const adminRow = rows.find((row) => row.studentId === adminStudentId);
  if (!adminRow) {
    console.error(`Error: Admin student ID ${adminStudentId} not found in CSV`);
    console.log("\nAvailable student IDs:");
    rows.slice(0, 10).forEach((row) => console.log(`  ${row.studentId} - ${row.name}`));
    console.log(`  ... and ${rows.length - 10} more`);
    process.exit(1);
  }

  // Import all members
  let imported = 0;
  let errors: string[] = [];

  for (const member of rows) {
    try {
      await db
        .insert(members)
        .values({
          studentId: member.studentId,
          name: member.name,
          joiningDate: member.joiningDate,
          membershipExpires: member.membershipExpires,
          isAdmin: member.studentId === adminStudentId,
        })
        .onConflictDoUpdate({
          target: members.studentId,
          set: {
            name: sql`excluded.name`,
            joiningDate: sql`excluded.joining_date`,
            membershipExpires: sql`excluded.membership_expires`,
          },
        });
      imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Student ${member.studentId}: ${message}`);
    }
  }

  console.log(`Imported ${imported} members`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  // Ensure admin is set (in case of conflict update didn't set it)
  await db
    .update(members)
    .set({ isAdmin: true })
    .where(eq(members.studentId, adminStudentId));

  console.log(`\nAdmin set: ${adminStudentId} (${adminRow.name})`);
  console.log("\nSeed complete!");

  // Clean up
  client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
