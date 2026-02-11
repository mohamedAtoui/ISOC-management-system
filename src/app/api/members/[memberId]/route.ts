import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/auth";

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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
