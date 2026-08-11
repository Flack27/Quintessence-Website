import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireEnv } from "./env";

/**
 * The site is served from `PUBLIC_SITE_URL` (e.g. quintessence-eu.com/guides/) but these
 * functions live on the codex's own Vercel domain, so every browser call here is cross-origin.
 * Call this first in every handler; when it returns true (an OPTIONS preflight), the caller
 * should return immediately without doing any other work.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = new URL(requireEnv("PUBLIC_SITE_URL")).origin;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
