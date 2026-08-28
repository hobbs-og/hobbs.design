# Design tokens

The base and semantic token layers are **not in this repo any more**. They live
in [`@hobbs-og/design-system`](https://github.com/hobbs-og/hobbs-design-system)
along with the atoms, molecules and grid built on them, so other products can
depend on them instead of copying them. The full write-up — the three layers,
the accessibility decisions encoded in the values, motion, where the accent is
allowed — is that repo's [`docs/design-tokens.md`](https://github.com/hobbs-og/hobbs-design-system/blob/main/docs/design-tokens.md).

What stays here is this site's own component layer.

```
@hobbs-og/design-system                              this repo
  tokens/base/  ──▶  tokens/semantic/  ─────────────▶  tokens/component/
  raw values         roles                             nav · sheet
        │                    │                         case-hero · project-row
        └── dist/tokens.css ─┘                                │
            (vendored, linked first)          dist/tokens.local.css
                                              (linked second, via main.css)
```

## Why there are two stylesheets

Every page links the system first, then this site:

```html
<link rel="stylesheet" href="vendor/design-system/styles/index.css">
<link rel="stylesheet" href="src/styles/main.css">
```

`main.css` imports `dist/tokens.local.css` before anything else, so the four
component-token sets below resolve against semantic custom properties that are
already on `:root`.

## This site's component tokens

`tokens/component/` holds tokens for the components the system doesn't have,
because they are this portfolio rather than a product baseline:

- `nav.json` — the site header and its sheet-based mobile panel
- `sheet.json` — the sliding panel the nav is a variant of
- `case-hero.json` — the case-study opener, light and inverse
- `project-row.json` — the work index row

Every value aliases a semantic token from the system. None of them reaches past
it to a primitive — if a rule needs a value the semantic layer doesn't have,
the system is missing a role, and that is a change to make upstream.

## Building

```bash
npm install            # also vendors the system into vendor/
npm run build:tokens   # tokens/component/*.json -> dist/tokens.local.css
npm run watch:tokens
```

`style-dictionary.config.mjs` sources the system's `base/` and `semantic/`
JSON out of `node_modules` purely so aliases resolve, then filters them out of
the output — they are already being delivered by the vendored stylesheet, and
emitting them twice would let the two copies drift.

## Changing a system value

Don't do it here. Change it in the design-system repo, tag a release, then:

```bash
npm install && npm run vendor
```

and commit the updated `vendor/`. Editing `vendor/design-system/` directly
works right up until the next vendor run silently reverts it.
