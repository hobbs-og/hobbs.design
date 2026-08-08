# Design tokens

The token system behind hobbs.design. Three layers, one direction of dependency, one source of truth.

```
tokens/base/*.json  ──▶  tokens/semantic/*.json  ──▶  tokens/component/*.json
subatomic                roles                        per-component
raw values               aliases only                 aliases only
```

Tokens are authored as W3C-format JSON (`$value` / `$type`) and compiled by
**Style Dictionary v4** into:

- `dist/tokens.css` — CSS custom properties on `:root`, with semantic vars
  emitted as `var()` chains so the layer structure is inspectable in DevTools
- `dist/tokens.mjs` + `dist/tokens.d.ts` — for any JS that needs token values

```bash
npm run build:tokens    # one-shot
npm run watch:tokens    # rebuild on change
```

A component never reaches past the semantic layer. If a rule needs a value the
semantic layer doesn't have, that's a signal the layer is missing a role, not
permission to use a primitive directly.

---

## Layer 1 — Subatomic (`tokens/base/`)

Raw values with no meaning attached. **The only layer allowed to contain a hex
or px value.** `color.brand.primary.500` is a red; it doesn't know it's a link.

- `color.json` — content/background/border colors, the brand primary ramp
  (100–900, centered on `#E12A09`), a neutral ramp, and utility
  (success/warning/error) triads
- `spacing.json` — a **strict 8px scale** (8–160, no 4s or 12s), gaps,
  container, stroke widths, radii, breakpoints
- `typography.json` — Neue Haas Grotesk stacks, font sizes, weights,
  line heights (all 8px multiples), letter spacing (0 — tracking is never
  manipulated)

Dimensions compile to rem (÷16) so user font-size preferences scale the UI.
Breakpoints stay px: media queries can't read custom properties, so those
tokens document the values duplicated by hand in CSS.

## Layer 2 — Semantic (`tokens/semantic/`)

Roles, named **element-property-role**:

```
--text-color-heading
--surface-color-page
--border-color-hairline
--action-color-hover
--space-section-y
```

Read it as: *what am I styling, which property, in what role.* Space is the
deliberate exception — it has no element, so the scale stays flat
(`--space-md`) with named roles on top (`--space-section-y`, `--space-nav-x`,
`--space-grid-column-gap`).

Every semantic value aliases a base token. A literal hex or rem in this layer
is a bug.

## Layer 3 — Component (`tokens/component/`)

Per-component tokens, added only once a component has enough variants that the
semantic layer stops being expressive enough. Every value aliases a semantic
token. `button.json` is the working example; see
`src/styles/atoms/button.css` for the consumption pattern — variants swap
custom properties, never rules.

---

## Accessibility decisions encoded in the tokens

These are deliberate deviations from the pre-v5 values, made so every default
pairing passes WCAG 2.2 AA:

1. **Muted text is 60% black, not 40%.** The old 40% (`rgba(15,15,15,.4)`)
   measures ~2.6:1 on `#F8F8F8` — an AA failure. 60% measures ~5.0:1. The 40%
   value survives only as `content.disabled`, which WCAG exempts.
2. **Body-size links use `primary.600` (`#C11406`, 5.9:1), not the 500.**
   `#E12A09` on the page background measures 4.36:1 — just under the 4.5:1
   AA threshold for normal text. The 500 remains available as
   `--text-color-link-large` / `--action-color-accent` for large-scale type
   (≥24px), where the 3:1 threshold applies.
3. **Focus is a token.** `--border-color-focus` (near-black) +
   `--border-width-focus` (2px) drive the global `:focus-visible` style in
   `src/styles/base/global.css`.

---

## Relationship to the legacy Sass token layer

`src/scss/tokens/` (the Sass primitives → semantic system) is **frozen**. It
still compiles `src/scss/tokens.css` for the 17 legacy pages and must not be
deleted while those pages are live. The JSON pipeline is the source of truth
for all v5 work; when the rebuilt pages replace the legacy ones, the Sass
token layer retires with them.

The pipeline's structure matches `hobbs-og/design-system` on GitHub, so tokens
can round-trip between the personal site and the white-label system — same
architecture, different subatomic values.
