// Builds the site's pages from pages/*.html and the shared pieces in
// pages/partials/. cPanel runs no build, so the output is written to the repo
// root and committed: the deploy keeps copying the same files it always has.
//
//   node tools/build-pages.mjs           # write every page
//   node tools/build-pages.mjs --check   # fail if a built page is out of date
//
// In a page or partial:
//   <!-- @include site-nav.html -->
//   <!-- @include projects/terafina-row.html class="span-6" -->
// The path is relative to pages/partials/. Attributes become variables in
// the partial: {{class}} is required, {{class?}} may be left out (empty).
// Partials can include partials, and can pass their own variables on:
//   <!-- @include projects/terafina-specs.html class="{{specs?}}" -->
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const pagesDir = join(root, 'pages');
const partialsDir = join(pagesDir, 'partials');
const check = process.argv.includes('--check');

const INCLUDE = /^([ \t]*)<!-- @include ([\w./-]+)((?:\s+[\w-]+="[^"]*")*) -->[ \t]*$/gm;
const VARIABLE = /\{\{([\w-]+)(\?)?\}\}/g;

function attributes(text) {
  return Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

function fill(text, vars, where) {
  return text.replace(VARIABLE, (_, name, optional) => {
    if (name in vars) return vars[name];
    if (optional) return '';
    throw new Error(`${where} needs ${name}="…"`);
  });
}

function expand(text, where, depth = 0) {
  if (depth > 10) throw new Error(`${where}: includes nested more than 10 deep`);
  return text.replace(INCLUDE, (_, indent, path, attrs) => {
    const file = join(partialsDir, path);
    if (!existsSync(file)) throw new Error(`${where}: no partial at pages/partials/${path}`);
    const body = expand(fill(readFileSync(file, 'utf8'), attributes(attrs), path), path, depth + 1);
    return body.replace(/\n$/, '').replace(/^(?=.)/gm, indent);
  });
}

// Local stylesheets and scripts get ?v= and a hash of their contents. The
// host sends no cache headers, so without it a browser can pair new HTML
// with old cached CSS. A file that changes gets a new URL; the rest stay
// cached.
function versionAssets(html, where) {
  return html.replace(/\b(href|src)="((?:vendor|src)\/[^"?#]+\.(?:css|js))"/g, (_, attr, path) => {
    const file = join(root, path);
    if (!existsSync(file)) throw new Error(`${where}: no file at ${path}`);
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
    return `${attr}="${path}?v=${hash}"`;
  });
}

// An optional variable left empty leaves stray spaces in a class list.
function tidyClasses(html) {
  return html.replace(/\bclass="([^"]*)"/g, (_, list) => `class="${list.trim().split(/\s+/).join(' ')}"`);
}

const pages = readdirSync(pagesDir).filter((file) => file.endsWith('.html')).sort();
const stale = [];

for (const page of pages) {
  const source = readFileSync(join(pagesDir, page), 'utf8');
  const banner = `<!-- Built by tools/build-pages.mjs from pages/${page}. Edit that file, not this one. -->`;
  const html = versionAssets(tidyClasses(expand(source, `pages/${page}`)), `pages/${page}`).replace(/^<!DOCTYPE html>\n/, `<!DOCTYPE html>\n${banner}\n`);
  const out = join(root, page);

  if (check) {
    if (!existsSync(out) || readFileSync(out, 'utf8') !== html) stale.push(page);
  } else {
    writeFileSync(out, html);
  }
}

if (check && stale.length) {
  console.error(`Out of date: ${stale.join(', ')}. Run npm run build:pages and commit the result.`);
  process.exit(1);
}
console.log(check ? `${pages.length} page(s) up to date.` : `Built ${pages.length} page(s): ${pages.join(', ')}`);
