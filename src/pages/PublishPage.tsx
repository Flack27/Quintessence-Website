import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-quint-purple/60 focus:bg-white/[0.06]";
// Native <select> ignores background-color unless the OS widget skin is switched off first —
// appearance-none does that, then we draw our own chevron so it still reads as a dropdown.
const selectClass = `${inputClass} appearance-none bg-void-950 pr-10`;
// <option> background/color isn't covered by color-scheme in every browser (Firefox needs it
// spelled out), so the dropdown list matches the closed field instead of falling back to white.
const optionClass = "bg-void-950 text-slate-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

function SelectChevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ALLOWED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 4 * 1024 * 1024;

const GAME_OPTIONS = ["Aion 2"];
const SECTION_OPTIONS = ["Class Guides", "Tips", "PvE Guides", "PvP Guides", "Others"];

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

interface UploadedImage {
  filename: string;
  dataUrl: string;
  bytes: number;
}

const initialForm: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  game: GAME_OPTIONS[0],
  section: "",
  tags: "",
  date: "",
  cover: "",
  body: "",
};

/** URL-safe slug derived from a title, e.g. "Templar Tanking!" -> "templar-tanking". */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Same normalization, but keeps the extension and allows dots/underscores for filenames. */
function sanitizeFilename(name: string): string {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot + 1) : "";
  const base =
    (dot >= 0 ? lower.slice(0, dot) : lower)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  return `${base}.${ext}`;
}

function uniqueFilename(candidate: string, existing: Set<string>): string {
  if (!existing.has(candidate)) return candidate;
  const dot = candidate.lastIndexOf(".");
  const base = dot >= 0 ? candidate.slice(0, dot) : candidate;
  const ext = dot >= 0 ? candidate.slice(dot) : "";
  let i = 2;
  let next = `${base}-${i}${ext}`;
  while (existing.has(next)) {
    i += 1;
    next = `${base}-${i}${ext}`;
  }
  return next;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PublishPage() {
  const { loading, authenticated, authorized } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; commitUrl: string } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateTitle(value: string) {
    setForm((prev) => ({ ...prev, title: value, slug: slugify(value) }));
  }

  async function handleImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setImageError(null);

    const remainingSlots = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, Math.max(remainingSlots, 0));
    if (files.length > toProcess.length) {
      setImageError(`Only ${Math.max(remainingSlots, 0)} more image(s) can be added (max ${MAX_IMAGES}).`);
    }

    const existingNames = new Set(images.map((img) => img.filename));
    let totalBytes = images.reduce((sum, img) => sum + img.bytes, 0);
    const next: UploadedImage[] = [];

    for (const file of toProcess) {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        setImageError(`"${file.name}" isn't a supported image type.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(`"${file.name}" is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB).`);
        continue;
      }
      if (totalBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
        setImageError(`Images are too large together (max ${MAX_TOTAL_IMAGE_BYTES / (1024 * 1024)}MB total).`);
        break;
      }

      const filename = uniqueFilename(sanitizeFilename(file.name), existingNames);
      existingNames.add(filename);
      totalBytes += file.size;
      const dataUrl = await readFileAsDataUrl(file);
      next.push({ filename, dataUrl, bytes: file.size });
    }

    if (next.length > 0) setImages((prev) => [...prev, ...next]);
  }

  function removeImage(filename: string) {
    setImages((prev) => prev.filter((img) => img.filename !== filename));
    setForm((prev) => (prev.cover === filename ? { ...prev, cover: "" } : prev));
  }

  function insertImageMarkdown(filename: string) {
    const markdown = `![](${filename})`;
    const textarea = bodyRef.current;

    if (!textarea) {
      update("body", form.body ? `${form.body}\n${markdown}\n` : `${markdown}\n`);
      return;
    }

    const { selectionStart, selectionEnd, value } = textarea;
    const nextBody = `${value.slice(0, selectionStart)}${markdown}${value.slice(selectionEnd)}`;
    update("body", nextBody);

    const cursor = selectionStart + markdown.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
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
          images: images.map((img) => ({ filename: img.filename, content: img.dataUrl })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to publish.");
      }

      setResult({ url: data.url, commitUrl: data.commitUrl });
      setForm(initialForm);
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  const bypassAuth = import.meta.env.DEV;

  if (!bypassAuth && !authenticated) {
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

  if (!bypassAuth && !authorized) {
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

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="game">
              Game
            </label>
            <div className="relative">
              <select
                id="game"
                required
                value={form.game}
                onChange={(e) => update("game", e.target.value)}
                className={selectClass}
              >
                {GAME_OPTIONS.map((option) => (
                  <option key={option} value={option} className={optionClass}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="section">
              Section
            </label>
            <div className="relative">
              <select
                id="section"
                required
                value={form.section}
                onChange={(e) => update("section", e.target.value)}
                className={selectClass}
              >
                <option value="" disabled className={optionClass}>
                  Select a section…
                </option>
                {SECTION_OPTIONS.map((option) => (
                  <option key={option} value={option} className={optionClass}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
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
            onChange={(e) => updateTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="subtitle">
            Subtitle
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
            Description
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
              Tags
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
              Date
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
          <label className={labelClass} htmlFor="images">
            Images — click one below to insert it into the body
          </label>
          <input
            id="images"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            onChange={handleImagesSelected}
            disabled={images.length >= MAX_IMAGES}
            className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/20"
          />
          {imageError && <p className="mt-2 text-sm text-red-400">{imageError}</p>}

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.filename}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() => insertImageMarkdown(img.filename)}
                    className="block w-full text-left"
                    title="Insert into body"
                  >
                    <img src={img.dataUrl} alt={img.filename} className="h-24 w-full object-cover" />
                    <p className="truncate px-2 py-1.5 text-xs text-slate-300">{img.filename}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(img.filename)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="cover">
            Cover image
          </label>
          <div className="relative">
            <select
              id="cover"
              value={form.cover}
              onChange={(e) => update("cover", e.target.value)}
              disabled={images.length === 0}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="" className={optionClass}>
                None
              </option>
              {images.map((img) => (
                <option key={img.filename} value={img.filename} className={optionClass}>
                  {img.filename}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="body">
            Body
          </label>
          <textarea
            id="body"
            ref={bodyRef}
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
