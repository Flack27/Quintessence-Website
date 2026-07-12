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
export const QUTIE_GUILD_ID = 'QUINTESSENCE_GUILD_ID';
export const QUTIE_APPLY_URL = `https://QUTIE_HOST/g/${QUTIE_GUILD_ID}/apply`;
