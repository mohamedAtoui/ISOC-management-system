import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, members } from "@/db/schema";
import { requireAdmin, requireSessionApi } from "@/lib/auth";
import { desc, gt, sql } from "drizzle-orm";

export async function GET() {
  const authResult = await requireSessionApi();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const allEvents = await db
    .select()
    .from(events)
    .orderBy(desc(events.date));

  return NextResponse.json(allEvents);
}

export async function POST(req: NextRequest) {
  await requireAdmin();

  const body = await req.json();
  const { name, date, capacity, foodOptions } = body;

  if (!name || !date || !capacity) {
    return NextResponse.json(
      { error: "name, date, and capacity are required" },
      { status: 400 }
    );
  }

  // Validate and serialize foodOptions if provided
  let serializedFoodOptions: string | null = null;
  if (foodOptions && Array.isArray(foodOptions) && foodOptions.length > 0) {
    serializedFoodOptions = JSON.stringify(foodOptions);
  }

  const [event] = await db
    .insert(events)
    .values({
      name,
      date,
      capacity: Number(capacity),
      isOpen: false,
      foodOptions: serializedFoodOptions,
    })
    .returning();

  // Decrement penalty count for all penalized members
  // This allows members to book again after N events have passed
  await db
    .update(members)
    .set({
      penaltyUntilEventCount: sql`MAX(${members.penaltyUntilEventCount} - 1, 0)`,
    })
    .where(gt(members.penaltyUntilEventCount, 0));

  return NextResponse.json(event, { status: 201 });
}
