/**
 * Links into Qutie (the bot + dashboard that replaced the legacy Quintessence stack).
 *
 * Only the apply link needs Qutie's host + guild id here. Data comes from our OWN
 * backend proxy at /api/qutie (the API key lives server-side in the API's config,
 * not in the browser - see QutieController / QutieApiClient), so there's no Qutie
 * API base or key in the frontend.
 *
 * TODO: fill in the real host + guild id once Qutie is publicly hosted.
 */
export const QUTIE_GUILD_ID = '1137802734284832910';
export const QUTIE_APPLY_URL = `https://qutie.app/g/${QUTIE_GUILD_ID}/apply`;

/**
 * Discord role that defines the public "main roster". The roster page pulls the members
 * holding this role from Qutie (GET /api/v1/members?roleId=...) instead of a hand-managed
 * list, so the site's roster tracks the Discord role automatically.
 */
export const QUTIE_MAIN_ROSTER_ROLE_ID = '1137817925638684802';
