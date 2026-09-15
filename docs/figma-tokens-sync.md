# Figma token sync

There is a Figma file that started as a mirror of `@hobbs-og/design-system`'s
tokens and has grown into a small portable component starter kit built on
top of them — nav, sheet, alert, checkbox, radio, all bound to the same
token chain, including this site's own `nav`/`sheet` component tokens
(mirrored from `tokens/component/nav.json` / `sheet.json` — see
[`design-tokens.md`](design-tokens.md) for where those live in code).

**File:** [hobbs.design — Design Tokens](https://www.figma.com/design/FtTx0vhG9aEGgVLnf4ng9F)
(file key `FtTx0vhG9aEGgVLnf4ng9F`, in the `hobbs.design` team's drafts —
not inside the existing `654155960` folder, deliberately, so it never
collides with whatever lives there).

This is a **manual, human-triggered** sync — there is no CI job and no stored
Figma credential. Re-running it means opening a session (this repo has the
Figma MCP connector authorized) and doing the steps below by hand or by
asking an agent to follow this doc.

## Source of truth

Everything in the Figma file is read from, in this order of preference:

1. `node_modules/@hobbs-og/design-system/dist/tokens.css` — the compiled
   output. This is the ground truth for exact values (including the `rem`
   conversions and the `prefers-color-scheme: dark` overrides) and for every
   `--custom-property` name used in the Figma variables' WEB code syntax.
2. `node_modules/@hobbs-og/design-system/tokens/{base,semantic,component}/*.json`
   — the authored source, useful for the alias structure (which semantic
   token points at which base token) that the compiled CSS flattens away.

Never hand-type a value into Figma. If a number or color can't be read from
one of these two places, stop and ask — same rule the design system itself
enforces on raw values in code.

## When to re-run

Whenever `@hobbs-og/design-system` is re-vendored here (`npm install && npm
run vendor` after a version bump) and `tokens.css` actually changed. Diff
`node_modules/@hobbs-og/design-system/dist/tokens.css` against what the
Figma variables currently hold before touching anything — most vendor bumps
don't touch token values at all.

## File structure to preserve

12 variable collections, 10 pages. Re-running should update variables
*within* this structure, not recreate it:

| Collection | Modes | What |
|---|---|---|
| `Base/Color` | Light, Dark | The only collection with two modes — mirrors the `prefers-color-scheme` override happening at the primitive layer in the real CSS |
| `Base/Typography`, `Base/Spacing`, `Base/Motion` | Value | Single-mode primitives. `Base/Spacing` also carries two additions with no code precedent: `control/checkbox` (18px) and `border-radius/xs` (2px) — see "Extending past the shipped tokens" below. |
| `Semantic/Color`, `Semantic/Typography`, `Semantic/Spacing`, `Semantic/Motion` | Value | Single-mode — every value is a `VARIABLE_ALIAS` into the matching `Base/*` collection. Dark-mode behavior is inherited automatically through the alias, exactly like a CSS `var()` chain. Never give these a second mode. `Semantic/Color` also carries `feedback/color/info` / `info-bg` / `info-text` (not in the shipped system — added for the Alert component, aliased from `Base/Color Reference`'s blue hue). `Semantic/Spacing` carries the semantic aliases for the two additions above. |
| `Component` | Value | Aliases into `Semantic/Color` and `Semantic/Spacing` only, for button/chip/field/stat — the only four components that ship component tokens in the source system |
| `Base/Color Reference` | Value | 156 colors (12 hues × 13 tones), HCT tonal scale via `material-color-utilities`. Sourced from a one-off reference artifact, not yet in any tagged release of the design system. Empty `scopes`, no `codeSyntax` — deliberately unwired inventory, not aliased by anything except where explicitly promoted (see `feedback/color/info`, above). If/when a hue from here gets promoted into `tokens/base/color.json`, move its value there and it stops living in this collection. |
| `Portfolio/Nav`, `Portfolio/Sheet` | Value | Mirror this site's own `tokens/component/nav.json` and `sheet.json` exactly — including their `motion` sections. Kept as separate collections from `Component`, matching the real repo boundary: these are portfolio-specific, not part of `@hobbs-og/design-system`. |

Pages: **Cover**, **Base**, **Semantic**, **Component**, **Reference**,
**Alert**, **Nav**, **Sheet**, **Checkbox**, **Radio**.

Cover/Base/Semantic/Component/Reference are documentation pages (see prior
section for their grid rules). Alert/Nav/Sheet/Checkbox/Radio are **real
`COMPONENT_SET`s** — combine variants with `figma.combineAsVariants`, give
them a proper variant property (`Type`, `State`, `Selected`, `Disabled`,
etc.), and every layer gets a real name, not Figma's default "Frame" /
"Rectangle". `fills = []` explicitly on every layout-only wrapper —
`createAutoLayout`/`createFrame` default to a solid white fill, and leaving
that unset shows up as a stray white box behind content that has no token
backing it. Audit for both (`node.name === 'Frame'`, and any `SOLID` fill
without `boundVariables.color`) before calling a page done.

## Extending past the shipped tokens

Nav and Sheet mirror real code exactly. Alert, Checkbox, and Radio don't —
there's no `alert.css`, no checkbox, no radio anywhere in the codebase yet.
Building those needed real judgment calls, made the same way the system
itself would make them:

- **Never invent a raw value.** Alert's `info` color and Checkbox/Radio's
  box size are grounded in real sources — `feedback/color/info` aliases the
  `blue` hue already sitting in `Base/Color Reference`; `control/checkbox`
  and `border-radius/xs` match Material 3's actual published checkbox spec
  (pulled from the Material 3 Design Kit library already attached to this
  file, not memory).
- **New tokens follow the existing exception, not a new one.** `control/*`
  dimensions already sit outside the 8px grid on purpose ("they size
  affordances against the hand and the eye, not against layout rhythm" —
  `tokens/base/spacing.json`). `control/checkbox` is one more of those, not
  a new kind of exception.
- **Contrast is computed before building, not after.** Every color pairing
  in Alert/Checkbox/Radio was checked against WCAG 2.1 AA (4.5:1 text,
  3:1 non-text UI components) before the component was built, not eyeballed
  afterward. `border/color/strong` against the page background clears the
  3:1 floor by only 0.01 — real, passing, but worth knowing if this system
  is reused somewhere with a different `border/color/strong` value.

## Starter-kit reuse across projects

The alias chain already makes this work without any extra structure:
`Semantic/*`, `Component`, `Portfolio/*`, and every component page
(Alert/Nav/Sheet/Checkbox/Radio) only ever reference `Base/*` — nothing
downstream holds a raw value. To adapt this file for a different project:

1. Duplicate the Figma file.
2. Edit only `Base/Color`'s 49 primitives (and `Base/Typography`/
   `Base/Spacing` if the new project's type scale or grid genuinely
   differs) to the new brand's values.
3. Everything else — every semantic token, every component, every swatch
   card — repaints automatically, the same way changing a CSS custom
   property cascades through every `var()` that points at it.

Light/Dark stays a real Figma **mode** on `Base/Color`, because that's a
state the same brand needs simultaneously. A different *brand* isn't a mode
of this file — it's a fork of `Base/*`'s values, the same way a new product
consuming `@hobbs-og/design-system` in code doesn't get a "brand mode," it
gets its own token overrides. Don't build brand-switching as a second mode
axis; duplicate-and-edit is the correct shape for it, not a limitation to
route around.

## How to re-run

1. Read the two source files above; note what changed.
2. Read the current Figma state (`get_metadata`, or a read-only `use_figma`
   script calling `figma.variables.getLocalVariableCollectionsAsync()`) —
   don't assume the structure above still matches; confirm it.
3. **Patch, don't rebuild.** Update only the variables whose values changed
   (`variable.setValueForMode`). Add variables for new tokens, following the
   existing naming convention (slash-hierarchy matching the JSON path) and
   scope choices already set on sibling variables in the same collection.
   Remove variables only for tokens actually deleted upstream.
4. If a documentation page's layout needs to change (a new token group, a
   new component), edit only the affected section — find it by name via
   `get_metadata` or a `query()` — rather than clearing the page.

### Do not blanket-delete a page's children

On the first build of this file, a full-page clear-and-rebuild deleted a
reference mockup that had been placed directly on the Base page by hand
(outside this tooling) before it could be read. **Always inspect a page's
existing children before removing any of them**, the same way you'd run
`git status` before a destructive git command. If something doesn't match
what you expect to have created, ask before deleting it.
