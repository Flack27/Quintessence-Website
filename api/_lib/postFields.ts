/** Validation/sanitization shared by api/publish.ts (create) and api/update.ts (edit). */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const IMAGE_FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,80}\.(png|jpe?g|gif|webp|svg)$/;
export const MAX_BODY_LENGTH = 200_000;
export const MAX_FIELD_LENGTH = 300;
export const MAX_IMAGES = 6;
// Vercel serverless functions cap the whole request body around 4.5MB, and base64 inflates
// payload size by ~33% — keep well under that so a full request doesn't get rejected upstream.
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;

export interface PublishRequestImage {
  filename?: unknown;
  content?: unknown;
}

export interface PublishRequestBody {
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
  images?: unknown;
}

export interface PublishImage {
  filename: string;
  content: string;
}

/** Validates the client-supplied image list; throws with a user-facing message on the first bad entry. */
export function parseImages(value: unknown): PublishImage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("Images must be a list.");
  }
  if (value.length > MAX_IMAGES) {
    throw new Error(`Too many images (max ${MAX_IMAGES}).`);
  }

  const seen = new Set<string>();
  let totalBytes = 0;

  const images = value.map((item: PublishRequestImage) => {
    const filename = item?.filename;
    const content = item?.content;

    if (typeof filename !== "string" || !IMAGE_FILENAME_PATTERN.test(filename)) {
      throw new Error(`Invalid image filename: "${String(filename)}".`);
    }
    if (seen.has(filename)) {
      throw new Error(`Duplicate image filename: "${filename}".`);
    }
    seen.add(filename);

    if (typeof content !== "string" || !content) {
      throw new Error(`Missing image data for "${filename}".`);
    }
    const base64 = content.replace(/^data:[^,]*base64,/, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      throw new Error(`Image "${filename}" is not valid base64 data.`);
    }

    const bytes = Buffer.byteLength(base64, "base64");
    if (bytes > MAX_IMAGE_BYTES) {
      throw new Error(`Image "${filename}" is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB).`);
    }
    totalBytes += bytes;

    return { filename, content: base64 };
  });

  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new Error(`Images are too large together (max ${MAX_TOTAL_IMAGE_BYTES / (1024 * 1024)}MB total).`);
  }

  return images;
}

/** Frontmatter scalars are single-line and the parser has no quote-escaping, so strip both. */
export function sanitizeScalar(value: string): string {
  return value.replace(/["\r\n]/g, "").trim().slice(0, MAX_FIELD_LENGTH);
}

export function yamlString(value: string): string {
  return `"${sanitizeScalar(value)}"`;
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`"${field}" is required.`);
  }
  return value;
}

export interface ParsedPostFields {
  title: string;
  description: string;
  game: string;
  section: string;
  body: string;
  images: PublishImage[];
  subtitle?: string;
  date?: string;
  cover?: string;
  tags: string[];
}

/** Parses and validates every field shared by create and update; throws a user-facing Error on the first problem. */
export function parsePostFields(payload: PublishRequestBody): ParsedPostFields {
  const title = requireNonEmptyString(payload.title, "title");
  const description = requireNonEmptyString(payload.description, "description");
  const game = requireNonEmptyString(payload.game, "game");
  const section = requireNonEmptyString(payload.section, "section");
  const body = requireNonEmptyString(payload.body, "body");
  const images = parseImages(payload.images);

  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`Guide body is too long (max ${MAX_BODY_LENGTH} characters).`);
  }

  const subtitle = typeof payload.subtitle === "string" ? payload.subtitle : undefined;
  const date = typeof payload.date === "string" ? payload.date : undefined;
  const cover = typeof payload.cover === "string" ? payload.cover : undefined;
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => sanitizeScalar(tag).replace(/,/g, ""))
    : [];

  return { title, description, game, section, body, images, subtitle, date, cover, tags };
}

/** Builds the `---\n...\n---\n\nbody` markdown file content shared by create and update. */
export function buildMarkdown(
  fields: ParsedPostFields,
  author: { name: string; id: string },
): string {
  const frontmatterLines = [
    `title: ${yamlString(fields.title)}`,
    fields.subtitle ? `subtitle: ${yamlString(fields.subtitle)}` : null,
    `description: ${yamlString(fields.description)}`,
    `game: ${yamlString(fields.game)}`,
    `section: ${yamlString(fields.section)}`,
    fields.tags.length ? `tags: [${fields.tags.join(", ")}]` : null,
    fields.date ? `date: ${yamlString(fields.date)}` : null,
    `author: ${yamlString(author.name)}`,
    // Discord user id, not shown anywhere in the UI — lets /api/delete and /api/update verify
    // who may modify a guide.
    `authorId: ${yamlString(author.id)}`,
    fields.cover ? `cover: ${yamlString(fields.cover)}` : null,
  ].filter((line): line is string => line !== null);

  return `---\n${frontmatterLines.join("\n")}\n---\n\n${fields.body.trim()}\n`;
}
