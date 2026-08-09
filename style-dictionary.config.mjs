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
      // Breakpoints included: media queries are authored in rem so that
      // layout responds to text zoom, not just viewport width.
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

  platforms: {
    // ── CSS custom properties ──────────────────────────────────────────
    css: {
      transformGroup: 'css',
      transforms: ['attribute/cti', 'name/kebab', 'size/pxToRem', 'color/css'],
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
