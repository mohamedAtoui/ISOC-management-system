import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

// Single check-in, undo, or batch sync
export async function POST(req: NextRequest) {
  await requireAdmin();

  const body = await req.json();

  // Batch sync: array of check-ins
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      // Validate each bookingId in batch
      if (!Number.isInteger(item.bookingId) || item.bookingId < 1) {
        results.push({ success: false, bookingId: item.bookingId, error: "Invalid booking ID" });
        continue;
      }
      const result = await processCheckIn(item.bookingId);
      results.push(result);
    }
    return NextResponse.json({ results });
  }

  // Validate bookingId for single check-in/undo
  if (!Number.isInteger(body.bookingId) || body.bookingId < 1) {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  // Handle undo action
  if (body.action === "undo") {
    const result = await processUndo(body.bookingId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  // Single check-in
  const result = await processCheckIn(body.bookingId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

async function processCheckIn(bookingId: number) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.status, "confirmed")
      )
    )
    .limit(1);

  if (!booking) {
    return { success: false, bookingId, error: "Booking not found or not confirmed" };
  }

  if (booking.checkedIn) {
    return { success: true, bookingId, alreadyCheckedIn: true };
  }

  await db
    .update(bookings)
    .set({
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
    })
    .where(eq(bookings.id, bookingId));

  return { success: true, bookingId };
}

async function processUndo(bookingId: number) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.status, "confirmed")
      )
    )
    .limit(1);

  if (!booking) {
    return { success: false, bookingId, error: "Booking not found or not confirmed" };
  }

  if (!booking.checkedIn) {
    return { success: true, bookingId, alreadyUnchecked: true };
  }

  await db
    .update(bookings)
    .set({
      checkedIn: false,
      checkedInAt: null,
    })
    .where(eq(bookings.id, bookingId));

  return { success: true, bookingId, action: "unchecked" };
}
