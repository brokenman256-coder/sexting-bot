import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { SessionPayload, User, UserRole } from "./types";
import { findUserById, toPublicUser } from "./db";

export const COOKIE_NAME = "nightline_session";
export const ADMIN_COOKIE = "nightline_admin";

function secretKey() {
  const s = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "nightline-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export async function createSessionToken(
  user: User,
  maxAgeSec = 60 * 60 * 24 * 14
): Promise<string> {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    level: user.level,
  };
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: (payload.role as UserRole) || "user",
      level: (Number(payload.level) as 1 | 2 | 3) || 1,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await findUserById(session.sub);
  if (!user || user.banned) return null;
  return user;
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    // also allow ADMIN_PASSWORD cookie path
    const jar = await cookies();
    if (jar.get(ADMIN_COOKIE)?.value === "1") {
      return user;
    }
    return null;
  }
  return user;
}

export function setAdminCookieOnResponse(res: NextResponse, ok: boolean) {
  if (ok) {
    res.cookies.set(ADMIN_COOKIE, "1", sessionCookieOptions(60 * 60 * 12));
  } else {
    res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  }
  return res;
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const adminCookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (adminCookie === "1") return true;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  if (!session) return false;
  const user = await findUserById(session.sub);
  return !!user && user.role === "admin" && !user.banned;
}

export { toPublicUser };
