# Quintessence-Website

Public recruitment site for the Quintessence guild. Barebones by design: the guild's
bot, member management, applications and all internal tooling live in **Qutie** (the
public multi-guild product this stack evolved into); this site is the guild's public
face. Admins edit its content inline — there is no separate admin dashboard.

## What it is

- **Frontend** (`QT_FrontEnd/QT_FrontEnd`, Angular 17)
  - `/` + `/home` — landing page
  - `/games` — game showcase, two tabs:
    - **Upcoming Games**: cards (not clickable) with an optional official-site link on hover
    - **Prior Games**: cards open a details popup (story, achievements, gallery, and a
      Qutie-fed events-over-time graph with click-to-watch VOD overlays), plus the
      guild-wide "Our journey" timeline below.
    - **Admin (logged-in) view** adds inline editing everywhere: an "Add game" tile,
      per-card edit/reorder, the game editor overlay, and inline add/remove for
      achievements (with an icon picker), gallery items and timeline entries. No `/menu`.
  - `/roster` — main roster is a static, admin-managed list (with played-game icon
    tokens); a section per active game linked to Qutie adds attendance ring, events
    count and last-10 ticks. Main-roster members are added/edited inline (admin view).
  - `/apply` — redirects to the Qutie application form (`src/app/qutie.config.ts`)
  - `/login` — hidden admin entrance (Discord OAuth); no login button anywhere
- **API** (`QT_API`, ASP.NET 8)
  - `AccountsController` — Discord OAuth login/logout/info
  - `GamesController` — public game cards + past-game details + image serving
  - `TimelineController` — public guild timeline (GET) + admin add/delete
  - `RosterController` — public main roster (GET) + admin member CRUD
  - `GamesAdminController` — game CRUD, image upload, achievements + gallery CRUD (policy `IsAdmin`)
  - Admins = Discord user ids in `Discord:AdminUserIds` (appsettings); the old
    bot-synced role check is gone.

## Storage — no database

There is **no SQL Server / EF anymore**. All data is small and static enough to live in
JSON files, so:

- Games (with embedded achievements + gallery), the timeline, and the main roster are
  stored as JSON under `QT_API/Quintessence Website/App_Data/` (`games.json`,
  `timeline.json`, `roster.json`). A tiny file-locked `JsonStore<T>` reads/writes them.
- On first run each file is **seeded** from `BotWebsiteDAL/Store/Seed.cs` (which restores
  Aion 2, Throne and Liberty and New World). Delete a file to re-seed it.
- Uploaded images live on disk under `uploads/games/` and serve via `/api/games/images/{file}`.
- `App_Data/` is gitignored — it's runtime data (seed + the admin's live edits).

## Qutie integration (via a server-side proxy)

The Qutie public API is **keyed** (a per-guild secret `qta_…` key). A static browser app
can't hold a secret, so we **don't** call Qutie from the browser — we proxy through our
own backend, which holds the key:

```
Angular  ──►  /api/qutie/*  (our backend, QutieController)  ──►  Qutie /api/v1/*  (Bearer key)
```

- **Backend:** `Services/QutieApiClient.cs` reads `Qutie:ApiBase` + `Qutie:ApiKey` from
  config, calls Qutie's `/api/v1/*` with `Authorization: Bearer <key>`, pages paginated
  lists fully, and returns the JSON. `Controllers/QutieController.cs` exposes the read
  endpoints the site needs (`games`, `games/{id}/members`, `games/{id}/events`,
  `events/{id}/vods`) at `/api/qutie/*`, anonymous (they only surface the guild's own
  public data; the key never leaves the server). Returns `503` when unconfigured/upstream
  down, so the site degrades gracefully.
- **Frontend:** `src/app/services/qutie.service.ts` calls `/api/qutie/*` (no key in the
  browser). Shapes match the built API in `../../Qutie/docs/design/public-api.md`.
- **The key** goes in config `Qutie:ApiKey`. Since `appsettings.json` is gitignored, set
  it there in prod (or via a `Qutie__ApiKey` env var / user secrets in dev). Create the
  read-only key in Qutie → guild Settings → Public API. `Qutie:ApiBase` points at Qutie's
  API; **same-server prod → use the local address** (e.g. `http://localhost:5001`), which
  keeps the call private and fast.
- Degradation: until a key + base are configured, the per-game roster sections and the
  past-game events graph simply don't appear — the rest of the site (games, achievements,
  gallery, timeline, main roster) works entirely from the local JSON store.

## Build

- API: `dotnet build QT_API/QT_API.sln`
- Frontend: `npx ng build` in `QT_FrontEnd/QT_FrontEnd` (`npx ng serve` for dev,
  proxies `/api` to `https://localhost:5101` — moved off 5001, which Qutie's API uses)

## TODO before relaunch

- Fill `Discord:AdminUserIds` with the admin Discord user id(s).
- Add the real main-roster members in the admin roster view (seeded empty).
- Re-add any other showcase games that were only in the old database (Aion 2 / TL /
  New World are seeded; the rest didn't survive) and upload New World's card/banner.
- Fill the real Qutie host + guild id in `src/app/qutie.config.ts` (`QUTIE_GUILD_ID`,
  `QUTIE_APPLY_URL` — just the apply link; data goes through the proxy).
- Set `Qutie:ApiBase` + `Qutie:ApiKey` in the API config (a read-only key from Qutie →
  guild Settings → Public API). Then the per-game roster sections and the past-game
  events graph light up automatically.
- Link each showcase game to its Qutie game in the admin game editor (set the Qutie game
  + "Pull from Qutie") so the roster/events sections know which Qutie game to read.
