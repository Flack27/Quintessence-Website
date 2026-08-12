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
 * Discord-gated in-browser publishing - the `/publish` form, the sign-in control on
 * the home page, and the guide endpoints behind them.
 *
 * On. The endpoints live on the .NET API under `/api/codex/*`; guides are stored
 * server-side, so publishing one makes it visible immediately rather than waiting for
 * a container rebuild.
 *
 * Who may publish is decided by Discord roles, resolved live per request - see
 * CodexAccessService on the API side.
 */
export const PUBLISHING_ENABLED = true;
