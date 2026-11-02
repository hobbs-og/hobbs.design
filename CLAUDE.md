# hobbs.design — the site

Source for https://hobbs.design. Static HTML, CSS, and a little JavaScript. No
framework, no CMS, no build step on the server.

**The point of this repo:** it has to prove Mark's systems thinking well enough
to land a senior IC Design Engineer / Design Systems role. Content, structure,
code quality and the repo's own hygiene are all part of the pitch — not just
the rendered pages. Sloppiness here is visible to the audience.

---

## This repo is one brand of @hobbs-og/software

Tokens come from **[@hobbs-og/software](https://github.com/hobbs-og/software)**.
Read its `README.md` and `CLAUDE.md` before styling anything here. Never
invent a value and never edit a generated file. Swiss is a brand mode in
software-subatomic, so Figma controls its values (see the house rules).

- `data-brand="swiss"` on `<html>` selects the current design. Pages not yet
  converted use `data-brand="portfolio"`: the old production palette and type
  sizes on Inter. The theme follows the visitor's OS unless they pick one.
- This site's component tokens come from the Figma file **portfolio-components**
  (`7QdDKyvaM2Mznv89jMwsbF`). Layer names there are the DOM's `tag.class`, and
  token names follow software's
  `{component}/color/{variant}/{background|content|border}/{state}` pattern.
- The old **@hobbs-og/design-system** still supplies the reset, element
  defaults, atoms, molecules and grid, loaded by `src/styles/system.css`
  without its tokens. `src/styles/legacy-tokens.css` maps every old token name
  the CSS still uses to a software or component token. It's a bridge: delete a
  line once nothing references it.

```
@hobbs-og/software           -> vendor/software/      tokens.css, fonts.css, Inter
portfolio-components (Figma) -> tokens/component-software/ -> dist/tokens.components.css
@hobbs-og/design-system      -> vendor/design-system/ structure only (system.css)
this repo                       src/styles/  legacy-tokens, organisms, xray
                                *.html       the pages
```

Every page loads, in this order:

```html
<link rel="preload" href="vendor/software/fonts/inter-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="vendor/software/fonts.css">
<link rel="stylesheet" href="vendor/software/tokens.css">
<link rel="stylesheet" href="src/styles/system.css">
<link rel="stylesheet" href="src/styles/main.css">
```

`main.css` imports `dist/tokens.components.css`, then `legacy-tokens.css`,
then the site's own stylesheets.

### `vendor/` is committed, and that is deliberate

cPanel Git Version Control copies files into `public_html` and **runs nothing**
— no npm, no build. So anything the browser needs must already be a file in
this repo.

- `tools/vendor-software.mjs` copies software's web build into
  `vendor/software/`. Point it at a checkout with `SOFTWARE_DIR`, or install a
  tagged release.
- `tools/vendor.mjs` (also a `postinstall` hook) copies the old system into
  `vendor/design-system/`.
- Never edit `vendor/` directly — the next vendor run reverts it silently.
- Never gitignore `vendor/` — the deployed site loses its stylesheet.
- To change a system value: change it in Figma, export it to software and
  build, then `npm run vendor:software` here and commit the result.

---

## What this repo owns

| Path | What |
|---|---|
| `tokens/component-software/` | this site's Tier 3 tokens from portfolio-components; alias software tokens |
| `dist/tokens.components.css` | those compiled by `tools/component-tokens.mjs` |
| `src/styles/components.css` | the components: component tokens, layout and motion for every theme |
| `src/styles/themes/swiss.tokens.css` | what Figma can't carry for swiss: em letter spacing and breakpoint type steps |
| `src/styles/legacy-tokens.css` | old token names pointed at new ones (the bridge) |
| `src/styles/system.css` | the old system's structure, without its tokens |
| `src/styles/organisms/` | nav, sheet, footer, index-hero, how-i-work, case-hero, case-study, work-index, contact |
| `src/styles/molecules/` | project-row (the one bespoke molecule) |
| `src/styles/utilities/` | xray overlay |
| `src/js/` | nav, sheet, sheet-reload, feature-row, xray |
| `src/public/icons.svg` | generated sprite — do not hand-edit |
| `src/icons/` | this site's own icons (the swiss arrows), appended to the sprite by `tools/custom-icons.mjs` |
| `tools/` | vendor scripts, component-token build, local server |
| `.cpanel.yml` | deploy manifest — copies only servable paths |

`tokens/component/`, `style-dictionary.config.mjs` and `dist/tokens.local.css`
belong to the old token layer. Nothing loads them any more.

```bash
npm install                                        # installs the old system and vendors it
SOFTWARE_DIR=../software npm run vendor:software   # software's web build -> vendor/software/
npm run build:component-tokens                     # -> dist/tokens.components.css
npm run build:icons                                # sprite of only the icons this site references
npm run serve                                      # localhost:8123
```

---

## Pages are built from partials (swiss)

Swiss pages are not hand-written at the root. Each one has a source in
`pages/`, and `tools/build-pages.mjs` writes the finished file to the root,
where cPanel copies it from. The built HTML is committed because the server
runs no build. Every built file opens with a comment naming its source.

**Edit `pages/`, never a root `.html` that has the build comment.** Then run
`npm run build:pages` and commit the source and the output together.
`npm run check:pages` fails if any built page is out of date.

```html
<!-- @include site-nav.html -->
<!-- @include projects/terafina-row.html class="span-6" -->
```

The path is relative to `pages/partials/`. Attributes become variables:
`{{class}}` is required and the build stops without it, `{{class?}}` can be
left out.

| Partial | Used for |
|---|---|
| `head.html` | doctype to `<body>`. Takes `title` and `description` |
| `site-nav.html`, `nav-links.html`, `switches.html` | skip link, header and the phone menu. The menu sits inside the header so it opens from the header's bottom edge. Links and switches are shared by both |
| `site-footer.html` | footer and the x-ray legend |
| `next-project.html` | the closing row on a case study. Takes `project` (a slug) |
| `projects/<slug>-row.html` | a project's row. Takes `class` (span, `feature-row--lead`) and `media?` |
| `projects/<slug>-specs.html` | its Focus / Scope / Context list. Takes `class?` |
| `projects/<slug>-media.html` | its image or device combo. The index row and the case-study hero both use it, so they always match. Takes `class?` |

A project's specs are written once, then used in its index row, its case-study
hero and wherever it's the next project. Slugs are the page file names:
bullhorn, terafina, software, fabrication, proof, rumi, frictionless.

**The case-study template is `pages/bullhorn.html`.** To convert a page, copy
it and keep the blocks in this order:

1. `.page-hero` with its band, title, lead, body and specs include
2. `.case-flow`: one `section.content-section.content-section--card` per chapter,
   each with `__media`, `__head` (h2 + `__support`) and `__body`. A slot with
   no content stays as an empty element; the grid relies on it. Every h2 is
   `<h2 id="…"><span class="content-section__title-text">…</span>` followed by the
   `content-section__title-icon` svg (`#swiss-arrow-down-left`). The span keeps
   the text on columns 1–6 while the arrow sits at the grid's end
3. `__body` holds `__part` (h3 + paragraphs), `figure.stack--tight` with an
   `.media-frame` and a `.text-caption`, or `__notes` of `__note`
4. `<!-- @include next-project.html project="…" -->`

**Type steps with the screen.** Every heading has a phone, tablet and
desktop size from system roles (mostly `headline-lg`'s 32 / 40 / 56 steps).
Desktop sizes are the design's; smaller screens step down below 60em and
35em. A new heading style needs the same steps, not one fixed size.

**No one-word last lines, in CSS only.** Headings and short display text
use `text-wrap: balance`; paragraphs and captions start on `pretty`, and
take `balance` where it looks better. The presentation decides, not the
line count (Mark, 2026-10-31). Where a browser ignores them, the line
wraps however it wraps. Never put `&nbsp;`,
`<br>` or other characters in copy to steer a line break: they change what
a screen reader and a translator get, to fix something visual (Mark,
2026-10-28).

**Soft hyphens.** Chrome won't auto-hyphenate a capitalized or uppercase
word. The hero name is uppercase and fills the row, so long names carry
`&shy;` at their break points in the source (`Bull&shy;horn`). Section
h2s don't need them: at 32px on a phone, the longest word fits a 320px
screen. The hero title uses soft hyphens below 60em. From 60em a multi-word name breaks between words,
because Chrome otherwise splits a word that would fit on the next line. A
single-word name too long for the row at 136px adds
`page-hero__title--hyphenate` to keep its hyphens there (Groundwork does).

The index h1 (`.index-hero__title`) and its h2s (`.feature-list__lead`,
`.contact-section__title`) belong to the index only. Don't reuse them on
other pages.

**Stylesheets.** Swiss pages load software's `fonts.css`, `tokens.css` and
`grid.css`, then `src/styles/base.css`, software's components from
`vendor/software/components/`, `src/styles/components.css` and last the theme,
`src/styles/themes/swiss.tokens.css`. They don't load `system.css`
or `main.css`. The old stack leaks its paddings, borders and type into the
components. Pages not yet converted still use the old stack.

**Themes.** `components.css` belongs to no theme, so no selector in it may name
a brand. Changing `data-brand` on `<html>` restyles every component. A new
theme is a mode in software-subatomic plus, if it needs one, a
`themes/<name>.tokens.css` that loads last and can override any token. Below
60em, type roles read their `-mobile` tokens, so every theme steps down with
the screen. Pick a theme's fonts before you ship it: software self-hosts only
Inter.

---

## House rules for this repo

- **No inline styles, anywhere, ever.** If a rule is needed it gets a class.
  `src/styles/organisms/case-study.css` exists because of this rule
  (`.content-section`, `.content-section__support`).
- **Type comes from software's typography tokens**, unless Mark says
  otherwise: a role (`--typography-headline-lg-*`) where one fits, else a core
  step (`--typography-font-size-48`). Never a raw `rem` or `px`. The one
  exception is the page-hero title's fill-width formula, which Mark chose.
- **Images declare no width** (Mark, 2026-10-27). The column sizes them:
  they stretch to their grid or flex column, capped by `max-inline-size:
  100%` in `base.css`. The only image widths are the device-combo
  `--layer-width` percentages, which are the composition itself.
- **Swiss values live in Figma** (Mark, 2026-11-01, reversing his 2026-10-30
  rule). Swiss is a mode on Tier 1 and semantic typography in software-subatomic,
  so a new theme is a new mode. Change colors and core type there, export to
  software, then vendor them here. `src/styles/themes/swiss.tokens.css` holds
  only what Figma can't carry: em letter spacing and the 35em and 60em type
  steps. Type roles only this site uses are defaults in `components.css`.
  Anything that overrides software goes in one of those files, never in
  `vendor/`. Values are still Mark's call: if the one you need isn't there,
  ask.
- **360px is the narrowest supported width** (Mark, 2026-10-29). Test
  layouts, reflow and horizontal scroll at 360, not 320. Nothing has to fit
  a narrower screen.
- **Components are classes on semantic HTML** (`article.feature-row`), not
  custom elements. Decided explicitly.
- **The `.navbar` header is locked in** — byte-identical on every page:
  structure, `data-xray` hooks, logo markup, the X-ray toggle, and the links
  themselves. A global nav does not change per page; only `aria-current` varies.
  Canonical links: About → `about.html`, Work → `index.html#work`, Contact →
  `index.html#contact`, Resume → the PDF. On swiss pages, `nav-links.html` is the
  only copy. Do not "improve" one page's nav in isolation.
- **The footer is one component**, byte-identical on all pages.
- Links that leave the site carry the external-link icon and open in a new tab
  with `rel="noopener"`.
- Run new user-facing prose through the `humanize-writing` skill.

---

## Deploy

cPanel pulls from GitHub and runs `.cpanel.yml`, which **only copies — it never
deletes.** A file removed from this repo stays in `public_html` until it is
deleted there by hand. Adding a new top-level servable path means adding a line
to `.cpanel.yml`, or it silently never ships.

There is no PHP and nothing server-side. The contact form is gone — this host
blocks outbound SMTP for PHP and the domain's mail is behind Proofpoint with
DMARC `p=reject`, so the form told visitors it had delivered when it hadn't.
Contact is a `mailto:` now. Do not reintroduce a server-side form here.

The `package-lock.json` pins the design system over `git+ssh://`, which needs
Mark's SSH key. Fine locally; a CI runner would need the `https://` form or a
deploy key. There is no CI today.

---

## Open decisions — ask, don't assume

- **Deploy strategy** is unsettled (cPanel vs. an SFTP Action vs. Netlify /
  Cloudflare). Don't automate the deploy without Mark's call.
- **Legacy pages** still at the root and not linked from the current site:
  about/info, editorial, web, iusa, lesson.
- Five of the six case studies still carry the section rhythm as
  `style="margin-block-start: …"` attributes. The classes to remove them exist;
  that sweep hasn't been done.
