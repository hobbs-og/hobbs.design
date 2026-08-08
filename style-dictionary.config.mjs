/**
 * Style Dictionary v4 config — hobbs.design
 * Transforms design tokens (tokens/**\/*.json) → dist/tokens.css + dist/tokens.mjs
 *
 * Layers, one direction of dependency:
 *   tokens/base/       subatomic — the ONLY layer holding raw hex/px values
 *   tokens/semantic/   roles (element-property-role) — every value aliases base
 *   tokens/component/  per-component tokens — every value aliases semantic
 *
 * Run:   npm run build:tokens
 * Watch: npm run watch:tokens
 */

export default {
  // Order matters for alias resolution: primitives → semantic → component
  source: [
    'tokens/base/*.json',
    'tokens/semantic/*.json',
    'tokens/component/*.json',
  ],

  hooks: {
    transforms: {
      // px → rem for dimensions, so user font-size preferences scale the UI.
      // Breakpoints stay px (media queries), weights and tracking stay unitless.
      'size/pxToRem': {
        type: 'value',
        filter: (token) =>
          token.$type === 'dimension' &&
          !token.path.includes('letter-spacing') &&
          !token.path.includes('breakpoint') &&
          !token.path.includes('font-weight'),
        transform: (token) => {
          const val = parseFloat(token.$value ?? token.value)
          if (isNaN(val)) return token.$value ?? token.value
          return val === 0 ? '0' : `${val / 16}rem`
        },
      },
      // Breakpoints emit as px — they document the @media values, which
      // cannot read custom properties and are duplicated in CSS by hand.
      'size/breakpointPx': {
        type: 'value',
        filter: (token) => token.path.includes('breakpoint'),
        transform: (token) => `${parseFloat(token.$value ?? token.value)}px`,
      },
    },
  },

  platforms: {
    // ── CSS custom properties ──────────────────────────────────────────
    css: {
      transformGroup: 'css',
      transforms: ['attribute/cti', 'name/kebab', 'size/pxToRem', 'size/breakpointPx', 'color/css'],
      prefix: '',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            selector: ':root',
            // Semantic vars emit as var(--base-token) chains, so the layer
            // structure stays inspectable in DevTools.
            outputReferences: true,
          },
        },
      ],
    },

    // ── JavaScript / TypeScript ────────────────────────────────────────
    js: {
      transformGroup: 'js',
      transforms: ['attribute/cti', 'name/camel'],
      buildPath: 'dist/',
      files: [
        { destination: 'tokens.mjs', format: 'javascript/es6' },
        { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
      ],
    },
  },
}
