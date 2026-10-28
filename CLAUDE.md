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
Read its `README.md` and `CLAUDE.md` before styling anything here. Figma
controls every value: never invent one, never edit a generated file.

- `data-brand="portfolio"` on `<html>` selects this site's brand: the
  production palette in light and dark (Tier 1 role tokens) and the production
  type sizes on Inter. The theme follows the visitor's OS.
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
| `src/styles/legacy-tokens.css` | old token names pointed at new ones (the bridge) |
| `src/styles/system.css` | the old system's structure, without its tokens |
| `src/styles/organisms/` | nav, sheet, footer, index-hero, how-i-work, case-hero, case-study, work-index, contact |
| `src/styles/molecules/` | project-row (the one bespoke molecule) |
| `src/styles/utilities/` | xray overlay |
| `src/js/` | nav, sheet, project-row, xray |
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
| `site-nav.html`, `nav-links.html` | skip link, header, switches, phone menu. One set of links for both navs |
| `site-footer.html` | footer and the x-ray legend |
| `next-project.html` | the closing row on a case study. Takes `project` (a slug) |
| `projects/<slug>-row.html` | a project's row. Takes `class` (span, `project-row--lead`) and `media?` |
| `projects/<slug>-specs.html` | its Focus / Scope / Context list. Takes `class?` |

A project's specs are written once, then used in its index row, its case-study
hero and wherever it's the next project. Slugs are the page file names:
bullhorn, terafina, software, fabrication, proof, rumi, frictionless.

**The case-study template is `pages/bullhorn.html`.** To convert a page, copy
it and keep the blocks in this order:

1. `.case-hero` with its band, title, lead, body and specs include
2. `.case-flow`: one `section.case-section.case-section--card` per chapter,
   each with `__media`, `__head` (h2 + `__support`) and `__body`. A slot with
   no content stays as an empty element; the grid relies on it
3. `__body` holds `__part` (h3 + paragraphs), `figure.stack--tight` with an
   `.img-frame.media-pair` and a `.text-caption`, or `__notes` of `__note`
4. `<!-- @include next-project.html project="…" -->`

**Soft hyphens.** Chrome won't auto-hyphenate a capitalized or uppercase
word, and the hero title and section h2s are both uppercase. So long words
carry `&shy;` at their break points in the source: the hero name
(`Bull&shy;horn`), and any h2 word that overflows a 320px screen
(`com&shy;po&shy;nents`). The h2s use them on phones only.

The index h1 (`.index-hero__title`) and its h2s (`.work-index__lead`,
`.contact-section__title`) belong to the index only. Don't reuse them on
other pages.

**Stylesheets.** Swiss pages load software's `fonts.css`, `tokens.css`, `grid.css`,
then `src/styles/base.css` and `src/styles/themes/swiss.css`. They don't load
`system.css` or `main.css`. The old stack leaks its paddings, borders and type
into swiss components. Pages not yet converted still use the old stack.

---

## House rules for this repo

- **No inline styles, anywhere, ever.** If a rule is needed it gets a class.
  `src/styles/organisms/case-study.css` exists because of this rule
  (`.case-section`, `.case-section__support`).
- **Components are classes on semantic HTML** (`article.project-row`), not
  custom elements. Decided explicitly.
- **The `.site-nav` header is locked in** — byte-identical on every page:
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
