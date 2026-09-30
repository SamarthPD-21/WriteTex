/**
 * Renders the extension icons and store artwork from the SVG masters in
 * assets/brand/. Requires `rsvg-convert` (librsvg) on PATH.
 *
 *   node scripts/generate-icons.js
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = path.join(root, 'assets/brand');
const iconsDir = path.join(root, 'public/icons');
const storeDir = path.join(root, 'store');

function render(svg, out, size, height = size) {
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(height), path.join(brand, svg), '-o', out]);
  console.log(`  ${path.relative(root, out)} (${size}x${height})`);
}

try {
  execFileSync('rsvg-convert', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('rsvg-convert not found. Install librsvg (e.g. `pacman -S librsvg`, `brew install librsvg`, `apt install librsvg2-bin`).');
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });
console.log('Rendering icons…');
// Small sizes use a full-bleed variant drawn for legibility at toolbar size
render('icon-small.svg', path.join(iconsDir, 'icon-16.png'), 16);
render('icon-small.svg', path.join(iconsDir, 'icon-32.png'), 32);
render('icon.svg', path.join(iconsDir, 'icon-48.png'), 48);
render('icon.svg', path.join(iconsDir, 'icon-128.png'), 128);
render('icon.svg', path.join(storeDir, 'store-icon-128.png'), 128);
render('promo-tile.svg', path.join(storeDir, 'promo-small-440x280.png'), 440, 280);
console.log('Done.');
