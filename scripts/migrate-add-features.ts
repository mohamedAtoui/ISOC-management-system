/**
 * Migration script to add columns for features 2 and 4
 * - food_options to events table
 * - food_choice to bookings table
 * - penalty_until_event_count to members table
 *
 * Usage: npx tsx scripts/migrate-add-features.ts
 */

import { config } from "dotenv";
import { createClient } from "@libsql/client";
import * as path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

async function migrate() {
  console.log("Starting migration...\n");

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

  // Add food_options to events table
  try {
    await client.execute("ALTER TABLE events ADD COLUMN food_options TEXT;");
    console.log("✓ Added food_options column to events table");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate column name")) {
      console.log("⊘ food_options column already exists in events table");
    } else {
      console.error("✗ Failed to add food_options:", message);
    }
  }

  // Add food_choice to bookings table
  try {
    await client.execute("ALTER TABLE bookings ADD COLUMN food_choice TEXT;");
    console.log("✓ Added food_choice column to bookings table");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate column name")) {
      console.log("⊘ food_choice column already exists in bookings table");
    } else {
      console.error("✗ Failed to add food_choice:", message);
    }
  }

  // Add penalty_until_event_count to members table
  try {
    await client.execute(
      "ALTER TABLE members ADD COLUMN penalty_until_event_count INTEGER DEFAULT 0;"
    );
    console.log("✓ Added penalty_until_event_count column to members table");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate column name")) {
      console.log("⊘ penalty_until_event_count column already exists in members table");
    } else {
      console.error("✗ Failed to add penalty_until_event_count:", message);
    }
  }

  console.log("\nMigration complete!");

  // Clean up
  client.close();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
