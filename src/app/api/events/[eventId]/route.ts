import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, waitlist } from "@/db/schema";
import { requireAdmin, requireSessionApi } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authResult = await requireSessionApi();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { eventId } = await params;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, Number(eventId)))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await requireAdmin();
  const { eventId } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.date !== undefined) updateData.date = body.date;
  if (body.capacity !== undefined) updateData.capacity = Number(body.capacity);
  if (body.isOpen !== undefined) updateData.isOpen = body.isOpen;
  if (body.foodOptions !== undefined) {
    // Accept null to clear, or array to set
    updateData.foodOptions = body.foodOptions
      ? JSON.stringify(body.foodOptions)
      : null;
  }

  const [updated] = await db
    .update(events)
    .set(updateData)
    .where(eq(events.id, Number(eventId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await requireAdmin();
  const { eventId } = await params;
  const id = Number(eventId);

  await db.delete(waitlist).where(eq(waitlist.eventId, id));
  await db.delete(bookings).where(eq(bookings.eventId, id));
  await db.delete(events).where(eq(events.id, id));

  return NextResponse.json({ success: true });
}
