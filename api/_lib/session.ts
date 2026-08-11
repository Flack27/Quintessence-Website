import { SignJWT, jwtVerify } from "jose";
import { parse, serialize } from "cookie";
import type { VercelRequest } from "@vercel/node";
import { requireEnv } from "./env";
import type { GuildRole } from "./discord";

const SESSION_COOKIE = "aion_session";
const STATE_COOKIE = "aion_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  /** Discord user id */
  sub: string;
  username: string;
  avatar: string | null;
  /** Permission tier in the configured guild, as of login time. */
  role: GuildRole;
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

  // sameSite "none" (not "lax") because the browser calls this API cross-origin — the site is
  // served from quintessence-eu.com/guides/, while these functions live on the codex's own
  // Vercel domain. "Lax" cookies aren't sent on cross-site fetch/XHR, only top-level navigation.
  return serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(): string {
  return serialize(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 0 });
}

export async function getSession(req: VercelRequest): Promise<SessionPayload | null> {
  const cookies = parse(req.headers.cookie ?? "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") return null;
    const role = payload.role;
    return {
      sub: payload.sub,
      username: payload.username,
      avatar: (payload.avatar as string | null) ?? null,
      role: role === "author" || role === "moderator" ? role : "none",
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
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function clearStateCookie(): string {
  return serialize(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 0 });
}

export function readStateCookie(req: VercelRequest): string | null {
  const cookies = parse(req.headers.cookie ?? "");
  return cookies[STATE_COOKIE] ?? null;
}
