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

import { formattedVariables, fileHeader } from 'style-dictionary/utils'

// Base color tokens under the `dark` path (tokens/base/color-dark.json) hold
// the same custom-property names as their light counterparts, so this format
// emits them as a `prefers-color-scheme: dark` override block. Semantic and
// component layers reference the base custom properties via var(), so they
// repaint automatically — nothing downstream needs a dark-specific alias.
async function cssVariablesWithDarkMode({ dictionary, options, file }) {
  const isDark = (token) => token.path[0] === 'dark'

  const lightTokens = dictionary.allTokens.filter((token) => !isDark(token))
  const darkTokens = dictionary.allTokens
    .filter(isDark)
    .map((token) => ({ ...token, name: token.name.replace(/^dark-/, '') }))

  const header = await fileHeader({ file })

  const light = formattedVariables({
    format: 'css',
    dictionary: { ...dictionary, allTokens: lightTokens },
    outputReferences: options.outputReferences,
    usesDtcg: options.usesDtcg,
  })

  const dark = formattedVariables({
    format: 'css',
    dictionary: { ...dictionary, allTokens: darkTokens },
    formatting: { indentation: '    ' },
    usesDtcg: options.usesDtcg,
  })

  return (
    `${header}:root {\n${light}\n}\n\n` +
    `@media (prefers-color-scheme: dark) {\n  :root {\n${dark}\n  }\n}\n`
  )
}

export default {
  // Order matters for alias resolution: primitives → semantic → component
  source: [
    'tokens/base/*.json',
    'tokens/semantic/*.json',
    'tokens/component/*.json',
  ],

  hooks: {
    formats: {
      'css/variables-with-dark-mode': cssVariablesWithDarkMode,
    },
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
          format: 'css/variables-with-dark-mode',
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
