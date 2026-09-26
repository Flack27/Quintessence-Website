import type { Post } from "@/types/post";

/**
 * The fixed set of sections offered on the publish form (`PublishPage.tsx`) and
 * the order the homepage groups guides in. A guide's `section` is stored as
 * free text server-side (see `contents/README.md`), so older or API-written
 * guides can carry a value outside this list - `groupBySection` below puts
 * those in an "Other" group appended after the known ones.
 */
export const SECTION_ORDER = ["General", "Class Guide", "PvE Guide", "PvP Guide", "Others"] as const;

export interface PostSectionGroup {
  section: string;
  posts: Post[];
}

/**
 * Buckets posts by `frontmatter.section`, in `SECTION_ORDER`, preserving each
 * bucket's existing relative order (so search relevance / sort choice from
 * the homepage still applies within a section). Sections with no matching
 * posts are omitted; any section name not in `SECTION_ORDER` is grouped
 * alphabetically after the known ones.
 */
export function groupBySection(posts: Post[]): PostSectionGroup[] {
  const buckets = new Map<string, Post[]>();

  for (const post of posts) {
    const section = post.frontmatter.section || "Others";
    const bucket = buckets.get(section);
    if (bucket) bucket.push(post);
    else buckets.set(section, [post]);
  }

  const known = SECTION_ORDER.filter((section) => buckets.has(section));
  const extra = [...buckets.keys()]
    .filter((section) => !(SECTION_ORDER as readonly string[]).includes(section))
    .sort((a, b) => a.localeCompare(b));

  return [...known, ...extra].map((section) => ({ section, posts: buckets.get(section)! }));
}
