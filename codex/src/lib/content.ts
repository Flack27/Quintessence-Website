import { publicAsset } from "./assets";
import { CODEX_API } from "./config";
import type { Post, PostFrontmatter } from "@/types/post";

/**
 * Guides come from the API, not from the bundle.
 *
 * They used to be read at build time with `import.meta.glob("/contents/*&#47;index.md")`,
 * which meant a guide could not appear without rebuilding and redeploying the
 * container - fine on a host that rebuilds on every push, useless on the guild's
 * hand-deployed server, and it made publishing from the site pointless.
 *
 * The `Post` shape is unchanged on purpose: PostCard, PostGrid, the search index and
 * the markdown renderer all keep working against the same fields, so only the source
 * of the data moved.
 */

/** What /api/codex/guides returns. */
interface GuideResponse {
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  game: string;
  section: string;
  tags: string[];
  date?: string | null;
  author?: string | null;
  authorId?: string | null;
  cover?: string | null;
  draft: boolean;
  content?: string | null;
  /** Stripped body, sent on the index where `content` is omitted. */
  searchText?: string | null;
  /** Filenames already uploaded for this guide. Sent on the single-guide read only. */
  images?: string[];
}

function toPost(dto: GuideResponse): Post {
  const frontmatter: PostFrontmatter = {
    title: dto.title,
    subtitle: dto.subtitle ?? undefined,
    description: dto.description ?? "",
    game: dto.game || "General",
    section: dto.section || "Uncategorized",
    tags: dto.tags ?? [],
    date: dto.date ?? undefined,
    author: dto.author ?? undefined,
    authorId: dto.authorId ?? undefined,
    cover: dto.cover ?? undefined,
    draft: dto.draft,
  };

  return {
    slug: dto.slug,
    frontmatter,
    content: dto.content ?? "",
    searchText: (dto.searchText ?? dto.content ?? "").toLowerCase(),
    coverUrl: frontmatter.cover ? resolveAssetUrl(dto.slug, frontmatter.cover) : undefined,
    images: dto.images,
  };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

/** Every guide the caller may see, newest first. Drafts are filtered server-side. */
export async function fetchPosts(): Promise<Post[]> {
  const guides = await getJson<GuideResponse[]>(`${CODEX_API}/guides`);
  return guides.map(toPost);
}

/** One guide including its markdown body, or null if it does not exist. */
export async function fetchPost(slug: string): Promise<Post | null> {
  try {
    return toPost(await getJson<GuideResponse>(`${CODEX_API}/guides/${encodeURIComponent(slug)}`));
  } catch {
    return null;
  }
}

/**
 * Resolves an image path from a guide's markdown to a URL.
 *
 * A bare or relative filename ("cover.png", "./shot.jpg") is an image uploaded with
 * that guide, served by the API. A root-absolute path is a file in the Codex's own
 * `assets/` folder and still resolves against the site base.
 */
export function resolveAssetUrl(slug: string, relativePath: string): string | undefined {
  if (!relativePath) return undefined;
  if (/^https?:\/\//.test(relativePath)) return relativePath;
  if (relativePath.startsWith("/")) return publicAsset(relativePath);

  const cleaned = relativePath.replace(/^\.\//, "");
  return `${CODEX_API}/guides/${encodeURIComponent(slug)}/images/${encodeURIComponent(cleaned)}`;
}

/**
 * Reads an explicit pixel size and/or left/right placement off a markdown image's
 * title, e.g. `![alt](file.png "400")`, `![alt](file.png "400x250 left")`, or
 * `![alt](file.png "right")`. Lets an author pin an image's size and float it beside
 * the text without touching CSS; anything else in the title is left alone so it still
 * works as a normal tooltip.
 *
 * A trailing `hover:<payload>` (e.g. `![alt](thumb.png "hover:big.png")`) marks the
 * image as a hover trigger - see `parseHoverPayload` for what the payload means. It's
 * pulled out first since its payload may itself contain spaces.
 */
export function parseImageMeta(
  title?: string | null
): { width?: number; height?: number; position?: "left" | "right"; hover?: string } {
  const result: { width?: number; height?: number; position?: "left" | "right"; hover?: string } = {};
  const raw = title ?? "";
  const hoverMatch = raw.match(/(?:^|\s)hover:(.*)$/i);
  const metaPart = hoverMatch ? raw.slice(0, hoverMatch.index).trim() : raw;
  if (hoverMatch) result.hover = hoverMatch[1].trim();

  for (const token of metaPart.trim().split(/\s+/).filter(Boolean)) {
    if (token === "left" || token === "right") {
      result.position = token;
      continue;
    }
    const sizeMatch = token.match(/^(\d+)(?:x(\d+))?$/);
    if (sizeMatch) {
      result.width = Number(sizeMatch[1]);
      result.height = sizeMatch[2] ? Number(sizeMatch[2]) : undefined;
    }
  }
  return result;
}

/**
 * Decodes a hover popup's payload - either a link's title when its href is the
 * `hover` sentinel, or the `hover:` value pulled out by `parseImageMeta`. An
 * `img:` prefix means "resolve this as an uploaded image filename"; anything else
 * is shown as plain text.
 */
export function parseHoverPayload(payload: string): { type: "image" | "text"; value: string } {
  const trimmed = payload.trim();
  const imgMatch = trimmed.match(/^img:(.*)$/i);
  return imgMatch ? { type: "image", value: imgMatch[1].trim() } : { type: "text", value: trimmed };
}
