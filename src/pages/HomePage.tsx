import { useMemo, useState } from "react";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { PostGrid } from "@/components/PostGrid";
import { getAllPosts } from "@/lib/content";
import { searchPosts } from "@/lib/search";

export function HomePage() {
  const posts = useMemo(() => getAllPosts(), []);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchPosts(posts, query), [posts, query]);

  return (
    <>
      <Hero postCount={posts.length} />

      <section id="guides" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 flex justify-end">
          <SearchBar value={query} onChange={setQuery} className="w-full sm:w-80" />
        </div>

        <PostGrid posts={filtered} />
      </section>
    </>
  );
}
