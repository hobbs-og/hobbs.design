// Appends this site's own icons to the sprite. hobbs-icons rewrites
// src/public/icons.svg from Bootstrap Icons on every run, so anything added
// to the sprite by hand would be lost. Custom symbols live in src/icons/*.svg
// instead, and this runs straight after hobbs-icons (see `npm run build:icons`).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const spritePath = join(root, 'src/public/icons.svg');
const sourceDir = join(root, 'src/icons');

const symbols = readdirSync(sourceDir)
  .filter((file) => file.endsWith('.svg'))
  .sort()
  .flatMap((file) => readFileSync(join(sourceDir, file), 'utf8').match(/<symbol\b[\s\S]*?<\/symbol>/g) ?? []);

const sprite = readFileSync(spritePath, 'utf8');
const ids = symbols.map((s) => s.match(/\bid="([^"]+)"/)[1]);
const clash = ids.find((id) => sprite.includes(`id="${id}"`));
if (clash) {
  console.error(`src/public/icons.svg already has #${clash}. Run hobbs-icons first; this script only appends.`);
  process.exit(1);
}

const closing = sprite.lastIndexOf('</svg>');
writeFileSync(spritePath, `${sprite.slice(0, closing)}${symbols.map((s) => `  ${s}\n`).join('')}${sprite.slice(closing)}`);
console.log(`Added ${symbols.length} custom icon(s) to src/public/icons.svg: ${ids.join(', ')}`);
