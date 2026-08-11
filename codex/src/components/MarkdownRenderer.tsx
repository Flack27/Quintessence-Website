import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { resolveAssetUrl } from "@/lib/content";

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
          img: ({ src, alt }) => {
            const resolved = typeof src === "string" ? resolveAssetUrl(slug, src) ?? src : src;
            return <img src={resolved} alt={alt ?? ""} loading="lazy" />;
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
