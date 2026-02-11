import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { like, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const sessionData = await getSession();
  if (!sessionData || !sessionData.member.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search")?.trim();

  let result;

  if (search) {
    const pattern = `%${search}%`;
    result = await db
      .select()
      .from(members)
      .where(
        or(
          like(members.name, pattern),
          like(members.studentId, pattern)
        )
      )
      .orderBy(members.name);
  } else {
    result = await db
      .select()
      .from(members)
      .orderBy(members.name);
  }

  return NextResponse.json({ members: result });
}
