// Copies the design system out of node_modules into vendor/design-system/,
// which IS committed to this repo.
//
// Committing a dependency looks wrong until you look at the deploy: cPanel
// Git Version Control copies files into public_html and runs nothing. There
// is no npm on the far end, so anything the browser needs has to be a file
// in this repo. The alternative is a build server for a static site.
//
// The whole tree is copied with its structure intact, because the CSS reaches
// across it: styles/base/fonts.css asks for ../../assets/fonts/, and
// styles/index.css asks for ../dist/tokens.css.
//
// Run: npm run vendor   (also runs on postinstall)
import { cp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkgDir = join(root, 'node_modules/@hobbs-og/design-system');
const dest = join(root, 'vendor/design-system');
const SUBTREES = ['styles', 'dist', 'assets'];

if (!existsSync(pkgDir)) {
  console.error('@hobbs-og/design-system is not installed. Run: npm install');
  process.exit(1);
}

const { version } = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'));

for (const sub of SUBTREES) {
  const from = join(pkgDir, sub);
  if (!existsSync(from)) {
    console.error(`Missing ${sub}/ in the installed package — is dist/ committed upstream?`);
    process.exit(1);
  }
}

await rm(dest, { recursive: true, force: true });
await mkdir(dirname(dest), { recursive: true });
for (const sub of SUBTREES) {
  await cp(join(pkgDir, sub), join(dest, sub), { recursive: true });
}

// A marker so the deployed tree says which version it is, and so a stale
// vendor/ is visible in a diff rather than only in behaviour.
await writeFile(
  join(dest, 'VERSION'),
  `@hobbs-og/design-system ${version}\n` +
  `Vendored by tools/vendor.mjs — do not hand-edit. To change anything in\n` +
  `here, change it in the design system repo, tag a release, bump the ref in\n` +
  `package.json, then run: npm install && npm run vendor\n`
);

console.log(`Vendored @hobbs-og/design-system ${version} -> vendor/design-system/`);
