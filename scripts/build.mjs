import './inline-icons.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contributions } from '../docs/profile-data.mjs';
import { previewSvg } from '../docs/preview.mjs';

const page = new URL('../docs/index.html', import.meta.url);
let html = readFileSync(page, 'utf8');
const start = Date.parse(`${contributions.start}T00:00:00Z`);
const months = [], days = [];
const monthFormat = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });
for (const [index, level] of [...contributions.levels].entries()) {
  const date = new Date(start + index * 86400000);
  days.push(`<span data-level="${level}" data-date="${date.toISOString().slice(0, 10)}"></span>`);
  if (date.getUTCDate() === 1 && index < 350) {
    months.push(`<span style="grid-column:${Math.floor(index / 7) + 1} / span 3">${monthFormat.format(date)}</span>`);
  }
}
html = html.replace(/(<div class="months"[^>]*>)[\s\S]*?(<\/div>)/, `$1${months.join('')}$2`)
  .replace(/(<div class="days"[^>]*>)[\s\S]*?(<\/div>)/, `$1${days.join('')}$2`)
  .replace(/(<h2 id="contributions-heading">)[^<]+/, `$1${contributions.total} contributions in the last year`);
writeFileSync(page, html);

writeFileSync(new URL('../docs/preview.svg', import.meta.url), previewSvg());

// Change the README image URL whenever its contents change, avoiding stale image caches.
const preview = readFileSync(new URL('../docs/preview.svg', import.meta.url));
const version = createHash('sha256').update(preview).digest('hex').slice(0, 12);
const readme = new URL('../README.md', import.meta.url);
writeFileSync(readme, readFileSync(readme, 'utf8').replace(/src="docs\/preview\.svg(?:\?v=[^"]*)?"/, `src="docs/preview.svg?v=${version}"`));
