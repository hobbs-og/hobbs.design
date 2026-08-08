# hobbs.design

Source for [hobbs.design](https://hobbs.design), the portfolio of Mark Hobbs.
I'm a product designer who builds, and this repo is the proof. No framework,
no CMS. HTML, CSS, and enough JavaScript to ship the real thing.

## How it's built

Design decisions live in one place and flow one direction.

```
tokens/base/       subatomic. Raw hex and px values, and the only layer allowed to have them.
tokens/semantic/   roles. Every value aliases a base token. Named element-property-role.
tokens/component/  per-component tokens. Every value aliases a semantic role.
```

[Style Dictionary](https://styledictionary.com) compiles the JSON to
`dist/tokens.css` as custom properties on `:root`, with the alias chains
preserved. Open DevTools on any page and you can trace
`--text-color-link` back to `--color-brand-primary-600` without reading a
line of source.

```bash
npm install
npm run build:tokens
```

The CSS itself follows Atomic Design. Atoms, molecules, and organisms live
under `src/styles/`, and every rule below the base layer consumes semantic
tokens. A raw hex value outside `tokens/base/` is a bug.

Spacing is a strict 8px grid. No 4s, no 12s. If a gap isn't divisible by
eight, it isn't in the system.

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
| `tokens/` | The design token source, W3C format JSON |
| `dist/` | Compiled tokens: CSS custom properties plus a JS module |
| `src/styles/` | The atomic CSS library |
| `v5/` | Foundations and component demo pages for the rebuild in progress |
| `src/scss/` | The legacy Sass build, still compiling the live pages |
| `docs/design-tokens.md` | The architecture in detail |
| `*.html` | The live site |

The live pages and the v5 rebuild share the same token pipeline. The legacy
Sass variables alias the compiled custom properties, so changing a value in
`tokens/base/` propagates to a stylesheet written years before the pipeline
existed. That migration is documented in the commit history, which is the
part of this repo I'd actually encourage you to read.

## The honest boundary

I work in HTML, CSS, SCSS, and enough JavaScript to build what you're
looking at. When something needs to become production TypeScript, I'm
working next to the engineer who owns it, not throwing files over a wall.
