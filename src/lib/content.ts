import { parseFrontmatter } from "./frontmatter";
import type { Post, PostFrontmatter } from "@/types/post";

// Every guide lives at contents/<slug>/index.md — this glob is the single
// place that knows about that convention.
const markdownModules = import.meta.glob("/contents/*/index.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

// Images sitting next to a post's index.md are bundled as regular assets so
// `cover: cover.png` and inline `![alt](cover.png)` markdown can resolve them.
const assetModules = import.meta.glob("/contents/*/*.{png,jpg,jpeg,gif,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const match = path.match(/^\/contents\/([^/]+)\/index\.md$/);
  if (!match) throw new Error(`Unexpected content path: ${path}`);
  return match[1];
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolves a markdown-relative image path (e.g. "cover.png", "./shot.jpg") to its built URL. */
export function resolveAssetUrl(slug: string, relativePath: string): string | undefined {
  if (/^https?:\/\//.test(relativePath) || relativePath.startsWith("/")) {
    return relativePath;
  }
  const cleaned = relativePath.replace(/^\.\//, "");
  return assetModules[`/contents/${slug}/${cleaned}`];
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function buildPost(path: string, raw: string): Post {
  const slug = slugFromPath(path);
  const { data, content } = parseFrontmatter(raw);

  const frontmatter: PostFrontmatter = {
    title: typeof data.title === "string" && data.title ? data.title : slug,
    subtitle: typeof data.subtitle === "string" ? data.subtitle : undefined,
    description: typeof data.description === "string" ? data.description : "",
    game: typeof data.game === "string" && data.game ? data.game : "General",
    section: typeof data.section === "string" && data.section ? data.section : "Uncategorized",
    tags: toStringArray(data.tags),
    date: typeof data.date === "string" ? data.date : undefined,
    author: typeof data.author === "string" ? data.author : undefined,
    cover: typeof data.cover === "string" ? data.cover : undefined,
    draft: Boolean(data.draft),
  };

  if (import.meta.env.DEV) {
    if (!data.title) console.warn(`[contents/${slug}] missing required "title" in frontmatter.`);
    if (!data.description) console.warn(`[contents/${slug}] missing required "description" (post intro) in frontmatter.`);
    if (!data.game) console.warn(`[contents/${slug}] missing required "game" in frontmatter.`);
    if (!data.section) console.warn(`[contents/${slug}] missing required "section" in frontmatter.`);
  }

  return {
    slug,
    frontmatter,
    content,
    searchText: stripMarkdown(content).toLowerCase(),
    coverUrl: frontmatter.cover ? resolveAssetUrl(slug, frontmatter.cover) : undefined,
  };
}

let cachedPosts: Post[] | null = null;

/** All published posts, newest first. In dev mode, drafts are included so authors can preview them. */
export function getAllPosts(): Post[] {
  if (cachedPosts) return cachedPosts;

  cachedPosts = Object.entries(markdownModules)
    .map(([path, raw]) => buildPost(path, raw))
    .filter((post) => !post.frontmatter.draft || import.meta.env.DEV)
    .sort((a, b) => {
      const dateA = a.frontmatter.date ? Date.parse(a.frontmatter.date) : 0;
      const dateB = b.frontmatter.date ? Date.parse(b.frontmatter.date) : 0;
      return dateB - dateA;
    });

  return cachedPosts;
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

