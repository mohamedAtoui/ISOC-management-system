import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  verifyAdminCredentials,
  createAdminSession,
  setAdminCookie,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    // First check if user is authenticated and is an admin in the database
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (!session.member.isAdmin) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { adminId, password } = body;

    if (!adminId || !password) {
      return NextResponse.json(
        { error: "Admin ID and password are required" },
        { status: 400 }
      );
    }

    // Verify admin credentials
    if (!verifyAdminCredentials(adminId, password)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create admin session token
    const token = await createAdminSession(adminId, session.member.id);

    // Set the cookie
    await setAdminCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
