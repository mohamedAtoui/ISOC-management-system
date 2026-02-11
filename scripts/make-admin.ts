import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const studentId = process.argv[2];

if (!studentId) {
  console.error("Usage: npx tsx scripts/make-admin.ts <studentId>");
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

async function makeAdmin() {
  const result = await db
    .update(schema.members)
    .set({ isAdmin: true })
    .where(eq(schema.members.studentId, studentId))
    .returning({
      id: schema.members.id,
      name: schema.members.name,
      studentId: schema.members.studentId,
      isAdmin: schema.members.isAdmin,
    });

  if (result.length === 0) {
    console.error(`No member found with student ID: ${studentId}`);
    process.exit(1);
  }

  console.log("✓ Admin privileges granted:");
  console.log(`  Name: ${result[0].name}`);
  console.log(`  Student ID: ${result[0].studentId}`);
  console.log(`  isAdmin: ${result[0].isAdmin}`);
}

makeAdmin().catch(console.error);
