import { ALIENS, BOSS_ART, SHIP, COLUMNS, ROWS, CELL_W, CELL_H } from './text-art.mjs';

export const WIDTH = COLUMNS * CELL_W;
export const HEIGHT = ROWS * CELL_H;
const SHIP_Y = HEIGHT - (SHIP.length + 1) * CELL_H;

function fleet() {
  return Array.from({ length: 15 }, (_, i) => ({
    x: 112 + (i % 5) * 144, y: 32 + Math.floor(i / 5) * 80,
    w: ALIENS[Math.floor(i / 5) % ALIENS.length][0][0].length * CELL_W,
    h: 4 * CELL_H, row: Math.floor(i / 5), col: i % 5,
    points: 30 - Math.floor(i / 5) * 10, alive: true,
  }));
}

export function createGame() {
  return {
    mode: 'ready', time: 0, score: 0, wave: 1, lives: 3,
    player: { x: (WIDTH - SHIP[0].length * CELL_W) / 2, y: SHIP_Y, w: SHIP[0].length * CELL_W, h: SHIP.length * CELL_H },
    enemies: fleet(), bullets: [], bombs: [], bursts: [],
    direction: 1, march: .4, enemyFire: 1.1, fire: 0, invulnerable: 0,
    nextWave: 0, boss: null, damage: 1, speed: 330,
  };
}

export function upgradeChoices(game) {
  return game.lives < 3 ? ['damage', 'health'] : ['speed', 'damage'];
}

export function chooseUpgrade(game, choice) {
  if (game.mode !== 'upgrade' || !upgradeChoices(game).includes(choice)) return false;
  if (choice === 'health') game.lives = 3;
  if (choice === 'damage') game.damage++;
  if (choice === 'speed') game.speed *= 1.3;
  game.mode = 'playing';
  game.invulnerable = 1.5;
  return true;
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function step(game, input, dt, random = Math.random) {
  if (game.mode !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, .05);
  game.time += dt;
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  game.bursts = game.bursts.filter(burst => (burst.life -= dt) > 0);
  game.player.x = Math.max(18, Math.min(WIDTH - game.player.w - 18,
    game.player.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * game.speed * dt));

  if (game.nextWave > 0) {
    game.nextWave -= dt;
    if (game.nextWave <= 0) {
      game.wave++;
      game.enemies = fleet();
      game.direction = 1;
      game.march = .4;
      game.enemyFire = 1;
      game.invulnerable = 1.5;
      game.boss = null;
      if (game.wave === 3) {
        const w = Math.max(...BOSS_ART.map(line => [...line].length)) * CELL_W;
        game.boss = { x: (WIDTH - w) / 2, y: 3 * CELL_H, w, h: BOSS_ART.length * CELL_H, hp: 32, maxHp: 32, direction: 1, fire: 1, volley: 0 };
        game.enemies = [];
        game.mode = 'upgrade';
      }
    }
    return;
  }

  game.fire -= dt;
  if (input.firePressed || (input.fire && game.fire <= 0)) {
    game.bullets.push({ x: game.player.x + game.player.w / 2 - 4, y: SHIP_Y - CELL_H, w: CELL_W, h: CELL_H, active: true });
    game.fire = .22;
  }
  for (const bullet of game.bullets) {
    bullet.y -= 460 * dt;
    if (game.boss?.hp > 0 && overlaps(bullet, game.boss)) {
      bullet.active = false;
      game.boss.hp = Math.max(0, game.boss.hp - game.damage);
      game.score += game.boss.hp === 0 ? 500 : 5;
      continue;
    }
    for (const enemy of game.enemies) {
      if (enemy.alive && overlaps(bullet, enemy)) {
        enemy.alive = false;
        bullet.active = false;
        game.score += enemy.points;
        game.bursts.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, life: .25, row: enemy.row });
        break;
      }
    }
  }
  game.bullets = game.bullets.filter(bullet => bullet.active && bullet.y + bullet.h > 0);
  const alive = game.enemies.filter(enemy => enemy.alive);
  if (!alive.length && (!game.boss || game.boss.hp === 0)) {
    game.nextWave = 1;
    game.bullets = [];
    game.bombs = [];
    return;
  }

  if (game.boss) {
    const boss = game.boss;
    boss.x += boss.direction * 100 * dt;
    if (boss.x <= 24 || boss.x + boss.w >= WIDTH - 24) {
      boss.x = Math.max(24, Math.min(WIDTH - boss.w - 24, boss.x));
      boss.direction *= -1;
    }
    boss.fire -= dt;
    if (boss.fire <= 0) {
      const x = boss.x + boss.w / 2, y = boss.y + boss.h;
      const aim = Math.atan2(game.player.x + game.player.w / 2 - x, game.player.y - y);
      for (const offset of [-.55, -.275, 0, .275, .55]) {
        const angle = (boss.volley % 2 ? aim : 0) + offset;
        game.bombs.push({ x, y, w: CELL_W, h: CELL_H, vx: Math.sin(angle) * 190, vy: Math.cos(angle) * 190, active: true });
      }
      boss.volley++;
      boss.fire = boss.hp < boss.maxHp / 2 ? .85 : 1.25;
    }
  } else {
    game.march -= dt;
    if (game.march <= 0) {
      const edge = alive.some(enemy => enemy.x + game.direction * 16 < 20 || enemy.x + enemy.w + game.direction * 16 > WIDTH - 20);
      if (edge) game.direction *= -1;
      for (const enemy of alive) {
        if (edge) enemy.y += CELL_H;
        else enemy.x += game.direction * 16;
      }
      game.march = Math.max(.08, .5 - game.wave * .025 - (15 - alive.length) * .018);
    }
    if (alive.some(enemy => enemy.y + enemy.h >= SHIP_Y)) {
      game.mode = 'over';
      return;
    }

    game.enemyFire -= dt;
    if (game.enemyFire <= 0) {
      const front = alive.filter(enemy => !alive.some(other => other.col === enemy.col && other.y > enemy.y));
      const enemy = front[Math.min(front.length - 1, Math.floor(random() * front.length))];
      game.bombs.push({ x: enemy.x + enemy.w / 2 - 4, y: enemy.y + enemy.h, w: CELL_W, h: CELL_H, active: true });
      game.enemyFire = Math.max(.3, 1.05 - game.wave * .06) + random() * .35;
    }
  }
  for (const bomb of game.bombs) {
    bomb.x += (bomb.vx || 0) * dt;
    bomb.y += (bomb.vy ?? Math.min(360, 180 + game.wave * 12)) * dt;
    if (overlaps(bomb, game.player)) {
      bomb.active = false;
      if (game.invulnerable <= 0) {
        game.lives--;
        game.invulnerable = 1.5;
        if (game.lives === 0) game.mode = 'over';
      }
    }
  }
  game.bombs = game.bombs.filter(bomb => bomb.active && bomb.y < HEIGHT && bomb.x + bomb.w > 0 && bomb.x < WIDTH);
}
