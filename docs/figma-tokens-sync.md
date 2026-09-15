# Figma token sync

There is a Figma file that mirrors `@hobbs-og/design-system`'s tokens as
Figma variables — not this site's own component tokens (nav, sheet,
case-hero, project-row; see [`design-tokens.md`](design-tokens.md)), just the
base → semantic → component chain the system itself ships.

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

9 variable collections, 4 pages. Re-running should update variables *within*
this structure, not recreate it:

| Collection | Modes | What |
|---|---|---|
| `Base/Color` | Light, Dark | The only collection with two modes — mirrors the `prefers-color-scheme` override happening at the primitive layer in the real CSS |
| `Base/Typography`, `Base/Spacing`, `Base/Motion` | Value | Single-mode primitives |
| `Semantic/Color`, `Semantic/Typography`, `Semantic/Spacing`, `Semantic/Motion` | Value | Single-mode — every value is a `VARIABLE_ALIAS` into the matching `Base/*` collection. Dark-mode behavior is inherited automatically through the alias, exactly like a CSS `var()` chain. Never give these a second mode. |
| `Component` | Value | Aliases into `Semantic/Color` and `Semantic/Spacing` only, for button/chip/field/stat — the only four components that ship component tokens in the source system |

Pages: **Cover**, **Base**, **Semantic**, **Component** — each a single
1200px-wide auto-layout frame using Figma's native `GRID` layout mode (12
columns) with `gridColumnGap`/`gridRowGap` bound to
`space/grid-column-gap`/`space/grid-row-gap`, not hardcoded. Side padding is
bound to `space/gutter`. Every swatch card shows the variable's
`codeSyntax.WEB` value, never a raw hex string.

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
