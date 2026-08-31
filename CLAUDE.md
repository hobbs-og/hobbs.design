# hobbs.design — the site

Source for https://hobbs.design. Static HTML, CSS, and a little JavaScript. No
framework, no CMS, no build step on the server.

**The point of this repo:** it has to prove Mark's systems thinking well enough
to land a senior IC Design Engineer / Design Systems role. Content, structure,
code quality and the repo's own hygiene are all part of the pitch — not just
the rendered pages. Sloppiness here is visible to the audience.

---

## This repo consumes the design system; it does not house it

Tokens, base styles, atoms, the product-agnostic molecules and the grid live in
**[@hobbs-og/design-system](https://github.com/hobbs-og/hobbs-design-system)**.
That repo's `CLAUDE.md` is the full reference — principles, the token surface,
rules of use. **Read it before styling anything here.**

```
@hobbs-og/design-system                       this repo
  tokens/base/  tokens/semantic/                tokens/component/  nav · sheet
  styles/  atoms · molecules · grid                                case-hero · project-row
                                                src/styles/        organisms · xray
                                                *.html             the pages
```

Every page links two stylesheets, in this order:

```html
<link rel="stylesheet" href="vendor/design-system/styles/index.css">
<link rel="stylesheet" href="src/styles/main.css">
```

### `vendor/` is committed, and that is deliberate

cPanel Git Version Control copies files into `public_html` and **runs nothing**
— no npm, no build. So anything the browser needs must already be a file in
this repo. `tools/vendor.mjs` (also a `postinstall` hook) copies the installed
package into `vendor/design-system/`.

- Never edit `vendor/` directly — the next vendor run reverts it silently.
- Never gitignore `vendor/` — the deployed site loses its stylesheet.
- To change a system value: change it upstream, tag a release, bump the ref in
  `package.json`, then `npm install && npm run vendor` and commit the result.

---

## What this repo owns

| Path | What |
|---|---|
| `tokens/component/` | nav, sheet, case-hero, project-row — alias the system's semantic layer |
| `dist/tokens.local.css` | those compiled; loaded by `main.css` before anything else |
| `src/styles/organisms/` | nav, sheet, footer, index-hero, how-i-work, case-hero, case-study, work-index, contact |
| `src/styles/molecules/` | project-row (the one bespoke molecule) |
| `src/styles/utilities/` | xray overlay |
| `src/js/` | nav, sheet, project-row, xray |
| `src/public/icons.svg` | generated sprite — do not hand-edit |
| `tools/vendor.mjs` | copies the system out of node_modules |
| `.cpanel.yml` | deploy manifest — copies only servable paths |

`style-dictionary.config.mjs` sources the system's base + semantic JSON out of
`node_modules` purely so aliases resolve, then filters them out of the output.
The "filtered out token references" warning is that filter working.

```bash
npm install            # installs the system and vendors it
npm run build:tokens   # -> dist/tokens.local.css
npm run build:icons    # sprite of only the icons this site references
npm run serve          # localhost:8123
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
