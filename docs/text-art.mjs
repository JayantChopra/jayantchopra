// Character conversions of WaffleKilometer's CC0 sprites. See art-sources.txt.
export const COLUMNS = 110, ROWS = 26, CELL_W = 8, CELL_H = 16;
export const TITLE_ART = "         █████ ████   ███   ████ █████         \n         █     █   █ █   █ █     █             \n         █████ ████  █████ █     ████          \n             █ █     █   █ █     █             \n         █████ █     █   █  ████ █████         \n                                               \n█████ █   █ █   █  ███  ████  █████ ████  █████\n  █   ██  █ █   █ █   █ █   █ █     █   █ █    \n  █   █ █ █ █   █ █████ █   █ ████  ████  █████\n  █   █  ██  █ █  █   █ █   █ █     █ █       █\n█████ █   █   █   █   █ ████  █████ █  █  █████";
export const SHIP = ['      █      ', ' ▄▄▄█ █ █▄▄▄ ', '█████████████', '█████████████'];
export const SHIPS = [
  { name: 'Classic', art: SHIP },
  { name: 'Dart', art: ['      ▲      ', '     ▟█▙     ', '  ▄▟█████▙▄  ', ' ▀▀██▀ ▀██▀▀ '] },
  { name: 'Twin', art: ['   ▌     ▐   ', '  ▟█▙   ▟█▙  ', ' ███████████ ', '▀███▀ ▀ ▀███▀'] },
  { name: 'Saucer', art: ['    ▄███▄    ', ' ▄█████████▄ ', '▀▀█████████▀▀', '   ▀█▀ ▀█▀   '] },
];
export const ALIENS = [
  [
    ['  ▄▀▀▄  ', '▄██▄▄██▄', '▀█▀██▀█▀', '▀▄▄  ▄▄▀'],
    [' ▄█▀▀█▄ ', '███▄▄███', '▄▀ ▀▀ ▀▄', ' ▀▄  ▄▀ '],
  ],
  [
    ['▄▄▄▄███▄▄▄▄', '█▀ ██▀▀█ ▀█', '  ▄██▄▄█▄  ', '  █ ███ █  '],
    ['    ▄▄▄    ', '██▀██▀▀█▀██', '▀ ███▄▄██ ▀', ' ▀▄ ▀▀▀ ▄▀ '],
  ],
  [
    ['  ▄▄████▄▄  ', '█████  █████', '  ▀▀████▀▀  ', ' ▀▀▄▄▀▀▄▄▀▀ '],
    [' ▄▄██████▄▄ ', '█████  █████', ' ▀▀██████▀▀ ', '▀▀▄▄▀  ▀▄▄▀▀'],
  ],
];
export const BURST = ['  ▀▄  █ ▄▀ ▄▄ ', '▄▄▄ ▀     ▀   ', '   ▄     ▄ ▀▀▀', ' ▀▀ ▄▀ █  ▀▄  '];
// Temporary CC0 sprite enlargement until the requested Hallucinator artwork is supplied.
export const BOSS_ART = ALIENS[1][0].flatMap(line => Array(2).fill([...line].map(char => char.repeat(3)).join('')));

function draw(cells, text, x, y) {
  for (const [row, line] of text.entries()) for (const [col, char] of [...line].entries()) {
    if (char !== ' ' && cells[y + row] && x + col >= 0 && x + col < cells[y + row].length) cells[y + row][x + col] = char;
  }
}

export function renderPreview(time = 0, ship = 0, reducedMotion = false) {
  if (reducedMotion) time = 0;
  const cells = Array.from({ length: 16 }, () => Array(42).fill(' '));
  const phase = time % 2, pose = Math.floor(time * 2) % 2;
  for (let i = 0; i < 3; i++) {
    if (i !== 1 || phase < .9 || phase > 1.4) draw(cells, ALIENS[2][pose], i * 15, 0);
    else if (phase < 1.15) draw(cells, BURST, 14, 0);
  }
  const x = 15 + Math.round(Math.sin(time * Math.PI) * 3);
  draw(cells, SHIPS[ship].art, x, 12);
  if (phase < .9) draw(cells, ['│'], x + 6, 11 - Math.floor(phase * 9));
  return cells.map(row => row.join('')).join('\n');
}

export function renderBoard(game, reducedMotion = false, ship = 0) {
  const cells = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(' '));
  const put = (text, x, y) => draw(cells, text, x, y);
  for (let i = 0; i < 28; i++) cells[(i * 11 + 5) % (ROWS - 3)][(i * 23 + 7) % COLUMNS] = i % 4 ? '·' : '⋅';
  const frame = reducedMotion ? 0 : Math.floor(game.time * 2) % 2;
  for (const enemy of game.enemies) {
    if (enemy.alive) put(ALIENS[enemy.row % ALIENS.length][frame], Math.round(enemy.x / CELL_W), Math.round(enemy.y / CELL_H));
  }
  if (game.boss?.hp > 0) {
    const boss = game.boss, filled = Math.ceil(boss.hp / boss.maxHp * 24);
    const health = `hallucinator [${'█'.repeat(filled)}${'░'.repeat(24 - filled)}] ${boss.hp}/${boss.maxHp}`;
    put([health], Math.floor((COLUMNS - health.length) / 2), 0);
    put(BOSS_ART, Math.round(boss.x / CELL_W), Math.round(boss.y / CELL_H));
  }
  for (const bullet of game.bullets) put(['│'], Math.round(bullet.x / CELL_W), Math.round(bullet.y / CELL_H));
  for (const bomb of game.bombs) put([bomb.vx > 20 ? '╲' : bomb.vx < -20 ? '╱' : '╎'], Math.round(bomb.x / CELL_W), Math.round(bomb.y / CELL_H));
  if (!reducedMotion) for (const burst of game.bursts) put(BURST, Math.round(burst.x / CELL_W) - 7, Math.round(burst.y / CELL_H) - 2);
  put(SHIPS[ship].art, Math.round(game.player.x / CELL_W), Math.round(game.player.y / CELL_H));
  if (game.invulnerable > 0) {
    const x = Math.round(game.player.x / CELL_W), y = Math.round(game.player.y / CELL_H);
    put(['╭' + '─'.repeat(SHIP[0].length) + '╮'], x - 1, y - 1);
  }
  if (game.nextWave > 0) put(['[ wave cleared ]'], Math.floor((COLUMNS - 16) / 2), 16);
  return ['╭' + '─'.repeat(COLUMNS) + '╮', ...cells.map(row => '│' + row.join('') + '│'), '╰' + '─'.repeat(COLUMNS) + '╯'].join('\n');
}
