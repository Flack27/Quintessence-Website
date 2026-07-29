import { SignJWT, jwtVerify } from "jose";
import { parse, serialize } from "cookie";
import type { VercelRequest } from "@vercel/node";
import { requireEnv } from "./env";

const SESSION_COOKIE = "aion_session";
const STATE_COOKIE = "aion_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  /** Discord user id */
  sub: string;
  username: string;
  avatar: string | null;
  /** Has the required role in the configured guild, as of login time. */
  authorized: boolean;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

export async function createSessionCookie(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  return serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(): string {
  return serialize(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession(req: VercelRequest): Promise<SessionPayload | null> {
  const cookies = parse(req.headers.cookie ?? "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") return null;
    return {
      sub: payload.sub,
      username: payload.username,
      avatar: (payload.avatar as string | null) ?? null,
      authorized: Boolean(payload.authorized),
    };
  } catch {
    return null;
  }
}

/** Short-lived cookie used only to guard the OAuth redirect against CSRF. */
export function createStateCookie(state: string): string {
  return serialize(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function clearStateCookie(): string {
  return serialize(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export function readStateCookie(req: VercelRequest): string | null {
  const cookies = parse(req.headers.cookie ?? "");
  return cookies[STATE_COOKIE] ?? null;
}
