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
  editors?: string[] | null;
  cover?: string | null;
  draft: boolean;
  isPublic?: boolean;
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
    editors: dto.editors ?? [],
    cover: dto.cover ?? undefined,
    draft: dto.draft,
    isPublic: dto.isPublic ?? false,
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

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];

/** Whether a guide asset filename is a video, so the renderer can pick `<video>` over `<img>`. */
export function isVideoAsset(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * A YouTube embed is stored in a guide's markdown with the same `![](src "meta")` syntax as an
 * uploaded image/video (see `isVideoAsset`), but `src` is the sentinel `youtube:<video id>`
 * rather than an uploaded filename - there's nothing to upload, just an id to embed.
 */
export function isYouTubeSrc(src: string): boolean {
  return src.startsWith("youtube:");
}

export function youTubeVideoId(src: string): string {
  return src.replace(/^youtube:/, "");
}

const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;

/** Pulls the 11-character video id out of any common YouTube URL shape, or null if none is found. */
export function extractYouTubeId(url: string): string | null {
  const match = url.trim().match(YOUTUBE_URL_RE);
  return match ? match[1] : null;
}

/**
 * Inline size style for a YouTube embed. Unlike an uploaded image/video, an `<iframe>` has no
 * intrinsic size to fall back on, so - unlike `imageSizeStyle` - this always sets an explicit
 * `aspectRatio` (16:9 unless the author pinned both width and height), and omits `width` entirely
 * when unset so the caller's own `w-full` class can size it instead.
 */
export function embedSizeStyle(width?: number, height?: number): { width?: string; aspectRatio: string; maxWidth?: string } {
  const aspectRatio = width && height ? `${width} / ${height}` : "16 / 9";
  return width ? { width: `${width}px`, aspectRatio, maxWidth: "none" } : { aspectRatio };
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
 * Inline size style for a `parseImageMeta`'d image/video. Width-only pins the width and
 * leaves height to the browser (which keeps the file's own aspect ratio automatically).
 * When both are pinned, `aspectRatio` stands in for a literal height.
 *
 * `maxWidth: "none"` overrides the `max-w-[45%]` cap that `.img-float-left`/`-right`
 * (index.css) puts on *unsized* floated images, so they don't blow up the column next to
 * text. Once an author explicitly picks a size, that choice is deliberate and should render
 * at that size - without this override, a size wider than 45% of the column would silently
 * get shrunk back down by the float cap, ignoring what was actually asked for.
 */
export function imageSizeStyle(
  width?: number,
  height?: number
): { width: string; height?: string; aspectRatio?: string; maxWidth?: string } | undefined {
  if (!width) return undefined;
  if (height) return { width: `${width}px`, aspectRatio: `${width} / ${height}`, maxWidth: "none" };
  return { width: `${width}px`, height: "auto", maxWidth: "none" };
}

/**
 * Decodes a hover popup's payload - either a link's title when its href is the
 * `hover` sentinel, or the `hover:` value pulled out by `parseImageMeta`. An
 * `img:` prefix means "resolve this as an uploaded image filename", optionally
 * followed by a size in the same `400` / `400x250` shape `parseImageMeta` uses
 * (e.g. `img:big.png 400x250`); anything else is shown as plain text.
 */
export function parseHoverPayload(
  payload: string
): { type: "image" | "text"; value: string; width?: number; height?: number } {
  const trimmed = payload.trim();
  const imgMatch = trimmed.match(/^img:(\S+)(?:\s+(\d+)(?:x(\d+))?)?\s*$/i);
  if (imgMatch) {
    return {
      type: "image",
      value: imgMatch[1],
      width: imgMatch[2] ? Number(imgMatch[2]) : undefined,
      height: imgMatch[3] ? Number(imgMatch[3]) : undefined,
    };
  }
  return { type: "text", value: trimmed };
}
