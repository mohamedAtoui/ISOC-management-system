import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth";
import { MAX_STRIKES } from "@/lib/constants";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const authResult = await requireAdminApi();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { memberId } = await params;
  const body = await req.json();
  const { action } = body;

  if (action === "unban") {
    // Reset strikes, remove blacklist, and clear penalty
    await db
      .update(members)
      .set({
        isBlacklisted: false,
        strikes: 0,
        penaltyUntilEventCount: 0,
      })
      .where(eq(members.id, Number(memberId)));

    return NextResponse.json({ success: true, message: "Member unbanned successfully" });
  }

  if (action === "blacklist") {
    await db
      .update(members)
      .set({ isBlacklisted: true })
      .where(eq(members.id, Number(memberId)));

    return NextResponse.json({ success: true, message: "Member blacklisted successfully" });
  }

  if (action === "add-strike") {
    await db.run(
      sql`UPDATE members SET strikes = strikes + 1 WHERE id = ${Number(memberId)}`
    );

    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, Number(memberId)))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.strikes >= MAX_STRIKES) {
      await db
        .update(members)
        .set({ isBlacklisted: true })
        .where(eq(members.id, Number(memberId)));
    }

    return NextResponse.json({
      success: true,
      strikes: member.strikes,
      blacklisted: member.strikes >= MAX_STRIKES,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
