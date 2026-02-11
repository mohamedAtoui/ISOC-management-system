import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: text("student_id").unique().notNull(),
  email: text("email"), // Nullable - members enter email on first login
  name: text("name").notNull(),
  gender: text("gender", { enum: ["M", "F"] }),
  joiningDate: text("joining_date").notNull(),
  membershipExpires: text("membership_expires").notNull(),
  strikes: integer("strikes").notNull().default(0),
  isBlacklisted: integer("is_blacklisted", { mode: "boolean" }).notNull().default(false),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  clerkUserId: text("clerk_user_id").unique(), // Clerk user ID - linked after sign-up
  penaltyUntilEventCount: integer("penalty_until_event_count").notNull().default(0), // Late cancellation penalty - blocked from this many events
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull(),
  capacity: integer("capacity").notNull(),
  bookedCount: integer("booked_count").notNull().default(0),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(false),
  foodOptions: text("food_options"), // JSON array of food choices e.g. ["Biryani", "Pasta", "Salad"]
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  status: text("status", { enum: ["confirmed", "cancelled", "missed"] }).notNull().default("confirmed"),
  checkedIn: integer("checked_in", { mode: "boolean" }).notNull().default(false),
  checkedInAt: text("checked_in_at"),
  foodChoice: text("food_choice"), // Selected food option
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull().references(() => members.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  claimToken: text("claim_token"),
  claimSentAt: text("claim_sent_at"),
  claimed: integer("claimed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// Helper to check if a member is eligible (membership not expired)
export function isMemberEligible(membershipExpires: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return membershipExpires >= today;
}
