import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "crypto";
import { buildAuthorizeUrl } from "../_lib/discord";
import { createStateCookie } from "../_lib/session";

function redirectUri(req: VercelRequest): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host;
  return `${proto}://${host}/api/auth/callback`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const state = randomBytes(16).toString("hex");

  res.setHeader("Set-Cookie", createStateCookie(state));
  res.redirect(302, buildAuthorizeUrl(redirectUri(req), state));
}
