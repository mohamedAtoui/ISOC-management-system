import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    // Check if user is admin
    const [member] = await db
      .select({ isAdmin: members.isAdmin })
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (member?.isAdmin) {
      redirect("/admin");
    }

    redirect("/book");
  }

  // User is not signed in, redirect to sign-up
  redirect("/sign-up");
}
