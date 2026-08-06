# Design tokens

The token system behind hobbs.design. Three layers, one direction of dependency.

```
primitives  ──▶  semantic  ──▶  component
raw values       roles           not built yet
```

A component never reaches past the semantic layer. If a rule needs a value the semantic layer doesn't have, that's a signal the layer is missing a role, not permission to use a primitive directly.

---

## Layer 1 — Primitives

`src/scss/tokens/_primitives.scss`

Raw values with no meaning attached. `$primary-500` is a red. It doesn't know it's a link.

Colour primitives are imported from `partials/base/_colors.scss`, which holds full 100–900 ramps for primary, secondary, tertiary and grey, plus alpha scales on black and white. 96 values.

Type, space, radius and border-width primitives are declared in `_primitives.scss` on a numeric scale (`$space-100`, `$font-size-300`) rather than t-shirt sizes, so inserting a value later doesn't force a rename.

Primitives compile to nothing. They exist only to be pointed at.

---

## Layer 2 — Semantic

`src/scss/tokens/_semantic-color.scss`, `_semantic-type.scss`, `_semantic-space.scss`

Roles. This is the only layer components should touch.

Naming is **element-property-role**:

```
--text-color-heading
--surface-color-page
--border-color-subtle
--action-color-hover
```

Read it as: *what am I styling, which property, in what role.*

Semantic tokens emit as CSS custom properties on `:root`. That makes them inspectable in DevTools, overridable per-scope, and legible to anyone reading the compiled CSS without a Sass build.

Every semantic value points at a primitive. A literal hex or rem in this layer is a bug.

### Space is a deliberate exception

Space has no element to attach to. `--layout-space-md` adds a word without adding meaning, so the scale stays flat (`--space-md`) and the roles are carried by named tokens (`--space-section-y`, `--space-grid-column-gap`, `--space-nav-x`).

Reach for a named token first. Fall back to the scale only when the spacing genuinely has no role.

### Breakpoints stay in Sass

`@media` conditions are resolved at compile time and can't read a custom property. Breakpoints remain Sass variables.

---

## Layer 3 — Component

Not built yet, and deliberately so. Component tokens are only worth adding once a component has enough variants that the semantic layer stops being expressive enough. Adding them before that is ceremony.

When they arrive, the shape is:

```scss
.button {
  --button-color-background: var(--action-color-default);
  --button-color-text:       var(--surface-color-page);
  --button-space-inset:      var(--space-2xs) var(--space-sm);

  background: var(--button-color-background);
  color:      var(--button-color-text);
  padding:    var(--button-space-inset);
}

.button--quiet {
  --button-color-background: transparent;
  --button-color-text:       var(--action-color-default);
}
```

The variant changes three custom properties. It never touches the rules.

---

## Build

```bash
sass src/scss/tokens.scss src/scss/tokens.css --style=expanded --no-source-map
```

`tokens.css` is linked before `styles.css` on every page. It compiles independently, so the existing stylesheet build is untouched.

---

## Using them

```css
.case-study__title {
  font-family:  var(--text-family-display);
  font-size:    var(--text-size-heading-md);
  font-weight:  var(--text-weight-heading);
  line-height:  var(--text-leading-heading);
  color:        var(--text-color-heading);
  margin-block-end: var(--space-stack-default);
}

.case-study__row {
  border-block-start: var(--border-width-hairline) solid var(--border-color-default);
  padding-block: var(--space-2xl);
  gap: var(--space-grid-row-gap) var(--space-grid-column-gap);
}
```

### Rules

1. Components use semantic tokens. Never primitives.
2. Accent red (`--action-color-default`) is for links and CTAs. It appears nowhere else — not on borders, icons, or decoration.
3. Hierarchy comes from size and opacity, not hue or weight. The weight tokens are few on purpose.
4. If you need a value that doesn't exist, add the role. Don't inline the primitive.

---

## Migration status

This layer is **additive**. Nothing that existed before was rewritten, and the compiled `styles.css` is byte-equivalent apart from two bug fixes noted below. Components move onto tokens one at a time, at whatever pace makes sense.

**Done**

- Primitive and semantic layers built, compiling to `tokens.css`
- Linked on all 17 pages
- `_colors.scss` reduced to variables only. It had a stray `html { background }` rule, which is why importing it into the token layer emitted CSS twice. Rule moved to `_variables.scss`, output unchanged.
- Fixed curly quotes around `“Segoe UI”` in `_variables.scss` and the compiled CSS. Typographer's quotes are invalid in a CSS font stack, so that entry was being discarded and Windows users fell through to Roboto. 44 occurrences.

**Next**

- `_variables.scss` is ~1,940 lines mixing token declarations with component and page CSS. The scale variables in it now duplicate `_primitives.scss`. Once components are migrated, delete the scale from `_variables.scss` and leave it as component CSS.
- Migrate components in this order, easiest and most-used first: nav, case study row, buttons, forms, grid.
- Add component tokens only where variants justify them.
