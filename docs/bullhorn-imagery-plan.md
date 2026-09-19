# Bullhorn / Novo case study — imagery plan

Companion to `bullhorn.html`. Six figure slots are marked in that file as
`<!-- FIGURE n — ... -->` comments. Nothing is wired up yet, so the page
renders clean today and each slot can be filled independently.

## Before anything gets drawn: the permission question

Three of the six candidates below use real Bullhorn product UI. That needs a
yes from Bullhorn or Mondo before it goes on a public site, and the answer
changes which version of each figure gets built. Every slot has an abstracted
fallback that needs no permission, because that's the version that ships if
the question takes three weeks to answer.

The abstracted route is also the better one for this case study. The argument
on the page is about where values live, not about what a candidate list looks
like. A screenshot of a table proves less than a drawing of the token that
colours its hover state.

## House conventions for the drawings

Copy the pattern in `images/site/*.svg` exactly. They're hand-authored SVG,
not exports:

- `viewBox="0 0 1200 480"` (or 1200 wide, height to fit), `role="img"` with a
  `<title>` and matching `aria-labelledby`
- Monospace type only, 11px body / 13px for names
- A hairline `#cccccc` box vocabulary, no fills
- Brand red `#c11406` reserved for the one thing being traced or denied
- A `@media (prefers-color-scheme: dark)` block redefining every colour, since
  the site ships dark tokens
- Wrapped in `<figure class="stack--tight">` with `<img class="img-frame"
  data-xray="atom · media" loading="lazy">` and a `<figcaption
  class="text-caption">`

Files go in `images/bullhorn/`.

---

## FIGURE 1 — lead-in, before the first section

**Shows:** the shape of the problem in one picture. One Novo component (a
candidate list row) drawn three times from three different places in the CSS,
each with slightly different values, and nothing in the drawing connecting
them. No design file above any of them.

**Why it earns the slot:** groundwork.html opens with `page-anatomy.svg`
showing where the rebuild landed. This is the mirror image, showing where the
work started. The reader needs to see "no source of truth" before the token
sections mean anything.

**Caption draft:** One component, three sets of values, and nothing in the
code saying they were ever meant to match. This is what "no design file" looks
like from the inside.

**Alt draft:** Three near-identical list rows drawn side by side with different
spacing and border values called out on each, and an empty labelled box above
them where a design file would sit.

**Source material:** `Shell+listing/bullhorn-listing-open.png`,
`Shell+listing/candidates.png`. Abstracted version needs no permission.

---

## FIGURE 2 — after the "code is the spec" section

**Shows:** the reading path. Five developer figures across two team boxes, each
with an arrow going into the compiled CSS rather than into a shared file, with
the arrows crossing. Then the same five with one file between them.

**Why it earns the slot:** the engineer's strongest fact is the team shape (two
teams, five devs, more coming) and that fact is currently only prose. It's the
cheapest thing on the page to draw and the most concrete.

**Caption draft:** Five people inferring the same rules separately is five
answers. The library didn't add capability, it removed the inference.

**Alt draft:** Two team boxes containing five developers, each with an arrow
reading directly into a block of CSS, beside the same five reading from one
shared library file.

**Source material:** none needed. Pure diagram.

**Note:** this is the one I'd build first. It carries the client's own
testimony and needs no permission at all.

---

## FIGURE 3 — after the subatomic section

**Shows:** the two tiers with the four modes hanging off the base. A spacing
step and a colour traced from `subatomic` up through a semantic name, with the
four mode columns (default, warm, bh-orange, bh-blue) shown as alternate values
feeding the same names. Crossed-out return path from semantic back down.

**Why it earns the slot:** this is the load-bearing diagram. It's also the one
where Bullhorn's architecture differs most from the one on groundwork.html, so
reusing `token-pipeline.svg` would be wrong. Four modes on the base layer is
the detail worth showing.

**Caption draft:** Four themes, one value layer. The modes are columns in the
base collection, so no component knows a theme exists.

**Alt draft:** The subatomic base collection with four mode columns feeding a
semantic layer above it, one colour traced through all four modes into a single
semantic name, and a crossed-out arrow running back down.

**Source material:** `__system/subatomic.json` has the real modes and values.
Nothing client-confidential in the structure.

---

## FIGURE 4 — after the semantic section

**Shows:** the anatomy of one name. `data-table.color.background.row.hover`
broken into its four parts with each part labelled (element, property, role,
state), then the resolution chain down to a hex. Beside it, the same value as
`blue-500` with nothing to label.

**Why it earns the slot:** the semantic-versus-raw argument is the centre of
the case study and it's currently carried entirely by prose. One real token
name does more work than the paragraph around it.

**Caption draft:** The name is the documentation. Read left to right, it says
what it styles, which property, and in what state.

**Alt draft:** The token name data-table dot color dot background dot row dot
hover split into labelled segments, resolving through a subatomic colour name
to a hex value, next to the same hex named blue-500 with no labels available.

**Source material:** `__system/semantic.json`. Use a token that's actually in
the file.

---

## FIGURE 5 — after the component library section

**Shows:** a variant matrix. The candidate badge across its five real states
(pre-registered, new, on assignment, available, just posted), with each cell
annotated by the token that fills it rather than by a hex.

**Why it earns the slot:** it's the only place a reader sees the actual
product vocabulary, and it demonstrates the claim that the library documents
Novo rather than replacing it. Those state names came from the application.

**Caption draft:** Five states, no hex values anywhere in the component. What's
left inside it is structure and variants.

**Alt draft:** A five by two matrix of candidate status badges, each cell
labelled with the semantic token supplying its background and border rather
than a colour value.

**Source material:** `__system/component.tokens.json` under `badges.color`.
This one arguably shows product UI, so it's the figure most worth clearing.
Fallback: draw the badges generically and keep the token labels.

---

## FIGURE 6 — after the adoption section

**Shows:** ninety thousand lines of CSS as a single block, with the adopted
portion as a small wedge and an arrow indicating direction rather than a
percentage. Deliberately not a progress bar, because a progress bar implies a
finish line and a known denominator, and neither exists.

**Why it earns the slot:** the page makes a point of not rounding adoption up.
A drawing that shows a small honest wedge does more for credibility than any
sentence in that section.

**Caption draft:** Adoption drawn at its real size. The direction is the
result. The percentage on its own would be a worse number than no number.

**Alt draft:** A large block representing ninety thousand lines of existing
CSS with a small shaded wedge at one edge marked as work using semantic
tokens, and an arrow showing the wedge growing with new work.

**Source material:** none needed.

**Risk:** this figure invites the reader to do arithmetic nobody can support
yet. If the honest answer is that the share isn't known, the drawing must not
imply a measured one. No axis, no gridlines, no percentage label.

---

## Photography and screenshots, if permission comes through

Ranked by what they'd add:

1. **The Figma library itself**, component sets open with the variables panel
   visible. This is the strongest possible evidence and it's the artifact the
   case study is about. Lowest confidentiality risk of the three, since it's a
   library file rather than customer-facing product.
2. **A candidate list screen**, as the hero image above the fold. Real product,
   real density, and it makes the "ninety thousand lines" claim tangible.
   `__claude/screen-1.png` and `screen-2.png` are already built from Figma.
3. **Before and after on one component.** Only worth it if a genuinely
   comparable before state can be captured. If the before is just "the same
   component, undocumented," a screenshot won't show it and Figure 1 does the
   job better.

## Not recommended

- A wall of colour swatches. Every design system case study has one and it
  proves nothing about architecture.
- A Figma canvas screenshot zoomed out to show scale. It reads as "lots of
  frames" rather than as a system.
- Anything containing real candidate names, contact details, or client data,
  including in a blurred form.
