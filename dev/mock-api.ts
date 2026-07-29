import type { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { parseFrontmatter } from "../src/lib/frontmatter";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,80}\.(png|jpe?g|gif|webp|svg)$/;
const MAX_FIELD_LENGTH = 300;

/** Stable fake identity used for every guide "published" through this mock. */
export const DEV_USER = { id: "dev-local-user", username: "Local Dev", avatar: null as string | null };

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`"${field}" is required.`);
  }
  return value;
}

function sanitizeScalar(value: string): string {
  return value.replace(/["\r\n]/g, "").trim().slice(0, MAX_FIELD_LENGTH);
}

function yamlString(value: string): string {
  return `"${sanitizeScalar(value)}"`;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function handlePublish(req: IncomingMessage, res: ServerResponse, contentsRoot: string) {
  const payload = await readJsonBody(req);

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
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request." });
    return;
  }

  if (!SLUG_PATTERN.test(slug)) {
    sendJson(res, 400, {
      error: 'Slug must be lowercase letters, numbers and hyphens only (e.g. "my-new-guide").',
    });
    return;
  }

  const postDir = path.join(contentsRoot, slug);
  if (await pathExists(postDir)) {
    sendJson(res, 409, { error: `A guide with slug "${slug}" already exists.` });
    return;
  }

  const images: { filename: string; base64: string }[] = [];
  if (payload.images !== undefined) {
    if (!Array.isArray(payload.images)) {
      sendJson(res, 400, { error: "Images must be a list." });
      return;
    }
    for (const item of payload.images as Array<{ filename?: unknown; content?: unknown }>) {
      const filename = item?.filename;
      const content = item?.content;
      if (typeof filename !== "string" || !IMAGE_FILENAME_PATTERN.test(filename)) {
        sendJson(res, 400, { error: `Invalid image filename: "${String(filename)}".` });
        return;
      }
      if (typeof content !== "string" || !content) {
        sendJson(res, 400, { error: `Missing image data for "${filename}".` });
        return;
      }
      images.push({ filename, base64: content.replace(/^data:[^,]*base64,/, "") });
    }
  }

  const subtitle = typeof payload.subtitle === "string" ? payload.subtitle : undefined;
  const date = typeof payload.date === "string" ? payload.date : undefined;
  const cover = typeof payload.cover === "string" ? payload.cover : undefined;
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => sanitizeScalar(tag).replace(/,/g, ""))
    : [];

  const frontmatterLines = [
    `title: ${yamlString(title)}`,
    subtitle ? `subtitle: ${yamlString(subtitle)}` : null,
    `description: ${yamlString(description)}`,
    `game: ${yamlString(game)}`,
    `section: ${yamlString(section)}`,
    tags.length ? `tags: [${tags.join(", ")}]` : null,
    date ? `date: ${yamlString(date)}` : null,
    `author: ${yamlString(DEV_USER.username)}`,
    `authorId: ${yamlString(DEV_USER.id)}`,
    cover ? `cover: ${yamlString(cover)}` : null,
  ].filter((line): line is string => line !== null);

  const markdown = `---\n${frontmatterLines.join("\n")}\n---\n\n${body.trim()}\n`;

  await fs.mkdir(postDir, { recursive: true });
  await fs.writeFile(path.join(postDir, "index.md"), markdown, "utf-8");
  for (const image of images) {
    await fs.writeFile(path.join(postDir, image.filename), Buffer.from(image.base64, "base64"));
  }

  sendJson(res, 200, { ok: true, slug, url: `/guide/${slug}`, commitUrl: "#" });
}

async function handleDelete(req: IncomingMessage, res: ServerResponse, contentsRoot: string) {
  const payload = await readJsonBody(req);
  const slug = typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";

  if (!slug || !SLUG_PATTERN.test(slug)) {
    sendJson(res, 400, { error: "Invalid slug." });
    return;
  }

  const postDir = path.join(contentsRoot, slug);
  const indexPath = path.join(postDir, "index.md");

  if (!(await pathExists(indexPath))) {
    sendJson(res, 404, { error: `No guide found with slug "${slug}".` });
    return;
  }

  const raw = await fs.readFile(indexPath, "utf-8");
  const { data } = parseFrontmatter(raw);
  const authorId = typeof data.authorId === "string" ? data.authorId : null;

  if (!authorId || authorId !== DEV_USER.id) {
    sendJson(res, 403, { error: "Only the guide's original publisher can delete it." });
    return;
  }

  await fs.rm(postDir, { recursive: true, force: true });
  sendJson(res, 200, { ok: true });
}

/**
 * Dev-only stand-in for the Vercel serverless functions under api/, so the whole
 * publish -> view -> delete lifecycle works with just `npm run dev` — no Vercel CLI,
 * Discord app or GitHub token needed. Writes real files into contents/, so the same
 * content.ts glob-loader Vite already watches picks guides up like any hand-written one.
 */
export function mockApiPlugin(): Plugin {
  return {
    name: "quintessence-dev-mock-api",
    apply: "serve",
    configureServer(server) {
      const contentsRoot = path.join(server.config.root, "contents");

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        try {
          if (url === "/api/auth/me" && req.method === "GET") {
            sendJson(res, 200, { authenticated: true, authorized: true, user: DEV_USER });
            return;
          }
          if (url === "/api/auth/logout" && req.method === "POST") {
            sendJson(res, 200, { ok: true });
            return;
          }
          if (url === "/api/publish" && req.method === "POST") {
            await handlePublish(req, res, contentsRoot);
            return;
          }
          if (url === "/api/delete" && req.method === "DELETE") {
            await handleDelete(req, res, contentsRoot);
            return;
          }
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : "Dev mock API error." });
          return;
        }

        next();
      });

      console.log(
        "\n  [dev-mock-api] /api/publish, /api/delete and /api/auth/* are mocked locally.\n" +
          "  Guides are written for real to contents/<slug>/, but nothing touches GitHub or Discord.\n",
      );
    },
  };
}
