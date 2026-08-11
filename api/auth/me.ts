import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "../_lib/session";
import { applyCors } from "../_lib/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const session = await getSession(req);

  if (!session) {
    res.status(200).json({ authenticated: false, role: "none" });
    return;
  }

  res.status(200).json({
    authenticated: true,
    role: session.role,
    user: { id: session.sub, username: session.username, avatar: session.avatar },
  });
}
