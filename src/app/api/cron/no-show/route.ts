import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, bookings, members } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import NoShowStrikeEmail from "@/emails/no-show-strike";
import BlacklistedEmail from "@/emails/blacklisted";
import { MAX_STRIKES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Find today's events
  const todayEvents = await db
    .select()
    .from(events)
    .where(eq(events.date, today));

  if (todayEvents.length === 0) {
    return NextResponse.json({ message: "No events today", processed: 0 });
  }

  let totalProcessed = 0;
  let totalStrikes = 0;
  let totalBlacklisted = 0;

  for (const event of todayEvents) {
    // Find no-shows: confirmed but not checked in
    const noShows = await db
      .select({
        bookingId: bookings.id,
        memberId: bookings.memberId,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.eventId, event.id),
          eq(bookings.status, "confirmed"),
          eq(bookings.checkedIn, false)
        )
      );

    for (const noShow of noShows) {
      // Mark booking as missed
      await db
        .update(bookings)
        .set({ status: "missed" })
        .where(eq(bookings.id, noShow.bookingId));

      // Increment strikes
      await db.run(
        sql`UPDATE members SET strikes = strikes + 1 WHERE id = ${noShow.memberId}`
      );

      // Get updated member
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.id, noShow.memberId))
        .limit(1);

      if (!member) continue;

      if (member.strikes >= MAX_STRIKES) {
        // Blacklist
        await db
          .update(members)
          .set({ isBlacklisted: true })
          .where(eq(members.id, member.id));

        if (member.email) {
          try {
            await sendEmail({
              to: member.email,
              subject: "ISOC Iftar - Account Suspended",
              react: BlacklistedEmail({
                name: member.name,
              }),
            });
          } catch (e) {
            console.error("Failed to send blacklist email:", e);
          }
        }
        totalBlacklisted++;
      } else {
        if (member.email) {
          try {
            await sendEmail({
              to: member.email,
              subject: `ISOC Iftar - Strike ${member.strikes} of ${MAX_STRIKES}`,
              react: NoShowStrikeEmail({
                name: member.name,
                eventName: event.name,
                strikeCount: member.strikes,
                maxStrikes: MAX_STRIKES,
              }),
            });
          } catch (e) {
            console.error("Failed to send strike email:", e);
          }
        }
        totalStrikes++;
      }

      totalProcessed++;
    }
  }

  return NextResponse.json({
    message: "No-show processing complete",
    processed: totalProcessed,
    strikes: totalStrikes,
    blacklisted: totalBlacklisted,
  });
}
