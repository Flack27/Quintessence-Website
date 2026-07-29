import { requireEnv } from "./env";

const API_BASE = "https://discord.com/api/v10";

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `${API_BASE}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord user: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string; username: string; avatar: string | null };
  return { id: data.id, username: data.username, avatar: data.avatar };
}

/**
 * Looks up the user's roles in the configured guild using the bot token (server-side only —
 * never exposed to the client). Returns `false` if the user isn't a member of the guild.
 */
export async function hasRequiredRole(userId: string): Promise<boolean> {
  const guildId = requireEnv("DISCORD_GUILD_ID");
  const requiredRoleId = requireEnv("DISCORD_REQUIRED_ROLE_ID");
  const botToken = requireEnv("DISCORD_BOT_TOKEN");

  const response = await fetch(`${API_BASE}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`Failed to fetch guild member: ${response.status} ${await response.text()}`);
  }

  const member = (await response.json()) as { roles: string[] };
  return member.roles.includes(requiredRoleId);
}
