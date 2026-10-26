# hobbs.design

Source for [hobbs.design](https://hobbs.design), the portfolio of Mark Hobbs.
I'm a product designer who builds, and this repo is the proof. No framework,
no CMS. HTML, CSS, and enough JavaScript to ship the real thing.

## How it's built

Design decisions live in one place and flow one direction.

```
Figma: software-subatomic        @hobbs-og/software           this repo
  Tier 1 values, one mode   -->    tokens.css (every brand)  -->  vendor/software/
  per brand                        fonts.css + Inter
Figma: portfolio-components                                      tokens/component-software/
  this site's component tokens  ---------------------------->    dist/tokens.components.css
                                                                  src/styles/   organisms, xray
                                                                  *.html        the pages
```

The tokens are not in this repo. They live in
[software](https://github.com/hobbs-og/software), the system I build
everything on, and Figma controls every value in it. This site is one brand
of that system: `data-brand="portfolio"` on `<html>` picks its colors and
type, and the theme follows the visitor's light or dark setting.

What stays here is what only this site has: its component tokens, its
organisms and its pages. The component tokens come from their own Figma
file and alias the system's semantic layer, so open DevTools on any page and
`--project-row-color-title-content-default` traces back through
`--color-content-headline` to a brand value without reading a line of source.

The page structure (reset, type atoms, grid) still comes from my older
design system, loaded without its tokens. `src/styles/legacy-tokens.css`
points its token names at the new ones. It's a bridge: each line goes once
nothing uses it, and the file goes when the last stylesheet moves to the
new names.

```bash
npm install                            # installs the old system and vendors it into vendor/
SOFTWARE_DIR=../software npm run vendor:software   # copies software's web build into vendor/software/
npm run build:component-tokens         # tokens/component-software -> dist/tokens.components.css
npm run build:icons                    # sprite of only the icons this site references
npm run serve
```

Every page links these, in this order:

```html
<link rel="stylesheet" href="vendor/software/fonts.css">
<link rel="stylesheet" href="vendor/software/tokens.css">
<link rel="stylesheet" href="src/styles/system.css">
<link rel="stylesheet" href="src/styles/main.css">
```

`vendor/` is committed rather than installed, which looks wrong until you
look at the deploy: cPanel copies files into `public_html` and runs nothing.
There is no npm on the far end, so anything the browser needs has to already
be a file in this repo. Refresh it with the vendor scripts and commit what
they write.

Fonts are self-hosted: Inter from software, and JetBrains Mono for the mono
labels. No font service, no third-party connection.

The CSS follows Atomic Design. Every rule consumes tokens. A raw hex value
in a stylesheet is a bug.

### Changing a system value

Not here. Change the variable in Figma, export it to software, and build.
Then run `npm run vendor:software` here and commit the result. Editing
`vendor/` directly works right up until the next vendor run silently
reverts it.

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
| `vendor/software/` | software's tokens and Inter, vendored. Generated — never hand-edit |
| `vendor/design-system/` | The older system's structure (reset, atoms, grid), vendored. Generated — never hand-edit |
| `tokens/component-software/` | This site's own component tokens, from Figma, aliasing software's semantic layer |
| `dist/tokens.components.css` | Those tokens compiled |
| `src/styles/` | This site's organisms, one molecule, the X-ray overlay, and the bridge from old token names to new ones |
| `src/js/` | Nav, sheet, project-row, X-ray |
| `*.html` | The site: homepage, foundations, components, six case studies, resume, contact |
| `tools/` | Vendor scripts, the component-token build, the local server |
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
