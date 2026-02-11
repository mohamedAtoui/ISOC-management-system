import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getSession() {
  const { userId } = await auth();
  if (!userId) return null;

  // Look up member by clerkUserId
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);

  if (!member) return null;

  return { member };
}

export async function requireSession() {
  const result = await getSession();
  if (!result) redirect("/sign-in");
  return result;
}

export async function requireAdmin() {
  const result = await getSession();
  if (!result || !result.member.isAdmin) redirect("/");
  return result;
}

// API-specific auth helpers that return JSON errors instead of redirecting
export async function requireSessionApi() {
  const result = await getSession();
  if (!result) {
    return { error: "Unauthorized", status: 401 as const };
  }
  return { session: result };
}

export async function requireAdminApi() {
  const result = await getSession();
  if (!result) {
    return { error: "Unauthorized", status: 401 as const };
  }
  if (!result.member.isAdmin) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { session: result };
}
