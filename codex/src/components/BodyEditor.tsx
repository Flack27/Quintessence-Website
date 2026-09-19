import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { Table as TiptapTable } from "@tiptap/extension-table";
import { TableRow as TiptapTableRow } from "@tiptap/extension-table-row";
import { TableHeader as TiptapTableHeader } from "@tiptap/extension-table-header";
import { TableCell as TiptapTableCell } from "@tiptap/extension-table-cell";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { parseImageMeta, isVideoAsset } from "@/lib/content";
import { HoverPopup } from "./HoverPopup";

/** tiptap-markdown doesn't ship a `Storage` module augmentation for `@tiptap/core`, so
 *  `editor.storage.markdown` isn't visible to the type checker without this narrow cast. */
function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
}

const toolbarButtonClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-quint-purple/60 hover:bg-white/[0.08] hover:text-white";
const toolbarButtonActiveClass = "border-quint-purple/60 bg-white/[0.08] text-white";
const menuInputClass =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-slate-100 outline-none transition-colors focus:border-quint-purple/60";
const menuSelectClass = `${menuInputClass} appearance-none bg-void-950`;
const optionClass = "bg-void-950 text-slate-100";
function kindToggleClass(active: boolean) {
  return `flex-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
    active
      ? "border-quint-purple/60 bg-white/[0.08] text-white"
      : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
  }`;
}

interface MediaOption {
  filename: string;
}

interface BodyEditorContextValue {
  resolveImageSrc: (filename: string) => string;
  renderHoverContent: (payload: string) => ReactNode;
  /** Opens the size/position panel pre-filled from `currentMeta`, calling back with the new
   *  "[size] [position]" string (or undefined to clear it) once the author confirms. */
  openImageOptions: (currentMeta: string | undefined, onConfirm: (meta: string | undefined) => void) => void;
}

const BodyEditorContext = createContext<BodyEditorContextValue | null>(null);

/** Quotes can't appear literally inside a markdown title, so swap them for the closest safe character. */
function escapeMarkdownTitle(value: string): string {
  return value.replace(/"/g, "'");
}

/** Combines a size/position string with an existing hover payload back into one title string. */
function buildImageTitle(meta: string | undefined, hover: string | undefined): string | null {
  return [meta, hover ? `hover:${hover}` : undefined].filter(Boolean).join(" ") || null;
}

/** Renders a guide image/video node - float position, explicit size, and hover-popup wrapping,
 *  plus a small hover-revealed control to reconfigure or remove it. */
function ImageView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const ctx = useContext(BodyEditorContext);
  if (!ctx) return null;

  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const title = typeof node.attrs.title === "string" ? node.attrs.title : null;
  const filename = src.replace(/^\.\//, "");
  const resolved = ctx.resolveImageSrc(filename);
  const { width, height, position, hover } = parseImageMeta(title);
  const floatClass = position === "left" ? "img-float-left" : position === "right" ? "img-float-right" : undefined;
  const isVideo = isVideoAsset(filename);
  const style = width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined;

  function reconfigure() {
    ctx!.openImageOptions(title ?? undefined, (meta) => updateAttributes({ title: buildImageTitle(meta, hover) }));
  }

  const media = isVideo ? (
    <video src={resolved} controls className={`${floatClass ?? ""} !my-0`} style={style} />
  ) : (
    <img src={resolved} alt={alt} className={`${floatClass ?? ""} !my-0`} style={style} draggable={false} />
  );
  const content = hover ? <HoverPopup trigger={media} content={ctx.renderHoverContent(hover)} /> : media;

  return (
    <NodeViewWrapper
      as="div"
      className={`group/media relative inline-block ${floatClass ?? "my-6 block"} ${
        selected ? "rounded-xl ring-2 ring-quint-purple/70" : ""
      }`}
    >
      {content}
      <span className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover/media:opacity-100">
        <button
          type="button"
          contentEditable={false}
          onClick={reconfigure}
          className="rounded-full bg-black/70 px-1.5 py-1 text-[10px] leading-none text-white hover:bg-black/90"
          title="Size / position"
        >
          ⚙
        </button>
        <button
          type="button"
          contentEditable={false}
          onClick={() => deleteNode()}
          className="rounded-full bg-black/70 px-1.5 py-1 text-[10px] leading-none text-white hover:bg-black/90"
          title="Remove"
        >
          ✕
        </button>
      </span>
    </NodeViewWrapper>
  );
}

const GuideImage = TiptapImage.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

// `title` is already part of the stock Link mark's attributes; the only change needed is
// visually flagging the `href="hover"` sentinel this project's hover-popup syntax uses, done
// in CSS (see `.prose-codex a[href="hover"]`) rather than a custom mark view, since a live
// hover-preview inside the editor isn't essential - the author can trust the real guide page
// (unchanged) to render it.
const GuideLink = TiptapLink.configure({ openOnClick: false, autolink: false });

export interface BodyEditorHandle {
  /** Inserts an already-uploaded image/video at the caret, opening the size/position panel first. */
  insertMediaWithPrompt: (filename: string) => void;
}

interface BodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  insertableImages: MediaOption[];
  insertableVideos: MediaOption[];
  resolveImageSrc: (filename: string) => string;
  renderHoverContent: (payload: string) => ReactNode;
}

/** Guide body editor: a live, directly-editable rendering of the markdown (via Tiptap), with a
 *  "Markdown" fallback view for anything the WYSIWYG surface can't express cleanly by hand. */
export const BodyEditor = forwardRef<BodyEditorHandle, BodyEditorProps>(function BodyEditor(
  { value, onChange, insertableImages, insertableVideos, resolveImageSrc, renderHoverContent },
  ref,
) {
  const [viewMode, setViewMode] = useState<"write" | "markdown">("write");
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [hoverTriggerKind, setHoverTriggerKind] = useState<"text" | "image">("text");
  const [hoverTriggerText, setHoverTriggerText] = useState("");
  const [hoverTriggerImage, setHoverTriggerImage] = useState("");
  const [hoverPopupKind, setHoverPopupKind] = useState<"text" | "image">("text");
  const [hoverPopupText, setHoverPopupText] = useState("");
  const [hoverPopupImage, setHoverPopupImage] = useState("");
  const [hoverPopupImageSize, setHoverPopupImageSize] = useState("");
  const [hoverFormError, setHoverFormError] = useState<string | null>(null);

  const imageMenuRef = useRef<HTMLDivElement>(null);
  const videoMenuRef = useRef<HTMLDivElement>(null);
  const hoverMenuRef = useRef<HTMLDivElement>(null);

  // Snapshot of the editor's selection, taken right before opening a dropdown/panel or a
  // window.prompt() - all of which move DOM focus away from the editor for a while. Tiptap's
  // `.focus()` restores focus but doesn't reliably restore *where the caret was*, so without
  // this the eventual insert could land at the wrong spot (or reset to the top of the doc).
  const pendingRangeRef = useRef<{ from: number; to: number } | null>(null);

  function capturePendingRange() {
    pendingRangeRef.current = editor ? { from: editor.state.selection.from, to: editor.state.selection.to } : null;
  }

  /** Focuses the editor and, if a range was captured beforehand, restores the selection to it. */
  function focusChain() {
    const chain = editor!.chain().focus();
    const range = pendingRangeRef.current;
    pendingRangeRef.current = null;
    return range ? chain.setTextSelection(range) : chain;
  }

  const editor = useEditor({
    // false, not true: with React.StrictMode (which this app's main.tsx uses), a `true` here
    // has the editor render synchronously during the intentional double-mount, which can leave
    // `onUpdate` closing over an editor instance StrictMode already tore down - the exact
    // "Cannot read properties of undefined (reading 'getMarkdown')" crash that was silently
    // taking out this whole component (hence "no Table button", "no tables", "tables vanish").
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      GuideImage,
      GuideLink,
      // `resizable: false` - a plain, uniform grid keeps every table serializable back to GFM
      // markdown (see tiptap-markdown's table spec: no merged/resized cells); the guide page's
      // renderer wouldn't know what to do with column widths anyway.
      TiptapTable.configure({ resizable: false }),
      TiptapTableRow,
      TiptapTableHeader,
      TiptapTableCell,
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: "-", linkify: false, breaks: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(getMarkdown(editor)),
  });

  // Resyncs the editor when `value` changes from outside typing - e.g. the guide's content
  // arriving from the API after this component already mounted with an empty draft, or a
  // hand-edit made in the raw Markdown view. Skipped while the editor has focus so it never
  // fights an in-progress keystroke (which would reset the caret to the start of the doc).
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (getMarkdown(editor) !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (!showImageMenu) return;
    function onClick(event: MouseEvent) {
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) setShowImageMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showImageMenu]);

  useEffect(() => {
    if (!showVideoMenu) return;
    function onClick(event: MouseEvent) {
      if (videoMenuRef.current && !videoMenuRef.current.contains(event.target as Node)) setShowVideoMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showVideoMenu]);

  useEffect(() => {
    if (!showHoverMenu) return;
    function onClick(event: MouseEvent) {
      if (hoverMenuRef.current && !hoverMenuRef.current.contains(event.target as Node)) setShowHoverMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showHoverMenu]);

  // The size/position panel shown after picking an image/video to insert, or after clicking
  // an already-placed one's ⚙ control - replaces the old window.prompt() flow with proper
  // width/height fields and left/inline/right buttons.
  const [pendingInsert, setPendingInsert] = useState<{ onConfirm: (meta: string | undefined) => void } | null>(null);
  const [pendingWidth, setPendingWidth] = useState("");
  const [pendingHeight, setPendingHeight] = useState("");
  const [pendingPosition, setPendingPosition] = useState<"" | "left" | "right">("");

  function openImageOptions(currentMeta: string | undefined, onConfirm: (meta: string | undefined) => void) {
    const { width, height, position } = parseImageMeta(currentMeta ?? null);
    setPendingWidth(width ? String(width) : "");
    setPendingHeight(height ? String(height) : "");
    setPendingPosition(position ?? "");
    setPendingInsert({ onConfirm });
  }

  function confirmPendingInsert() {
    if (!pendingInsert) return;
    const size = pendingWidth ? (pendingHeight ? `${pendingWidth}x${pendingHeight}` : pendingWidth) : undefined;
    const meta = [size, pendingPosition || undefined].filter(Boolean).join(" ") || undefined;
    pendingInsert.onConfirm(meta);
    setPendingInsert(null);
  }

  function insertMedia(filename: string, meta?: string) {
    if (!editor) return;
    focusChain().insertContent({ type: "image", attrs: { src: filename, alt: "", title: meta ?? null } }).run();
  }

  useImperativeHandle(ref, () => ({
    insertMediaWithPrompt(filename: string) {
      capturePendingRange();
      openImageOptions(undefined, (meta) => insertMedia(filename, meta));
    },
  }));

  function insertLink() {
    if (!editor) return;
    capturePendingRange();
    const url = window.prompt("Link URL", "https://");
    if (!url) {
      pendingRangeRef.current = null;
      return;
    }
    const range = pendingRangeRef.current;

    if (!range || range.from === range.to) {
      focusChain().insertContent({ type: "text", text: "link text", marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      focusChain().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  function resetHoverForm() {
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

  /** Reads the hover-popup form, validates it, and inserts the markdown it describes. */
  function submitHoverPopup() {
    if (!editor) return;
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

    const popupPayload = hoverPopupKind === "image" ? `img:${popupValue}${size ? ` ${size}` : ""}` : popupValue;
    const payload = escapeMarkdownTitle(popupPayload);

    if (hoverTriggerKind === "text") {
      focusChain()
        .insertContent({ type: "text", text: triggerValue, marks: [{ type: "link", attrs: { href: "hover", title: payload } }] })
        .run();
    } else {
      insertMedia(triggerValue, `hover:${payload}`);
    }

    resetHoverForm();
  }

  const isActive = (name: string, attrs?: Record<string, unknown>) => Boolean(editor?.isActive(name, attrs));

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setViewMode("write")}
          className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-semibold transition-colors ${
            viewMode === "write" ? "border-white/10 bg-white/[0.06] text-white" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setViewMode("markdown")}
          className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-xs font-semibold transition-colors ${
            viewMode === "markdown" ? "border-white/10 bg-white/[0.06] text-white" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          title="Edit the raw markdown directly - useful as a fallback if something looks off above"
        >
          Markdown
        </button>
      </div>

      <div hidden={viewMode !== "write"}>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`${toolbarButtonClass} ${isActive("heading", { level: 1 }) ? toolbarButtonActiveClass : ""}`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`${toolbarButtonClass} ${isActive("heading", { level: 2 }) ? toolbarButtonActiveClass : ""}`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`${toolbarButtonClass} ${isActive("heading", { level: 3 }) ? toolbarButtonActiveClass : ""}`}
            title="Heading 3"
          >
            H3
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`${toolbarButtonClass} font-bold ${isActive("bold") ? toolbarButtonActiveClass : ""}`}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`${toolbarButtonClass} italic ${isActive("italic") ? toolbarButtonActiveClass : ""}`}
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
              onClick={() => {
                capturePendingRange();
                setShowImageMenu((prev) => !prev);
              }}
              className={toolbarButtonClass}
              title="Image"
            >
              🖼 Image
            </button>
            {showImageMenu && (
              <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/10 bg-void-950 p-1.5 shadow-xl">
                {insertableImages.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-400">No images uploaded yet — add one in the Images section below.</p>
                ) : (
                  insertableImages.map((img) => (
                    <button
                      key={img.filename}
                      type="button"
                      onClick={() => {
                        setShowImageMenu(false);
                        openImageOptions(undefined, (meta) => insertMedia(img.filename, meta));
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
              onClick={() => {
                capturePendingRange();
                setShowVideoMenu((prev) => !prev);
              }}
              className={toolbarButtonClass}
              title="Video"
            >
              🎬 Video
            </button>
            {showVideoMenu && (
              <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/10 bg-void-950 p-1.5 shadow-xl">
                {insertableVideos.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-400">No videos uploaded yet — add one in the Videos section below.</p>
                ) : (
                  insertableVideos.map((vid) => (
                    <button
                      key={vid.filename}
                      type="button"
                      onClick={() => {
                        setShowVideoMenu(false);
                        openImageOptions(undefined, (meta) => insertMedia(vid.filename, meta));
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
                capturePendingRange();
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
                    <button type="button" onClick={() => setHoverTriggerKind("text")} className={kindToggleClass(hoverTriggerKind === "text")}>
                      Text
                    </button>
                    <button type="button" onClick={() => setHoverTriggerKind("image")} className={kindToggleClass(hoverTriggerKind === "image")}>
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
                    <select value={hoverTriggerImage} onChange={(e) => setHoverTriggerImage(e.target.value)} className={menuSelectClass}>
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
                    <button type="button" onClick={() => setHoverPopupKind("text")} className={kindToggleClass(hoverPopupKind === "text")}>
                      Text
                    </button>
                    <button type="button" onClick={() => setHoverPopupKind("image")} className={kindToggleClass(hoverPopupKind === "image")}>
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
                      <select value={hoverPopupImage} onChange={(e) => setHoverPopupImage(e.target.value)} className={menuSelectClass}>
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
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={`${toolbarButtonClass} line-through ${isActive("strike") ? toolbarButtonActiveClass : ""}`}
            title="Strikethrough"
          >
            S
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`${toolbarButtonClass} ${isActive("bulletList") ? toolbarButtonActiveClass : ""}`}
            title="Bullet list"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`${toolbarButtonClass} ${isActive("orderedList") ? toolbarButtonActiveClass : ""}`}
            title="Numbered list"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={`${toolbarButtonClass} ${isActive("blockquote") ? toolbarButtonActiveClass : ""}`}
            title="Quote"
          >
            " Quote
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            className={`${toolbarButtonClass} font-mono ${isActive("codeBlock") ? toolbarButtonActiveClass : ""}`}
            title="Code block"
          >
            {"</>"}
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            className={toolbarButtonClass}
            title="Horizontal rule"
          >
            ―
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={toolbarButtonClass}
            title="Insert table"
          >
            ▦ Table
          </button>
          {isActive("table") && (
            <>
              <button
                type="button"
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                className={toolbarButtonClass}
                title="Add row"
              >
                +Row
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                className={toolbarButtonClass}
                title="Add column"
              >
                +Col
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().deleteRow().run()}
                className={toolbarButtonClass}
                title="Delete row"
              >
                −Row
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                className={toolbarButtonClass}
                title="Delete column"
              >
                −Col
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().deleteTable().run()}
                className={toolbarButtonClass}
                title="Delete table"
              >
                Delete table
              </button>
            </>
          )}
        </div>
        {pendingInsert && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-void-950 p-2">
            <span className="text-xs font-semibold text-slate-300">Size / position:</span>
            <input
              value={pendingWidth}
              onChange={(e) => setPendingWidth(e.target.value.replace(/\D/g, ""))}
              placeholder="Width px"
              inputMode="numeric"
              className={`${menuInputClass} w-24`}
            />
            <input
              value={pendingHeight}
              onChange={(e) => setPendingHeight(e.target.value.replace(/\D/g, ""))}
              placeholder="Height px"
              inputMode="numeric"
              className={`${menuInputClass} w-24`}
            />
            <button type="button" onClick={() => setPendingPosition("")} className={kindToggleClass(pendingPosition === "")}>
              Inline
            </button>
            <button type="button" onClick={() => setPendingPosition("left")} className={kindToggleClass(pendingPosition === "left")}>
              Float left
            </button>
            <button type="button" onClick={() => setPendingPosition("right")} className={kindToggleClass(pendingPosition === "right")}>
              Float right
            </button>
            <button
              type="button"
              onClick={confirmPendingInsert}
              className="rounded-md bg-quint-gradient px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setPendingInsert(null)}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
        <BodyEditorContext.Provider value={{ resolveImageSrc, openImageOptions, renderHoverContent }}>
          <EditorContent
            editor={editor}
            className="prose-codex w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus-within:border-quint-purple/60 focus-within:bg-white/[0.06] min-h-[24rem] [&_.ProseMirror]:min-h-[22rem] [&_.ProseMirror]:outline-none"
          />
        </BodyEditorContext.Provider>
      </div>

      <textarea
        hidden={viewMode !== "markdown"}
        required={viewMode === "markdown"}
        rows={16}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-quint-purple/60 focus:bg-white/[0.06]"
      />
    </div>
  );
});
