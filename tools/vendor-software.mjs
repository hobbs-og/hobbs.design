// Copies @hobbs-og/software's web output into vendor/software/, the same way
// tools/vendor.mjs copies the old system: cPanel runs no build, so the browser's
// files have to be committed.
//
// Source, in order: SOFTWARE_DIR (a local checkout of hobbs-og/software, for
// unreleased work), then node_modules/@hobbs-og/software once a tag is pinned.
import { cpSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const candidates = [process.env.SOFTWARE_DIR, join(root, 'node_modules/@hobbs-og/software')].filter(Boolean);
const source = candidates.map((dir) => join(dir, 'platforms/web')).find((dir) => existsSync(join(dir, 'tokens.css')));
if (!source) {
  console.error('No @hobbs-og/software build found. Set SOFTWARE_DIR to a checkout of hobbs-og/software, or install a tagged release.');
  process.exit(1);
}

const out = join(root, 'vendor/software');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of ['tokens.css', 'fonts.css', 'grid.css', 'fonts']) cpSync(join(source, file), join(out, file), { recursive: true });
cpSync(join(source, '../../components/web'), join(out, 'components'), { recursive: true });
console.log(`vendor/software ← ${source}`);
