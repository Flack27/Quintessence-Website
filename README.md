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

Anyone with a required role in the guild's Discord can publish a new guide
through a form at `/publish`, without touching git directly. Since the site
itself stays a static build with no database, this is implemented as a
handful of Vercel serverless functions under [`api/`](api):

- `api/auth/login`, `api/auth/callback`, `api/auth/me`, `api/auth/logout` —
  Discord OAuth2 login. On callback, the server (never the browser) uses a
  bot token to look up the logged-in user's roles in the configured guild and
  stores an `authorized: true/false` flag in a signed, httpOnly session
  cookie.
- `api/publish` — only usable when `authorized` is true. Takes the form
  fields, builds `contents/<slug>/index.md` in the same frontmatter format
  `src/lib/frontmatter.ts` parses, and commits it straight to the repo via
  the GitHub Contents API. That commit triggers the normal Vercel rebuild —
  the guide goes live once that deploy finishes, same as if someone had
  committed the file by hand.

No content, sessions, or roles are stored in a database — the repo is still
the only source of truth for guides, and Discord is the only source of truth
for who's allowed to publish.

### Setup

1. Create a Discord application at
   [discord.com/developers/applications](https://discord.com/developers/applications).
   - **OAuth2** tab: add redirect URI `https://<your-domain>/api/auth/callback`,
     note the client ID/secret.
   - **Bot** tab: create a bot, note its token, and invite it to the guild
     with just the "View Channels" permission (no privileged gateway intents
     needed — this only calls the REST API for a single member's roles).
2. In Discord, with Developer Mode on: copy the guild's ID and the ID of the
   role that should be allowed to publish.
3. Create a GitHub token (a fine-grained PAT scoped to just this repo, with
   "Contents: Read and write") so the publish endpoint can commit files.
4. Copy [`.env.example`](.env.example) to `.env` for local dev with
   `vercel dev`, and set the same variables as Environment Variables in the
   Vercel project dashboard for deployed builds. **Never commit `.env`.**

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
