/**
 * Frontmatter contract every `contents/<slug>/index.md` file must follow.
 * See `contents/README.md` for the authoring rule this type encodes.
 */
export interface PostFrontmatter {
  title: string;
  subtitle?: string;
  description: string;
  game: string;
  section: string;
  tags?: string[];
  date?: string;
  author?: string;
  /** Discord user id of whoever published this guide; used to gate the delete button. */
  authorId?: string;
  cover?: string;
  draft?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  /** Raw markdown body, frontmatter block stripped. */
  content: string;
  /** Plain-text rendering of `content`, used for full-text search. */
  searchText: string;
  /** Resolved absolute URL for `frontmatter.cover`, if it exists on disk. */
  coverUrl?: string;
  /** Filenames already uploaded for this guide, present when fetched via `fetchPost`. */
  images?: string[];
}
