import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members, isMemberEligible } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId, gender } = body;

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    if (!gender || (gender !== "M" && gender !== "F")) {
      return NextResponse.json(
        { error: "Gender is required (M or F)" },
        { status: 400 }
      );
    }

    const trimmedStudentId = studentId.trim();

    // Check if this Clerk user is already linked to a member
    const [existingLink] = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (existingLink) {
      return NextResponse.json(
        { error: "This account is already linked to a member" },
        { status: 409 }
      );
    }

    // Find the member by student ID
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.studentId, trimmedStudentId))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "No member found with that Student ID. Please ensure you are registered as an ISOC member." },
        { status: 404 }
      );
    }

    // Check if student ID is already linked to another Clerk user
    if (member.clerkUserId) {
      return NextResponse.json(
        { error: "This Student ID is already linked to another account" },
        { status: 409 }
      );
    }

    // Check if membership is expired
    if (!isMemberEligible(member.membershipExpires)) {
      return NextResponse.json(
        { error: "Your membership has expired. Please renew to continue." },
        { status: 403 }
      );
    }

    // Check if member is blacklisted
    if (member.isBlacklisted) {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact ISOC." },
        { status: 403 }
      );
    }

    // Link the Clerk user to the member
    await db
      .update(members)
      .set({ clerkUserId: userId, gender })
      .where(eq(members.id, member.id));

    return NextResponse.json({
      success: true,
      memberId: member.id,
      name: member.name,
      isAdmin: member.isAdmin,
    });
  } catch (error) {
    console.error("Link member error:", error);
    return NextResponse.json(
      { error: "Failed to link account. Please try again." },
      { status: 500 }
    );
  }
}
