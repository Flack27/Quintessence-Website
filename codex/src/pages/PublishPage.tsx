import { useRef, useState, type ChangeEvent, type FormEvent, useEffect} from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useAuth } from "@/lib/AuthContext";
import { CODEX_API } from "@/lib/config";
import { fetchPost, resolveAssetUrl, parseImageMeta, parseHoverPayload } from "@/lib/content";
import { HoverPopup } from "@/components/HoverPopup";
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
const toolbarButtonClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-quint-purple/60 hover:bg-white/[0.08] hover:text-white";
const menuInputClass =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100 outline-none transition-colors focus:border-quint-purple/60";
const menuSelectClass = `${menuInputClass} appearance-none bg-void-950`;
function kindToggleClass(active: boolean) {
  return `flex-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
    active
      ? "border-quint-purple/60 bg-white/[0.08] text-white"
      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
  }`;
}

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
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [bodyView, setBodyView] = useState<"editor" | "preview">("editor");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);

  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [hoverTriggerKind, setHoverTriggerKind] = useState<"text" | "image">("text");
  const [hoverTriggerText, setHoverTriggerText] = useState("");
  const [hoverTriggerImage, setHoverTriggerImage] = useState("");
  const [hoverPopupKind, setHoverPopupKind] = useState<"text" | "image">("text");
  const [hoverPopupText, setHoverPopupText] = useState("");
  const [hoverPopupImage, setHoverPopupImage] = useState("");
  const [hoverFormError, setHoverFormError] = useState<string | null>(null);
  const hoverMenuRef = useRef<HTMLDivElement>(null);

  // Closes the toolbar's image dropdown on an outside click, same as a native <select>.
  useEffect(() => {
    if (!showImageMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) {
        setShowImageMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showImageMenu]);

  // Same for the hover-popup form.
  useEffect(() => {
    if (!showHoverMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (hoverMenuRef.current && !hoverMenuRef.current.contains(event.target as Node)) {
        setShowHoverMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHoverMenu]);

  const existingCover = existingPost?.frontmatter.cover;
  const canEditThis = isEditing && Boolean(canModerate || (user && user.id === existingPost?.frontmatter.authorId));

  // Images already saved on the guide (from a previous session) plus whatever is staged
  // for upload in this one. A freshly staged file with the same name wins the display slot,
  // since it's the version that will actually be saved.
  const allImages = [
    ...existingImages
      .filter((filename) => !images.some((img) => img.filename === filename))
      .map((filename) => ({
        filename,
        previewUrl: resolveAssetUrl(editSlug ?? "", filename) ?? filename,
        removable: false,
      })),
    ...images.map((img) => ({ filename: img.filename, previewUrl: img.dataUrl, removable: true })),
  ];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateTitle(value: string) {
    setForm((prev) => ({ ...prev, title: value, slug: isEditing ? prev.slug : slugify(value) }));
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

  /**
   * Resolves an image filename for the preview. Staged (not-yet-saved) uploads live
   * only as local data URLs; anything else — already-saved images when editing — is
   * fetched from the API.
   */
  function resolvePreviewImageSrc(filename: string): string {
    const staged = images.find((img) => img.filename === filename);
    if (staged) return staged.dataUrl;
    return resolveAssetUrl(form.slug || "preview", filename) ?? filename;
  }

  /** Renders a hover payload (image or text) as popup content for the preview. */
  function renderHoverPreviewContent(payload: string) {
    const { type, value } = parseHoverPayload(payload);
    if (type === "image") {
      return <img src={resolvePreviewImageSrc(value)} alt="" className="max-h-48 w-auto rounded-lg" />;
    }
    return <span>{value}</span>;
  }

  /** Asks for an explicit pixel size to pin on an inserted image; blank/cancel keeps the original size. */
  function promptImageSize(): string | undefined {
    const input = window.prompt('Pin a size in pixels? e.g. "400" or "400x250" — leave blank for original size', "");
    const trimmed = input?.trim();
    return trimmed && /^\d+(x\d+)?$/.test(trimmed) ? trimmed : undefined;
  }

  /** Asks whether the image should float left/right of the text; blank/cancel keeps it inline. */
  function promptImagePosition(): "left" | "right" | undefined {
    const input = window.prompt(
      'Place the image to the "left" or "right" of the text, with the text wrapping on the other side? Leave blank to keep it inline (full width)',
      ""
    );
    const trimmed = input?.trim().toLowerCase();
    return trimmed === "left" || trimmed === "right" ? trimmed : undefined;
  }

  /** Asks for size and left/right placement, combined into the title markdown images pin metadata to. */
  function promptImageOptions(): string | undefined {
    const size = promptImageSize();
    const position = promptImagePosition();
    return [size, position].filter(Boolean).join(" ") || undefined;
  }

  /** Inserts markdown at the cursor (or appends it, if the body textarea isn't mounted yet). */
  function insertAtCursor(markdown: string) {
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

  function insertImageMarkdown(filename: string, meta?: string) {
    insertAtCursor(meta ? `![](${filename} "${meta}")` : `![](${filename})`);
  }

  /** Quotes can't appear literally inside a markdown title, so swap them for the closest safe character. */
  function escapeMarkdownTitle(value: string): string {
    return value.replace(/"/g, "'");
  }

  /** Builds the `hover "…"` / `hover:…` markdown for a hover-popup insertion and drops it at the cursor. */
  function insertHoverPopup(
    trigger: { kind: "text"; value: string } | { kind: "image"; value: string },
    popup: { kind: "text"; value: string } | { kind: "image"; value: string }
  ) {
    const payload = escapeMarkdownTitle(popup.kind === "image" ? `img:${popup.value}` : popup.value);
    const markdown =
      trigger.kind === "text"
        ? `[${trigger.value}](hover "${payload}")`
        : `![](${trigger.value} "hover:${payload}")`;
    insertAtCursor(markdown);
  }

  /** Reads the hover-popup form, validates it, and inserts the markdown it describes. */
  function submitHoverPopup() {
    const triggerValue = hoverTriggerKind === "text" ? hoverTriggerText.trim() : hoverTriggerImage;
    const popupValue = hoverPopupKind === "text" ? hoverPopupText.trim() : hoverPopupImage;

    if (!triggerValue || !popupValue) {
      setHoverFormError("Fill in (or pick an image for) both the trigger and the popup content.");
      return;
    }

    insertHoverPopup({ kind: hoverTriggerKind, value: triggerValue }, { kind: hoverPopupKind, value: popupValue });

    setShowHoverMenu(false);
    setHoverFormError(null);
    setHoverTriggerKind("text");
    setHoverTriggerText("");
    setHoverTriggerImage("");
    setHoverPopupKind("text");
    setHoverPopupText("");
    setHoverPopupImage("");
  }

  /** Wraps the selection in `before`/`after` (e.g. "**bold**"), or inserts a placeholder. */
  function applyInline(before: string, after: string, placeholder: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    const nextBody = `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`;
    update("body", nextBody);

    const start = selectionStart + before.length;
    const end = start + selected.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  }

  /** Sets the current line's heading level, replacing any marker it already has (toggles off on repeat). */
  function applyHeading(level: number) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd = value.indexOf("\n", selectionEnd) === -1 ? value.length : value.indexOf("\n", selectionEnd);

    const line = value.slice(lineStart, lineEnd);
    const match = line.match(/^(#{1,6})\s+/);
    const stripped = match ? line.slice(match[0].length) : line;
    const isSameLevel = Boolean(match && match[1].length === level);
    const nextLine = isSameLevel ? stripped : `${"#".repeat(level)} ${stripped}`;

    const nextBody = `${value.slice(0, lineStart)}${nextLine}${value.slice(lineEnd)}`;
    update("body", nextBody);

    const delta = nextLine.length - line.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineEnd + delta);
    });
  }

  /** Toggles a per-line prefix (e.g. "- ") across every line the selection touches. */
  function applyLinePrefix(prefix: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd = value.indexOf("\n", selectionEnd) === -1 ? value.length : value.indexOf("\n", selectionEnd);

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const alreadyApplied = lines.every((line) => line.startsWith(prefix));
    const nextBlock = lines.map((line) => (alreadyApplied ? line.slice(prefix.length) : `${prefix}${line}`)).join("\n");

    const nextBody = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
    update("body", nextBody);

    const delta = nextBlock.length - block.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineEnd + delta);
    });
  }

  function insertLink() {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const url = window.prompt("Link URL", "https://");
    if (!url) return;

    const selected = value.slice(selectionStart, selectionEnd) || "link text";
    const markdown = `[${selected}](${url})`;
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

    try {
      // REST now: POST /guides to create, PUT /guides/<slug> to edit.
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
          images: images.map((img) => ({ filename: img.filename, data: img.dataUrl })),
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

          {allImages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allImages.map((img) => (
                <div
                  key={img.filename}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() => insertImageMarkdown(img.filename, promptImageOptions())}
                    className="block w-full text-left"
                    title="Insert into body"
                  >
                    <img src={img.previewUrl} alt={img.filename} className="h-24 w-full object-cover" />
                    <p className="truncate px-2 py-1.5 text-xs text-slate-300">{img.filename}</p>
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
          <label className={labelClass} htmlFor="cover">
            Cover image
          </label>
          <div className="relative">
            <select
              id="cover"
              value={form.cover}
              onChange={(e) => update("cover", e.target.value)}
              disabled={allImages.length === 0 && !existingCover}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="" className={optionClass}>
                None
              </option>
              {existingCover && !allImages.some((img) => img.filename === existingCover) && (
                <option value={existingCover} className={optionClass}>
                  {existingCover} (current)
                </option>
              )}
              {allImages.map((img) => (
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
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBodyView("editor")}
              className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-semibold transition-colors ${
                bodyView === "editor"
                  ? "border-white/10 bg-white/[0.06] text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setBodyView("preview")}
              className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-semibold transition-colors ${
                bodyView === "preview"
                  ? "border-white/10 bg-white/[0.06] text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Preview
            </button>
          </div>
          {bodyView === "editor" ? (
          <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => applyHeading(1)} className={toolbarButtonClass} title="Heading 1">
              H1
            </button>
            <button type="button" onClick={() => applyHeading(2)} className={toolbarButtonClass} title="Heading 2">
              H2
            </button>
            <button type="button" onClick={() => applyHeading(3)} className={toolbarButtonClass} title="Heading 3">
              H3
            </button>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <button
              type="button"
              onClick={() => applyInline("**", "**", "bold text")}
              className={`${toolbarButtonClass} font-bold`}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyInline("_", "_", "italic text")}
              className={`${toolbarButtonClass} italic`}
              title="Italic"
            >
              I
            </button>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <button type="button" onClick={insertLink} className={toolbarButtonClass} title="Link">
              🔗 Link
            </button>
            <div ref={imageMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowImageMenu((prev) => !prev)}
                className={toolbarButtonClass}
                title="Image"
              >
                🖼 Image
              </button>
              {showImageMenu && (
                <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/10 bg-void-950 p-1.5 shadow-xl">
                  {allImages.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-slate-400">
                      No images uploaded yet — add one in the Images section below.
                    </p>
                  ) : (
                    allImages.map((img) => (
                      <button
                        key={img.filename}
                        type="button"
                        onClick={() => {
                          insertImageMarkdown(img.filename, promptImageOptions());
                          setShowImageMenu(false);
                        }}
                        className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10"
                      >
                        {img.filename}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div ref={hoverMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setHoverFormError(null);
                  setShowHoverMenu((prev) => !prev);
                }}
                className={toolbarButtonClass}
                title="Hover popup"
              >
                💬 Hover
              </button>
              {showHoverMenu && (
                <div className="absolute left-0 top-full z-10 mt-1 w-72 space-y-3 rounded-lg border border-white/10 bg-void-950 p-3 shadow-xl">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-300">What gets hovered</p>
                    <div className="mb-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHoverTriggerKind("text")}
                        className={kindToggleClass(hoverTriggerKind === "text")}
                      >
                        Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setHoverTriggerKind("image")}
                        className={kindToggleClass(hoverTriggerKind === "image")}
                      >
                        Image
                      </button>
                    </div>
                    {hoverTriggerKind === "text" ? (
                      <input
                        value={hoverTriggerText}
                        onChange={(e) => setHoverTriggerText(e.target.value)}
                        placeholder="Word or phrase to hover"
                        className={menuInputClass}
                      />
                    ) : (
                      <select
                        value={hoverTriggerImage}
                        onChange={(e) => setHoverTriggerImage(e.target.value)}
                        className={menuSelectClass}
                      >
                        <option value="" className={optionClass}>
                          Select an image…
                        </option>
                        {allImages.map((img) => (
                          <option key={img.filename} value={img.filename} className={optionClass}>
                            {img.filename}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-300">Popup content (shown on hover)</p>
                    <div className="mb-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHoverPopupKind("text")}
                        className={kindToggleClass(hoverPopupKind === "text")}
                      >
                        Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setHoverPopupKind("image")}
                        className={kindToggleClass(hoverPopupKind === "image")}
                      >
                        Image
                      </button>
                    </div>
                    {hoverPopupKind === "text" ? (
                      <textarea
                        value={hoverPopupText}
                        onChange={(e) => setHoverPopupText(e.target.value)}
                        rows={2}
                        placeholder="Text to show in the popup"
                        className={menuInputClass}
                      />
                    ) : (
                      <select
                        value={hoverPopupImage}
                        onChange={(e) => setHoverPopupImage(e.target.value)}
                        className={menuSelectClass}
                      >
                        <option value="" className={optionClass}>
                          Select an image…
                        </option>
                        {allImages.map((img) => (
                          <option key={img.filename} value={img.filename} className={optionClass}>
                            {img.filename}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {hoverFormError && <p className="text-xs text-red-400">{hoverFormError}</p>}
                  <button
                    type="button"
                    onClick={submitHoverPopup}
                    className="w-full rounded-md bg-quint-gradient px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Insert
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => applyLinePrefix("- ")} className={toolbarButtonClass} title="Bullet list">
              • List
            </button>
          </div>
          <textarea
            id="body"
            ref={bodyRef}
            required
            rows={16}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            className={`${inputClass} font-mono`}
          />
          </>
          ) : (
            <div className={`${inputClass} prose-codex min-h-[24rem] overflow-y-auto`}>
              {form.body.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={{
                    a: ({ href, title, children }) => {
                      if (href === "hover") {
                        return (
                          <HoverPopup
                            trigger={
                              <span className="border-b border-dashed border-slate-400 transition-colors group-hover:border-white group-hover:text-white">
                                {children}
                              </span>
                            }
                            content={renderHoverPreviewContent(title ?? "")}
                          />
                        );
                      }
                      return (
                        <a href={href} title={title}>
                          {children}
                        </a>
                      );
                    },
                    img: ({ src, alt, title }) => {
                      const filename = typeof src === "string" ? src.replace(/^\.\//, "") : "";
                      const resolved = resolvePreviewImageSrc(filename);
                      const { width, height, position, hover } = parseImageMeta(title);
                      const floatClass =
                        position === "left" ? "img-float-left" : position === "right" ? "img-float-right" : undefined;
                      const hoverClass = hover
                        ? "transition duration-150 group-hover:scale-[1.03] group-hover:brightness-110"
                        : undefined;
                      const image = (
                        <img
                          src={resolved}
                          alt={alt ?? ""}
                          title={width || position || hover ? undefined : title}
                          className={[floatClass, hoverClass].filter(Boolean).join(" ") || undefined}
                          style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
                          loading="lazy"
                        />
                      );
                      return hover ? <HoverPopup trigger={image} content={renderHoverPreviewContent(hover)} /> : image;
                    },
                    table: ({ children }) => (
                      <div className="my-6 overflow-x-auto rounded-xl border border-white/10">{children}</div>
                    ),
                  }}
                >
                  {form.body}
                </ReactMarkdown>
              ) : (
                <p className="text-sm text-slate-500">Nothing to preview yet — switch back to Editor and start writing.</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-quint-gradient px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (isEditing ? "Saving…" : "Publishing…") : isEditing ? "Save changes" : "Publish"}
        </button>
      </form>
    </div>
  );
}
