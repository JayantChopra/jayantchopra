import './inline-icons.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contributions } from '../docs/profile-data.mjs';
import { renderPreview } from '../docs/text-art.mjs';

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

// The README image and live card use the same character-animation frames.
const frames = Array.from({ length: 16 }, (_, i) => `<g class="preview-frame" style="animation-delay:${i / 8 - 2}s">${renderPreview(i / 8).split('\n').map((line, row) => `<text x="382" y="${132 + row * 9}">${line}</text>`).join('')}</g>`).join('');
writeFileSync(new URL('../docs/preview.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-labelledby="title desc">
  <title id="title">Space Invaders. Click to enter the game.</title>
  <desc id="desc">A ship fires at aliens drawn with text characters.</desc>
  <style>
    text { font-family:Menlo,Consolas,"DejaVu Sans Mono",monospace; white-space:pre; font-variant-ligatures:none; }
    .preview-frame { opacity:0; animation:frame 2s steps(1,end) infinite; }
    @keyframes frame { 0%,6.249% { opacity:1; } 6.25%,100% { opacity:0; } }
    @media (prefers-reduced-motion:reduce) { .preview-frame { animation:none; } .preview-frame:first-child { opacity:1; } }
  </style>
  <rect x=".5" y=".5" width="639" height="359" rx="5" fill="#151b23" stroke="#3d444d"/>
  <path d="M1 32h638" stroke="#3d444d"/>
  <text x="12" y="21" font-size="10" fill="#a1abb6">jayantchopra / <tspan fill="#e6edf3">Space Invaders</tspan></text>
  <text x="28" y="162" font-size="20" font-weight="600" fill="#e6edf3"># Space Invaders</text>
  <text x="28" y="187" font-size="11" fill="#a1abb6">A game made of text.</text>
  <text x="28" y="231" font-size="12" fill="#adf0c0">[ enter game ]</text>
  <g xml:space="preserve" font-size="9" fill="#c9d1d9">${frames}</g>
</svg>\n`);

// Change the README image URL whenever its contents change, avoiding stale image caches.
const preview = readFileSync(new URL('../docs/preview.svg', import.meta.url));
const version = createHash('sha256').update(preview).digest('hex').slice(0, 12);
const readme = new URL('../README.md', import.meta.url);
writeFileSync(readme, readFileSync(readme, 'utf8').replace(/src="docs\/preview\.svg(?:\?v=[^"]*)?"/, `src="docs/preview.svg?v=${version}"`));
