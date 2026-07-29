import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-quint-purple/60 focus:bg-white/[0.06]";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

interface FormState {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  game: string;
  section: string;
  tags: string;
  date: string;
  cover: string;
  body: string;
}

const initialForm: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  game: "",
  section: "",
  tags: "",
  date: "",
  cover: "",
  body: "",
};

export function PublishPage() {
  const { loading, authenticated, authorized } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; commitUrl: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to publish.");
      }

      setResult({ url: data.url, commitUrl: data.commitUrl });
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Log in to publish</h1>
        <p className="mt-3 text-slate-400">
          Publishing a guide requires logging in with a Discord account that has the required role
          in the guild.
        </p>
        <a
          href="/api/auth/login"
          className="mt-6 inline-block rounded-full bg-quint-gradient px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Log in with Discord
        </a>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">You don't have access</h1>
        <p className="mt-3 text-slate-400">
          Publishing is restricted to members of the guild's Discord with the required role.
          Ask a guild officer if you think this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-white">Publish a guide</h1>
      <p className="mt-2 text-slate-400">
        This creates <code className="text-slate-300">contents/&lt;slug&gt;/index.md</code> in the
        repo and triggers a rebuild — the guide goes live once that deploy finishes.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <label className={labelClass} htmlFor="slug">
            Slug (URL, lowercase letters/numbers/hyphens only)
          </label>
          <input
            id="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="my-new-guide"
            className={inputClass}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="game">
              Game
            </label>
            <input
              id="game"
              required
              value={form.game}
              onChange={(e) => update("game", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="section">
              Section
            </label>
            <input
              id="section"
              required
              value={form.section}
              onChange={(e) => update("section", e.target.value)}
              placeholder="Class Guides, Raid Guides, PvP…"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="subtitle">
            Subtitle (optional)
          </label>
          <input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="description">
            Description (shown on homepage cards)
          </label>
          <input
            id="description"
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="tags">
              Tags (comma-separated, optional)
            </label>
            <input
              id="tags"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder="pvp, beginner"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="date">
              Date (optional)
            </label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="cover">
            Cover image path (optional, e.g. "/some-image.webp")
          </label>
          <input
            id="cover"
            value={form.cover}
            onChange={(e) => update("cover", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="body">
            Body (Markdown)
          </label>
          <textarea
            id="body"
            required
            rows={16}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {result && (
          <p className="text-sm text-emerald-400">
            Committed. Once the deploy finishes:{" "}
            <Link to={result.url} className="underline">
              view the guide
            </Link>{" "}
            &middot;{" "}
            <a href={result.commitUrl} target="_blank" rel="noreferrer" className="underline">
              view the commit
            </a>
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-quint-gradient px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Publishing…" : "Publish"}
        </button>
      </form>
    </div>
  );
}
