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

Per-component tokens, added only once a component earns them. Every value
aliases a semantic token.

Built so far: `button.json`, `nav.json`, `project-row.json`, `chip.json`,
`field.json`, `case-hero.json`. Their CSS lives under `src/styles/` in
atoms/, molecules/, and organisms/. The consumption pattern is in
button.css and case-hero.css: variants swap custom properties, never rules.

The footer and the index hero are the counterexamples, on purpose. Both are
built entirely on semantic tokens because none of their values needed a
component-level name. That's the test for whether a component gets a token
file at all. Both demo pages are live: `v5/index.html` for foundations,
`v5/components.html` for the component layer.

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

## Where the accent is allowed

The rule is that `--action-color-*` belongs to links and CTAs and appears
nowhere else — not on borders, icons, or decoration. There is one sanctioned
exception:

**The brand rule.** The two-color bar that underlines the name on the resume:
a continuous 2px bar, accent then onyx, with the colour changing on a column
boundary rather than at an arbitrary point. It carries brand identity rather
than decoration, so it is allowed to use the accent. It is exposed as
`--stat-color-rule-lead` / `--stat-color-rule-trail` and drawn by
`.stat-band__rule`. Any future use of this mark should alias those tokens
rather than reaching for the accent directly, so the exception stays one
named thing instead of becoming a loophole.

The rule redeclares the 12-column grid instead of using the `.grid` utility,
because the content grid collapses to one column on small screens and the bar
must not break into stacked pieces. The lead segment spans 3 columns, so the
split moves by editing one number.

The colour changes on the divider between the first and second stat, not at a
track edge. Both segments reach half a column gap past their own track, which
is the same half-gap offset the dividers use, so the handoff sits on that
vertical line by construction. Change `--space-grid-column-gap` and the bar,
the dividers, and the columns all move together.

The handoff follows the divider at every breakpoint, because the divider
moves:

| Width | Stats | Divider at | Lead spans |
|---|---|---|---|
| ≥1025px | 4 across | column 3/4 | 3 |
| 768–1024px | 2×2 | column 6/7 | 6 |
| ≤767px | stacked | none | half the bar |

Stacked layouts have no vertical divider to align to, so the rule drops its
twelve-column definition and splits in half. That is also a hard requirement
rather than a preference: below roughly 624px the eleven column gaps alone
(11 × 48px) exceed the available content width, and keeping the twelve-column
grid pushes the bar past the right gutter.

Both rules of the band run the full width of the device while the stats stay
inside the container and its max-width. The lower rule gets that for free,
since the band is a full-width block. The upper rule can't: it has to stay on
the grid to find the divider. So each segment paints outward past the
container edge with a pseudo-element and the band clips the excess
(`overflow-x: clip`, not `hidden`, so it never becomes a scroll container).
The handoff is unaffected, which is the point — the bar reaches both edges of
the screen while the colour still changes exactly on the column divider.

---

## Relationship to the legacy Sass layer

The live pages now consume the JSON pipeline. All of them link
`dist/tokens.css` instead of the old Sass-built `tokens.css`, and the Sass
variables in `partials/base/_colors.scss` and `_variables.scss` alias the
token custom properties, so the compiled `styles.css` resolves its colors and
font stacks from `dist/tokens.css` at runtime. Raw values that remain in the
Sass partials are either legacy-only (the cream and onyx hero colors, the
black and white alpha scales) or inputs to Sass color functions, which can't
operate on a `var()`.

`src/scss/tokens/` (the old Sass primitives and semantic files) is retired.
It stays in the tree for reference until the legacy pages are replaced, but
nothing links its output anymore.

The pipeline's structure matches `hobbs-og/design-system` on GitHub, so tokens
can round-trip between the personal site and the white-label system — same
architecture, different subatomic values.
