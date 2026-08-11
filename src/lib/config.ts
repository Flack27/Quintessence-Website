/**
 * Site-level feature flags.
 */

/**
 * Absolute origin of this codex's own Vercel deployment, e.g.
 * `https://quintessence-codex.vercel.app`. The site itself is served under
 * `quintessence-eu.com/guides/`, a sub-path of a separate main site that owns
 * `/api/*` at that domain's root — so every `/api/...` call the browser makes
 * has to point here explicitly instead of relying on same-origin `fetch("/api/...")`.
 * Set via the `VITE_API_ORIGIN` build-time env var; empty string means
 * same-origin (only correct if this app is ever deployed standalone at its
 * own domain instead of sub-path-mounted).
 */
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "";

/**
 * Discord-gated in-browser publishing (the `/publish` form, the navbar login
 * button, and the `api/` serverless functions behind them).
 *
 * Requires `VITE_API_ORIGIN` above plus the Discord/GitHub/`PUBLIC_SITE_URL`
 * env vars from `.env.example` to be set in the Vercel project for the
 * feature to actually work end to end — see README.md's "Discord-gated
 * publishing" section for the full setup checklist.
 */
export const PUBLISHING_ENABLED = true;
