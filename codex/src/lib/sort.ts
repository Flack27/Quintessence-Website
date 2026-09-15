import type { Post } from "@/types/post";

export const SORT_OPTIONS = ["newest", "oldest", "az", "za", "category"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  az: "Title A-Z",
  za: "Title Z-A",
  category: "Category",
};

function byTitle(a: Post, b: Post): number {
  return a.frontmatter.title.localeCompare(b.frontmatter.title);
}

// Frontmatter dates are "YYYY-MM-DD" (or blank), so plain string comparison
// already sorts chronologically - no need to parse them into `Date`s.
function byDate(a: Post, b: Post): number {
  return (a.frontmatter.date ?? "").localeCompare(b.frontmatter.date ?? "");
}

/**
 * Re-orders posts already filtered by `searchPosts`, independent of the
 * relevance ranking that function applies while a search is active - once a
 * sort option is picked, it should mean what its label says.
 */
export function sortPosts(posts: Post[], option: SortOption): Post[] {
  switch (option) {
    case "newest":
      return [...posts].sort((a, b) => byDate(b, a));
    case "oldest":
      return [...posts].sort(byDate);
    case "az":
      return [...posts].sort(byTitle);
    case "za":
      return [...posts].sort((a, b) => byTitle(b, a));
    case "category":
      return [...posts].sort((a, b) => {
        const section = a.frontmatter.section.localeCompare(b.frontmatter.section);
        return section !== 0 ? section : byTitle(a, b);
      });
    default:
      return posts;
  }
}
