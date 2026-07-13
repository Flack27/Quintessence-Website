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

/**
 * The roster's rank roles, HIGHEST priority first. Qutie returns each member's highest-held
 * role from this list (with its live Discord name) as `rankRole`; the card shows that name and
 * the roster sorts by this order, then alphabetically. The last id is the umbrella role above
 * (everyone on the roster has it), so it doubles as the "Member" fallback.
 */
export const QUTIE_ROSTER_RANK_ROLE_IDS = [
  '1137803902503366689',
  '1138417129184579665',
  '1138416911462436874',
  '1137817925638684802',
];
