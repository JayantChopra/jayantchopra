import { renderPreview } from './text-art.mjs';

// Both the README image and the live card use this artwork at the same aspect ratio.
export function previewSvg(ship = 0) {
  const frames = Array.from({ length: 16 }, (_, i) => `<g class="preview-frame" style="animation-delay:${i / 8 - 2}s">${renderPreview(i / 8, ship).split('\n').map((line, row) => `<text x="382" y="${132 + row * 9}">${line}</text>`).join('')}</g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-labelledby="preview-title preview-desc">
  <title id="preview-title">Space Invaders. Click to enter the game.</title>
  <desc id="preview-desc">A ship fires at aliens drawn with text characters.</desc>
  <style>
    .profile-preview text { font-family:Menlo,Consolas,"DejaVu Sans Mono",monospace; white-space:pre; font-variant-ligatures:none; }
    .preview-frame { opacity:0; animation:preview-frame 2s steps(1,end) infinite; }
    @keyframes preview-frame { 0%,6.249% { opacity:1; } 6.25%,100% { opacity:0; } }
    @media (prefers-reduced-motion:reduce) { .preview-frame { animation:none; } .preview-frame:first-child { opacity:1; } }
  </style>
  <g class="profile-preview">
    <rect x=".5" y=".5" width="639" height="359" rx="5" fill="#151b23" stroke="#3d444d"/>
    <path d="M1 32h638" stroke="#3d444d"/>
    <text x="12" y="21" font-size="10" fill="#a1abb6">jayantchopra / <tspan fill="#e6edf3">Space Invaders</tspan></text>
    <text x="622" y="21" text-anchor="end" font-size="9" fill="#9198a1">[ settings ]</text>
    <text x="28" y="162" font-size="20" font-weight="600" fill="#e6edf3"># Space Invaders</text>
    <text x="28" y="187" font-size="11" fill="#a1abb6">A game made of text.</text>
    <text x="28" y="231" font-size="12" fill="#adf0c0">[ enter game ]</text>
    <g xml:space="preserve" font-size="9" fill="#c9d1d9">${frames}</g>
  </g>
</svg>\n`;
}
