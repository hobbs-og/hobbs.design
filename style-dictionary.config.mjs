/**
 * Style Dictionary v4 config — hobbs.design (the site)
 *
 * The base and semantic layers live in @hobbs-og/design-system now. This
 * config compiles only the component tokens belonging to components this
 * site owns and the system does not: nav, sheet, case-hero, project-row.
 *
 *   node_modules/@hobbs-og/design-system/tokens/base/       ┐ sourced so the
 *   node_modules/@hobbs-og/design-system/tokens/semantic/   ┘ aliases resolve
 *   tokens/component/*.json                                   ← the only layer emitted
 *
 * The system's own tokens are read but filtered out of the output. They are
 * already being delivered by the system stylesheet, and emitting them a
 * second time would ship every value twice and let the two copies drift.
 *
 * Output: dist/tokens.local.css — loaded AFTER the system stylesheet, so its
 * var() references resolve against the custom properties already on :root.
 *
 * This is the same extension pattern any product on the system uses; it is
 * written up in the system's README under "Extending it".
 *
 * Run:   npm run build:tokens
 * Watch: npm run watch:tokens
 */

const SYSTEM = 'node_modules/@hobbs-og/design-system/tokens'

export default {
  // Order matters for alias resolution: primitives → semantic → component
  source: [
    `${SYSTEM}/base/*.json`,
    `${SYSTEM}/semantic/*.json`,
    'tokens/component/*.json',
  ],

  platforms: {
    css: {
      transformGroup: 'css',
      transforms: ['attribute/cti', 'name/kebab', 'size/pxToRem', 'color/css'],
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.local.css',
          format: 'css/variables',
          // Emit this site's component layer only. Everything sourced out of
          // node_modules is here for reference resolution, not for output.
          filter: (token) => !token.filePath.includes('@hobbs-og/design-system'),
          options: {
            selector: ':root',
            // Emit as var(--semantic-token) chains, so the layer structure
            // stays inspectable in DevTools.
            outputReferences: true,
          },
        },
      ],
    },
  },

  hooks: {
    transforms: {
      // px → rem for dimensions, so user font-size preferences scale the UI.
      // Same transform the system uses; component values have to compile the
      // same way the semantic values they alias did.
      'size/pxToRem': {
        type: 'value',
        filter: (token) =>
          token.$type === 'dimension' &&
          !token.path.includes('letter-spacing') &&
          !token.path.includes('font-weight'),
        transform: (token) => {
          const val = parseFloat(token.$value ?? token.value)
          if (isNaN(val)) return token.$value ?? token.value
          return val === 0 ? '0' : `${val / 16}rem`
        },
      },
    },
  },
}
