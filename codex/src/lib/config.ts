/**
 * Site-level configuration.
 */

/**
 * Base path for the Codex's own API.
 *
 * The Codex is served at `quintessence-eu.com/guides/` by the same nginx that
 * serves the Angular site and proxies `/api/` to the .NET API — so this is a
 * plain **same-origin** path. No absolute origin, no CORS, no `SameSite=None`
 * third-party cookie (which Safari blocks outright): the session cookie set by
 * the API is first-party here, exactly like it is for the Angular admin login.
 *
 * The `/codex` namespace keeps these routes from colliding with the existing
 * `/api/games`, `/api/timeline` etc. on the same API.
 */
export const CODEX_API = "/api/codex";

/**
 * Discord-gated in-browser publishing — the `/publish` form, the navbar login
 * button, and the endpoints behind them.
 *
 * **Off**: the UI is written and working, but the endpoints it calls do not
 * exist yet. They are being built on the .NET API rather than as serverless
 * functions (see `CODEX-PLAN.md` in the repo root, phase C). Flip this to
 * `true` once `/api/codex/*` is live.
 *
 * Local development ignores this flag — `App.tsx` and `AuthContext` also check
 * `import.meta.env.DEV`, which routes to the fake API in `dev/mock-api.ts`, so
 * the publish flow stays testable with `npm run dev` and no backend at all.
 */
export const PUBLISHING_ENABLED = false;
