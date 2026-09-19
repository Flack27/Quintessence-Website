import { useRef, useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { CODEX_API } from "@/lib/config";
import { fetchPost, resolveAssetUrl, parseHoverPayload, isVideoAsset } from "@/lib/content";
import { SECTION_ORDER } from "@/lib/sections";
import { BodyEditor, type BodyEditorHandle } from "@/components/BodyEditor";
import type { Post } from "@/types/post";

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
// Matches the API's own cap (CodexGuidesController.MaxImageBytes) - going higher here would
// just mean the upload fails once it reaches the server anyway.
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

// Videos share the same guide folder and upload endpoint as images (see
// CodexGuidesController.AllowedVideoExtensions/MaxVideoBytes) - only the extension and
// per-file size cap differ.
const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];
const MAX_VIDEO_BYTES = 90 * 1024 * 1024;

const GAME_OPTIONS = ["Aion 2"];
const SECTION_OPTIONS = SECTION_ORDER;

interface FormState {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  game: string;
  section: string;
  tags: string;
  date: string;
  author: string;
  cover: string;
  body: string;
}

/** Shape for a staged image or video upload - both go through the same upload/status flow. */
interface UploadedMedia {
  filename: string;
  dataUrl: string;
  bytes: number;
  /** Each file now uploads to the API as soon as it's picked, not bundled into the publish request. */
  status: "uploading" | "done" | "error";
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
  author: "",
  cover: "",
  body: "",
};

/** Prefills the form from an existing post's frontmatter + body when editing. */
function formFromPost(slug: string, post: Post | null | undefined): FormState {
  if (!post) return { ...initialForm, slug };
  const { frontmatter, content } = post;
  return {
    slug,
    title: frontmatter.title,
    subtitle: frontmatter.subtitle ?? "",
    description: frontmatter.description,
    game: frontmatter.game || GAME_OPTIONS[0],
    section: frontmatter.section,
    tags: (frontmatter.tags ?? []).join(", "),
    date: frontmatter.date ?? "",
    author: frontmatter.author ?? "",
    cover: frontmatter.cover ?? "",
    body: content,
  };
}

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
  const { slug: editSlug } = useParams<{ slug: string }>();
  const isEditing = Boolean(editSlug);

  const { loading, authenticated, user, canPublish, canModerate } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [existingPost, setExistingPost] = useState<Post | null | undefined>(undefined);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Editing loads the guide from the API rather than the bundle, so the form fills in
  // once it arrives instead of being seeded synchronously at first render.
  useEffect(() => {
    let cancelled = false;
    if (!editSlug) { setExistingPost(null); return; }

    fetchPost(editSlug).then((post) => {
      if (cancelled) return;
      setExistingPost(post);
      setForm(formFromPost(editSlug, post));
      setExistingImages(post?.images ?? []);
    });

    return () => { cancelled = true; };
  }, [editSlug]);

  // Prefills the byline with the logged-in user's Discord name for a new guide, as a
  // starting point - it stays editable so a co-authored or ghost-written guide can credit
  // someone else instead.
  useEffect(() => {
    if (isEditing || !user) return;
    setForm((prev) => (prev.author ? prev : { ...prev, author: user.username }));
  }, [isEditing, user]);

  const [images, setImages] = useState<UploadedMedia[]>([]);
  const [videos, setVideos] = useState<UploadedMedia[]>([]);
  // Only a new guide needs this: its slug isn't settled until Create() runs (it's derived
  // from the title, which can still change), so images picked before then are staged under
  // this id and adopted into the real slug's folder once it exists. Editing an existing
  // guide uploads straight to its already-fixed slug instead.
  const [draftId] = useState(() => crypto.randomUUID());
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyEditorRef = useRef<BodyEditorHandle>(null);

  const existingCover = existingPost?.frontmatter.cover;
  const canEditThis = isEditing && Boolean(canModerate || (user && user.id === existingPost?.frontmatter.authorId));

  // Where this session's image uploads/deletes go: an existing guide's slug is already
  // fixed, so they go straight there; a new guide doesn't have one yet, so they're staged
  // under draftId and adopted into the real slug when the form is submitted.
  const imagesBase = isEditing
    ? `${CODEX_API}/guides/${encodeURIComponent(editSlug ?? "")}/images`
    : `${CODEX_API}/guides/drafts/${draftId}/images`;

  // Images and videos share one folder on the guide, so split what's already saved
  // between them by extension before building each picker's list.
  const existingImageFiles = existingImages.filter((filename) => !isVideoAsset(filename));
  const existingVideoFiles = existingImages.filter((filename) => isVideoAsset(filename));

  // Images already saved on the guide (from a previous session) plus whatever is staged
  // for upload in this one. A freshly staged file with the same name wins the display slot,
  // since it's the version that will actually be saved.
  const allImages = [
    ...existingImageFiles
      .filter((filename) => !images.some((img) => img.filename === filename))
      .map((filename) => ({
        filename,
        previewUrl: resolveAssetUrl(editSlug ?? "", filename) ?? filename,
        removable: true,
        status: "done" as const,
      })),
    ...images.map((img) => ({
      filename: img.filename,
      previewUrl: img.dataUrl,
      removable: true,
      status: img.status,
    })),
  ];
  // Same shape, for videos.
  const allVideos = [
    ...existingVideoFiles
      .filter((filename) => !videos.some((vid) => vid.filename === filename))
      .map((filename) => ({
        filename,
        previewUrl: resolveAssetUrl(editSlug ?? "", filename) ?? filename,
        removable: true,
        status: "done" as const,
      })),
    ...videos.map((vid) => ({
      filename: vid.filename,
      previewUrl: vid.dataUrl,
      removable: true,
      status: vid.status,
    })),
  ];
  // Pickers that insert a reference into the body (toolbar, cover, hover popup) should only
  // ever offer images that have actually finished uploading - referencing one still in
  // flight (or that failed) would save a markdown link to nothing.
  const insertableImages = allImages.filter((img) => img.status === "done");
  const insertableVideos = allVideos.filter((vid) => vid.status === "done");
  const imagesUploading = images.some((img) => img.status === "uploading") || videos.some((vid) => vid.status === "uploading");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateTitle(value: string) {
    setForm((prev) => ({ ...prev, title: value, slug: isEditing ? prev.slug : slugify(value) }));
  }

  /** Uploads one file (image or video) as its own multipart request, so a batch never becomes one giant request. */
  async function uploadFile(file: File, filename: string): Promise<boolean> {
    const body = new FormData();
    body.append("file", file, filename);

    try {
      const response = await fetch(imagesBase, { method: "POST", credentials: "include", body });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `"${filename}" failed to upload.`);
      }
      return true;
    } catch (err) {
      setImageError(err instanceof Error ? err.message : `"${filename}" failed to upload.`);
      return false;
    }
  }

  /** Best-effort: an orphaned staged/guide file left behind is harmless clutter, not worth surfacing an error for. */
  async function deleteRemoteFile(filename: string) {
    try {
      await fetch(`${imagesBase}/${encodeURIComponent(filename)}`, { method: "DELETE", credentials: "include" });
    } catch {
      // ignored
    }
  }

  async function handleImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setImageError(null);

    const existingNames = new Set(images.map((img) => img.filename));

    for (const file of files) {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        setImageError(`"${file.name}" isn't a supported image type.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(`"${file.name}" is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB).`);
        continue;
      }

      const filename = uniqueFilename(sanitizeFilename(file.name), existingNames);
      existingNames.add(filename);
      const dataUrl = await readFileAsDataUrl(file);
      setImages((prev) => [...prev, { filename, dataUrl, bytes: file.size, status: "uploading" }]);

      // Uploads run concurrently rather than one-at-a-time - each is its own small request,
      // so there's no shared "total" budget left to serialize them against.
      uploadFile(file, filename).then((ok) => {
        setImages((prev) =>
          prev.map((img) => (img.filename === filename ? { ...img, status: ok ? "done" : "error" } : img))
        );
      });
    }
  }

  function removeImage(filename: string) {
    // Files already saved on the guide (as opposed to just staged this session) are deleted
    // from the server immediately, not on the next Save - worth a confirmation.
    if (existingImages.includes(filename) && !window.confirm(`Delete "${filename}" from this guide? This can't be undone.`)) {
      return;
    }
    setImages((prev) => prev.filter((img) => img.filename !== filename));
    setExistingImages((prev) => prev.filter((f) => f !== filename));
    setForm((prev) => (prev.cover === filename ? { ...prev, cover: "" } : prev));
    void deleteRemoteFile(filename);
  }

  /** Same flow as handleImagesSelected, for video files - same upload endpoint, own extension/size checks. */
  async function handleVideosSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setVideoError(null);

    const existingNames = new Set(videos.map((vid) => vid.filename));

    for (const file of files) {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
        setVideoError(`"${file.name}" isn't a supported video type.`);
        continue;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setVideoError(`"${file.name}" is too large (max ${MAX_VIDEO_BYTES / (1024 * 1024)}MB).`);
        continue;
      }

      const filename = uniqueFilename(sanitizeFilename(file.name), existingNames);
      existingNames.add(filename);
      const dataUrl = await readFileAsDataUrl(file);
      setVideos((prev) => [...prev, { filename, dataUrl, bytes: file.size, status: "uploading" }]);

      uploadFile(file, filename).then((ok) => {
        setVideos((prev) =>
          prev.map((vid) => (vid.filename === filename ? { ...vid, status: ok ? "done" : "error" } : vid))
        );
      });
    }
  }

  function removeVideo(filename: string) {
    if (existingImages.includes(filename) && !window.confirm(`Delete "${filename}" from this guide? This can't be undone.`)) {
      return;
    }
    setVideos((prev) => prev.filter((vid) => vid.filename !== filename));
    setExistingImages((prev) => prev.filter((f) => f !== filename));
    void deleteRemoteFile(filename);
  }

  /**
   * Resolves an image filename for the preview. Staged (not-yet-saved) uploads live
   * only as local data URLs; anything else — already-saved images when editing — is
   * fetched from the API.
   */
  function resolvePreviewImageSrc(filename: string): string {
    const staged = images.find((img) => img.filename === filename) ?? videos.find((vid) => vid.filename === filename);
    if (staged) return staged.dataUrl;
    return resolveAssetUrl(form.slug || "preview", filename) ?? filename;
  }

  /** Renders a hover payload (image or text) as popup content for the preview. */
  function renderHoverPreviewContent(payload: string) {
    const { type, value, width, height } = parseHoverPayload(payload);
    if (type === "image") {
      // `.prose-codex img` puts a 24px top/bottom margin on every guide image; that would
      // inflate this popup's box and, since it's a child of that same wrapper, throw off
      // the popup's positioning against its trigger. `!my-0` overrides it back to 0.
      // Without an explicit size, max-h-80 keeps an oversized source image from blowing
      // up the popup; an explicit size means the author asked for it, so it wins instead.
      return (
        <img
          src={resolvePreviewImageSrc(value)}
          alt=""
          className={`${width ? "" : "max-h-80"} w-auto rounded-lg !my-0`}
          style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
        />
      );
    }
    return <span>{value}</span>;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (imagesUploading) return;
    if (!form.body.trim()) {
      setError("The guide's body can't be empty.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // REST now: POST /guides to create, PUT /guides/<slug> to edit. Images are no longer
      // part of this payload - each was already uploaded to the API as soon as it was
      // picked (see uploadFile). Creating just needs to know where to find them: draftId
      // says which staged folder to adopt into the slug this call settles on.
      const endpoint = isEditing
        ? `${CODEX_API}/guides/${encodeURIComponent(editSlug ?? "")}`
        : `${CODEX_API}/guides`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          ...(isEditing ? {} : { draftId }),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to publish.");
      }

      window.location.href = "https://quintessence-eu.com/guides/";
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
        <h1 className="font-display text-2xl font-bold text-white">Log in to {isEditing ? "edit" : "publish"}</h1>
        <p className="mt-3 text-slate-400">
          {isEditing ? "Editing" : "Publishing"} a guide requires logging in with a Discord account
          that has the required role in the guild.
        </p>
        <a
          href={`${CODEX_API}/auth/login`}
          className="mt-6 inline-block rounded-full bg-quint-gradient px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Log in with Discord
        </a>
      </div>
    );
  }

  if (isEditing && !existingPost) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Guide not found</h1>
        <p className="mt-3 text-slate-400">There's no guide with slug "{editSlug}" to edit.</p>
      </div>
    );
  }

  if (!bypassAuth && (isEditing ? !canEditThis : !canPublish)) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">You don't have access</h1>
        <p className="mt-3 text-slate-400">
          {isEditing
            ? "Only the guide's original publisher (or a moderator) can edit it."
            : "Publishing is restricted to members of the guild's Discord with the required role."}{" "}
          Ask a guild officer if you think this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-white">{isEditing ? "Edit guide" : "Publish a guide"}</h1>

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
          <label className={labelClass} htmlFor="author">
            Author
          </label>
          <input
            id="author"
            value={form.author}
            onChange={(e) => update("author", e.target.value)}
            placeholder="Shown as the guide's byline"
            className={inputClass}
          />
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
            className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/20"
          />
          {imageError && <p className="mt-2 text-sm text-red-400">{imageError}</p>}

          {allImages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allImages.map((img) => (
                <div
                  key={img.filename}
                  className={`group relative overflow-hidden rounded-xl border bg-white/[0.03] ${
                    img.status === "error" ? "border-red-500/60" : "border-white/10"
                  } ${img.status === "uploading" ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => bodyEditorRef.current?.insertMediaWithPrompt(img.filename)}
                    disabled={img.status !== "done"}
                    className="block w-full text-left disabled:cursor-not-allowed"
                    title={
                      img.status === "uploading"
                        ? "Still uploading…"
                        : img.status === "error"
                          ? "Upload failed"
                          : "Insert into body"
                    }
                  >
                    <img src={img.previewUrl} alt={img.filename} className="h-24 w-full object-cover" />
                    <p className="truncate px-2 py-1.5 text-xs text-slate-300">
                      {img.filename}
                      {img.status === "uploading" && " — uploading…"}
                      {img.status === "error" && " — failed"}
                    </p>
                  </button>
                  {img.removable && (
                    <button
                      type="button"
                      onClick={() => removeImage(img.filename)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="videos">
            Videos — click one below to insert it into the body
          </label>
          <input
            id="videos"
            type="file"
            multiple
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideosSelected}
            className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/20"
          />
          {videoError && <p className="mt-2 text-sm text-red-400">{videoError}</p>}

          {allVideos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allVideos.map((vid) => (
                <div
                  key={vid.filename}
                  className={`group relative overflow-hidden rounded-xl border bg-white/[0.03] ${
                    vid.status === "error" ? "border-red-500/60" : "border-white/10"
                  } ${vid.status === "uploading" ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => bodyEditorRef.current?.insertMediaWithPrompt(vid.filename)}
                    disabled={vid.status !== "done"}
                    className="block w-full text-left disabled:cursor-not-allowed"
                    title={
                      vid.status === "uploading"
                        ? "Still uploading…"
                        : vid.status === "error"
                          ? "Upload failed"
                          : "Insert into body"
                    }
                  >
                    <video src={vid.previewUrl} muted className="h-24 w-full object-cover" />
                    <p className="truncate px-2 py-1.5 text-xs text-slate-300">
                      {vid.filename}
                      {vid.status === "uploading" && " — uploading…"}
                      {vid.status === "error" && " — failed"}
                    </p>
                  </button>
                  {vid.removable && (
                    <button
                      type="button"
                      onClick={() => removeVideo(vid.filename)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
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
              disabled={insertableImages.length === 0 && !existingCover}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="" className={optionClass}>
                None
              </option>
              {existingCover && !insertableImages.some((img) => img.filename === existingCover) && (
                <option value={existingCover} className={optionClass}>
                  {existingCover} (current)
                </option>
              )}
              {insertableImages.map((img) => (
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
          <BodyEditor
            ref={bodyEditorRef}
            value={form.body}
            onChange={(next) => update("body", next)}
            insertableImages={insertableImages}
            insertableVideos={insertableVideos}
            resolveImageSrc={resolvePreviewImageSrc}
            renderHoverContent={renderHoverPreviewContent}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || imagesUploading}
          className="rounded-full bg-quint-gradient px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {imagesUploading
            ? "Uploading images…"
            : submitting
              ? isEditing
                ? "Saving…"
                : "Publishing…"
              : isEditing
                ? "Save changes"
                : "Publish"}
        </button>
      </form>
    </div>
  );
}
