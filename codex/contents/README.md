# Writing a guide

Every blog post — every guide in the Codex — is one folder in `contents/`.
The site scans this folder at build/dev time; there is nothing else to wire up.

```
contents/
  your-post-slug/
    index.md        <- required: frontmatter + markdown body
    cover.png        <- optional: card/banner image
    any-other.png    <- optional: images referenced from the body
```

The folder name becomes the URL slug (`contents/warrior-tanking/` → `/guide/warrior-tanking`).
Use lowercase, hyphen-separated names.

## The frontmatter rule

`index.md` must start with a `---` frontmatter block. This is the **one rule**
that gives every post its title, subtitle and intro description, and slots it
into a game and a section so the homepage can group and filter it correctly:

```markdown
---
title: "Templar Tanking Fundamentals"
subtitle: "Aggro, mitigation and cooldown planning for raid tanks"
description: "A ground-up breakdown of how Templar tanking works in Aion 2 raids: stat priorities, cooldown sequencing and positioning basics."
game: "Aion 2"
section: "Class Guides"
tags: [templar, tank, pve]
date: "2026-06-18"
author: "Quintessence Officers"
cover: "cover.png"
---

The rest of the file is plain markdown.
```

| Field         | Required | Purpose                                                                                  |
| ------------- | :------: | ----------------------------------------------------------------------------------------- |
| `title`       |    ✅    | Main heading, shown on the card and the post page.                                        |
| `description` |    ✅    | The one/two-sentence intro — shown on the card excerpt and as the post's lead-in callout. |
| `game`        |    ✅    | Which game the guide is for (e.g. `Aion 2`, `Minecraft`, `Valheim`); the primary homepage filter, since the guild covers more than one game. |
| `section`     |    ✅    | Groups the guide within that game (e.g. `Class Guides`, `Raid Guides`, `PvP`, `Getting Started`); powers the section filter chips. |
| `subtitle`    |    —     | Short supporting line shown under the title.                                              |
| `tags`        |    —     | List of keywords; searchable, shown as pills, and also powers the tag filter chips.       |
| `date`        |    —     | `YYYY-MM-DD`; used to sort posts newest-first.                                            |
| `author`      |    —     | Shown on the post page.                                                                    |
| `cover`       |    —     | Filename of an image next to `index.md` (e.g. `cover.png`), **or** an absolute path like `/some-shared-image.jpg` pointing at a file already in the top-level `assets/` folder — used as the card/banner image. |

Missing `title`, `description`, `game` or `section` doesn't break the build, but the dev server
logs a console warning so it's easy to catch before publishing.

## Writing the body

Standard markdown — everything below "just works":

- `#`/`##`/`###` headings (used for on-page structure; don't repeat the `title` as an `#` heading, it's already rendered above the body)
- Bullet and numbered lists
- Tables (`| col | col |`)
- `![alt text](image.png)` — reference images sitting in the same post folder by filename
- Bold/italic, blockquotes, links, code blocks

## Search & filtering

The homepage has three filter rows — **Game**, **Section**, and **Tag** — so a
player can jump straight to guides for the game they're playing, then narrow
down from there. Section options are scoped to the selected game, and tag
options are scoped to the selected game + section, so the chips shown always
reflect what's actually available. Picking a different game resets the
section/tag filters underneath it.

The search box on top of that matches against `title`, `subtitle`, `tags`,
`game`, `section`, `description` and the full body text — so searching
`quinte` surfaces anything mentioning "Quintessence" anywhere in the post, not
just the title.

## Try it

Copy `getting-started-sample/` as a starting template, rename the folder, and
edit the frontmatter + body. The three `*-sample` folders included are
Lorem Ipsum placeholders (real cover images, filler text) — replace their
content first.
