# Setting up `/guides` (the Codex)

The Codex is the guild's guide/blog site. It lives in a **separate repo owned by
someone else** — [`kozu0/quintessence-codex`](https://github.com/kozu0/quintessence-codex) —
and is deliberately kept that way so he can keep working on it independently. It is
*not* part of this repo, this solution, or the Docker stack.

It appears to visitors at **`https://quintessence-eu.com/guides/`**, as if it were part
of this site. The "Guides" item in the navbar links to it.

> **Nothing in this document needs to be done on the home server.** No Docker changes,
> no nginx changes, no container. It is all Cloudflare + Vercel dashboard work. The only
> server-side change is the navbar link, which is already in this repo and ships with
> the next `docker compose up -d --build`.

## How it fits together

```
                                  ┌─ /guides/*  ─────► Cloudflare Worker ──► Vercel
                                  │                     (quintessence-codex)
browser ──► Cloudflare (DNS/TLS) ─┤
                                  │
                                  └─ everything else ─► Cloudflare Tunnel ──► home server
                                                                              nginx ──► /api ──► .NET API
```

The Worker matches `/guides*` **at Cloudflare's edge**, before the request enters the
tunnel. So those requests never touch the home server at all — the Codex stays up even
when the server is down, and vice versa.

> ### Do **not** add a tunnel route for this
>
> The tunnel's published application routes stay exactly as they are: one entry,
> `quintessence-eu.com` → `http://frontend:80`.
>
> Tunnel routes do have a path field, so adding a `/guides` one looks like the obvious
> move — but a tunnel route's **service URL has to be reachable from `cloudflared` on the
> home server** (`http://frontend:80`, `http://api:8080`, …). The Codex runs on Vercel,
> so there is no such URL to give it. That is precisely why this needs a Worker instead.
>
> A Worker route wins before origin resolution happens, so the two never conflict: the
> Worker answers `/guides*` itself, and everything else falls through to the tunnel
> untouched.
>
> You would only add a tunnel route if the Codex later moved onto the box as its own
> container — then it becomes an ordinary service like `http://codex:80`.

The two sites share only a URL prefix. There is no shared code, no shared build, no
shared deploy.

## Why the Codex repo needed changes

A Vite app assumes it owns the domain root. Served at `/guides/` instead, three things
had to change in `kozu0/quintessence-codex` (already done — see the commits/diff there):

| Change | File | Why |
|---|---|---|
| `base: "/guides/"` | `vite.config.ts` | Script/CSS/favicon URLs in `index.html` get the prefix |
| `build.outDir: "dist/guides"` | `vite.config.ts` | Files physically land under `guides/`, so the deployed layout matches those URLs exactly — no rewrite trickery |
| `basename={import.meta.env.BASE_URL}` | `src/main.tsx` | React Router strips `/guides` before matching routes |
| `publicAsset()` helper | `src/lib/assets.ts` | Hardcoded strings like `src="/logo.png"` are invisible to Vite's rewriting; without this the logo/covers 404 against the main site |
| `/guides/…` rewrite + redirects | `vercel.json` | Deep links (`/guides/guide/some-post`) fall back to the SPA's `index.html` |
| `PUBLISHING_ENABLED = false` | `src/lib/config.ts` | See below |

### The dropped `/publish` feature

The Codex shipped with Discord-gated in-browser publishing (`/publish` + the `api/`
serverless functions). The guild decided guides get added by committing markdown to
`contents/` directly, so it is **switched off** via `PUBLISHING_ENABLED`.

That flag is off rather than the code deleted, because the feature would otherwise be
actively broken rather than merely idle: it calls root-absolute `/api/auth/…`, which is
**not** under `/guides/`, so those requests bypass the Worker, go down the tunnel, and
land on this site's .NET API. `src/lib/config.ts` documents what to do to revive it.

## Setup

### 1. Vercel (hosts the Codex build)

Vercel is a hosting service: connect a GitHub repo, and on every push it runs the build
and serves the result. The free "Hobby" tier is plenty for this. It does **not** run on
the home server.

Decide who owns the project first:

- **Preferred — kozu0 creates it** under his own Vercel account. It's his repo; he gets
  the deploy logs and previews, and you never need repo access.
- Otherwise he adds you as a collaborator on the GitHub repo and you import it.

Then, at [vercel.com/new](https://vercel.com/new):

1. Import `kozu0/quintessence-codex`.
2. Framework preset: **Vite** (auto-detected).
3. Leave the build settings at their defaults:
   - Build command: `npm run build`
   - **Output directory: `dist`** — ⚠️ *not* `dist/guides`. The app builds into
     `dist/guides/`, and Vercel serves the output directory's contents at the domain
     root, which is exactly what produces the `/guides/*` URLs. Pointing it at
     `dist/guides` would serve the site at the root and break every asset path.
4. No environment variables are needed (publishing is off).
5. Deploy, then note the URL — something like `quintessence-codex.vercel.app`.
6. Sanity-check it standalone: `https://<that-url>/guides/` should load the Codex, and
   `https://<that-url>/` should redirect there.

From now on, **every push to `main` in his repo redeploys automatically**, usually well
under a minute. Nothing to do on your end, ever.

### 2. Cloudflare Worker (routes `/guides` to Vercel)

In the Cloudflare dashboard, on the account that owns `quintessence-eu.com`:

1. **Compute (Workers) → Create → Start from Hello World → Deploy.** Name it something
   like `quintessence-guides-proxy`.
2. **Edit code**, replace the contents with the following, and deploy:

```js
// Forwards quintessence-eu.com/guides/* to the Codex's Vercel deployment.
// Path, method, headers and body pass through untouched — the Codex is built with
// base "/guides/", so the prefix is meaningful to it and must NOT be stripped.
const CODEX_ORIGIN = "quintessence-codex.vercel.app"; // <- your Vercel URL, no https://

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = CODEX_ORIGIN;
    url.port = "";

    // redirect: "manual" so Vercel's /guides -> /guides/ redirect reaches the
    // browser as a redirect, rather than being silently followed against the
    // vercel.app host (which would leak that hostname into the address bar).
    return fetch(new Request(url, request), { redirect: "manual" });
  },
};
```

3. Set `CODEX_ORIGIN` to the Vercel URL from step 1.
4. **Settings → Domains & Routes → Add → Route**, and add both:
   - `quintessence-eu.com/guides*`
   - `www.quintessence-eu.com/guides*`

   Zone: `quintessence-eu.com`. The `*` matters — without it only the exact path
   matches and every asset 404s.

Free-plan Workers include 100,000 requests/day, far beyond what this needs.

### 3. Ship the navbar link

The "Guides" entry is already in `navbar.component.html` in this repo. It goes live with
the usual hand-rolled deploy on the server:

```bash
docker compose up -d --build frontend
```

It is a plain `<a href="/guides/">`, not a `routerLink`, on purpose — it has to be a real
page load so the request leaves the SPA and reaches Cloudflare. If it were a `routerLink`,
Angular would try to match `/guides` as an internal route, miss, and bounce to the home
page via the `**` catch-all.

## Verifying

Once all three are done:

| URL | Expected |
|---|---|
| `quintessence-eu.com/guides/` | Codex homepage, logo and post covers visible |
| `quintessence-eu.com/guides` | redirects to `/guides/` |
| `quintessence-eu.com/guides/guide/<slug>` | that guide, on a hard refresh (not just via in-app click) |
| `quintessence-eu.com/` | main Angular site, unaffected |
| `quintessence-eu.com/api/games` | still the .NET API, unaffected |
| Navbar "Guides" | goes to the Codex; the Codex is a separate app with its own navbar |

The deep-link hard-refresh case is the one that catches misconfiguration — it exercises
the Worker, the Vercel SPA rewrite and the router basename all at once.

## If something breaks

| Symptom | Cause |
|---|---|
| `/guides/` shows the **Angular home page** | The Worker route isn't matching. Check the route pattern has a trailing `*` and the zone is right. Requests are falling through to the tunnel, where Angular's `**` catch-all redirects to home. |
| Blank page, 404s on `/guides/assets/*.js` in devtools | Vercel's output directory is set to `dist/guides` instead of `dist`. |
| Page loads but **logo/cover images are missing** | Something in the Codex uses a bare `"/foo.png"` string instead of `publicAsset("/foo.png")`. |
| `/guides/` works, deep links 404 on refresh | The `rewrites` entry in `vercel.json` is missing or its `source` doesn't match. |
| The address bar jumps to `*.vercel.app` | The Worker is following redirects instead of passing them through — check `redirect: "manual"`. |

## Moving it later

Nothing here is locked in. The Codex is a pile of static files, so switching hosts means
building it (`npm run build`, output in `dist/guides/`) and serving that from anywhere —
including this repo's nginx container, if you ever want it fully self-hosted. Only the
Worker's `CODEX_ORIGIN` would change; the Codex repo itself needs no edits, because
`/guides/` is baked into the build rather than into the hosting.
