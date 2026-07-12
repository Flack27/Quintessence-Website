# Quintessence Website — Design Pass Brief

Brief for a **HTML/CSS-only** restyling pass over the Angular frontend. All functional work
(backend, data wiring, autosave, loading states, new views) is already done — this pass is purely
about visual coherence. **Do not change component logic, event bindings, `*ngIf`/`*ngFor`
structure, element ids, or `[(ngModel)]` wiring.**

## Stack & file layout

- Angular 17, frontend root: `Website\QT_FrontEnd\QT_FrontEnd\`
- Global styles + design tokens: `src\styles.css` (CSS variables: `--primary-dark/medium/light`,
  `--secondary-blue/pink/teal`, spacing, radii, shadows). Keep the dark-purple theme and these tokens;
  extend them rather than hardcoding new colors.
- Per-page styles: `src\app\pages\**\*.component.css` (plain CSS, component-scoped).
- Fonts: Poppins. Icons: Font Awesome (`fas`/`fab`).
- Build check: `npx ng build` in the frontend root.

## Page inventory

Public:
| Route | Files |
|---|---|
| `/` `/home` | `pages/home/` |
| `/games` | `pages/games/` (cards + archived-games modal) |
| `/games/:gameId` | `pages/game-page/` (tabs: Roster / Graphs / Attendance / My Info / Events) |
| `/roster` | `pages/roster/` |
| `/profile` | `pages/profile/` (identity card, social links, DKP, **new Game Stats section**) |
| `/apply`, `/apply/thank-you` | `pages/apply/` |

Admin (`/menu/...`): `pages/menu/` — landing `menu/`, `gamesadmin/` (Game Management),
`automation/`, `messages/`, `voice/`, `xpconfig/`, `reactionconfig/`, `forms/` (+ `form/`),
`submissions/` (+ `submission/`). (The old `events/` pages were removed — don't reference them.)

Shared: `components/navbar/`.

## Required fixes (the owner's list)

1. **Alternating row colors on every table** (zebra striping), site-wide: game page roster /
   attendance / events tables, admin gamesadmin rows, menu events/signups/forms/submissions tables,
   roster page. Suggest one shared table style in `styles.css` (e.g. `.data-table`) that all pages use.
2. **Unify table styling across the site.** Today there are several one-off table styles
   (`.data-table`, `.roster-table`, per-page tables in the menu section). Same header treatment,
   padding, hover state, zebra rows, sort-icon placement everywhere.
   ⚠️ Tables with sticky headers/columns must keep `border-collapse: separate` — `collapse` makes
   rows bleed through sticky headers.
3. **Game Management (`/menu/games`) tile images don't fit** — fix `.game-tile-image` /
   `.image-preview` sizing (object-fit, fixed aspect) so card (~3:4) and banner (1400×220) previews
   render cleanly. Same for the games-list tiles on the left panel.
4. **Apply page**: style the new single full-page loading state (`.form-loading`) — currently the
   generic spinner box; a skeleton of the form would be nicer.
5. **Admin menu section coherence**: make all `/menu/*` pages look like one product — same page
   header pattern (`h1` + `.title-line` + `.page-intro`), same panel/card style as `gamesadmin`'s
   `.editor-section`, same tables, same buttons.
6. **Button hierarchy unification**: `standard-button`, `small-button`, `save-button`,
   `icon-button`, `upload-button` are styled per page. Define one hierarchy (primary / secondary /
   small / icon / danger) and apply it everywhere.
7. **Input unification**: `.profile-input`, `.form-field input/select`, `.search-bar`, apply-page
   inputs all differ. One input style (and one select/checkbox style) site-wide.

## New sections that need styling polish (functional markup already in place)

- **Profile → Game Stats** (`pages/profile/`): `.game-stats-container`, `.stats-game-picker`
  (select in the section title), `.stats-grid`/`.stat-card`, `.stats-field-row` list, and the
  attendance chart canvas (`#profile-attendance-chart`, chart.js — colors are set in TS, leave the
  canvas markup alone).
- **Game page → My Info tab** (`pages/game-page/`): `.myinfo-header` (avatar + name + save state),
  reused `.stats-grid`/`.stat-card`, auto-saved form fields. The stat-card styles are currently
  duplicated between profile and game-page CSS — fine to consolidate visually, but keep class names.
- **Auto-save indicators**: `.saving-indicator` / `.success-indicator` (+ `.mini-spinner`,
  `.save-state`, `.save-state-col`, `.autosave-hint`) now appear on profile links, My Info tab,
  events table rows and gamesadmin settings. Keep these class names and `*ngIf`s intact; make them
  look consistent (small inline spinner + green check).

## Hard constraints

- Never remove or rename classes referenced by `[ngClass]`/`[class.xxx]` bindings or ids used by
  chart.js (`graph-{{fieldName}}`, `profile-attendance-chart`) and the attendance scroll-sync
  (`.top-scroll`, `.attendance-wrapper`, `.event-col` width is measured in TS — 28px, keep in sync
  with `eventColumnWidth`).
- Keep all `(click)`, `(input)`, `(blur)`, `(ngModelChange)`, `(scroll)`, `(mouseenter/leave)`
  handlers exactly as they are.
- The attendance event tooltip is position:fixed and rendered outside the table — keep that.
- Mobile: pages currently have ad-hoc breakpoints; unifying them is in scope.

## Nice-to-haves (if in scope)

- Avatar fallback (initials circle) where `member.avatar` is null.
- Consistent empty states (`.no-data`) with an icon instead of bare text.
- Navbar active-route styling consistency.
- Loading skeletons instead of spinners on table-heavy pages.
- Success/error message styles exist in 3+ variants (`.success-message`, `.error`, `.validation-errors`) — unify.
