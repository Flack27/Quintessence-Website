import { useEffect, useMemo, useState } from "react";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { PostGrid } from "@/components/PostGrid";
import { DiscordLoginButton } from "@/components/DiscordLoginButton";
import { fetchPosts } from "@/lib/content";
import { searchPosts } from "@/lib/search";
import { useAuth } from "@/lib/AuthContext";
import type { Post } from "@/types/post";

export function HomePage() {
  const { authenticated, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchPosts()
      .then((loaded) => { if (!cancelled) setPosts(loaded); })
      .catch(() => { if (!cancelled) setError("Guides couldn't be loaded just now. Try again in a moment."); });

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => searchPosts(posts ?? [], query), [posts, query]);

  return (
    <>
      <Hero postCount={posts?.length ?? 0} />

      <section id="guides" className="mx-auto max-w-[1200px] px-5 pb-24">
        {/* Sign-in sits at the left of this row rather than in the navbar: it is only
            relevant on the Codex, and the signed-in state (name, Publish, Log out) is
            too wide to live in a bar shared with the main site. The session itself is
            site-wide - the same cookie the Angular admin pages use. */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <DiscordLoginButton />
          <SearchBar value={query} onChange={setQuery} className="w-full sm:w-80" />
        </div>

        {error ? (
          <p className="rounded-xl border border-[rgba(201,160,220,0.26)] bg-white/[0.03] px-5 py-4 text-[#9c8fae]">
            {error}
          </p>
        ) : posts === null ? (
          <p className="px-1 text-[#6c6179]">Loading guides…</p>
        ) : posts.length === 0 && !authLoading ? (
          // Guides are members-only by default, so an empty list is the normal view for a
          // signed-out visitor - say why, or the Codex just looks broken.
          <div className="rounded-xl border border-[rgba(201,160,220,0.26)] bg-white/[0.03] px-5 py-6">
            <p className="font-semibold text-[#e6dcef]">
              {authenticated ? "No guides to show yet." : "The guides are for guild members."}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#9c8fae]">
              {authenticated
                ? "Guides are limited to members holding the Discord role for their game. If you think you should see something here, ask an officer to check your roles."
                : "Log in with Discord to read them. Anything published publicly will show up here without signing in."}
            </p>
          </div>
        ) : (
          <PostGrid posts={filtered} />
        )}
      </section>
    </>
  );
}
