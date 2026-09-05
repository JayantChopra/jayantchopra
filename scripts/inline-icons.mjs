import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../docs/assets/github-icons.svg', import.meta.url), 'utf8');
const icons = new Map([...source.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)]
  .map(([, name, viewBox, body]) => [name, { viewBox, body }]));
const page = new URL('../docs/index.html', import.meta.url);
const html = readFileSync(page, 'utf8').replace(/<svg data-icon="([^"]+)"[^>]*>[\s\S]*?<\/svg>/g, (_, name) => {
  const icon = icons.get(name);
  if (!icon) throw new Error(`Missing icon: ${name}`);
  return `<svg data-icon="${name}" viewBox="${icon.viewBox}" width="16" height="16" aria-hidden="true" fill="currentColor">${icon.body.trim()}</svg>`;
});
writeFileSync(page, html);
