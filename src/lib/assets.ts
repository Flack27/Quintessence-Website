/**
 * Resolves a path to a file in `assets/` (the Vite public dir) against the
 * site's base path.
 *
 * The codex is served under `/guides/` rather than the domain root, and Vite
 * only rewrites asset URLs it can see — imports, and the references in
 * `index.html`. A hardcoded string like `<img src="/logo.png">` is invisible to
 * it and would resolve against the main guild site instead, 404ing. Run every
 * such path through this helper:
 *
 *     import { publicAsset } from "@/lib/assets";
 *     <img src={publicAsset("/logo-quintessence-v1.png")} />
 *
 * External URLs and already-prefixed paths are returned untouched.
 */
export function publicAsset(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;

  // import.meta.env.BASE_URL is "/guides/" in this project, "/" if the base is
  // ever dropped — both end in a slash, so trim the leading one off `path`.
  const base = import.meta.env.BASE_URL;
  if (path.startsWith(base)) return path;
  return base + path.replace(/^\/+/, "");
}
