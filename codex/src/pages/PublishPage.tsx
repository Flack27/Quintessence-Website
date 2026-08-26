import { useRef, useState, type ChangeEvent, type FormEvent, useEffect} from "react";
import { flushSync } from "react-dom";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useAuth } from "@/lib/AuthContext";
import { CODEX_API } from "@/lib/config";
import { fetchPost, resolveAssetUrl, parseImageMeta, parseHoverPayload, isVideoAsset } from "@/lib/content";
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
// Matches the API's own caps (CodexGuidesController.MaxImages/MaxImageBytes) - going higher
// here would just mean the upload fails once it reaches the server anyway.
const MAX_IMAGES = 50;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

// Videos share the same guide folder, upload endpoint and MAX_IMAGES slot count as images
// (see CodexGuidesController.AllowedVideoExtensions/MaxVideoBytes) - only the extension and
// per-file size cap differ.
const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];
const MAX_VIDEO_BYTES = 90 * 1024 * 1024;

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
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [bodyView, setBodyView] = useState<"editor" | "preview">("editor");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const videoMenuRef = useRef<HTMLDivElement>(null);

  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [hoverTriggerKind, setHoverTriggerKind] = useState<"text" | "image">("text");
  const [hoverTriggerText, setHoverTriggerText] = useState("");
  const [hoverTriggerImage, setHoverTriggerImage] = useState("");
  const [hoverPopupKind, setHoverPopupKind] = useState<"text" | "image">("text");
  const [hoverPopupText, setHoverPopupText] = useState("");
  const [hoverPopupImage, setHoverPopupImage] = useState("");
  const [hoverPopupImageSize, setHoverPopupImageSize] = useState("");
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

  // Same for the toolbar's video dropdown.
  useEffect(() => {
    if (!showVideoMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (videoMenuRef.current && !videoMenuRef.current.contains(event.target as Node)) {
        setShowVideoMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVideoMenu]);

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
        removable: false,
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
        removable: false,
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

    const remainingSlots = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, Math.max(remainingSlots, 0));
    if (files.length > toProcess.length) {
      setImageError(`Only ${Math.max(remainingSlots, 0)} more image(s) can be added (max ${MAX_IMAGES}).`);
    }

    const existingNames = new Set(images.map((img) => img.filename));

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
    setImages((prev) => prev.filter((img) => img.filename !== filename));
    setForm((prev) => (prev.cover === filename ? { ...prev, cover: "" } : prev));
    void deleteRemoteFile(filename);
  }

  /** Same flow as handleImagesSelected, for video files - same upload endpoint, own extension/size checks. */
  async function handleVideosSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setVideoError(null);

    const remainingSlots = MAX_IMAGES - videos.length;
    const toProcess = files.slice(0, Math.max(remainingSlots, 0));
    if (files.length > toProcess.length) {
      setVideoError(`Only ${Math.max(remainingSlots, 0)} more video(s) can be added (max ${MAX_IMAGES}).`);
    }

    const existingNames = new Set(videos.map((vid) => vid.filename));

    for (const file of toProcess) {
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
    setVideos((prev) => prev.filter((vid) => vid.filename !== filename));
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

    // flushSync forces the controlled textarea's DOM value to update *before* we touch its
    // selection, instead of a requestAnimationFrame racing an async re-render - without it,
    // the caret could land wherever the browser happened to leave it (often the end of the
    // text) rather than right after what was just inserted.
    flushSync(() => update("body", nextBody));

    const cursor = selectionStart + markdown.length;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  }

  /** Inserts an image or video reference - same `![](file "meta")` syntax, the extension picks the tag at render time. */
  function insertMediaMarkdown(filename: string, meta?: string) {
    insertAtCursor(meta ? `![](${filename} "${meta}")` : `![](${filename})`);
  }

  /** Quotes can't appear literally inside a markdown title, so swap them for the closest safe character. */
  function escapeMarkdownTitle(value: string): string {
    return value.replace(/"/g, "'");
  }

  /** Builds the `hover "…"` / `hover:…` markdown for a hover-popup insertion and drops it at the cursor. */
  function insertHoverPopup(
    trigger: { kind: "text"; value: string } | { kind: "image"; value: string },
    popup: { kind: "text"; value: string } | { kind: "image"; value: string; size?: string }
  ) {
    const popupPayload =
      popup.kind === "image" ? `img:${popup.value}${popup.size ? ` ${popup.size}` : ""}` : popup.value;
    const payload = escapeMarkdownTitle(popupPayload);
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

    const size = hoverPopupImageSize.trim();
    if (hoverPopupKind === "image" && size && !/^\d+(x\d+)?$/.test(size)) {
      setHoverFormError('Popup image size must look like "400" or "400x250".');
      return;
    }

    insertHoverPopup(
      { kind: hoverTriggerKind, value: triggerValue },
      { kind: hoverPopupKind, value: popupValue, size: hoverPopupKind === "image" ? size || undefined : undefined }
    );

    setShowHoverMenu(false);
    setHoverFormError(null);
    setHoverTriggerKind("text");
    setHoverTriggerText("");
    setHoverTriggerImage("");
    setHoverPopupKind("text");
    setHoverPopupText("");
    setHoverPopupImage("");
    setHoverPopupImageSize("");
  }

  /** Wraps the selection in `before`/`after` (e.g. "**bold**"), or inserts a placeholder. */
  function applyInline(before: string, after: string, placeholder: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    const nextBody = `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`;
    flushSync(() => update("body", nextBody));

    const start = selectionStart + before.length;
    const end = start + selected.length;
    textarea.focus();
    textarea.setSelectionRange(start, end);
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
    flushSync(() => update("body", nextBody));

    const delta = nextLine.length - line.length;
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineEnd + delta);
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
    flushSync(() => update("body", nextBody));

    const delta = nextBlock.length - block.length;
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineEnd + delta);
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
    flushSync(() => update("body", nextBody));

    const cursor = selectionStart + markdown.length;
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (imagesUploading) return;
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
            disabled={images.length >= MAX_IMAGES}
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
                    onClick={() => insertMediaMarkdown(img.filename, promptImageOptions())}
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
            disabled={videos.length >= MAX_IMAGES}
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
                    onClick={() => insertMediaMarkdown(vid.filename, promptImageOptions())}
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
                  {insertableImages.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-slate-400">
                      No images uploaded yet — add one in the Images section below.
                    </p>
                  ) : (
                    insertableImages.map((img) => (
                      <button
                        key={img.filename}
                        type="button"
                        onClick={() => {
                          insertMediaMarkdown(img.filename, promptImageOptions());
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
            <div ref={videoMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowVideoMenu((prev) => !prev)}
                className={toolbarButtonClass}
                title="Video"
              >
                🎬 Video
              </button>
              {showVideoMenu && (
                <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/10 bg-void-950 p-1.5 shadow-xl">
                  {insertableVideos.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-slate-400">
                      No videos uploaded yet — add one in the Videos section below.
                    </p>
                  ) : (
                    insertableVideos.map((vid) => (
                      <button
                        key={vid.filename}
                        type="button"
                        onClick={() => {
                          insertMediaMarkdown(vid.filename, promptImageOptions());
                          setShowVideoMenu(false);
                        }}
                        className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10"
                      >
                        {vid.filename}
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
                        {insertableImages.map((img) => (
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
                      <div className="space-y-1.5">
                        <select
                          value={hoverPopupImage}
                          onChange={(e) => setHoverPopupImage(e.target.value)}
                          className={menuSelectClass}
                        >
                          <option value="" className={optionClass}>
                            Select an image…
                          </option>
                          {insertableImages.map((img) => (
                            <option key={img.filename} value={img.filename} className={optionClass}>
                              {img.filename}
                            </option>
                          ))}
                        </select>
                        <input
                          value={hoverPopupImageSize}
                          onChange={(e) => setHoverPopupImageSize(e.target.value)}
                          placeholder='Size in pixels, e.g. "400" or "400x250" (optional)'
                          className={menuInputClass}
                        />
                      </div>
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

                      if (isVideoAsset(filename)) {
                        return (
                          <video
                            src={resolved}
                            controls
                            className={floatClass}
                            style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
                          />
                        );
                      }
                      const hoverClass = hover
                        ? "transition duration-150 group-hover:scale-[1.03] group-hover:brightness-110 !my-0"
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
                      <div className="my-6 overflow-x-auto rounded-xl border border-white/10">
                        <table>{children}</table>
                      </div>
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
