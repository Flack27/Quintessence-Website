# Quintessence Codex

A markdown-driven guide/blog for the Quintessence guild, styled after
[qutie.app](https://qutie.app)'s dark, pink-to-purple gradient aesthetic and
the guild's own flame branding.

Every guide is a markdown file. There's no CMS and no database — write a
folder in `contents/`, and it shows up on the site.

## Stack

- **Vite + React + TypeScript** — all source in [`src/`](src)
- Markdown loaded at build time via `import.meta.glob` (no server/runtime needed)
- Custom lightweight frontmatter parser + full-text search (see [`src/lib/`](src/lib)) — no runtime YAML/search dependency
- Plain CSS/Tailwind, no component library

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build locally
```

> This environment didn't have Node.js installed, so the app hasn't been run
> here — `npm install && npm run dev` is the first thing to try after cloning.

## Project layout

```
assets/       Static brand assets (logo, favicon, images) — served as-is at the site root.
              Drop e.g. logo.png here and reference it as /logo.png.
contents/     One subfolder per guide/blog post. See contents/README.md for the format.
src/          All frontend source (components, pages, content-loading logic).
```

## Writing a guide

See [`contents/README.md`](contents/README.md) — it's the one rule to follow:
a `contents/<slug>/index.md` file with a frontmatter block giving the post its
`title`, `description` (intro), `game` (which game it's for) and `section`
(which part of that game's guide it belongs to), plus optional `subtitle`,
`tags`, `date`, `author` and `cover`. Everything after the frontmatter is
plain markdown — headings, lists, tables, images, links, blockquotes.

Three placeholder posts are included under `contents/` to show the format —
`getting-started-sample`, `class-guide-sample` and `raid-guide-sample`. Their
body text is Lorem Ipsum filler, but each uses a real Aion 2 screenshot as its
`cover` (referenced by absolute path from `assets/`, e.g.
`cover: "/bg-sample-1.webp"`) so the homepage cards and post
pages look right out of the box. Replace the filler text with real guides
whenever you're ready — the frontmatter and folder structure stay the same.

## Discord-gated publishing

Logging in with Discord grants one of two permission tiers, checked against
role IDs configured in env vars (see Setup below) — no roles/permissions are
hardcoded:

- **author** (Guild Member, Main Roster) — create a new guide via `/publish`,
  and edit or delete **their own** guides via the "Edit guide"/"Delete guide"
  buttons on a guide page.
- **moderator** (Advisors, Monarchs) — everything an author can do, plus edit
  or delete **anyone's** guide. A strict superset of author.

Since the site itself stays a static build with no database, this is
implemented as a handful of Vercel serverless functions under
[`api/`](api):

- `api/auth/login`, `api/auth/callback`, `api/auth/me`, `api/auth/logout` —
  Discord OAuth2 login. On callback, the server (never the browser) uses a
  bot token to look up the logged-in user's roles in the configured guild,
  maps them onto the two tiers above, and stores the result (`"none" |
  "author" | "moderator"`) in a signed, httpOnly session cookie.
- `api/publish` (`POST`) — create a new guide. Only usable when role isn't
  `"none"`. Takes the form fields, builds `contents/<slug>/index.md` in the
  same frontmatter format `src/lib/frontmatter.ts` parses, and commits it
  straight to the repo via the GitHub Contents API.
- `api/update` (`PUT`) — edit an existing guide's fields/body/images in
  place. Allowed when the caller is a moderator, or is the guide's original
  publisher (`authorId` in its frontmatter, never trusted from the request —
  always re-read from the file being edited). Rewrites `index.md` via the
  same GitHub Contents API call as publish, but with that file's current
  `sha` so it updates instead of erroring on a create-conflict.
- `api/delete` (`DELETE`) — same allow rule as update.

Every one of these triggers the normal Vercel rebuild on commit — a guide's
create/edit/delete goes live once that deploy finishes, same as if someone
had committed the file change by hand.

No content, sessions, or roles are stored in a database — the repo is still
the only source of truth for guides, and Discord is the only source of truth
for who's allowed to touch them.

### Why the cross-origin cookie/CORS plumbing exists

The codex is served under `quintessence-eu.com/guides/` — a sub-path of a
separate main site that owns `/api/*` at that domain's root — so relative
`fetch("/api/...")` calls from the browser would never reach this project's
functions. Every API call the frontend makes is instead pointed at this
project's own absolute Vercel URL via `VITE_API_ORIGIN`
([`src/lib/config.ts`](src/lib/config.ts)), which makes every one of those
calls **cross-origin** relative to the page the user is actually looking at.
Two things exist purely because of that:

- The session/OAuth-state cookies are `SameSite=None` (not the more usual
  `Lax`) — `Lax` cookies aren't sent on cross-site `fetch`/`XHR`, only
  top-level navigations, which would silently break every logged-in API call
  except the login link itself.
- [`api/_lib/cors.ts`](api/_lib/cors.ts) answers every function's request
  with `Access-Control-Allow-Origin`/`-Credentials` scoped to
  `PUBLIC_SITE_URL`, and every frontend `fetch` call passes
  `credentials: "include"` — both sides are required for the cookie to
  actually cross that origin boundary.
- `api/auth/callback` redirects to an **absolute** `PUBLIC_SITE_URL` URL
  after login (e.g. `.../guides/publish`), since a relative redirect from
  this response would land the browser on the bare Vercel domain instead of
  back under `/guides/`.

If this project is ever deployed standalone at its own domain instead of
sub-path-mounted, none of this is needed — leave `VITE_API_ORIGIN` unset and
all of the above degenerates to ordinary same-origin behavior (though the
`SameSite=None`/CORS code is harmless to leave in either way).

### Testing publish/edit/delete with just `npm run dev`

`npm run dev` runs Vite only, which has no idea what `api/*.ts` is — those
routes only exist as real Vercel functions, normally reachable via `vercel
dev` (see Setup below). For quick local testing without a Discord app or
GitHub token, [`vite.config.ts`](vite.config.ts) loads
[`dev/mock-api.ts`](dev/mock-api.ts), which is active only under `npm run
dev` (never in a production build) and:

- Always reports a logged-in fake user (`Local Dev`) with the **moderator**
  tier from `/api/auth/me`, so the navbar, `/publish`, `/publish/:slug` and
  the edit/delete buttons all behave as if you're logged in with full
  rights — including editing/deleting a guide "published" under a different
  author, to exercise the moderator-only path.
- Handles `POST /api/publish` by writing a real `contents/<slug>/index.md`
  (plus any uploaded images) straight to disk — Vite's own file watcher then
  picks it up the same as if you'd written the file by hand.
- Handles `PUT /api/update` the same way, rewriting that file in place.
- Handles `DELETE /api/delete` by removing that folder.

Nothing here touches GitHub or Discord, and none of the cross-origin
cookie/CORS mechanics above apply locally (the dev server serves the app and
this mock from the same origin). To exercise the real commit-to-GitHub flow,
use `vercel dev` instead, per the Setup section below.

### Setup

1. Create a Discord application at
   [discord.com/developers/applications](https://discord.com/developers/applications).
   - **OAuth2** tab: add redirect URI `https://<this-project's-vercel-domain>/api/auth/callback`
     (the codex's own deployment URL — not `quintessence-eu.com`, since that's
     not where these functions actually run), note the client ID/secret.
   - **Bot** tab: create a bot, note its token, and invite it to the guild
     with just the "View Channels" permission (no privileged gateway intents
     needed — this only calls the REST API for a single member's roles).
2. In Discord, with Developer Mode on: copy the guild's ID, and the IDs of
   every role that should map to each tier (Guild Member/Main Roster →
   author; Advisors/Monarchs → moderator) — see `DISCORD_AUTHOR_ROLE_IDS`
   / `DISCORD_MODERATOR_ROLE_IDS` in `.env.example`.
3. Create a GitHub token (a fine-grained PAT scoped to just this repo, with
   "Contents: Read and write") so publish/update can commit files.
4. Copy [`.env.example`](.env.example) to `.env` for local dev with
   `vercel dev`, and set the same variables — including `PUBLIC_SITE_URL` and
   `VITE_API_ORIGIN` (see "Why the cross-origin cookie/CORS plumbing exists"
   above) — as Environment Variables in the Vercel project dashboard for
   deployed builds. **Never commit `.env`.**

## Search & filtering

The navbar has an Aion 2 game-switcher dropdown (a placeholder today, ready to
list more games later), and the homepage keeps a single search bar — no
separate section/tag chip filters. The search bar matches partial words
across title, subtitle, tags, game, section, description and full body text,
so `quinte` finds anything mentioning "Quintessence" anywhere in a post, and
searching a tag (e.g. `positioning`) surfaces posts carrying that tag without
a dedicated tag picker.

## Branding

`assets/` holds the real guild brand files, served from the site root, named
`<category>-<description>.<ext>`:

- `logo-quintessence-v1.png` — the flame mark, used in
  [`src/components/Logo.tsx`](src/components/Logo.tsx) (navbar) and as the
  homepage hero centerpiece in [`src/components/Hero.tsx`](src/components/Hero.tsx).
- `icon-favicon.svg` — a small original placeholder flame mark used only for
  the browser tab icon (`index.html`); swap it for a real favicon export
  whenever one exists.
- `gradient-1.png` — extra reference art dropped in `assets/`, not wired into
  any component yet; available for further theming (section dividers, an
  about page, etc.).
- `bg-sample-1.webp`, `bg-sample-2.jpg`, `bg-sample-3.jpg` — real Aion 2
  screenshots/key art, used as the `cover` image for the three placeholder
  posts in `contents/`.
