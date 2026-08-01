/**
 * Site-level feature flags.
 */

/**
 * Discord-gated in-browser publishing (the `/publish` form, the navbar login
 * button, and the `api/` serverless functions behind them).
 *
 * Turned **off**: the guild decided guides get added by committing markdown to
 * `contents/` directly, so the whole OAuth + GitHub-commit path is unused.
 *
 * It is disabled rather than deleted because it would otherwise be actively
 * broken, not merely idle. The codex is served under
 * `quintessence-eu.com/guides/`, but those endpoints are requested as
 * root-absolute `/api/...` — which is *not* under `/guides/`, so the request
 * never reaches this app. It lands on the main guild site's .NET API instead.
 *
 * To bring publishing back: flip this to `true`, set the Discord/GitHub env
 * vars from `.env.example` in the Vercel project, and give the `/api` calls in
 * `DiscordLoginButton.tsx` + `AuthContext.tsx` an absolute origin pointing at
 * the codex's own deployment (e.g. `https://<project>.vercel.app/api/...`),
 * since the sub-path mount means same-origin `/api` no longer belongs to us.
 */
export const PUBLISHING_ENABLED = false;
