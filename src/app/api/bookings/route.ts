import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, waitlist, members, isMemberEligible } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { eq, and, sql, gte, asc } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import WaitlistPromotedEmail from "@/emails/waitlist-promoted";

export async function GET() {
  const { member } = await requireSession();

  // Return this member's bookings with event info
  const memberBookings = await db
    .select({
      id: bookings.id,
      eventId: bookings.eventId,
      status: bookings.status,
      createdAt: bookings.createdAt,
      eventName: events.name,
      eventDate: events.date,
    })
    .from(bookings)
    .innerJoin(events, eq(bookings.eventId, events.id))
    .where(eq(bookings.memberId, member.id));

  // Also get waitlist entries
  const memberWaitlist = await db
    .select({
      id: waitlist.id,
      eventId: waitlist.eventId,
      claimed: waitlist.claimed,
      eventName: events.name,
      eventDate: events.date,
    })
    .from(waitlist)
    .innerJoin(events, eq(waitlist.eventId, events.id))
    .where(
      and(
        eq(waitlist.memberId, member.id),
        eq(waitlist.claimed, false)
      )
    );

  // Compute which specific events are blocked by the penalty
  const penaltyCount = member.penaltyUntilEventCount ?? 0;
  let blockedEventIds: number[] = [];
  if (penaltyCount > 0) {
    const today = new Date().toISOString().split("T")[0];
    const blockedEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(gte(events.date, today))
      .orderBy(asc(events.date))
      .limit(penaltyCount);
    blockedEventIds = blockedEvents.map((e) => e.id);
  }

  return NextResponse.json({
    bookings: memberBookings,
    waitlist: memberWaitlist,
    memberStatus: {
      membershipExpires: member.membershipExpires,
      isBlacklisted: member.isBlacklisted,
      strikes: member.strikes,
      penaltyUntilEventCount: penaltyCount,
      blockedEventIds,
      isEligible: isMemberEligible(member.membershipExpires) && !member.isBlacklisted,
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const { member } = await requireSession();
  const { eventId, foodChoice } = await req.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  if (member.isBlacklisted) {
    return NextResponse.json(
      { error: "You have been blacklisted and cannot book events" },
      { status: 403 }
    );
  }

  if (!isMemberEligible(member.membershipExpires)) {
    return NextResponse.json(
      { error: "Your membership has expired. You are not eligible to book events." },
      { status: 403 }
    );
  }

  // Check for late cancellation penalty on this specific event
  const postPenaltyCount = member.penaltyUntilEventCount ?? 0;
  if (postPenaltyCount > 0) {
    const today = new Date().toISOString().split("T")[0];
    const blockedEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(gte(events.date, today))
      .orderBy(asc(events.date))
      .limit(postPenaltyCount);
    const blockedIds = blockedEvents.map((e) => e.id);

    if (blockedIds.includes(Number(eventId))) {
      return NextResponse.json(
        { error: `You are blocked from booking this event due to a late cancellation penalty. ${postPenaltyCount} event${postPenaltyCount !== 1 ? "s" : ""} remaining.` },
        { status: 403 }
      );
    }
  }

  // Check for existing confirmed booking
  const [existingBooking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.memberId, member.id),
        eq(bookings.eventId, Number(eventId)),
        eq(bookings.status, "confirmed")
      )
    )
    .limit(1);

  if (existingBooking) {
    return NextResponse.json(
      { error: "You already have a confirmed booking for this event" },
      { status: 409 }
    );
  }

  // Check for existing waitlist entry
  const [existingWaitlist] = await db
    .select()
    .from(waitlist)
    .where(
      and(
        eq(waitlist.memberId, member.id),
        eq(waitlist.eventId, Number(eventId)),
        eq(waitlist.claimed, false)
      )
    )
    .limit(1);

  if (existingWaitlist) {
    return NextResponse.json(
      { error: "You are already on the waitlist for this event" },
      { status: 409 }
    );
  }

  // Atomic booking attempt: increment booked_count only if under capacity
  const result = await db.run(
    sql`UPDATE events SET booked_count = booked_count + 1 WHERE id = ${Number(eventId)} AND booked_count < capacity AND is_open = 1`
  );

  if (result.rowsAffected === 0) {
    // Check if event exists and is open
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, Number(eventId)))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.isOpen) {
      return NextResponse.json(
        { error: "Bookings are not open for this event" },
        { status: 400 }
      );
    }

    // Event is full - add to waitlist
    await db
      .insert(waitlist)
      .values({
        memberId: member.id,
        eventId: Number(eventId),
      });

    return NextResponse.json({
      status: "waitlisted",
    });
  }

  // Booking succeeded
  const [booking] = await db
    .insert(bookings)
    .values({
      memberId: member.id,
      eventId: Number(eventId),
      status: "confirmed",
      foodChoice: foodChoice || null,
    })
    .returning();

  return NextResponse.json({
    status: "confirmed",
    bookingId: booking.id,
  });
}

export async function DELETE(req: NextRequest) {
  const { member } = await requireSession();
  const { bookingId } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  // Find the booking - must belong to this member and be confirmed
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, Number(bookingId)),
        eq(bookings.memberId, member.id),
        eq(bookings.status, "confirmed")
      )
    )
    .limit(1);

  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found or already cancelled" },
      { status: 404 }
    );
  }

  // Check for late cancellation (within 24 hours of event)
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, booking.eventId))
    .limit(1);

  if (event) {
    const eventDate = new Date(event.date);
    // Set event time to start of day (midnight) for comparison
    eventDate.setHours(0, 0, 0, 0);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Apply penalty if cancelling within 24 hours before the event
    if (hoursUntilEvent <= 24 && hoursUntilEvent > -24) {
      await db
        .update(members)
        .set({ penaltyUntilEventCount: 5 })
        .where(eq(members.id, member.id));
    }
  }

  // Cancel the booking
  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, booking.id));

  // Decrement booked count
  await db.run(
    sql`UPDATE events SET booked_count = MAX(booked_count - 1, 0) WHERE id = ${booking.eventId}`
  );

  // Auto-promote first waitlisted person
  const { isNull, asc } = await import("drizzle-orm");

  const [nextInLine] = await db
    .select()
    .from(waitlist)
    .where(
      and(
        eq(waitlist.eventId, booking.eventId),
        eq(waitlist.claimed, false),
        isNull(waitlist.claimSentAt)
      )
    )
    .orderBy(asc(waitlist.createdAt))
    .limit(1);

  if (nextInLine) {
    // Atomic: try to book for the waitlisted member
    const promoResult = await db.run(
      sql`UPDATE events SET booked_count = booked_count + 1 WHERE id = ${booking.eventId} AND booked_count < capacity`
    );

    if (promoResult.rowsAffected === 1) {
      await db
        .update(waitlist)
        .set({ claimed: true })
        .where(eq(waitlist.id, nextInLine.id));

      await db
        .insert(bookings)
        .values({
          memberId: nextInLine.memberId,
          eventId: booking.eventId,
          status: "confirmed",
        });

      // Send promotion notification email (fire-and-forget)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      Promise.all([
        db
          .select({ name: members.name, email: members.email })
          .from(members)
          .where(eq(members.id, nextInLine.memberId))
          .limit(1),
        db
          .select({ name: events.name, date: events.date })
          .from(events)
          .where(eq(events.id, booking.eventId))
          .limit(1),
      ])
        .then(([[promoMember], [event]]) => {
          if (promoMember && promoMember.email && event) {
            return sendEmail({
              to: promoMember.email,
              subject: `You're in! Waitlist promotion for ${event.name}`,
              react: WaitlistPromotedEmail({
                name: promoMember.name,
                eventName: event.name,
                eventDate: event.date,
                bookUrl: `${appUrl}/book`,
              }),
            });
          }
        })
        .catch((e) => console.error("Failed to send promotion email:", e));
    }
  }

  return NextResponse.json({ success: true });
}
