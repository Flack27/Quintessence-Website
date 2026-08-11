import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSessionCookie } from "../_lib/session";
import { applyCors } from "../_lib/cors";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(200).json({ ok: true });
}
