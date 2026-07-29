import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "./_lib/session";
import { getContentFile, listDirectory, deleteContentFile } from "./_lib/github";
import { parseFrontmatter } from "../src/lib/frontmatter";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }
  if (!session.authorized) {
    res.status(403).json({ error: "You don't have the required Discord role to publish." });
    return;
  }

  const payload = req.body as { slug?: unknown };
  const slug = typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";
  if (!slug || !SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid slug." });
    return;
  }

  const indexPath = `contents/${slug}/index.md`;

  try {
    const indexFile = await getContentFile(indexPath);
    if (!indexFile) {
      res.status(404).json({ error: `No guide found with slug "${slug}".` });
      return;
    }

    const { data } = parseFrontmatter(indexFile.content);
    const authorId = typeof data.authorId === "string" ? data.authorId : null;

    if (!authorId || authorId !== session.sub) {
      res.status(403).json({ error: "Only the guide's original publisher can delete it." });
      return;
    }

    const author = { name: session.username, email: `${session.sub}@users.noreply.discord.com` };
    const entries = await listDirectory(`contents/${slug}`);

    // Deleted one at a time, same reasoning as publish: the Contents API commits each
    // file separately, and parallel deletes against the same branch ref can race.
    for (const entry of entries) {
      if (entry.type !== "file") continue;
      await deleteContentFile({
        path: entry.path,
        sha: entry.sha,
        message: `Remove guide: ${slug} (${entry.path.split("/").pop()})`,
        author,
      });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(502).json({ error: "Failed to delete from GitHub. Please try again." });
  }
}
