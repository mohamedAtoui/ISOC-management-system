import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, members, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authResult = await requireAdminApi();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { eventId } = await params;

  const guests = await db
    .select({
      bookingId: bookings.id,
      memberId: members.id,
      name: members.name,
      studentId: members.studentId,
      gender: members.gender,
      status: bookings.status,
      checkedIn: bookings.checkedIn,
      checkedInAt: bookings.checkedInAt,
      foodChoice: bookings.foodChoice,
    })
    .from(bookings)
    .innerJoin(members, eq(bookings.memberId, members.id))
    .where(eq(bookings.eventId, Number(eventId)));

  return NextResponse.json(guests);
}

// POST: Add a member to the event (VIP override - bypasses capacity)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authResult = await requireAdminApi();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { eventId } = await params;
  const eventIdNum = Number(eventId);
  const body = await req.json();
  const { memberId, studentId } = body;

  // Find the member by ID or student ID
  let member;
  if (memberId) {
    [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, Number(memberId)))
      .limit(1);
  } else if (studentId) {
    [member] = await db
      .select()
      .from(members)
      .where(eq(members.studentId, studentId))
      .limit(1);
  } else {
    return NextResponse.json({ error: "memberId or studentId is required" }, { status: 400 });
  }

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Check if member already has a booking for this event
  const [existingBooking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.memberId, member.id),
        eq(bookings.eventId, eventIdNum),
        eq(bookings.status, "confirmed")
      )
    )
    .limit(1);

  if (existingBooking) {
    return NextResponse.json({ error: "Member already has a booking for this event" }, { status: 400 });
  }

  // Create the booking (bypassing capacity check)
  const [newBooking] = await db
    .insert(bookings)
    .values({
      memberId: member.id,
      eventId: eventIdNum,
      status: "confirmed",
    })
    .returning();

  // Increment booked count
  await db
    .update(events)
    .set({
      bookedCount: db.$count(bookings, and(eq(bookings.eventId, eventIdNum), eq(bookings.status, "confirmed"))),
    })
    .where(eq(events.id, eventIdNum));

  // Re-fetch the actual count to update properly
  const confirmedCount = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.eventId, eventIdNum), eq(bookings.status, "confirmed")));

  await db
    .update(events)
    .set({ bookedCount: confirmedCount.length })
    .where(eq(events.id, eventIdNum));

  return NextResponse.json({
    success: true,
    booking: newBooking,
    member: { id: member.id, name: member.name, studentId: member.studentId },
  }, { status: 201 });
}
