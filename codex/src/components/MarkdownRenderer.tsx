import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { resolveAssetUrl, parseImageMeta, parseHoverPayload } from "@/lib/content";
import { HoverPopup } from "./HoverPopup";

interface MarkdownRendererProps {
  slug: string;
  content: string;
}

export function MarkdownRenderer({ slug, content }: MarkdownRendererProps) {
  /** Renders a hover payload (image or text) as popup content, resolving image filenames against this guide. */
  function renderHoverContent(payload: string) {
    const { type, value } = parseHoverPayload(payload);
    if (type === "image") {
      return <img src={resolveAssetUrl(slug, value) ?? value} alt="" className="max-h-48 w-auto rounded-lg" />;
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
                  trigger={<span className="border-b border-dashed border-slate-400">{children}</span>}
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
            const image = (
              <img
                src={resolved}
                alt={alt ?? ""}
                title={width || position || hover ? undefined : title}
                className={floatClass}
                style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
                loading="lazy"
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
    </div>
  );
}
