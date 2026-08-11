import type { Post } from "@/types/post";

interface SearchableField {
  weight: number;
  value: string;
}

function fieldsFor(post: Post): SearchableField[] {
  return [
    { weight: 4, value: post.frontmatter.title },
    { weight: 3, value: post.frontmatter.subtitle ?? "" },
    { weight: 3, value: (post.frontmatter.tags ?? []).join(" ") },
    { weight: 3, value: post.frontmatter.game },
    { weight: 2, value: post.frontmatter.section },
    { weight: 2, value: post.frontmatter.description },
    { weight: 1, value: post.searchText },
  ];
}

/**
 * Substring/keyword search across title, subtitle, tags, section,
 * description and body. Every space-separated term in the query must match
 * somewhere (AND across terms); results are ranked by field weight, with a
 * bonus when the term matches the start of a word — so "quinte" ranks
 * "Quintessence" content above an unrelated mid-word hit.
 */
export function searchPosts(posts: Post[], rawQuery: string): Post[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return posts;

  const terms = query.split(/\s+/).filter(Boolean);

  const scored: { post: Post; score: number }[] = [];

  for (const post of posts) {
    const fields = fieldsFor(post);
    let score = 0;
    let allTermsMatched = true;

    for (const term of terms) {
      let termMatched = false;

      for (const field of fields) {
        const haystack = field.value.toLowerCase();
        if (!haystack || !haystack.includes(term)) continue;

        termMatched = true;
        score += field.weight;
        if (haystack.split(/\s+/).some((word) => word.startsWith(term))) {
          score += field.weight;
        }
      }

      if (!termMatched) {
        allTermsMatched = false;
        break;
      }
    }

    if (allTermsMatched) scored.push({ post, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.post);
}
