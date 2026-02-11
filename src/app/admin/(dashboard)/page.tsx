import { db } from "@/db";
import { members, events, bookings } from "@/db/schema";
import { eq, count, gte, and } from "drizzle-orm";

export default async function AdminDashboard() {
  const today = new Date().toISOString().split("T")[0];

  const [totalMembersResult] = await db
    .select({ value: count() })
    .from(members);

  // Eligible = membershipExpires >= today and not blacklisted
  const [eligibleMembersResult] = await db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        gte(members.membershipExpires, today),
        eq(members.isBlacklisted, false)
      )
    );

  const [totalEventsResult] = await db
    .select({ value: count() })
    .from(events);

  const [totalBookingsResult] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.status, "confirmed"));

  const totalMembers = totalMembersResult?.value ?? 0;
  const eligibleMembers = eligibleMembersResult?.value ?? 0;
  const totalEvents = totalEventsResult?.value ?? 0;
  const totalBookings = totalBookingsResult?.value ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Overview of the Iftar management system.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={totalMembers}
          description="Registered in the system"
        />
        <StatCard
          title="Eligible Members"
          value={eligibleMembers}
          description="Can book Iftar spots"
        />
        <StatCard
          title="Total Events"
          value={totalEvents}
          description="Iftar events created"
        />
        <StatCard
          title="Confirmed Bookings"
          value={totalBookings}
          description="Active confirmed bookings"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-stone-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold text-stone-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-400">
        {description}
      </p>
    </div>
  );
}
