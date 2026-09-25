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
import { Extension, type Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { Table as TiptapTable } from "@tiptap/extension-table";
import { TableRow as TiptapTableRow } from "@tiptap/extension-table-row";
import { TableHeader as TiptapTableHeader } from "@tiptap/extension-table-header";
import { TableCell as TiptapTableCell } from "@tiptap/extension-table-cell";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { parseImageMeta, isVideoAsset, imageSizeStyle } from "@/lib/content";
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

/** One toolbar action - a plain button, or the active/toggled state of a format like Bold. */
function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`${toolbarButtonClass} ${active ? toolbarButtonActiveClass : ""} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-slate-300 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

/** Groups related toolbar buttons with a label above them, so the palette reads as sections
 *  (Text, Insert, Lists, Table) instead of one undifferentiated row of icons. */
function ToolbarGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-1 hidden h-9 w-px shrink-0 self-end bg-white/10 sm:block" />;
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
  const style = imageSizeStyle(width, height);

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

// tiptap-markdown can only serialize a table to GFM markdown when every cell holds exactly one
// paragraph; the stock table-cell/table-header nodes allow any number of blocks ("block+"), so a
// stray Enter keypress (or a multi-line paste) inside a cell silently produces a table the
// serializer can't express - and it then drops the *entire* table as the literal text "[table]"
// instead of just that cell. Restricting cell content to a single paragraph OR a single image
// makes that state structurally impossible (Enter inside a cell becomes a no-op rather than
// corrupting the table), while still allowing the one other thing a cell can usefully hold.
const GuideTableCell = TiptapTableCell.extend({ content: "paragraph | image" });
const GuideTableHeader = TiptapTableHeader.extend({ content: "paragraph | image" });

/** Mirrors the private `hasSpan`/`childNodes`/`isMarkdownSerializable` helpers in
 *  tiptap-markdown/src/extensions/nodes/table.js (not exported by the package, so duplicated
 *  here) - the gate that decides whether a table can round-trip through GFM markdown at all.
 *  With cell content locked to "paragraph | image" above, the only way this can still fail is
 *  a merged cell (colspan/rowspan), which this editor's UI never creates. */
function hasSpan(node: { attrs: { colspan?: number; rowspan?: number } }): boolean {
  return (node.attrs.colspan ?? 1) > 1 || (node.attrs.rowspan ?? 1) > 1;
}
function tableChildNodes(node: { content?: { content: unknown[] } } | undefined): any[] {
  return (node?.content?.content as any[]) ?? [];
}
function isTableMarkdownSerializable(node: any): boolean {
  const rows = tableChildNodes(node);
  const firstRow = rows[0];
  const bodyRows = rows.slice(1);
  if (tableChildNodes(firstRow).some((cell) => cell.type.name !== "tableHeader" || hasSpan(cell) || cell.childCount > 1)) {
    return false;
  }
  if (bodyRows.some((row) => tableChildNodes(row).some((cell) => cell.type.name === "tableHeader" || hasSpan(cell) || cell.childCount > 1))) {
    return false;
  }
  return true;
}

/** Writes a table cell's sole child as markdown. tiptap-markdown's own table serializer calls
 *  `state.renderInline(cellContent)`, which renders a *paragraph's* children (text + marks) -
 *  but silently emits nothing for a lone image, since an image is a leaf with no children and
 *  no text content of its own. Handling it here is what actually makes "images in table cells"
 *  survive a save, not just look like they worked while the editor is open. */
function writeTableCellContent(state: any, cellContent: any): void {
  if (!cellContent) return;
  if (cellContent.type.name === "image") {
    const alt = state.esc(cellContent.attrs.alt || "");
    const src = String(cellContent.attrs.src || "").replace(/[()]/g, "\\$&");
    const title = cellContent.attrs.title ? ` "${String(cellContent.attrs.title).replace(/"/g, '\\"')}"` : "";
    state.write(`![${alt}](${src}${title})`);
    return;
  }
  if (cellContent.textContent.trim()) {
    state.renderInline(cellContent);
  }
}

const GuideTable = TiptapTable.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          if (!isTableMarkdownSerializable(node)) {
            state.write("[table]");
            state.closeBlock(node);
            return;
          }
          state.inTable = true;
          node.forEach((row: any, _offset: number, i: number) => {
            state.write("| ");
            row.forEach((col: any, _colOffset: number, j: number) => {
              if (j) state.write(" | ");
              writeTableCellContent(state, col.firstChild);
            });
            state.write(" |");
            state.ensureNewLine();
            if (!i) {
              const delimiterRow = Array.from({ length: row.childCount })
                .map(() => "---")
                .join(" | ");
              state.write(`| ${delimiterRow} |`);
              state.ensureNewLine();
            }
          });
          state.closeBlock(node);
          state.inTable = false;
        },
        parse: {
          // handled by markdown-it
        },
      },
    };
  },
});

// A GFM pipe-table cell can't hold a literal line break. Plain Enter inside one is already a
// no-op (GuideTableCell/GuideTableHeader's "paragraph | image" content model rejects a second
// paragraph), but Shift-Enter/Mod-Enter is a *different* command - it inserts a hard break
// inside the same paragraph, which that content model happily allows. tiptap-markdown can only
// render a hard break inside a table as an HTML `<br>` (see its hard-break spec), and this
// editor runs with `html: false` (below), so it falls back to writing the literal text
// "[hardBreak]" into the cell instead - the same kind of silent corruption the table-level fix
// above exists to prevent. `priority: 1000` puts this ahead of the default HardBreak keymap
// (from StarterKit, priority 100) so it gets first refusal inside a cell, and falls through
// (returns false) to the normal shortcut everywhere else.
const TableHardBreakGuard = Extension.create({
  name: "tableHardBreakGuard",
  priority: 1000,
  addKeyboardShortcuts() {
    const insideTableCell = () => this.editor.isActive("tableCell") || this.editor.isActive("tableHeader");
    return {
      "Mod-Enter": insideTableCell,
      "Shift-Enter": insideTableCell,
    };
  },
});

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
    // Tiptap v3 defaults this to off (a perf tradeoff): without it, moving the caret alone -
    // e.g. clicking from a table's header into a body cell - never re-renders this component,
    // so every `isActive(...)` check below (bold/heading highlighting, the table-header safety
    // gating) would keep showing whatever was true at the last actual content edit.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      GuideImage,
      GuideLink,
      // `resizable: false` - a plain, uniform grid keeps every table serializable back to GFM
      // markdown (see tiptap-markdown's table spec: no merged/resized cells); the guide page's
      // renderer wouldn't know what to do with column widths anyway.
      GuideTable.configure({ resizable: false }),
      TiptapTableRow,
      GuideTableHeader,
      GuideTableCell,
      TableHardBreakGuard,
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
    const attrs = { src: filename, alt: "", title: meta ?? null };

    // A table cell's content is "paragraph | image" (see GuideTableCell/GuideTableHeader) - it
    // can hold text OR one image, never both side by side. So inserting an image at a cursor
    // that's inside a cell can't just add the image next to the cell's existing (usually empty)
    // paragraph the way a normal insertContent() would elsewhere; it has to replace that cell's
    // whole content with the image instead. Resolved against `pendingRangeRef` (captured before
    // the image picker/size panel stole focus) rather than the editor's current selection, since
    // that's the position the insert is actually meant to land at - see `focusChain`'s comment.
    const target = pendingRangeRef.current ?? { from: editor.state.selection.from, to: editor.state.selection.to };
    const $from = editor.state.doc.resolve(target.from);
    let cellDepth = $from.depth;
    while (cellDepth > 0 && $from.node(cellDepth).type.name !== "tableCell" && $from.node(cellDepth).type.name !== "tableHeader") {
      cellDepth--;
    }

    if (cellDepth > 0) {
      const cellNode = $from.node(cellDepth);
      const cellStart = $from.before(cellDepth) + 1;
      focusChain()
        .command(({ tr }) => {
          tr.replaceWith(cellStart, cellStart + cellNode.content.size, editor.schema.nodes.image.create(attrs));
          return true;
        })
        .run();
      return;
    }

    focusChain().insertContent({ type: "image", attrs }).run();
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
  // A table cell's content model is "paragraph | image" (see GuideTableCell/GuideTableHeader) -
  // none of headings, lists, quotes, code blocks or a horizontal rule can ever land there, so
  // ProseMirror silently no-ops these commands inside a cell rather than doing anything. Left
  // enabled, that reads as broken (the button lights up "active" with nothing having changed -
  // see toggleBulletList below); disabling them here is the same treatment the "Row"/"Col"
  // buttons already get for actions that don't apply to the current selection.
  const inTableCell = isActive("tableCell") || isActive("tableHeader");
  const notInCellTitle = "Not available inside a table cell - a cell can only hold text or a single image";

  return (
    <div>
      <div
        className="sticky z-30 -mx-1 space-y-2 border-b border-white/10 bg-void-950/95 px-1 pb-3 pt-2 backdrop-blur-sm"
        style={{ top: "var(--navbar-height)" }}
      >
        <div className="flex items-center gap-1">
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

        {viewMode === "write" && (
          <>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <ToolbarGroup label="Heading">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  active={!inTableCell && isActive("heading", { level: 1 })}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Heading 1"}
                >
                  H1
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  active={!inTableCell && isActive("heading", { level: 2 })}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Heading 2"}
                >
                  H2
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  active={!inTableCell && isActive("heading", { level: 3 })}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Heading 3"}
                >
                  H3
                </ToolbarButton>
              </ToolbarGroup>

              <ToolbarDivider />

              <ToolbarGroup label="Text">
                <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={isActive("bold")} title="Bold" className="font-bold">
                  B
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={isActive("italic")} title="Italic" className="italic">
                  I
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={isActive("strike")} title="Strikethrough" className="line-through">
                  S
                </ToolbarButton>
              </ToolbarGroup>

              <ToolbarDivider />

              <ToolbarGroup label="Lists & blocks">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  active={!inTableCell && isActive("bulletList")}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Bullet list"}
                >
                  • List
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  active={!inTableCell && isActive("orderedList")}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Numbered list"}
                >
                  1. List
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  active={!inTableCell && isActive("blockquote")}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Quote"}
                >
                  ❝ Quote
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  active={!inTableCell && isActive("codeBlock")}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Code block"}
                  className="font-mono"
                >
                  {"</>"}
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                  disabled={inTableCell}
                  title={inTableCell ? notInCellTitle : "Horizontal rule (divider line)"}
                >
                  ― Line
                </ToolbarButton>
              </ToolbarGroup>

              <ToolbarDivider />

              <ToolbarGroup label="Insert">
                <ToolbarButton onClick={insertLink} title="Link">
                  🔗 Link
                </ToolbarButton>
                <div ref={imageMenuRef} className="relative">
                  <ToolbarButton
                    onClick={() => {
                      capturePendingRange();
                      setShowImageMenu((prev) => !prev);
                    }}
                    title="Image"
                  >
                    🖼 Image
                  </ToolbarButton>
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
                  <ToolbarButton
                    onClick={() => {
                      capturePendingRange();
                      setShowVideoMenu((prev) => !prev);
                    }}
                    title="Video"
                  >
                    🎬 Video
                  </ToolbarButton>
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
                  <ToolbarButton
                    onClick={() => {
                      capturePendingRange();
                      setHoverFormError(null);
                      setShowHoverMenu((prev) => !prev);
                    }}
                    title="Hover popup"
                  >
                    💬 Hover
                  </ToolbarButton>
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
              </ToolbarGroup>

              <ToolbarDivider />

              <ToolbarGroup label="Table">
                <ToolbarButton onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert a 3×3 table">
                  ▦ Table
                </ToolbarButton>
              </ToolbarGroup>
            </div>

            {isActive("table") && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-quint-purple/30 bg-quint-purple/[0.06] p-2">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Table cell:</span>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().addRowBefore().run()}
                  disabled={isActive("tableHeader")}
                  title={
                    isActive("tableHeader")
                      ? "Can't insert a row above the header - a table needs exactly one header row, at the top"
                      : "Insert a row above the current one"
                  }
                >
                  ↑ Row
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().addRowAfter().run()} title="Insert a row below the current one">
                  ↓ Row
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().addColumnBefore().run()} title="Insert a column to the left">
                  ← Col
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().addColumnAfter().run()} title="Insert a column to the right">
                  → Col
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-white/10" />
                <ToolbarButton
                  onClick={() => editor?.chain().focus().deleteRow().run()}
                  disabled={isActive("tableHeader")}
                  title={isActive("tableHeader") ? "Can't delete the header row - a table needs exactly one" : "Delete the current row"}
                >
                  ✕ Row
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().deleteColumn().run()} title="Delete the current column">
                  ✕ Col
                </ToolbarButton>
                <ToolbarButton onClick={() => editor?.chain().focus().deleteTable().run()} title="Delete the whole table">
                  ✕ Table
                </ToolbarButton>
              </div>
            )}

            {pendingInsert && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-void-950 p-2">
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
          </>
        )}
      </div>

      <div hidden={viewMode !== "write"} className="mt-3">
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
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-quint-purple/60 focus:bg-white/[0.06]"
      />
    </div>
  );
});
