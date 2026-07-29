import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "../_lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req);

  if (!session) {
    res.status(200).json({ authenticated: false, authorized: false });
    return;
  }

  res.status(200).json({
    authenticated: true,
    authorized: session.authorized,
    user: { id: session.sub, username: session.username, avatar: session.avatar },
  });
}
