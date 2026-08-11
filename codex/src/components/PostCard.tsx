import { Link } from "react-router-dom";
import type { Post } from "@/types/post";
import { formatPostDate } from "@/lib/date";
import { TagPill } from "./TagPill";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { frontmatter, coverUrl, slug } = post;
  const date = formatPostDate(frontmatter.date);

  return (
    <Link
      to={`/guide/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-void-900/60 transition-all hover:-translate-y-1 hover:border-quint-purple/50 hover:shadow-card-hover"
    >
      {coverUrl ? (
        <div className="aspect-[16/9] w-full overflow-hidden border-b border-white/10">
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center border-b border-white/10 bg-quint-radial">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-quint-cta text-2xl font-display font-bold text-white shadow-glow">
            {frontmatter.title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-quint-blue/80">
          {frontmatter.game}
        </p>

        <div className="flex items-center justify-between gap-3">
          <TagPill label={frontmatter.section} />
          {date && <span className="text-xs text-slate-500">{date}</span>}
        </div>

        <h3 className="font-display text-xl font-semibold text-white transition-colors group-hover:text-transparent group-hover:bg-quint-gradient group-hover:bg-clip-text">
          {frontmatter.title}
        </h3>

        {frontmatter.subtitle && (
          <p className="text-sm font-medium text-quint-blue/90">{frontmatter.subtitle}</p>
        )}

        <p className="line-clamp-3 flex-1 text-sm text-slate-400">{frontmatter.description}</p>

        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {frontmatter.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
