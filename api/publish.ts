import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "./_lib/session";
import { contentFileExists, createContentFile } from "./_lib/github";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_BODY_LENGTH = 200_000;
const MAX_FIELD_LENGTH = 300;

interface PublishRequestBody {
  slug?: unknown;
  title?: unknown;
  subtitle?: unknown;
  description?: unknown;
  game?: unknown;
  section?: unknown;
  tags?: unknown;
  date?: unknown;
  cover?: unknown;
  body?: unknown;
}

/** Frontmatter scalars are single-line and the parser has no quote-escaping, so strip both. */
function sanitizeScalar(value: string): string {
  return value.replace(/["\r\n]/g, "").trim().slice(0, MAX_FIELD_LENGTH);
}

function yamlString(value: string): string {
  return `"${sanitizeScalar(value)}"`;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`"${field}" is required.`);
  }
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
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

  const payload = req.body as PublishRequestBody;

  let slug: string;
  let title: string;
  let description: string;
  let game: string;
  let section: string;
  let body: string;

  try {
    slug = requireNonEmptyString(payload.slug, "slug").trim().toLowerCase();
    title = requireNonEmptyString(payload.title, "title");
    description = requireNonEmptyString(payload.description, "description");
    game = requireNonEmptyString(payload.game, "game");
    section = requireNonEmptyString(payload.section, "section");
    body = requireNonEmptyString(payload.body, "body");
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

  if (body.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: `Guide body is too long (max ${MAX_BODY_LENGTH} characters).` });
    return;
  }

  const subtitle = typeof payload.subtitle === "string" ? payload.subtitle : undefined;
  const date = typeof payload.date === "string" ? payload.date : undefined;
  const cover = typeof payload.cover === "string" ? payload.cover : undefined;
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => sanitizeScalar(tag).replace(/,/g, ""))
    : [];

  const path = `contents/${slug}/index.md`;

  try {
    if (await contentFileExists(path)) {
      res.status(409).json({ error: `A guide with slug "${slug}" already exists.` });
      return;
    }

    const frontmatterLines = [
      `title: ${yamlString(title)}`,
      subtitle ? `subtitle: ${yamlString(subtitle)}` : null,
      `description: ${yamlString(description)}`,
      `game: ${yamlString(game)}`,
      `section: ${yamlString(section)}`,
      tags.length ? `tags: [${tags.join(", ")}]` : null,
      date ? `date: ${yamlString(date)}` : null,
      `author: ${yamlString(session.username)}`,
      cover ? `cover: ${yamlString(cover)}` : null,
    ].filter((line): line is string => line !== null);

    const markdown = `---\n${frontmatterLines.join("\n")}\n---\n\n${body.trim()}\n`;

    const { commitUrl } = await createContentFile({
      path,
      content: markdown,
      message: `Add guide: ${title} (${slug})`,
      author: { name: session.username, email: `${session.sub}@users.noreply.discord.com` },
    });

    res.status(200).json({ ok: true, slug, url: `/guide/${slug}`, commitUrl });
  } catch (error) {
    console.error("Publish failed:", error);
    res.status(502).json({ error: "Failed to publish to GitHub. Please try again." });
  }
}
