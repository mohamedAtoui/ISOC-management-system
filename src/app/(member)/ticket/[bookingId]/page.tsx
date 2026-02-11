import { db } from "@/db";
import { bookings, members, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { member: currentMember } = await requireSession();
  const { bookingId } = await params;

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, Number(bookingId)))
    .limit(1);

  if (!booking || booking.status !== "confirmed") {
    notFound();
  }

  // Verify booking belongs to current user
  if (booking.memberId !== currentMember.id) {
    redirect("/book");
  }

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, booking.memberId))
    .limit(1);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, booking.eventId))
    .limit(1);

  if (!member || !event) {
    notFound();
  }

  const bgColor = member.gender === "M" ? "bg-blue-600" : member.gender === "F" ? "bg-pink-500" : "bg-emerald-600";

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center p-8 ${bgColor}`}
    >
      <div className="text-center space-y-6 max-w-lg">
        <div
          className="inline-block px-6 py-2 rounded-full text-lg font-bold bg-white/20 text-white"
        >
          CONFIRMED
        </div>

        <h1 className="text-6xl font-black text-white leading-tight break-words">
          {member.name}
        </h1>

        <h2 className="text-3xl font-bold text-white/90">{event.name}</h2>

        <p className="text-2xl font-mono text-white/80">{member.studentId}</p>

        <p className="text-xl text-white/70">{event.date}</p>
      </div>
    </div>
  );
}
