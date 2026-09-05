(() => {
  // docs/text-art.mjs
  var COLUMNS = 110;
  var ROWS = 26;
  var CELL_W = 8;
  var CELL_H = 16;
  var TITLE_ART = "         █████ ████   ███   ████ █████         \n         █     █   █ █   █ █     █             \n         █████ ████  █████ █     ████          \n             █ █     █   █ █     █             \n         █████ █     █   █  ████ █████         \n                                               \n█████ █   █ █   █  ███  ████  █████ ████  █████\n  █   ██  █ █   █ █   █ █   █ █     █   █ █    \n  █   █ █ █ █   █ █████ █   █ ████  ████  █████\n  █   █  ██  █ █  █   █ █   █ █     █ █       █\n█████ █   █   █   █   █ ████  █████ █  █  █████";
  var SHIP = ["      █      ", " ▄▄▄█ █ █▄▄▄ ", "█████████████", "█████████████"];
  var SHIPS = [
    { name: "Classic", art: SHIP },
    { name: "Dart", art: ["      ▲      ", "     ▟█▙     ", "  ▄▟█████▙▄  ", " ▀▀██▀ ▀██▀▀ "] },
    { name: "Twin", art: ["   ▌     ▐   ", "  ▟█▙   ▟█▙  ", " ███████████ ", "▀███▀ ▀ ▀███▀"] },
    { name: "Saucer", art: ["    ▄███▄    ", " ▄█████████▄ ", "▀▀█████████▀▀", "   ▀█▀ ▀█▀   "] }
  ];
  var ALIENS = [
    [
      ["  ▄▀▀▄  ", "▄██▄▄██▄", "▀█▀██▀█▀", "▀▄▄  ▄▄▀"],
      [" ▄█▀▀█▄ ", "███▄▄███", "▄▀ ▀▀ ▀▄", " ▀▄  ▄▀ "]
    ],
    [
      ["▄▄▄▄███▄▄▄▄", "█▀ ██▀▀█ ▀█", "  ▄██▄▄█▄  ", "  █ ███ █  "],
      ["    ▄▄▄    ", "██▀██▀▀█▀██", "▀ ███▄▄██ ▀", " ▀▄ ▀▀▀ ▄▀ "]
    ],
    [
      ["  ▄▄████▄▄  ", "█████  █████", "  ▀▀████▀▀  ", " ▀▀▄▄▀▀▄▄▀▀ "],
      [" ▄▄██████▄▄ ", "█████  █████", " ▀▀██████▀▀ ", "▀▀▄▄▀  ▀▄▄▀▀"]
    ]
  ];
  var BURST = ["  ▀▄  █ ▄▀ ▄▄ ", "▄▄▄ ▀     ▀   ", "   ▄     ▄ ▀▀▀", " ▀▀ ▄▀ █  ▀▄  "];
  var BOSS_ART = ALIENS[1][0].flatMap((line) => Array(2).fill([...line].map((char) => char.repeat(3)).join("")));
  function draw(cells, text, x, y) {
    for (const [row, line] of text.entries()) for (const [col, char] of [...line].entries()) {
      if (char !== " " && cells[y + row] && x + col >= 0 && x + col < cells[y + row].length) cells[y + row][x + col] = char;
    }
  }
  function renderPreview(time = 0, ship = 0, reducedMotion2 = false) {
    if (reducedMotion2) time = 0;
    const cells = Array.from({ length: 16 }, () => Array(42).fill(" "));
    const phase = time % 2, pose = Math.floor(time * 2) % 2;
    for (let i = 0; i < 3; i++) {
      if (i !== 1 || phase < 0.9 || phase > 1.4) draw(cells, ALIENS[2][pose], i * 15, 0);
      else if (phase < 1.15) draw(cells, BURST, 14, 0);
    }
    const x = 15 + Math.round(Math.sin(time * Math.PI) * 3);
    draw(cells, SHIPS[ship].art, x, 12);
    if (phase < 0.9) draw(cells, ["│"], x + 6, 11 - Math.floor(phase * 9));
    return cells.map((row) => row.join("")).join("\n");
  }
  function renderBoard(game2, reducedMotion2 = false, ship = 0) {
    const cells = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(" "));
    const put = (text, x, y) => draw(cells, text, x, y);
    for (let i = 0; i < 28; i++) cells[(i * 11 + 5) % (ROWS - 3)][(i * 23 + 7) % COLUMNS] = i % 4 ? "·" : "⋅";
    const frame2 = reducedMotion2 ? 0 : Math.floor(game2.time * 2) % 2;
    for (const enemy of game2.enemies) {
      if (enemy.alive) put(ALIENS[enemy.row % ALIENS.length][frame2], Math.round(enemy.x / CELL_W), Math.round(enemy.y / CELL_H));
    }
    if (game2.boss?.hp > 0) {
      const boss = game2.boss, filled = Math.ceil(boss.hp / boss.maxHp * 24);
      const health = `hallucinator [${"█".repeat(filled)}${"░".repeat(24 - filled)}] ${boss.hp}/${boss.maxHp}`;
      put([health], Math.floor((COLUMNS - health.length) / 2), 0);
      put(BOSS_ART, Math.round(boss.x / CELL_W), Math.round(boss.y / CELL_H));
    }
    for (const bullet of game2.bullets) put(["│"], Math.round(bullet.x / CELL_W), Math.round(bullet.y / CELL_H));
    for (const bomb of game2.bombs) put([bomb.vx > 20 ? "╲" : bomb.vx < -20 ? "╱" : "╎"], Math.round(bomb.x / CELL_W), Math.round(bomb.y / CELL_H));
    if (!reducedMotion2) for (const burst of game2.bursts) put(BURST, Math.round(burst.x / CELL_W) - 7, Math.round(burst.y / CELL_H) - 2);
    put(SHIPS[ship].art, Math.round(game2.player.x / CELL_W), Math.round(game2.player.y / CELL_H));
    if (game2.invulnerable > 0) {
      const x = Math.round(game2.player.x / CELL_W), y = Math.round(game2.player.y / CELL_H);
      put(["╭" + "─".repeat(SHIP[0].length) + "╮"], x - 1, y - 1);
    }
    if (game2.nextWave > 0) put(["[ wave cleared ]"], Math.floor((COLUMNS - 16) / 2), 16);
    return ["╭" + "─".repeat(COLUMNS) + "╮", ...cells.map((row) => "│" + row.join("") + "│"), "╰" + "─".repeat(COLUMNS) + "╯"].join("\n");
  }

  // docs/engine.mjs
  var WIDTH = COLUMNS * CELL_W;
  var HEIGHT = ROWS * CELL_H;
  var SHIP_Y = HEIGHT - (SHIP.length + 1) * CELL_H;
  function fleet() {
    return Array.from({ length: 15 }, (_, i) => ({
      x: 112 + i % 5 * 144,
      y: 32 + Math.floor(i / 5) * 80,
      w: ALIENS[Math.floor(i / 5) % ALIENS.length][0][0].length * CELL_W,
      h: 4 * CELL_H,
      row: Math.floor(i / 5),
      col: i % 5,
      points: 30 - Math.floor(i / 5) * 10,
      alive: true
    }));
  }
  function createGame() {
    return {
      mode: "ready",
      time: 0,
      score: 0,
      wave: 1,
      lives: 3,
      player: { x: (WIDTH - SHIP[0].length * CELL_W) / 2, y: SHIP_Y, w: SHIP[0].length * CELL_W, h: SHIP.length * CELL_H },
      enemies: fleet(),
      bullets: [],
      bombs: [],
      bursts: [],
      direction: 1,
      march: 0.4,
      enemyFire: 1.1,
      fire: 0,
      invulnerable: 0,
      nextWave: 0,
      boss: null,
      damage: 1,
      speed: 330
    };
  }
  function upgradeChoices(game2) {
    return game2.lives < 3 ? ["damage", "health"] : ["speed", "damage"];
  }
  function chooseUpgrade(game2, choice) {
    if (game2.mode !== "upgrade" || !upgradeChoices(game2).includes(choice)) return false;
    if (choice === "health") game2.lives = 3;
    if (choice === "damage") game2.damage++;
    if (choice === "speed") game2.speed *= 1.3;
    game2.mode = "playing";
    game2.invulnerable = 1.5;
    return true;
  }
  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function step(game2, input, dt, random = Math.random) {
    if (game2.mode !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    game2.time += dt;
    game2.invulnerable = Math.max(0, game2.invulnerable - dt);
    game2.bursts = game2.bursts.filter((burst) => (burst.life -= dt) > 0);
    game2.player.x = Math.max(18, Math.min(
      WIDTH - game2.player.w - 18,
      game2.player.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * game2.speed * dt
    ));
    if (game2.nextWave > 0) {
      game2.nextWave -= dt;
      if (game2.nextWave <= 0) {
        game2.wave++;
        game2.enemies = fleet();
        game2.direction = 1;
        game2.march = 0.4;
        game2.enemyFire = 1;
        game2.invulnerable = 1.5;
        game2.boss = null;
        if (game2.wave === 3) {
          const w = Math.max(...BOSS_ART.map((line) => [...line].length)) * CELL_W;
          game2.boss = { x: (WIDTH - w) / 2, y: 3 * CELL_H, w, h: BOSS_ART.length * CELL_H, hp: 32, maxHp: 32, direction: 1, fire: 1, volley: 0 };
          game2.enemies = [];
          game2.mode = "upgrade";
        }
      }
      return;
    }
    game2.fire -= dt;
    if (input.firePressed || input.fire && game2.fire <= 0) {
      game2.bullets.push({ x: game2.player.x + game2.player.w / 2 - 4, y: SHIP_Y - CELL_H, w: CELL_W, h: CELL_H, active: true });
      game2.fire = 0.22;
    }
    for (const bullet of game2.bullets) {
      bullet.y -= 460 * dt;
      if (game2.boss?.hp > 0 && overlaps(bullet, game2.boss)) {
        bullet.active = false;
        game2.boss.hp = Math.max(0, game2.boss.hp - game2.damage);
        game2.score += game2.boss.hp === 0 ? 500 : 5;
        continue;
      }
      for (const enemy of game2.enemies) {
        if (enemy.alive && overlaps(bullet, enemy)) {
          enemy.alive = false;
          bullet.active = false;
          game2.score += enemy.points;
          game2.bursts.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2, life: 0.25, row: enemy.row });
          break;
        }
      }
    }
    game2.bullets = game2.bullets.filter((bullet) => bullet.active && bullet.y + bullet.h > 0);
    const alive = game2.enemies.filter((enemy) => enemy.alive);
    if (!alive.length && (!game2.boss || game2.boss.hp === 0)) {
      game2.nextWave = 1;
      game2.bullets = [];
      game2.bombs = [];
      return;
    }
    if (game2.boss) {
      const boss = game2.boss;
      boss.x += boss.direction * 100 * dt;
      if (boss.x <= 24 || boss.x + boss.w >= WIDTH - 24) {
        boss.x = Math.max(24, Math.min(WIDTH - boss.w - 24, boss.x));
        boss.direction *= -1;
      }
      boss.fire -= dt;
      if (boss.fire <= 0) {
        const x = boss.x + boss.w / 2, y = boss.y + boss.h;
        const aim = Math.atan2(game2.player.x + game2.player.w / 2 - x, game2.player.y - y);
        for (const offset of [-0.55, -0.275, 0, 0.275, 0.55]) {
          const angle = (boss.volley % 2 ? aim : 0) + offset;
          game2.bombs.push({ x, y, w: CELL_W, h: CELL_H, vx: Math.sin(angle) * 190, vy: Math.cos(angle) * 190, active: true });
        }
        boss.volley++;
        boss.fire = boss.hp < boss.maxHp / 2 ? 0.85 : 1.25;
      }
    } else {
      game2.march -= dt;
      if (game2.march <= 0) {
        const edge = alive.some((enemy) => enemy.x + game2.direction * 16 < 20 || enemy.x + enemy.w + game2.direction * 16 > WIDTH - 20);
        if (edge) game2.direction *= -1;
        for (const enemy of alive) {
          if (edge) enemy.y += CELL_H;
          else enemy.x += game2.direction * 16;
        }
        game2.march = Math.max(0.08, 0.5 - game2.wave * 0.025 - (15 - alive.length) * 0.018);
      }
      if (alive.some((enemy) => enemy.y + enemy.h >= SHIP_Y)) {
        game2.mode = "over";
        return;
      }
      game2.enemyFire -= dt;
      if (game2.enemyFire <= 0) {
        const front = alive.filter((enemy2) => !alive.some((other) => other.col === enemy2.col && other.y > enemy2.y));
        const enemy = front[Math.min(front.length - 1, Math.floor(random() * front.length))];
        game2.bombs.push({ x: enemy.x + enemy.w / 2 - 4, y: enemy.y + enemy.h, w: CELL_W, h: CELL_H, active: true });
        game2.enemyFire = Math.max(0.3, 1.05 - game2.wave * 0.06) + random() * 0.35;
      }
    }
    for (const bomb of game2.bombs) {
      bomb.x += (bomb.vx || 0) * dt;
      bomb.y += (bomb.vy ?? Math.min(360, 180 + game2.wave * 12)) * dt;
      if (overlaps(bomb, game2.player)) {
        bomb.active = false;
        if (game2.invulnerable <= 0) {
          game2.lives--;
          game2.invulnerable = 1.5;
          if (game2.lives === 0) game2.mode = "over";
        }
      }
    }
    game2.bombs = game2.bombs.filter((bomb) => bomb.active && bomb.y < HEIGHT && bomb.x + bomb.w > 0 && bomb.x < WIDTH);
  }

  // docs/audio.mjs
  var context;
  var musicBus;
  var effectsBus;
  var timer;
  var beat = 0;
  var state = { music: false, sfx: false, playing: false };
  function tone(bus, frequency, duration, type = "square", end = frequency) {
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(1e-4, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 6e-3);
    gain.gain.exponentialRampToValueAtTime(1e-4, now + duration);
    oscillator.connect(gain).connect(bus);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  function scheduleMusic() {
    const bass = [110, 110, 146.83, 130.81, 110, 164.81, 146.83, 98];
    const melody = [440, 0, 523.25, 659.25, 587.33, 0, 523.25, 392, 440, 659.25, 783.99, 659.25, 587.33, 523.25, 392, 0];
    if (beat % 2 === 0) tone(musicBus, bass[beat / 2 % bass.length], 0.16, "triangle");
    if (melody[beat % melody.length]) tone(musicBus, melody[beat % melody.length], 0.11);
    beat++;
  }
  function setAudioState(next) {
    state = { ...state, ...next };
    if (!context) return;
    musicBus.gain.setTargetAtTime(state.playing && state.music ? 0.28 : 0, context.currentTime, 0.01);
    effectsBus.gain.setTargetAtTime(state.playing && state.sfx ? 0.45 : 0, context.currentTime, 0.01);
    const running = state.playing && state.music && context.state === "running";
    if (running && !timer) {
      scheduleMusic();
      timer = setInterval(scheduleMusic, 180);
    }
    if (!running && timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  async function unlockAudio() {
    if (!state.music && !state.sfx) return true;
    try {
      if (!context) {
        context = new AudioContext();
        musicBus = context.createGain();
        effectsBus = context.createGain();
        musicBus.connect(context.destination);
        effectsBus.connect(context.destination);
      }
      if (context.state !== "running") await context.resume();
      setAudioState({});
      return context.state === "running";
    } catch {
      return false;
    }
  }
  function playSound(name) {
    if (!state.sfx || !state.playing) return;
    if (name === "shot") tone(effectsBus, 1200, 0.07, "square", 240);
    if (name === "hit") tone(effectsBus, 220, 0.12, "triangle", 45);
    if (name === "damage") tone(effectsBus, 95, 0.28, "sawtooth", 25);
    if (name === "wave") tone(effectsBus, 330, 0.3, "triangle", 880);
  }

  // docs/profile.mjs
  var menus = [...document.querySelectorAll(".nav-menu")];
  function positionMenu(menu) {
    const panel = menu.querySelector(".nav-panel");
    panel.style.left = "0px";
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.min(0, innerWidth - 16 - rect.right)}px`;
  }
  for (const menu of menus) {
    let closeTimer;
    menu.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      clearTimeout(closeTimer);
      menus.forEach((other) => {
        if (other !== menu) other.open = false;
      });
      menu.open = true;
      positionMenu(menu);
      document.dispatchEvent(new Event("profile-interaction"));
    });
    menu.addEventListener("pointerleave", () => {
      closeTimer = setTimeout(() => {
        menu.open = false;
      }, 120);
    });
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      menus.forEach((other) => {
        if (other !== menu) other.open = false;
      });
      positionMenu(menu);
    });
    menu.addEventListener("focusout", (event) => {
      if (!menu.contains(event.relatedTarget)) menu.open = false;
    });
  }
  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const menu = menus.find((item) => item.open);
    if (menu) {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
    hideRepository();
  });
  var hovercard = document.createElement("aside");
  var repositories = [...document.querySelectorAll(".repo-card")];
  hovercard.className = "repo-hovercard";
  hovercard.hidden = true;
  hovercard.setAttribute("aria-label", "Repository preview");
  document.querySelector("#profile-scene").append(hovercard);
  var previewTimer;
  function hideRepository() {
    clearTimeout(previewTimer);
    hovercard.hidden = true;
  }
  function scheduleHide() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(hideRepository, 150);
  }
  function showRepository(link) {
    const card = repositories.find((repo) => repo.querySelector("h3>a").href === link.href);
    hovercard.replaceChildren(...[...card.children].map((child) => child.cloneNode(true)));
    hovercard.hidden = false;
    const rect = link.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left - 16, innerWidth - hovercard.offsetWidth - 12));
    const below = rect.top < hovercard.offsetHeight + 20;
    hovercard.classList.toggle("below", below);
    hovercard.style.left = `${left}px`;
    hovercard.style.top = `${below ? rect.bottom + 12 : rect.top - hovercard.offsetHeight - 12}px`;
    hovercard.style.setProperty("--arrow-left", `${Math.min(hovercard.offsetWidth - 28, Math.max(16, rect.left - left + 16))}px`);
  }
  for (const link of document.querySelectorAll(".repo-card h3>a,.overview-grid a")) {
    if (!repositories.some((repo) => repo.querySelector("h3>a").href === link.href)) continue;
    link.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => showRepository(link), 350);
    });
    link.addEventListener("pointerleave", scheduleHide);
    link.addEventListener("focus", () => showRepository(link));
    link.addEventListener("blur", (event) => {
      if (!hovercard.contains(event.relatedTarget)) scheduleHide();
    });
  }
  hovercard.addEventListener("pointerenter", () => clearTimeout(previewTimer));
  hovercard.addEventListener("pointerleave", scheduleHide);
  hovercard.addEventListener("focusout", (event) => {
    if (!hovercard.contains(event.relatedTarget)) scheduleHide();
  });
  document.addEventListener("click", (event) => {
    if (!hovercard.contains(event.target)) hideRepository();
  });
  window.addEventListener("scroll", hideRepository, { passive: true });
  window.addEventListener("resize", () => {
    hideRepository();
    menus.filter((menu) => menu.open).forEach(positionMenu);
  });
  document.addEventListener("profile-exit", () => {
    hideRepository();
    menus.forEach((menu) => {
      menu.open = false;
    });
  });
  var mobileTabs = document.querySelector(".profile-tabs").cloneNode(true);
  mobileTabs.classList.add("mobile-tabs");
  document.querySelector(".sidebar").after(mobileTabs);
  function showLocalTime() {
    const now = /* @__PURE__ */ new Date();
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Etc/GMT+12" }).format(now);
    const difference = -12 + now.getTimezoneOffset() / 60;
    const offset = difference === 0 ? "local time" : `${Math.abs(difference)}h ${difference < 0 ? "behind" : "ahead"}`;
    const strong = document.createElement("strong");
    strong.textContent = time;
    document.querySelector("#local-time").replaceChildren(strong, ` - ${offset}`);
  }
  showLocalTime();
  setInterval(showLocalTime, 6e4);

  // docs/game.mjs
  var $ = (id) => document.getElementById(id);
  var board = $("game");
  var shell = $("game-shell");
  var overlay = $("overlay");
  var play = $("play");
  var pause = $("pause");
  var enter = $("enter");
  var profile = $("profile-view");
  var announcement = $("announcement");
  var scene = $("profile-scene");
  var cover = $("game-cover");
  var consolePanel = $("game-console");
  var boot = $("boot-log");
  var reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  var keys = /* @__PURE__ */ new Set();
  var settings = $("game-settings");
  var settingsOpen = $("settings-open");
  var menuSettings = $("menu-settings");
  var settingsTrigger = settingsOpen;
  var keyControls = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  var storageKey = "space-invaders-best";
  var game = createGame();
  var best = 0;
  var previous = 0;
  var lastDraw = 0;
  var lastMode = "";
  var lastWave = 1;
  var lastLives = 3;
  var bootTimer;
  var camera;
  var transition = 0;
  var savedScroll = 0;
  var focused = false;
  var titleScreen = true;
  var booting = false;
  var touchPointer = null;
  var lastPreview = -1;
  var resumeAfterSettings = false;
  var firePressed = false;
  var preferences = { ship: 0, music: true, sfx: true };
  var autoIntro = location.protocol !== "file:" && !new URLSearchParams(location.search).has("profile");
  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
  } catch {
  }
  try {
    const saved = JSON.parse(localStorage.getItem("space-invaders-settings"));
    if (Number.isInteger(saved?.ship) && saved.ship >= 0 && saved.ship < SHIPS.length) preferences.ship = saved.ship;
    if (typeof saved?.music === "boolean") preferences.music = saved.music;
    if (typeof saved?.sfx === "boolean") preferences.sfx = saved.sfx;
  } catch {
  }
  setAudioState(preferences);
  $("welcome-art").textContent = ALIENS[1][0].join("\n");
  $("title-art").textContent = TITLE_ART;
  $("preview-art").textContent = renderPreview(0, preferences.ship);
  board.textContent = renderBoard(game, reducedMotion.matches, preferences.ship);
  var measure = document.createElement("span");
  measure.style.cssText = "position:absolute;visibility:hidden;font:10px var(--mono)";
  measure.textContent = "M";
  document.body.append(measure);
  var charRatio = measure.getBoundingClientRect().width / 10;
  measure.remove();
  function fitBoard() {
    if (consolePanel.hidden) return;
    const field2 = $("playfield");
    const font = Math.max(1, Math.min(12, (field2.clientWidth - 2) / ((COLUMNS + 2) * charRatio), (field2.clientHeight - 2) / (ROWS + 2)));
    shell.style.setProperty("--cell-font", `${font}px`);
    shell.style.setProperty("--cell-line", `${font}px`);
  }
  function clearInput() {
    keys.clear();
    touchPointer = null;
    firePressed = false;
  }
  function togglePause() {
    if (titleScreen) return;
    if (!["playing", "paused"].includes(game.mode)) return;
    if (!focused) {
      focusGame();
      return;
    }
    if (booting || !settings.hidden || document.body.dataset.view !== "game") return;
    game.mode = game.mode === "playing" ? "paused" : "playing";
    clearInput();
    updateUI();
    board.focus({ preventScroll: true });
  }
  function startPlaying() {
    void unlockAudio();
    titleScreen = false;
    if (["ready", "over"].includes(game.mode)) {
      game = createGame();
      lastWave = 1;
      lastLives = 3;
    }
    if (game.mode !== "upgrade") game.mode = "playing";
    clearInput();
    lastMode = "";
    updateUI();
    if (game.mode === "playing") {
      board.focus({ preventScroll: true });
      announcement.textContent = "Game started. Arrow keys move; press space once per shot.";
    }
  }
  function savePreferences() {
    try {
      localStorage.setItem("space-invaders-settings", JSON.stringify(preferences));
    } catch {
    }
    setAudioState(preferences);
    board.textContent = renderBoard(game, reducedMotion.matches, preferences.ship);
    lastPreview = -1;
  }
  SHIPS.forEach((ship, index) => {
    const label = document.createElement("label"), input = document.createElement("input");
    const art = document.createElement("pre"), name = document.createElement("span");
    input.type = "radio";
    input.name = "ship";
    input.value = index;
    input.checked = index === preferences.ship;
    art.textContent = ship.art.join("\n");
    art.setAttribute("aria-hidden", "true");
    name.textContent = ship.name;
    label.append(input, art, name);
    document.querySelector(".ship-choices").append(label);
    input.addEventListener("change", () => {
      preferences.ship = index;
      savePreferences();
    });
  });
  for (const [id, key] of [["music-enabled", "music"], ["sfx-enabled", "sfx"]]) {
    $(id).checked = preferences[key];
    $(id).addEventListener("change", async () => {
      preferences[key] = $(id).checked;
      savePreferences();
      $("audio-status").textContent = await unlockAudio() ? "" : "Audio is unavailable in this browser.";
    });
  }
  var tabs = [$("ship-tab"), $("audio-tab")];
  function selectTab(selected) {
    tabs.forEach((tab) => {
      tab.setAttribute("aria-selected", String(tab === selected));
      tab.tabIndex = tab === selected ? 0 : -1;
      $(tab.getAttribute("aria-controls")).hidden = tab !== selected;
    });
  }
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[1] : tabs.find((other) => other !== tab);
      selectTab(next);
      next.focus();
    });
  });
  function closeSettings(resume = true) {
    if (settings.hidden) return;
    settings.hidden = true;
    settingsOpen.setAttribute("aria-expanded", "false");
    menuSettings.setAttribute("aria-expanded", "false");
    cover.inert = consolePanel.inert = false;
    if (resume && resumeAfterSettings && focused) startPlaying();
    else settingsTrigger.focus({ preventScroll: true });
  }
  function openSettings(event) {
    if (booting || document.body.dataset.view === "zoom") return;
    if (!settings.hidden) {
      closeSettings();
      return;
    }
    settingsTrigger = event.currentTarget;
    stopAutoIntro();
    resumeAfterSettings = game.mode === "playing";
    if (resumeAfterSettings) togglePause();
    settings.hidden = false;
    cover.inert = consolePanel.inert = true;
    settingsOpen.setAttribute("aria-expanded", "true");
    menuSettings.setAttribute("aria-expanded", "true");
    tabs.find((tab) => tab.getAttribute("aria-selected") === "true").focus();
  }
  settingsOpen.addEventListener("click", openSettings);
  menuSettings.addEventListener("click", openSettings);
  $("settings-close").addEventListener("click", () => closeSettings());
  function setSurroundingsInert(inert) {
    for (let branch = shell; branch !== scene; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch) sibling.inert = inert;
      }
    }
  }
  function stopAutoIntro() {
    autoIntro = false;
    $("stay-profile").hidden = true;
    $("skip-intro").textContent = "[ play intro ]";
  }
  function lockScene() {
    if (scene.style.position === "fixed") return;
    savedScroll = scrollY;
    const width = scene.getBoundingClientRect().width;
    document.body.style.height = `${scene.scrollHeight}px`;
    Object.assign(scene.style, { position: "fixed", width: `${width}px`, zoom: "2", left: "0px", top: "0px", transformOrigin: "0 0", ...cameraPose(1, 0, -savedScroll) });
  }
  function cameraPose(scale, x, y) {
    return { transform: `matrix(${scale / 2}, 0, 0, ${scale / 2}, ${x / 2}, ${y / 2})` };
  }
  function gameCamera() {
    const zoom = new DOMMatrixReadOnly(getComputedStyle(scene).transform).a * 2;
    const page = scene.getBoundingClientRect(), card = shell.getBoundingClientRect();
    const width = card.width / zoom, height = card.height / zoom;
    const x = (card.left - page.left) / zoom, y = (card.top - page.top) / zoom;
    const margin = innerWidth < 768 ? 16 : 64;
    const scale = Math.max(1, Math.min(1.7, (innerWidth - margin * 2) / width, (innerHeight - margin * 2) / height));
    return cameraPose(scale, (innerWidth - width * scale) / 2 - x * scale, (innerHeight - height * scale) / 2 - y * scale);
  }
  async function moveCamera(target, animate, duration) {
    const style = getComputedStyle(scene);
    const from = { transform: style.transform };
    const id = ++transition;
    camera?.cancel();
    Object.assign(scene.style, from);
    if (animate && !reducedMotion.matches) {
      camera = scene.animate([from, target], { duration, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" });
      await camera.finished.catch(() => {
      });
    }
    if (id !== transition) return false;
    Object.assign(scene.style, target);
    camera?.cancel();
    camera = null;
    return true;
  }
  function bootConsole() {
    cover.hidden = true;
    consolePanel.hidden = false;
    overlay.hidden = true;
    boot.hidden = false;
    booting = true;
    fitBoard();
    settingsOpen.disabled = true;
    const lines = ["> Space Invaders", "> preparing the game", "> reading character set", "> allocating display buffer", "> mapping arrow keys", "> mapping A / D", "> loading ship", "> charging laser", "> waking the fleet", "> calibrating collision grid", "> loading audio settings", "> controls online"];
    let count = 0;
    function next() {
      if (!focused) return;
      if (count === lines.length + 3 || reducedMotion.matches) {
        boot.hidden = true;
        booting = false;
        titleScreen = true;
        settingsOpen.disabled = false;
        lastMode = "";
        updateUI();
        return;
      }
      count++;
      const output = lines.slice(0, Math.min(count, lines.length));
      if (count > lines.length) output.push("> launching in", ...[3, 2, 1].slice(0, count - lines.length).map((number) => `> ${number}`));
      boot.textContent = output.join("\n") + "\n▍";
      boot.scrollTop = boot.scrollHeight;
      bootTimer = setTimeout(next, count <= lines.length ? 35 : 500);
    }
    next();
  }
  async function focusGame(animate = true) {
    if (focused) return;
    closeSettings(false);
    void unlockAudio();
    stopAutoIntro();
    document.dispatchEvent(new Event("profile-exit"));
    focused = true;
    lockScene();
    setSurroundingsInert(true);
    profile.hidden = false;
    profile.textContent = "[ back to profile ]";
    $("preview-controls").hidden = true;
    settingsOpen.disabled = true;
    document.body.dataset.view = "zoom";
    if (!await moveCamera(gameCamera(), animate, 2400) || !focused) return;
    activateConsole();
  }
  function activateConsole() {
    document.body.dataset.view = "game";
    board.tabIndex = 0;
    cover.hidden = true;
    consolePanel.hidden = false;
    bootConsole();
  }
  function restoreProfile() {
    scene.removeAttribute("style");
    document.body.style.height = "";
    document.body.dataset.view = "profile";
    setSurroundingsInert(false);
    board.tabIndex = -1;
    consolePanel.hidden = true;
    cover.hidden = false;
    profile.hidden = true;
    settingsOpen.disabled = false;
    $("preview-controls").hidden = false;
    scrollTo(0, savedScroll);
    enter.focus({ preventScroll: true });
  }
  async function showProfile(animate = true) {
    stopAutoIntro();
    if (scene.style.position !== "fixed") return;
    closeSettings(false);
    focused = false;
    clearTimeout(bootTimer);
    booting = false;
    boot.hidden = true;
    clearInput();
    if (game.mode === "playing") game.mode = "paused";
    lastMode = "";
    updateUI();
    profile.textContent = "[ enter game ]";
    settingsOpen.disabled = true;
    document.body.dataset.view = "zoom";
    if (await moveCamera(cameraPose(1, 0, -savedScroll), animate, 1800) && !focused) restoreProfile();
  }
  enter.addEventListener("click", () => focusGame());
  $("skip-intro").addEventListener("click", () => focusGame());
  $("stay-profile").addEventListener("click", () => showProfile());
  profile.addEventListener("click", () => focused ? showProfile() : focusGame());
  document.addEventListener("profile-interaction", stopAutoIntro);
  window.addEventListener("resize", () => {
    if (scene.style.position === "fixed") {
      const wasZooming = document.body.dataset.view === "zoom";
      transition++;
      camera?.cancel();
      camera = null;
      Object.assign(scene.style, { ...cameraPose(1, 0, -savedScroll), width: `${innerWidth}px` });
      document.body.style.height = `${scene.scrollHeight}px`;
      if (focused) {
        Object.assign(scene.style, gameCamera());
        if (wasZooming) activateConsole();
      } else restoreProfile();
    }
    fitBoard();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) camera?.finish();
  });
  play.addEventListener("click", () => {
    if (!focused) focusGame();
    else if (!booting && document.body.dataset.view === "game") startPlaying();
  });
  pause.addEventListener("click", togglePause);
  for (const menu of document.querySelectorAll(".title-actions")) {
    menu.addEventListener("pointerover", (event) => {
      const button = event.target.closest("button");
      if (event.pointerType === "mouse" && button) button.focus({ preventScroll: true });
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.code === "Escape" && !settings.hidden) {
      closeSettings();
      return;
    }
    if (event.code === "Escape" && focused) {
      showProfile();
      return;
    }
    if (!shell.contains(event.target) || !settings.hidden || booting || document.body.dataset.view !== "game") return;
    if (titleScreen || game.mode === "upgrade") {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
        const options = titleScreen ? [play, menuSettings] : [...$("upgrade-options").children];
        options[(options.indexOf(event.target) + 1) % options.length].focus();
      }
      return;
    }
    if (game.mode === "over") return;
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat && game.mode === "playing") firePressed = true;
    }
    if (event.code in keyControls) {
      event.preventDefault();
      if (game.mode === "playing") keys.add(event.code);
    }
    if (event.code === "KeyP" && !event.repeat) {
      event.preventDefault();
      togglePause();
    }
  });
  document.addEventListener("keyup", (event) => keys.delete(event.code));
  var field = $("playfield");
  function moveTouch(event) {
    if (event.pointerType === "mouse" || event.pointerId !== touchPointer || game.mode !== "playing") return;
    const rect = board.getBoundingClientRect();
    game.player.x = Math.max(18, Math.min(
      WIDTH - game.player.w - 18,
      (event.clientX - rect.left) / rect.width * WIDTH - game.player.w / 2
    ));
  }
  field.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || titleScreen || !settings.hidden || booting || !focused) return;
    if (game.mode === "paused") {
      togglePause();
      return;
    }
    if (game.mode !== "playing") return;
    event.preventDefault();
    field.setPointerCapture(event.pointerId);
    touchPointer = event.pointerId;
    moveTouch(event);
    board.focus({ preventScroll: true });
  });
  field.addEventListener("pointermove", moveTouch);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    field.addEventListener(type, (event) => {
      if (event.pointerId === touchPointer) touchPointer = null;
    });
  }
  window.addEventListener("blur", () => {
    if (game.mode === "playing") togglePause();
    clearInput();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.mode === "playing") togglePause();
  });
  function updateUI() {
    if (game.score > best) {
      best = game.score;
      try {
        localStorage.setItem(storageKey, String(best));
      } catch {
      }
    }
    for (const [id, value] of Object.entries({ score: game.score, best, wave: game.wave, lives: game.lives })) {
      const text = String(value).padStart(id === "wave" ? 2 : id === "lives" ? 1 : 4, "0");
      if ($(id).textContent !== text) $(id).textContent = text;
    }
    if (game.wave !== lastWave || game.lives !== lastLives) {
      announcement.textContent = `Wave ${game.wave}. ${game.lives} ${game.lives === 1 ? "life" : "lives"} remaining.`;
      lastWave = game.wave;
      lastLives = game.lives;
    }
    const mode = titleScreen ? "ready" : game.mode;
    if (booting || mode === lastMode) return;
    lastMode = mode;
    shell.dataset.mode = mode;
    board.textContent = renderBoard(game, reducedMotion.matches, preferences.ship);
    setAudioState({ playing: mode === "playing" && !document.hidden });
    overlay.hidden = mode === "playing";
    pause.disabled = mode !== "playing";
    pause.hidden = mode !== "playing";
    play.hidden = ["paused", "upgrade"].includes(mode);
    board.inert = titleScreen;
    board.tabIndex = titleScreen || !focused ? -1 : 0;
    $("title-art").hidden = !titleScreen;
    menuSettings.hidden = !titleScreen;
    $("menu-help").hidden = !titleScreen;
    $("welcome-art").hidden = titleScreen || mode === "upgrade";
    $("message").classList.toggle("sr-only", titleScreen);
    $("detail").hidden = ["paused", "upgrade"].includes(mode) || titleScreen;
    const upgrades = $("upgrade-options");
    upgrades.hidden = mode !== "upgrade";
    if (mode === "upgrade") {
      clearInput();
      upgrades.replaceChildren(...upgradeChoices(game).map((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `[ ${choice === "health" ? "refill health" : `upgrade ${choice}`} ]`;
        button.addEventListener("click", () => {
          if (!chooseUpgrade(game, choice)) return;
          clearInput();
          updateUI();
          board.focus({ preventScroll: true });
        });
        return button;
      }));
      $("message").textContent = "select upgrade";
      announcement.textContent = "Wave 3. Hallucinator. Select an upgrade.";
      if (focused && settings.hidden) upgrades.firstElementChild.focus({ preventScroll: true });
      return;
    }
    if (mode === "playing") return;
    const label = game.mode === "over" ? "play again" : "play";
    play.firstElementChild.textContent = titleScreen ? "┌──────────────┐\n│     play     │\n└──────────────┘" : `[ ${label} ]`;
    play.setAttribute("aria-label", titleScreen ? "Play" : label);
    $("message").textContent = titleScreen ? "Space Invaders" : game.mode === "paused" ? "paused" : "game over";
    $("detail").textContent = game.mode === "paused" ? "" : game.mode === "over" ? `${game.score} points` : "Press space once per shot.";
    if (!titleScreen) {
      clearInput();
      announcement.textContent = game.mode === "paused" ? "Game paused." : `Game over. Score ${game.score}.`;
      if (focused && document.body.dataset.view === "game") (game.mode === "paused" ? board : play).focus({ preventScroll: true });
    }
    if (titleScreen && focused && !booting && settings.hidden && document.body.dataset.view === "game") {
      play.focus({ preventScroll: true });
      announcement.textContent = "Space Invaders. Choose Play or Settings.";
    }
  }
  function frame(now) {
    const input = { left: false, right: false, fire: touchPointer !== null, firePressed };
    firePressed = false;
    for (const key of keys) input[keyControls[key]] = true;
    const { score, lives, wave, fire } = game;
    if (!titleScreen && !booting && focused) step(game, input, previous ? (now - previous) / 1e3 : 0);
    if (game.fire > fire) playSound("shot");
    if (game.score > score) playSound("hit");
    if (game.lives < lives) playSound("damage");
    if (game.wave > wave) playSound("wave");
    previous = now;
    if (game.mode === "playing" && now - lastDraw >= 1e3 / 30) {
      const text = renderBoard(game, reducedMotion.matches, preferences.ship);
      if (board.textContent !== text) board.textContent = text;
      lastDraw = now;
    }
    const previewFrame = reducedMotion.matches ? 0 : Math.floor(now / 125);
    if (!cover.hidden && settings.hidden && !document.hidden && previewFrame !== lastPreview) {
      $("preview-art").textContent = renderPreview(previewFrame / 8, preferences.ship, reducedMotion.matches);
      lastPreview = previewFrame;
    }
    updateUI();
    requestAnimationFrame(frame);
  }
  if (!autoIntro) {
    $("stay-profile").hidden = true;
    $("skip-intro").textContent = "[ play intro ]";
  }
  requestAnimationFrame(() => {
    if (autoIntro && document.body.dataset.view === "profile") focusGame();
  });
  requestAnimationFrame(frame);
})();
