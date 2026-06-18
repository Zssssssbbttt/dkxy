import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "super-secret-key-change-in-production"
);
const COOKIE_NAME = "session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 天

export interface SessionUser {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  role: string;
  departmentId: string | null;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.id) return null;
    return {
      id: payload.id as string,
      name: payload.name as string,
      employeeId: payload.employeeId as string,
      phone: payload.phone as string,
      role: payload.role as string,
      departmentId: (payload.departmentId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}