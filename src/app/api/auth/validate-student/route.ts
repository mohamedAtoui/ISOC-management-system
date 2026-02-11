import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, isMemberEligible } from "@/db/schema";
import { eq } from "drizzle-orm";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}

// Generic error message to prevent user enumeration
const GENERIC_ERROR = "Unable to verify student ID. Please contact ISOC if you believe this is an error.";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const studentId = body.studentId?.trim();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Find member by student ID
    const member = await db.query.members.findFirst({
      where: eq(members.studentId, studentId),
    });

    // Check if student ID exists - use generic error
    if (!member) {
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 400 }
      );
    }

    // Check if already linked to a Clerk account - use generic error
    if (member.clerkUserId) {
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 400 }
      );
    }

    // Check if membership is expired - use generic error
    if (!isMemberEligible(member.membershipExpires)) {
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 400 }
      );
    }

    // Check if blacklisted - use generic error
    if (member.isBlacklisted) {
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 400 }
      );
    }

    // Valid - return member info (only success case reveals information)
    return NextResponse.json({
      valid: true,
      name: member.name,
    });
  } catch (err) {
    console.error("Validate student error:", err);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
