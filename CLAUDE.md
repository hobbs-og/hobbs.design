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

## House rules for this repo

- **No inline styles, anywhere, ever.** If a rule is needed it gets a class.
  `src/styles/organisms/case-study.css` exists because of this rule
  (`.case-section`, `.case-section__support`).
- **Components are classes on semantic HTML** (`article.project-row`), not
  custom elements. Decided explicitly.
- **The `.site-nav` header is locked in** — byte-identical on every page:
  structure, `data-xray` hooks, logo markup, the X-ray toggle, and the links
  themselves. A global nav does not change per page; only `aria-current` varies.
  Canonical links: Work → `index.html#work`, Contact → `index.html#contact`,
  Resume → `resume.html`. Do not "improve" one page's nav in isolation.
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
- **`groundwork.html`** — whether it joins the homepage as case study 06, which
  would mean rewriting the "Five systems" heading and the "05 case studies"
  label; and whether it enters `sitemap.xml`.
- **Legacy pages** still at the root and not linked from the current site:
  about/info, editorial, web, iusa, lesson.
- Five of the six case studies still carry the section rhythm as
  `style="margin-block-start: …"` attributes. The classes to remove them exist;
  that sweep hasn't been done.
