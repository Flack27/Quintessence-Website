import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { resolveAssetUrl, parseImageMeta, parseHoverPayload } from "@/lib/content";
import { HoverPopup } from "./HoverPopup";
import { Lightbox } from "./Lightbox";

interface MarkdownRendererProps {
  slug: string;
  content: string;
}

export function MarkdownRenderer({ slug, content }: MarkdownRendererProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  /** Renders a hover payload (image or text) as popup content, resolving image filenames against this guide. */
  function renderHoverContent(payload: string) {
    const { type, value, width, height } = parseHoverPayload(payload);
    if (type === "image") {
      // `.prose-codex img` puts a 24px top/bottom margin on every guide image; that would
      // inflate this popup's box and, since it's a child of that same wrapper, throw off
      // the popup's positioning against its trigger. `!my-0` overrides it back to 0.
      // Without an explicit size, max-h-80 keeps an oversized source image from blowing
      // up the popup; an explicit size means the author asked for it, so it wins instead.
      return (
        <img
          src={resolveAssetUrl(slug, value) ?? value}
          alt=""
          className={`${width ? "" : "max-h-80"} w-auto rounded-lg !my-0`}
          style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
        />
      );
    }
    return <span>{value}</span>;
  }

  return (
    <div className="prose-codex">
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
                  content={renderHoverContent(title ?? "")}
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
            const resolved = typeof src === "string" ? resolveAssetUrl(slug, src) ?? src : src;
            const { width, height, position, hover } = parseImageMeta(title);
            const floatClass = position === "left" ? "img-float-left" : position === "right" ? "img-float-right" : undefined;
            const hoverClass = hover
              ? "transition duration-150 group-hover:scale-[1.03] group-hover:brightness-110 !my-0"
              : undefined;
            // Hover-payload images already open an enlarged preview on click (via HoverPopup's
            // toggle); wiring the lightbox onto them too would fight that click handler, so the
            // lightbox only applies to plain images.
            const image = (
              <img
                src={resolved}
                alt={alt ?? ""}
                title={width || position || hover ? undefined : title}
                className={[floatClass, hoverClass, hover ? undefined : "cursor-zoom-in"].filter(Boolean).join(" ") || undefined}
                style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
                loading="lazy"
                onClick={hover ? undefined : () => setLightbox({ src: resolved ?? "", alt: alt ?? "" })}
              />
            );
            return hover ? <HoverPopup trigger={image} content={renderHoverContent(hover)} /> : image;
          },
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-white/10">{children}</div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}
