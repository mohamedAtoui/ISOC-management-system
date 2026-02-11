import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const ADMIN_COOKIE_NAME = "admin_session";
const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "fallback-secret-change-in-production"
);

export interface AdminSession {
  adminId: string;
  memberId: number;
  exp: number;
}

export async function createAdminSession(adminId: string, memberId: number): Promise<string> {
  const token = await new SignJWT({ adminId, memberId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h") // Session expires in 8 hours
    .setIssuedAt()
    .sign(SECRET);

  return token;
}

export async function verifyAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function setAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export function verifyAdminCredentials(adminId: string, password: string): boolean {
  const validAdminId = process.env.ADMIN_ID;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (!validAdminId || !validPassword) {
    console.error("ADMIN_ID or ADMIN_PASSWORD not set in environment");
    return false;
  }

  return adminId === validAdminId && password === validPassword;
}
