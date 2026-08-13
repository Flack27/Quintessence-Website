import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { resolveAssetUrl, parseImageSize } from "@/lib/content";

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
            const { width, height } = parseImageSize(title);
            return (
              <img
                src={resolved}
                alt={alt ?? ""}
                title={width ? undefined : title}
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
