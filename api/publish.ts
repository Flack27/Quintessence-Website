import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "./_lib/session";
import { applyCors } from "./_lib/cors";
import { contentFileExists, createContentFile } from "./_lib/github";
import {
  SLUG_PATTERN,
  parsePostFields,
  buildMarkdown,
  requireNonEmptyString,
  type PublishRequestBody,
  type ParsedPostFields,
} from "./_lib/postFields";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }
  if (session.role === "none") {
    res.status(403).json({ error: "You don't have the required Discord role to publish." });
    return;
  }

  const payload = req.body as PublishRequestBody;

  let slug: string;
  let fields: ParsedPostFields;

  try {
    slug = requireNonEmptyString(payload.slug, "slug").trim().toLowerCase();
    fields = parsePostFields(payload);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request." });
    return;
  }

  if (!SLUG_PATTERN.test(slug) || slug.length > 80) {
    res.status(400).json({
      error: "Slug must be lowercase letters, numbers and hyphens only (e.g. \"my-new-guide\").",
    });
    return;
  }

  const path = `contents/${slug}/index.md`;

  try {
    if (await contentFileExists(path)) {
      res.status(409).json({ error: `A guide with slug "${slug}" already exists.` });
      return;
    }

    const markdown = buildMarkdown(fields, { name: session.username, id: session.sub });
    const author = { name: session.username, email: `${session.sub}@users.noreply.discord.com` };

    // Uploaded one at a time: the Contents API commits each file separately, and
    // parallel PUTs against the same branch ref can race and clobber each other.
    for (const image of fields.images) {
      await createContentFile({
        path: `contents/${slug}/${image.filename}`,
        content: image.content,
        encoding: "base64",
        message: `Add image for guide ${slug}: ${image.filename}`,
        author,
      });
    }

    const { commitUrl } = await createContentFile({
      path,
      content: markdown,
      message: `Add guide: ${fields.title} (${slug})`,
      author,
    });

    res.status(200).json({ ok: true, slug, url: `/guide/${slug}`, commitUrl });
  } catch (error) {
    console.error("Publish failed:", error);
    res.status(502).json({ error: "Failed to publish to GitHub. Please try again." });
  }
}
