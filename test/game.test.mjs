import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contributions } from '../docs/profile-data.mjs';
import { createGame, step, chooseUpgrade, upgradeChoices, WIDTH } from '../docs/engine.mjs';
import { ALIENS, SHIP, SHIPS, TITLE_ART, renderBoard, renderPreview, COLUMNS, ROWS, CELL_W, CELL_H } from '../docs/text-art.mjs';
import { setAudioState, unlockAudio, playSound } from '../docs/audio.mjs';

const start = () => Object.assign(createGame(), { mode: 'playing' });
const tick = (game, input = {}, dt = .016) => step(game, input, dt, () => .5);

// A shot hits only one alien and awards its points.
const hit = start();
const target = hit.enemies[10];
hit.bullets.push({ x: target.x + 10, y: target.y + 10, w: 4, h: 14, active: true });
tick(hit);
assert.equal(target.alive, false);
assert.equal(hit.score, 10);
assert.equal(hit.bullets.length, 0);

// Simultaneous hits cost one life; the shield protects the next frame.
const damage = start();
const bomb = () => ({ x: damage.player.x + 10, y: damage.player.y, w: 5, h: 14, active: true });
damage.bombs.push(bomb(), bomb());
tick(damage);
assert.equal(damage.lives, 2);
damage.bombs.push(bomb());
tick(damage);
assert.equal(damage.lives, 2);
damage.invulnerable = 0;
damage.lives = 1;
damage.bombs.push(bomb());
tick(damage);
assert.equal(damage.mode, 'over');

// The fleet reverses and descends at a wall.
const edge = start();
edge.enemies.forEach((enemy, i) => { enemy.alive = i === 0; });
edge.enemies[0].x = WIDTH - edge.enemies[0].w - 20;
edge.march = 0;
const oldY = edge.enemies[0].y;
tick(edge);
assert.equal(edge.direction, -1);
assert.equal(edge.enemies[0].y, oldY + CELL_H);

// Clearing a wave preserves score and lives, and resets the formation.
const clear = start();
clear.enemies.forEach(enemy => { enemy.alive = false; });
clear.score = 500;
clear.lives = 2;
tick(clear);
for (let i = 0; i < 70; i++) tick(clear);
assert.equal(clear.wave, 2);
assert.equal(clear.enemies.filter(enemy => enemy.alive).length, 15);
assert.equal(clear.score, 500);
assert.equal(clear.lives, 2);

// Wave three pauses for one upgrade, then starts a moving, damageable boss.
const bossRound = (lives = 3) => {
  const game = start();
  Object.assign(game, { wave: 2, nextWave: .01, lives, score: 600 });
  tick(game);
  return game;
};
const boss = bossRound();
assert.equal(boss.mode, 'upgrade');
assert.equal(boss.wave, 3);
assert.deepEqual(upgradeChoices(boss), ['speed', 'damage']);
const frozenBoss = JSON.stringify(boss);
tick(boss, { fire: true });
assert.equal(JSON.stringify(boss), frozenBoss);
assert.equal(chooseUpgrade(boss, 'health'), false);
assert.equal(chooseUpgrade(boss, 'damage'), true);
assert.equal(chooseUpgrade(boss, 'damage'), false);
assert.equal(boss.damage, 2);
assert.equal(boss.score, 600);
assert.equal(boss.enemies.length, 0);
const bossX = boss.boss.x, bossY = boss.boss.y;
boss.boss.fire = 0;
tick(boss);
assert.ok(boss.boss.x > bossX);
assert.equal(boss.boss.y, bossY);
assert.equal(boss.bombs.length, 5);
assert.ok(boss.bombs.some(shot => shot.vx < 0) && boss.bombs.some(shot => shot.vx > 0));
assert.ok(renderBoard(boss).includes('hallucinator ['));
assert.ok(renderBoard(boss).split('\n').every(line => [...line].length === COLUMNS + 2));
boss.boss.x = WIDTH - boss.boss.w - 24;
tick(boss);
assert.equal(boss.boss.direction, -1);
boss.bullets.push({ x: boss.boss.x + 10, y: boss.boss.y + 20, w: CELL_W, h: CELL_H, active: true });
tick(boss);
assert.equal(boss.boss.hp, 30);
assert.equal(boss.score, 605);
boss.boss.hp = 1;
boss.bullets.push({ x: boss.boss.x + 10, y: boss.boss.y + 20, w: CELL_W, h: CELL_H, active: true });
tick(boss);
assert.equal(boss.boss.hp, 0);
assert.equal(boss.score, 1105);
assert.equal(boss.nextWave, 1);
for (let i = 0; i < 70; i++) tick(boss);
assert.equal(boss.wave, 4);
assert.equal(boss.boss, null);
assert.equal(boss.enemies.length, 15);
assert.equal(boss.damage, 2);
const heal = bossRound(1);
assert.deepEqual(upgradeChoices(heal), ['damage', 'health']);
assert.equal(chooseUpgrade(heal, 'health'), true);
assert.equal(heal.lives, 3);
const fast = bossRound();
chooseUpgrade(fast, 'speed');
assert.equal(fast.speed, 429);
const firing = start();
firing.player.x = 18;
for (let i = 0; i < 20; i++) tick(firing, { fire: true });
assert.ok(firing.bullets.length >= 2, 'Holding the pointer must repeat shots');
const tapping = start();
tapping.player.x = 18;
tick(tapping, { firePressed: true });
for (let i = 0; i < 20; i++) tick(tapping);
assert.equal(tapping.bullets.length, 1, 'One press must fire only once');
tick(tapping, { firePressed: true });
assert.equal(tapping.bullets.length, 2, 'Another press must fire another shot');

// Reaching the ship ends the game even with lives remaining.
const invasion = start();
invasion.enemies[0].y = invasion.player.y;
tick(invasion);
assert.equal(invasion.mode, 'over');

// Pauses freeze state, bad timing is ignored, and movement stays on screen.
const bounds = start();
bounds.mode = 'paused';
const before = JSON.stringify(bounds);
tick(bounds, { left: true, fire: true });
assert.equal(JSON.stringify(bounds), before);
bounds.mode = 'playing';
tick(bounds, {}, NaN);
for (let i = 0; i < 200; i++) tick(bounds, { left: true, fire: true });
assert.equal(bounds.player.x, 18);
for (let i = 0; i < 200; i++) tick(bounds, { right: true, fire: true });
assert.equal(bounds.player.x, WIDTH - bounds.player.w - 18);

// Text cells and hitboxes share the same dimensions, including both poses.
const art = createGame();
assert.equal(art.player.w, SHIP[0].length * CELL_W);
assert.equal(art.player.h, SHIP.length * CELL_H);
for (const enemy of art.enemies) {
  assert.ok(enemy.x >= 0 && enemy.x + enemy.w <= WIDTH, 'Fleet must fit the wide card');
  assert.ok(enemy.y + enemy.h < art.player.y, 'Fleet needs room above the ship');
  for (const pose of ALIENS[enemy.row % ALIENS.length]) {
    assert.ok(pose.every(line => line.length * CELL_W === enemy.w));
    assert.equal(pose.length * CELL_H, enemy.h);
  }
}
const lines = renderBoard(art).split('\n');
assert.equal(lines.length, ROWS + 2);
assert.ok(lines.every(line => [...line].length === COLUMNS + 2));
assert.ok(lines.some(line => line.includes(SHIP[2])));
const still = renderBoard(art, true);
art.time = .6;
assert.equal(renderBoard(art, true), still);
assert.notEqual(renderBoard(art), still);
art.bullets.push({ x: -500, y: -500 });
art.bombs.push({ x: WIDTH + 100, y: 9999 });
assert.doesNotThrow(() => renderBoard(art));

// Cosmetic ships share hitboxes, and the preview is a fixed-size shooting loop.
for (const [index, ship] of SHIPS.entries()) {
  assert.equal(ship.art.length, SHIP.length);
  assert.ok(ship.art.every(line => [...line].length === SHIP[0].length), ship.name);
  assert.ok(renderBoard(createGame(), true, index).includes(ship.art[2]));
  const preview = renderPreview(.5, index).split('\n');
  assert.equal(preview.length, 16);
  assert.ok(preview.every(line => [...line].length === 42));
}
assert.notEqual(renderPreview(.1), renderPreview(.6));
assert.equal(renderPreview(.1, 0, true), renderPreview(1.2, 0, true));
assert.ok(renderPreview(.4).includes('│'));
assert.equal(TITLE_ART.split('\n').length, 11);
assert.ok(TITLE_ART.split('\n').every(line => [...line].length === 47));

// Audio has one context, separate switches, and no sound before opting in.
let contexts = 0, tones = 0;
const parameter = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} };
globalThis.AudioContext = class {
  constructor() { contexts++; this.state = 'suspended'; this.currentTime = 0; }
  async resume() { this.state = 'running'; }
  createGain() { return { gain: parameter, connect(bus) { return bus; }, disconnect() {} }; }
  createOscillator() { tones++; return { frequency: parameter, connect(bus) { return bus; }, start() {}, stop() {}, disconnect() {} }; }
};
await unlockAudio();
assert.equal(contexts, 0);
setAudioState({ sfx: true, playing: true });
assert.equal(await unlockAudio(), true);
playSound('shot');
assert.equal(tones, 1);
setAudioState({ sfx: false });
playSound('hit');
assert.equal(tones, 1);
setAudioState({ music: true });
assert.ok(tones > 1);
setAudioState({ music: false, playing: false });
const stopped = tones;
await new Promise(resolve => setTimeout(resolve, 220));
assert.equal(tones, stopped);
await unlockAudio();
assert.equal(contexts, 1);
delete globalThis.AudioContext;

// The static page must contain every control the game wires up.
const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../docs/game.mjs', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const [, id] of controller.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(id), `Missing game control: ${id}`);
assert.equal(contributions.levels.length, 53 * 7);
assert.match(contributions.levels, /^[0-4]+$/);
assert.equal(contributions.levels[21], '1', 'Snapshot must be chronological, not calendar-table row order');
assert.equal(new Date(Date.parse(contributions.start) + (contributions.levels.length - 1) * 86400000).toISOString().slice(0, 10), '2026-09-05');

// Icons must render from the HTML itself, even before JavaScript loads.
const icons = [...html.matchAll(/<svg data-icon="([^"]+)"([^>]*)>([\s\S]*?)<\/svg>/g)];
assert.ok(icons.length > 60);
for (const [, name, attributes, paths] of icons) {
  assert.match(attributes, /viewBox=/, `Missing viewBox: ${name}`);
  assert.match(paths, /<path\b/, `Missing inline paths: ${name}`);
  assert.doesNotMatch(paths, /<use\b/, `External icon reference: ${name}`);
}
assert.equal((html.match(/class="nav-menu"/g) || []).length, 5);
for (const org of ['stanwith', 'graypass-org']) assert.ok(html.includes(`href="https://github.com/${org}"`));
assert.match(html, /81 percent commits, 16 percent pull requests, 3 percent code review/);
assert.equal((html.match(/class="timeline-item" open/g) || []).length, 2);

// Static cells must survive a blocked script, and the entry point needs no module loader.
const calendar = html.match(/<div class="days"[^>]*>([\s\S]*?)<\/div>/)[1];
const cells = [...calendar.matchAll(/data-level="(\d)" data-date="([^"]+)"/g)];
assert.equal(cells.length, 371);
assert.equal(cells.map(cell => cell[1]).join(''), contributions.levels);
assert.equal(cells[21][2], '2025-09-21');
assert.match(html, /<script defer src="\.\/app\.js/);
assert.doesNotMatch(html, /<script[^>]*type="module"/);
const bundle = readFileSync(new URL('../docs/app.js', import.meta.url), 'utf8');
assert.doesNotMatch(bundle, /^\s*(import|export)\s/m);
assert.doesNotMatch(bundle, /\bimport\s*\(/);
assert.doesNotMatch(html, /where i work\/ed|best score saved in this browser|data-control=|class="game-footer"/);
assert.doesNotMatch(controller, /Your game is right where you left it|\[ resume \]/);
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
assert.doesNotMatch(readme, /If only GitHub allowed this|Play the game you see above/);
assert.equal((readme.match(/href="https:\/\/jayantchopra.github.io\/jayantchopra\/"/g) || []).length, 1);
const previewVersion = createHash('sha256').update(readFileSync(new URL('../docs/preview.svg', import.meta.url))).digest('hex').slice(0, 12);
assert.ok(readme.includes(`<a href="https://jayantchopra.github.io/jayantchopra/"><img src="docs/preview.svg?v=${previewVersion}"`));
assert.doesNotMatch(readFileSync(new URL('../docs/preview.svg', import.meta.url), 'utf8'), /Play the game you see above|↑/);
assert.match(html, /id="arcade-link" href="https:\/\/github.com\/JayantChopra">Back to the boring GitHub\.\.\.<\/a>/);
assert.doesNotMatch(controller, /\$\('arcade-link'\)\.addEventListener|Hold space to fire/);
assert.equal((readFileSync(new URL('../docs/preview.svg', import.meta.url), 'utf8').match(/class="preview-frame"/g) || []).length, 16);

console.log('Game and profile checks passed: engine, text rendering, controls, snapshot, inline icons, menus, organizations, and activity.');
