import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchPost } from "@/lib/content";
import { formatPostDate } from "@/lib/date";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TagPill } from "@/components/TagPill";
import { Lightbox } from "@/components/Lightbox";
import { useAuth } from "@/lib/AuthContext";
import { CODEX_API } from "@/lib/config";
import { GuideAccessDialog } from "@/components/GuideAccessDialog";
import { NotFoundPage } from "./NotFoundPage";

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, canPublish, canModerate } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);

  // The body lives on the server now, so a guide is fetched rather than read out of
  // the bundle. `undefined` means still loading; `null` means there is no such guide.
  const [post, setPost] = useState<Awaited<ReturnType<typeof fetchPost>> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!slug) { setPost(null); return; }

    setPost(undefined);
    fetchPost(slug)
      .then((loaded) => { if (!cancelled) setPost(loaded); })
      .catch(() => { if (!cancelled) setPost(null); });

    return () => { cancelled = true; };
  }, [slug]);

  if (post === undefined) {
    return <p className="mx-auto max-w-3xl px-6 py-24 text-[#6c6179]">Loading guide…</p>;
  }

  if (!post) return <NotFoundPage />;

  const { slug: postSlug, frontmatter, content, coverUrl } = post;
  const date = formatPostDate(frontmatter.date);
  const isOwner = Boolean(user && frontmatter.authorId && user.id === frontmatter.authorId);
  const isEditor = Boolean(user && frontmatter.editors?.includes(user.id));

  // Being invited to a guide lets you change its contents. Removing it, and deciding who else
  // gets in, stay with the owner and admins - a collaborator shouldn't be able to delete the
  // thing outright, or widen access without the owner knowing.
  const canEdit = canPublish && (canModerate || isOwner || isEditor);
  const canAdminister = canPublish && (canModerate || isOwner);

  // Admin-only. Reading a guide otherwise needs the Discord role configured for its game,
  // so this is the switch that puts one in front of the open internet instead.
  async function toggleVisibility() {
    const next = !frontmatter.isPublic;
    setVisibilityBusy(true);
    setVisibilityError(null);

    try {
      const response = await fetch(`${CODEX_API}/guides/${encodeURIComponent(postSlug)}/visibility`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't change who can see this.");

      setPost((prev) =>
        prev ? { ...prev, frontmatter: { ...prev.frontmatter, isPublic: data.isPublic } } : prev
      );
    } catch (err) {
      setVisibilityError(err instanceof Error ? err.message : "Couldn't change who can see this.");
    } finally {
      setVisibilityBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${frontmatter.title}"? This can't be undone.`)) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`${CODEX_API}/guides/${encodeURIComponent(postSlug)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete.");
      }

      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleting(false);
    }
  }

  return (
    <article className="mx-auto max-w-3xl px-6 pb-24 pt-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path d="M12 15L7 10l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to all guides
      </Link>

      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-quint-blue/80">
        {frontmatter.game}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TagPill label={frontmatter.section} />
        {date && <span className="text-xs text-slate-500">{date}</span>}
        {frontmatter.author && <span className="text-xs text-slate-500">by {frontmatter.author}</span>}
        {/* This row wraps because it can hold four controls (edit / visibility / access /
            delete), which on a narrow phone reaches the edge of the viewport exactly. */}
        {canEdit && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Link
              to={`/publish/${postSlug}`}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-quint-purple/50 hover:text-white"
            >
              Edit guide
            </Link>
            {/* Admins get a switch; everyone else who can edit gets to see the state, since
                "who can read this" matters when you are writing it. */}
            {canModerate ? (
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={visibilityBusy}
                title={
                  frontmatter.isPublic
                    ? "Anyone can read this guide. Click to put it back behind the game's role."
                    : "Only members with this game's Discord role can read this guide. Click to make it public."
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  frontmatter.isPublic
                    ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                    : "border-white/15 text-slate-300 hover:border-quint-purple/50 hover:text-white"
                }`}
              >
                {visibilityBusy ? "Saving…" : frontmatter.isPublic ? "Public" : "Members only"}
              </button>
            ) : (
              <span
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-500"
                title={
                  frontmatter.isPublic
                    ? "Anyone can read this guide."
                    : "Only members with this game's Discord role can read this guide."
                }
              >
                {frontmatter.isPublic ? "Public" : "Members only"}
              </span>
            )}

            {canAdminister && (
              <>
                <button
                  type="button"
                  onClick={() => setAccessOpen(true)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-quint-purple/50 hover:text-white"
                >
                  Manage access
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete guide"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {deleteError && <p className="mb-4 text-sm text-red-400">{deleteError}</p>}
      {visibilityError && <p className="mb-4 text-sm text-red-400">{visibilityError}</p>}

      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{frontmatter.title}</h1>

      {frontmatter.subtitle && (
        <p className="mt-3 font-display text-lg font-medium text-quint-blue/90">{frontmatter.subtitle}</p>
      )}

      {frontmatter.description && (
        <p className="mt-5 border-l-2 border-quint-purple/60 bg-white/[0.03] px-5 py-3 text-slate-300">
          {frontmatter.description}
        </p>
      )}

      {frontmatter.tags && frontmatter.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {frontmatter.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          onClick={() => setCoverLightboxOpen(true)}
          className="mt-8 w-full cursor-zoom-in rounded-2xl border border-white/10"
        />
      )}
      {coverUrl && coverLightboxOpen && (
        <Lightbox src={coverUrl} alt={frontmatter.title} onClose={() => setCoverLightboxOpen(false)} />
      )}

      <div className="mt-10">
        <MarkdownRenderer slug={post.slug} content={content} />
      </div>

      {accessOpen && (
        <GuideAccessDialog
          slug={postSlug}
          title={frontmatter.title}
          onClose={() => setAccessOpen(false)}
        />
      )}
    </article>
  );
}
