import type { Post } from "@/types/post";
import { PostCard } from "./PostCard";

interface PostGridProps {
  posts: Post[];
  emptyMessage?: string;
}

export function PostGrid({ posts, emptyMessage = "No guides match your search yet." }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
