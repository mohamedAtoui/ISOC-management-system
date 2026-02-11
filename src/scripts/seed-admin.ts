import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client);

async function seedAdmin() {
  const studentId = "admin001";
  const email = "admin@isoc.test";

  // Check if already exists
  const [existing] = await db
    .select()
    .from(members)
    .where(eq(members.studentId, studentId))
    .limit(1);

  if (existing) {
    console.log("Test admin already exists:");
    console.log(`  Student ID: ${existing.studentId}`);
    console.log(`  Email: ${existing.email}`);
    console.log(`  Is Admin: ${existing.isAdmin}`);
    process.exit(0);
  }

  const today = new Date().toISOString().split("T")[0];
  // Set expiry to 1 year from now
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const expiresAt = nextYear.toISOString().split("T")[0];

  const [admin] = await db
    .insert(members)
    .values({
      studentId,
      email,
      name: "Test Admin",
      gender: "M",
      joiningDate: today,
      membershipExpires: expiresAt,
      isAdmin: true,
    })
    .returning();

  console.log("Test admin created:");
  console.log(`  Student ID: ${admin.studentId}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Name: ${admin.name}`);
  console.log(`  Is Admin: ${admin.isAdmin}`);
}

seedAdmin().catch(console.error);
