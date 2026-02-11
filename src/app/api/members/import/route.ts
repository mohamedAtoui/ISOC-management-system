import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, isMemberEligible } from "@/db/schema";
import { parseFile } from "@/lib/csv";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const sessionData = await getSession();
  if (!sessionData || !sessionData.member.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preview = request.nextUrl.searchParams.get("preview") === "true";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = parseFile(buffer, file.name);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File is empty or has no valid rows" },
        { status: 400 }
      );
    }

    // Compute eligibility for preview display
    const membersData = rows.map((row) => ({
      ...row,
      isEligible: isMemberEligible(row.membershipExpires),
    }));

    // Preview mode: return parsed data without importing
    if (preview) {
      return NextResponse.json({
        preview: true,
        count: membersData.length,
        members: membersData,
      });
    }

    // Import mode: upsert members
    let imported = 0;
    const errors: string[] = [];

    for (const member of rows) {
      try {
        await db
          .insert(members)
          .values({
            studentId: member.studentId,
            name: member.name,
            joiningDate: member.joiningDate,
            membershipExpires: member.membershipExpires,
          })
          .onConflictDoUpdate({
            target: members.studentId,
            set: {
              name: sql`excluded.name`,
              joiningDate: sql`excluded.joining_date`,
              membershipExpires: sql`excluded.membership_expires`,
            },
          });
        imported++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Student ${member.studentId}: ${message}`);
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
