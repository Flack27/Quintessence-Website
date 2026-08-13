import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { resolveAssetUrl, parseImageMeta } from "@/lib/content";

interface MarkdownRendererProps {
  slug: string;
  content: string;
}

export function MarkdownRenderer({ slug, content }: MarkdownRendererProps) {
  return (
    <div className="prose-codex">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          img: ({ src, alt, title }) => {
            const resolved = typeof src === "string" ? resolveAssetUrl(slug, src) ?? src : src;
            const { width, height, position } = parseImageMeta(title);
            const floatClass = position === "left" ? "img-float-left" : position === "right" ? "img-float-right" : undefined;
            return (
              <img
                src={resolved}
                alt={alt ?? ""}
                title={width || position ? undefined : title}
                className={floatClass}
                style={width ? { width: `${width}px`, height: height ? `${height}px` : "auto" } : undefined}
                loading="lazy"
              />
            );
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
