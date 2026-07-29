import type { VercelRequest, VercelResponse } from "@vercel/node";
import { exchangeCodeForToken, getDiscordUser, hasRequiredRole } from "../_lib/discord";
import { clearStateCookie, createSessionCookie, readStateCookie } from "../_lib/session";

function redirectUri(req: VercelRequest): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host;
  return `${proto}://${host}/api/auth/callback`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const expectedState = readStateCookie(req);

  if (!code || !state || !expectedState || state !== expectedState) {
    res.setHeader("Set-Cookie", clearStateCookie());
    res.status(400).send("Login failed: invalid or expired state. Please try logging in again.");
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(code, redirectUri(req));
    const discordUser = await getDiscordUser(accessToken);
    const authorized = await hasRequiredRole(discordUser.id);

    const sessionCookie = await createSessionCookie({
      sub: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      authorized,
    });

    res.setHeader("Set-Cookie", [clearStateCookie(), sessionCookie]);
    res.redirect(302, authorized ? "/publish" : "/?unauthorized=1");
  } catch (error) {
    console.error("Discord OAuth callback failed:", error);
    res.setHeader("Set-Cookie", clearStateCookie());
    res.status(502).send("Login failed while contacting Discord. Please try again.");
  }
}
