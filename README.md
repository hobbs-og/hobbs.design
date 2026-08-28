# hobbs.design

Source for [hobbs.design](https://hobbs.design), the portfolio of Mark Hobbs.
I'm a product designer who builds, and this repo is the proof. No framework,
no CMS. HTML, CSS, and enough JavaScript to ship the real thing.

## How it's built

Design decisions live in one place and flow one direction.

```
@hobbs-og/design-system                       this repo
  tokens/base/       raw values                 tokens/component/  nav · sheet
  tokens/semantic/   roles                                         case-hero · project-row
  styles/            atoms · molecules · grid   src/styles/        organisms · xray
                                                *.html             the pages
```

The tokens and the CSS primitives built on them are **not in this repo**.
They live in [hobbs-design-system](https://github.com/hobbs-og/hobbs-design-system),
because they are the baseline for anything I build, and copying them into
every new project is how a system rots into four systems. This repo consumes
them like any other product would.

What stays here is what only this site has: its organisms, its pages, and the
four component-token sets belonging to components the system doesn't carry.

[Style Dictionary](https://styledictionary.com) compiles both halves into
custom properties on `:root` with the alias chains preserved. Open DevTools
on any page and you can trace `--text-color-link` back to
`--color-brand-primary-600` without reading a line of source — across the
repo boundary, because the chain is just `var()` all the way down.

```bash
npm install            # installs the system and vendors it into vendor/
npm run build:tokens   # this site's component layer -> dist/tokens.local.css
npm run build:icons    # sprite of only the icons this site references
npm run serve
```

Every page links two stylesheets, in this order:

```html
<link rel="stylesheet" href="vendor/design-system/styles/index.css">
<link rel="stylesheet" href="src/styles/main.css">
```

`vendor/` is committed rather than installed, which looks wrong until you
look at the deploy: cPanel copies files into `public_html` and runs nothing.
There is no npm on the far end, so anything the browser needs has to already
be a file in this repo. `npm run vendor` refreshes it; commit what it writes.

The CSS follows Atomic Design. Every rule below the base layer consumes
semantic tokens. A raw hex value anywhere but the system's `tokens/base/` is
a bug.

Spacing is a strict 8px grid. No 4s, no 12s. If a gap isn't divisible by
eight, it isn't in the system.

### Changing a system value

Not here. Change it in the design-system repo, tag a release, bump the ref in
`package.json`, then `npm install && npm run vendor` and commit the result.
Editing `vendor/design-system/` directly works right up until the next vendor
run silently reverts it.

## Accessibility is structural here

Auditing this site turned up two failures I'd been shipping for years, so I
fixed them at the token level where they can't quietly come back.

- The brand red, `#E12A09`, measures 4.36:1 against the page background.
  That's under the 4.5:1 WCAG AA line for body text, so body links now use
  the 600 step of the ramp at 5.9:1. The brighter red survives only at
  display scale, where 3:1 applies.
- Muted text used to sit at 40% black, which measures 2.6:1. It now sits at
  60%, which passes. The old value survives only as `disabled`, which WCAG
  exempts.

Focus is a token pair, a near-black 2px ring on `:focus-visible`. Every page
starts with a skip link. Errors in forms are wired through
`aria-describedby` and spell out the word Error, because color alone is not
an affordance.

## What's where

| Path | What it is |
|---|---|
| `vendor/design-system/` | The design system, vendored. Generated — never hand-edit |
| `tokens/component/` | This site's own component tokens, aliasing the system's semantic layer |
| `dist/tokens.local.css` | Those tokens compiled. Loaded after the system's |
| `src/styles/` | This site's organisms, one molecule, and the X-ray overlay |
| `src/js/` | Nav, sheet, project-row, X-ray |
| `*.html` | The site: homepage, foundations, components, six case studies, resume, contact |
| `tools/vendor.mjs` | Copies the system out of `node_modules` into `vendor/` |
| `docs/design-tokens.md` | How the two token layers meet |
| `.cpanel.yml` | Deploy config — copies only the servable paths into `public_html` on the host |

This rebuild used to live under `v5/` while the pre-rebuild HTML and Sass
still ran at the domain root. The legacy Sass variables used to alias the
compiled custom properties, so a value change in `tokens/base/` propagated
to a stylesheet written years before the pipeline existed. That migration
path is preserved in the commit history, which is the part of this repo I'd
actually encourage you to read. The legacy pages and that Sass build have
since been archived out of this working tree, and this rebuild has been
promoted to the root: what's here now is the actual site.

## The honest boundary

I work in HTML, CSS, SCSS, and enough JavaScript to build what you're
looking at. When something needs to become production TypeScript, I'm
working next to the engineer who owns it, not throwing files over a wall.
