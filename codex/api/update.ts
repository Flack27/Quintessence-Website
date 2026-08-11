import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "./_lib/session";
import { applyCors } from "./_lib/cors";
import { getContentFile, createContentFile } from "./_lib/github";
import { parseFrontmatter } from "../src/lib/frontmatter";
import { SLUG_PATTERN, parsePostFields, buildMarkdown, type PublishRequestBody, type ParsedPostFields } from "./_lib/postFields";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }
  if (session.role === "none") {
    res.status(403).json({ error: "You don't have the required Discord role to edit guides." });
    return;
  }

  const payload = req.body as PublishRequestBody;
  const slug = typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";
  if (!slug || !SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid slug." });
    return;
  }

  let fields: ParsedPostFields;
  try {
    fields = parsePostFields(payload);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request." });
    return;
  }

  const path = `contents/${slug}/index.md`;

  try {
    const existingFile = await getContentFile(path);
    if (!existingFile) {
      res.status(404).json({ error: `No guide found with slug "${slug}".` });
      return;
    }

    const { data: existingData } = parseFrontmatter(existingFile.content);
    const authorId = typeof existingData.authorId === "string" ? existingData.authorId : null;
    const authorName = typeof existingData.author === "string" ? existingData.author : session.username;

    if (!(session.role === "moderator" || (authorId && authorId === session.sub))) {
      res.status(403).json({ error: "You can only edit your own guides." });
      return;
    }

    const commitAuthor = { name: session.username, email: `${session.sub}@users.noreply.discord.com` };

    // Uploaded one at a time, same reasoning as publish: the Contents API commits each
    // file separately, and parallel PUTs against the same branch ref can race.
    for (const image of fields.images) {
      await createContentFile({
        path: `contents/${slug}/${image.filename}`,
        content: image.content,
        encoding: "base64",
        message: `Add image for guide ${slug}: ${image.filename}`,
        author: commitAuthor,
      });
    }

    // Author/authorId always come from the existing file, never the request — editing never
    // reassigns ownership, even when a moderator is the one making the change.
    const markdown = buildMarkdown(fields, { name: authorName, id: authorId ?? session.sub });

    const { commitUrl } = await createContentFile({
      path,
      content: markdown,
      sha: existingFile.sha,
      message: `Update guide: ${fields.title} (${slug})`,
      author: commitAuthor,
    });

    res.status(200).json({ ok: true, slug, url: `/guide/${slug}`, commitUrl });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(502).json({ error: "Failed to update on GitHub. Please try again." });
  }
}
