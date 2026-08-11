# Plan: bring the Codex in-house

Status: **proposal, not yet built.** Written for Flack and kozu0 to argue with before
any code is written.

## What this changes

The Codex (guides) currently lives in a separate repo, deploys to Vercel, and is
stitched onto `quintessence-eu.com/guides/` by a Cloudflare Worker. That was the right
call when it was a read-only static site with no login.

Adding Discord login and web publishing changes the maths: the feature needs secrets, an
API, image uploads and a session — and splitting those across two hosts creates a
cross-origin cookie problem, a 4.5 MB upload cap, and an argument about who holds the
guild's credentials. All three disappear if it runs here.

**So: the Codex moves into this repo and is served by our own nginx. Vercel and the
Cloudflare Worker go away.**

It stays a React/Vite app. It is **not** being ported to Angular — that would throw away
~2,000 lines of working code and stop kozu0 (who writes React) from contributing to the
thing he built. Two frameworks under one domain is a normal arrangement; the seam is a
styling problem, not an architecture problem.

## Architecture after

```
quintessence-eu.com  ──► Cloudflare Tunnel ──► nginx ─┬─ /          Angular app
                                                       ├─ /guides/   Codex (React build)
                                                       └─ /api/      .NET API
```

One domain, one origin, one session cookie, one `docker compose up -d --build`.
No Worker, no Vercel, no third-party secrets, no `VITE_API_ORIGIN`.

Because it is all one origin, the login you already have works in the Codex unchanged.

## The decision that shapes everything: where guides live

Today the Codex reads guides at **build time** — `import.meta.glob("/contents/*/index.md")`
bakes every markdown file into the JS bundle. That works beautifully on Vercel, where a
commit triggers a rebuild automatically.

It does not work here. This stack has no CI/CD (`docker compose up -d --build`, by hand).
A guide published through the web form would commit a file and then sit there invisible
until someone SSHes in and rebuilds. That makes the publish button pointless.

**So guides become runtime content, stored the way games/roster/timeline already are.**

| | Today (build time) | Proposed (runtime) |
|---|---|---|
| Stored in | the JS bundle | `App_Data/guides/` + `uploads/guides/` on the server |
| Published by | commit + rebuild | web form → live immediately |
| Read by | `import.meta.glob` | `GET /api/codex/guides` |
| Backed up by | git | the volume backup you already do for `qt-appdata` |

This matches the existing pattern exactly: games, the timeline and the roster are all
JSON in `App_Data/` with images in `uploads/`, edited inline by admins, no rebuild.
Guides become the fourth thing that works that way.

Markdown files in `contents/` stay in the repo as **seed data** — loaded on first run if
the store is empty, exactly like `Seed.cs` does for games. So kozu0 can still author a
big guide as a file, and the three-line correction still happens in the web form.

**Cost, stated plainly:** this is a real refactor of `src/lib/content.ts`, plus the search
index and the two pages that consume it. It is the biggest single item in this plan and
it lands on kozu0's side of the fence.

**The alternative**, if that cost is judged too high: keep build-time content and add a
small watcher that rebuilds the container when the repo changes. That preserves the
markdown-in-git workflow, but reintroduces the deploy machinery we are removing, and
publishing goes back to being a ~2 minute round trip.

## Access control

**One Discord role, in the Quintessence server.**

- **Codex Author** — create and edit your own guides
- **Codex Moderator** — plus edit and remove anyone's

Contributors from other guilds join the Discord as guests and get the role. That is a
five-second action and it means no separate account system, no invite codes, and
revoking access is removing a role.

No bot token is needed. Discord's `guilds.members.read` OAuth scope lets the user's own
login token report their roles in our guild — one line in `Program.cs:82`:

```csharp
options.Scope.Add("guilds.members.read");
```

Roles are resolved **once at login** and stored as claims in the existing auth cookie, so
there is no per-request call to Discord. Consequence: a role change takes effect on the
person's next login, not instantly. That is fine for this.

### Secrets this needs

| | Where |
|---|---|
| Discord client ID + secret | already in `appsettings.Production.json` |
| Guild ID, the two role IDs | same file — IDs, not really secret |
| GitHub token | **not needed** — guides no longer go to a repo |

Nothing leaves the server. Nothing is shared with anyone.

## Login, and making it mean something

Right now `/login` is hidden and admins "just know" the URL, with no button anywhere.
That gets replaced by one login control in the navbar, with capabilities following from
what you hold:

| You are | You get |
|---|---|
| logged out | the public site |
| admin (`Discord:AdminUserIds`) | inline games / roster / timeline editing |
| Codex Author | "Write a guide" in the Codex, and edit your own |
| Codex Moderator | edit and remove any guide |

One button, one session, one avatar — capabilities differ, the login does not.

## API surface (.NET)

| Endpoint | Purpose |
|---|---|
| `GET /api/codex/session` | who you are; `canWrite` / `canModerate` |
| `GET /api/codex/guides` | index for the homepage + search |
| `GET /api/codex/guides/{slug}` | one guide (markdown body + frontmatter) |
| `POST /api/codex/guides` | create or update; accepts images |
| `DELETE /api/codex/guides/{slug}` | own guide, or any if moderator |
| `GET /api/codex/guides/images/{file}` | serve uploaded guide images |

Images follow the existing game-image approach (`uploads/guides/`, served by the API).
No 4.5 MB cap — that was a Vercel function limit and Vercel is gone. Limits become ours
to choose; suggest ~10 MB per image and no fixed count, with WebP conversion on upload
since the Templar guide alone is 9.2 MB of PNGs.

## Serving it

The frontend Dockerfile gains a second build stage:

1. `node` stage builds the Angular app (as today)
2. `node` stage runs `npm run build` in `codex/` → `dist/guides/`
3. `nginx` stage copies both into `/usr/share/nginx/html`

`vite.config.ts` already has `base: "/guides/"` and `outDir: "dist/guides"`, so the built
folder structure drops straight in. nginx needs one block:

```nginx
location /guides/ {
    try_files $uri $uri/ /guides/index.html;
}
```

## Work breakdown

| # | Item | Owner | Size |
|---|---|---|---|
| 1 | Codex source into this repo under `codex/` | Flack + kozu0 | small |
| 2 | Dockerfile build stage + nginx location | me | small |
| 3 | `guilds.members.read` + role claims at login | me | small |
| 4 | Codex API endpoints + guide store + image upload | me | **large** |
| 5 | `content.ts` from build-time glob to API fetch | kozu0 | **large** |
| 6 | Point the publish form at `/api/codex/*` | kozu0 | small |
| 7 | Unify navbar/styling so the seam disappears | either | medium |
| 8 | Retire Vercel project + Cloudflare Worker | Flack | small |

Items 1–3 and 8 can happen immediately and are useful on their own — they collapse the
hosting down to one box with no behaviour change. Items 4–6 are the actual feature. Item
7 is what makes it feel like one website rather than two.

## Deliberately not doing yet

- Draft/approval workflow. The `draft` flag already exists in the frontmatter and the
  site filters it out, so this is cheap to add later if it turns out to be needed.
- Per-game author roles. One role until there is a reason for more.
- Guide edit history. The store is a file on disk; if history matters, that is a reason
  to revisit git-backed storage.

## Open questions for kozu0

1. Is the runtime-content refactor (item 5) acceptable, or do you prefer keeping
   build-time content and living with rebuild-to-publish?
2. Does the publish form handle a 292-line guide with 24 images if the caps are lifted,
   or does authoring at that size stay a file-based job?
3. Anything in the API surface above that does not fit how the UI wants to call it?
