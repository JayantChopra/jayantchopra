import { createGame, step, chooseUpgrade, upgradeChoices, WIDTH } from './engine.mjs';
import { ALIENS, SHIPS, TITLE_ART, renderBoard, renderPreview, COLUMNS, ROWS } from './text-art.mjs';
import { setAudioState, unlockAudio, playSound, playNavigationSound } from './audio.mjs';
import './profile.mjs';

const $ = id => document.getElementById(id);
const board = $('game'), shell = $('game-shell'), overlay = $('overlay');
const play = $('play'), pause = $('pause'), enter = $('enter'), profile = $('profile-view');
const announcement = $('announcement'), scene = $('profile-scene');
const cover = $('game-cover'), consolePanel = $('game-console'), boot = $('boot-log');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set();
const settings = $('game-settings'), settingsOpen = $('settings-open');
const menuSettings = $('menu-settings');
let settingsTrigger = settingsOpen;
const keyControls = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const storageKey = 'space-invaders-best';
let game = createGame(), best = 0, previous = 0, lastDraw = 0, lastMode = '';
let lastWave = 1, lastLives = 3, bootTimer;
let camera, transition = 0, savedScroll = 0, focused = false, titleScreen = true, booting = false;
let touchPointer = null, lastPreview = -1, resumeAfterSettings = false;
let firePressed = false;
const preferences = { ship: 0, music: true, sfx: true };
let autoIntro = location.protocol !== 'file:' && !new URLSearchParams(location.search).has('profile');

try {
  const saved = Number(localStorage.getItem(storageKey));
  if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
} catch { /* Play still works without browser storage. */ }
try {
  const saved = JSON.parse(localStorage.getItem('space-invaders-settings'));
  if (Number.isInteger(saved?.ship) && saved.ship >= 0 && saved.ship < SHIPS.length) preferences.ship = saved.ship;
  if (typeof saved?.music === 'boolean') preferences.music = saved.music;
  if (typeof saved?.sfx === 'boolean') preferences.sfx = saved.sfx;
} catch { /* Invalid preferences fall back to defaults. */ }
setAudioState(preferences);

let lastControl, lastCue = -Infinity, lastInput = -Infinity;
for (const type of ['keydown', 'pointerdown']) {
  document.addEventListener(type, () => { lastInput = performance.now(); }, true);
}
for (const type of ['pointerover', 'focusin', 'change']) {
  document.addEventListener(type, event => {
    if (booting || document.body.dataset.view === 'zoom' || document.hidden) return;
    if (type === 'pointerover' && event.pointerType !== 'mouse') return;
    const now = performance.now();
    if (type === 'focusin' && now - lastInput > 150) return;
    let control = event.target.closest?.('a[href],button,summary,input[type="radio"],input[type="checkbox"],.ship-choices label,.audio-option');
    if (!control || control.disabled || control.closest('[hidden],[inert],[aria-disabled="true"]')) return;
    control = control.closest('label') || control;
    if (type === 'pointerover' && control.contains(event.relatedTarget)) return;
    if (now - lastCue < 50 || (control === lastControl && now - lastCue < 150)) return;
    lastControl = control; lastCue = now;
    void playNavigationSound();
  });
}

$('welcome-art').textContent = ALIENS[1][0].join('\n');
$('title-art').textContent = TITLE_ART;
$('preview-art').textContent = renderPreview(0, preferences.ship);
board.textContent = renderBoard(game, reducedMotion.matches, preferences.ship);
const measure = document.createElement('span');
measure.style.cssText = 'position:absolute;visibility:hidden;font:10px var(--mono)';
measure.textContent = 'M';
document.body.append(measure);
const charRatio = measure.getBoundingClientRect().width / 10;
measure.remove();

function fitBoard() {
  if (consolePanel.hidden) return;
  const field = $('playfield');
  const font = Math.max(1, Math.min(12, (field.clientWidth - 2) / ((COLUMNS + 2) * charRatio), (field.clientHeight - 2) / (ROWS + 2)));
  shell.style.setProperty('--cell-font', `${font}px`);
  shell.style.setProperty('--cell-line', `${font}px`);
}

function clearInput() {
  keys.clear();
  touchPointer = null;
  firePressed = false;
}

function togglePause() {
  if (titleScreen) return;
  if (!['playing', 'paused'].includes(game.mode)) return;
  if (!focused) { focusGame(); return; }
  if (booting || !settings.hidden || document.body.dataset.view !== 'game') return;
  game.mode = game.mode === 'playing' ? 'paused' : 'playing';
  clearInput();
  updateUI();
  board.focus({ preventScroll: true });
}

function startPlaying() {
  void unlockAudio();
  titleScreen = false;
  if (['ready', 'over'].includes(game.mode)) {
    game = createGame();
    lastWave = 1;
    lastLives = 3;
  }
  if (game.mode !== 'upgrade') game.mode = 'playing';
  clearInput();
  lastMode = '';
  updateUI();
  if (game.mode === 'playing') {
    board.focus({ preventScroll: true });
    announcement.textContent = 'Game started. Arrow keys move; press space once per shot.';
  }
}

function savePreferences() {
  try { localStorage.setItem('space-invaders-settings', JSON.stringify(preferences)); } catch { /* Preferences still work for this visit. */ }
  setAudioState(preferences);
  board.textContent = renderBoard(game, reducedMotion.matches, preferences.ship);
  lastPreview = -1;
}

SHIPS.forEach((ship, index) => {
  const label = document.createElement('label'), input = document.createElement('input');
  const art = document.createElement('pre'), name = document.createElement('span');
  input.type = 'radio'; input.name = 'ship'; input.value = index;
  input.checked = index === preferences.ship;
  art.textContent = ship.art.join('\n'); art.setAttribute('aria-hidden', 'true');
  name.textContent = ship.name;
  label.append(input, art, name);
  document.querySelector('.ship-choices').append(label);
  input.addEventListener('change', () => { preferences.ship = index; savePreferences(); });
});

for (const [id, key] of [['music-enabled', 'music'], ['sfx-enabled', 'sfx']]) {
  $(id).checked = preferences[key];
  $(id).addEventListener('change', async () => {
    preferences[key] = $(id).checked;
    savePreferences();
    $('audio-status').textContent = await unlockAudio() ? '' : 'Audio is unavailable in this browser.';
  });
}
const tabs = [$('ship-tab'), $('audio-tab')];
function selectTab(selected) {
  tabs.forEach(tab => {
    tab.setAttribute('aria-selected', String(tab === selected));
    tab.tabIndex = tab === selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = tab !== selected;
  });
}
tabs.forEach(tab => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[1] : tabs.find(other => other !== tab);
    selectTab(next); next.focus();
  });
});
settings.addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  const controls = [...tabs, ...settings.querySelectorAll('[role="tabpanel"]:not([hidden]) input'), $('settings-close')];
  if (event.key === 'Enter') {
    if (event.repeat || !controls.includes(event.target)) return;
    event.target.click();
    if (tabs.includes(event.target)) $(event.target.getAttribute('aria-controls')).querySelector('input').focus({ preventScroll: true });
    return;
  }
  const index = controls.indexOf(document.activeElement);
  controls[(index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length].focus({ preventScroll: true });
});
function closeSettings(resume = true) {
  if (settings.hidden) return;
  settings.hidden = true;
  settingsOpen.setAttribute('aria-expanded', 'false');
  menuSettings.setAttribute('aria-expanded', 'false');
  cover.inert = consolePanel.inert = false;
  if (resume && resumeAfterSettings && focused) startPlaying();
  else settingsTrigger.focus({ preventScroll: true });
}
function openSettings(event) {
  if (booting || document.body.dataset.view === 'zoom') return;
  if (!settings.hidden) { closeSettings(); return; }
  settingsTrigger = event.currentTarget;
  stopAutoIntro();
  resumeAfterSettings = game.mode === 'playing';
  if (resumeAfterSettings) togglePause();
  settings.hidden = false;
  cover.inert = consolePanel.inert = true;
  settingsOpen.setAttribute('aria-expanded', 'true');
  menuSettings.setAttribute('aria-expanded', 'true');
  tabs.find(tab => tab.getAttribute('aria-selected') === 'true').focus();
}
settingsOpen.addEventListener('click', openSettings);
menuSettings.addEventListener('click', openSettings);
$('settings-close').addEventListener('click', () => closeSettings());

function stopAutoIntro() {
  autoIntro = false;
  $('stay-profile').hidden = true;
  $('skip-intro').textContent = '[ play intro ]';
}

function lockScene() {
  if (scene.style.position === 'fixed') return;
  savedScroll = scrollY;
  const width = scene.getBoundingClientRect().width;
  document.body.style.height = `${scene.scrollHeight}px`;
  // Paint at 2x once. Only the transform changes in flight, so text never reflows per frame.
  Object.assign(scene.style, { position: 'fixed', width: `${width}px`, zoom: '2', left: '0px', top: '0px', transformOrigin: '0 0', ...cameraPose(1, 0, -savedScroll) });
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
    camera = scene.animate([from, target], { duration, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
    await camera.finished.catch(() => {});
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
  const lines = ['> Space Invaders', '> preparing the game', '> reading character set', '> allocating display buffer', '> mapping arrow keys', '> mapping A / D', '> loading ship', '> charging laser', '> waking the fleet', '> calibrating collision grid', '> loading audio settings', '> controls online'];
  let count = 0;
  function next() {
    if (!focused) return;
    if (count === lines.length + 3 || reducedMotion.matches) {
      boot.hidden = true;
      booting = false;
      titleScreen = true;
      settingsOpen.disabled = false;
      lastMode = '';
      updateUI();
      return;
    }
    count++;
    const output = lines.slice(0, Math.min(count, lines.length));
    if (count > lines.length) output.push('> launching in', ...[3, 2, 1].slice(0, count - lines.length).map(number => `> ${number}`));
    boot.textContent = output.join('\n') + '\n▍';
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
  document.dispatchEvent(new Event('profile-exit'));
  focused = true;
  lockScene();
  profile.hidden = false;
  profile.textContent = '[ back to profile ]';
  $('preview-controls').hidden = true;
  settingsOpen.disabled = true;
  document.body.dataset.view = 'zoom';
  if (!await moveCamera(gameCamera(), animate, 2400) || !focused) return;
  activateConsole();
}

function activateConsole() {
  document.body.dataset.view = 'game';
  board.tabIndex = 0;
  cover.hidden = true;
  consolePanel.hidden = false;
  bootConsole();
}

function restoreProfile() {
  scene.removeAttribute('style');
  document.body.style.height = '';
  document.body.dataset.view = 'profile';
  board.tabIndex = -1;
  consolePanel.hidden = true; cover.hidden = false; profile.hidden = true;
  settingsOpen.disabled = false;
  $('preview-controls').hidden = false;
  scrollTo(0, savedScroll);
  enter.focus({ preventScroll: true });
}

async function showProfile(animate = true, reset = false, scrollDelta = 0) {
  stopAutoIntro();
  if (scene.style.position !== 'fixed') return;
  closeSettings(false);
  document.dispatchEvent(new Event('profile-exit'));
  focused = false;
  clearTimeout(bootTimer);
  booting = false;
  boot.hidden = true;
  clearInput();
  if (reset) {
    game = createGame();
    titleScreen = true;
    savedScroll = Math.max(0, Math.min(scene.scrollHeight - innerHeight, savedScroll + scrollDelta));
  }
  if (game.mode === 'playing') game.mode = 'paused';
  lastMode = '';
  updateUI();
  profile.textContent = '[ enter game ]';
  settingsOpen.disabled = true;
  document.body.dataset.view = 'zoom';
  if (await moveCamera(cameraPose(1, 0, -savedScroll), animate, reset ? 1000 : 1800) && !focused) restoreProfile();
}

function scrollOut(event, delta) {
  if (!delta || scene.style.position !== 'fixed') return;
  const panel = event.target.closest?.('#game-settings,.nav-panel,.calendar-scroll');
  if (panel && (delta > 0 ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1 : panel.scrollTop > 0)) return;
  event.preventDefault();
  // Consume momentum during the return instead of restarting the camera on every wheel event.
  if (focused) showProfile(true, true, delta);
}
window.addEventListener('wheel', event => {
  if (!event.ctrlKey) scrollOut(event, event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1));
}, { passive: false });
let scrollTouchY = null;
window.addEventListener('touchstart', event => {
  scrollTouchY = event.touches.length === 1 && !event.target.closest('#playfield') ? event.touches[0].clientY : null;
}, { passive: true });
window.addEventListener('touchmove', event => {
  if (event.touches.length !== 1) { scrollTouchY = null; return; }
  if (scrollTouchY === null) return;
  const delta = scrollTouchY - event.touches[0].clientY;
  if (Math.abs(delta) > 8) { scrollOut(event, delta); scrollTouchY = event.touches[0].clientY; }
}, { passive: false });
window.addEventListener('touchend', () => { scrollTouchY = null; }, { passive: true });

enter.addEventListener('click', () => focusGame());
$('skip-intro').addEventListener('click', () => focusGame());
$('stay-profile').addEventListener('click', () => showProfile());
profile.addEventListener('click', () => focused ? showProfile() : focusGame());
document.addEventListener('profile-interaction', stopAutoIntro);
window.addEventListener('resize', () => {
  if (scene.style.position === 'fixed') {
    const wasZooming = document.body.dataset.view === 'zoom';
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
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) camera?.finish();
});

play.addEventListener('click', () => {
  if (!focused) focusGame();
  else if (!booting && document.body.dataset.view === 'game') startPlaying();
});
pause.addEventListener('click', togglePause);
for (const menu of document.querySelectorAll('.title-actions')) {
  menu.addEventListener('pointerover', event => {
    const button = event.target.closest('button');
    if (event.pointerType === 'mouse' && button) button.focus({ preventScroll: true });
  });
}

document.addEventListener('keydown', event => {
  if (event.code === 'Escape' && event.repeat) return;
  if (!event.target.closest?.('input,textarea,select,[contenteditable="true"]')) {
    const delta = { PageDown: innerHeight * .8, PageUp: -innerHeight * .8, End: scene.scrollHeight, Home: -scene.scrollHeight }[event.code];
    if (delta) { scrollOut(event, delta); return; }
    if (!shell.contains(event.target) && ['ArrowDown', 'ArrowUp', 'Space'].includes(event.code)) {
      scrollOut(event, event.code === 'ArrowUp' ? -40 : event.code === 'Space' ? innerHeight * .8 : 40);
    }
  }
  if (event.code === 'Escape' && !settings.hidden) {
    event.preventDefault();
    closeSettings(false);
    if (focused) {
      titleScreen = true;
      clearInput();
      lastMode = '';
      updateUI();
    }
    return;
  }
  if (event.code === 'Escape' && focused) { showProfile(); return; }
  if (!shell.contains(event.target) || !settings.hidden || booting || document.body.dataset.view !== 'game') return;
  if (titleScreen || game.mode === 'upgrade') {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
      const options = titleScreen ? [play, menuSettings] : [...$('upgrade-options').children];
      options[(options.indexOf(event.target) + 1) % options.length].focus();
    }
    return;
  }
  if (game.mode === 'over') return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat && game.mode === 'playing') firePressed = true;
  }
  if (event.code in keyControls) {
    event.preventDefault();
    if (game.mode === 'playing') keys.add(event.code);
  }
  if (event.code === 'KeyP' && !event.repeat) {
    event.preventDefault();
    togglePause();
  }
});
document.addEventListener('keyup', event => keys.delete(event.code));
shell.addEventListener('focusout', event => {
  if (game.mode === 'playing' && event.relatedTarget && !shell.contains(event.relatedTarget)) {
    game.mode = 'paused';
    clearInput();
    updateUI();
  }
});
const field = $('playfield');
function moveTouch(event) {
  if (event.pointerType === 'mouse' || event.pointerId !== touchPointer || game.mode !== 'playing') return;
  const rect = board.getBoundingClientRect();
  game.player.x = Math.max(18, Math.min(WIDTH - game.player.w - 18,
    (event.clientX - rect.left) / rect.width * WIDTH - game.player.w / 2));
}
field.addEventListener('pointerdown', event => {
  if (event.button !== 0 || titleScreen || !settings.hidden || booting || !focused) return;
  if (game.mode === 'paused') { togglePause(); return; }
  if (game.mode !== 'playing') return;
  event.preventDefault();
  field.setPointerCapture(event.pointerId);
  touchPointer = event.pointerId;
  moveTouch(event);
  board.focus({ preventScroll: true });
});
field.addEventListener('pointermove', moveTouch);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  field.addEventListener(type, event => { if (event.pointerId === touchPointer) touchPointer = null; });
}
window.addEventListener('blur', () => { if (game.mode === 'playing') togglePause(); clearInput(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'playing') togglePause(); });

function updateUI() {
  if (game.score > best) {
    best = game.score;
    try { localStorage.setItem(storageKey, String(best)); } catch { /* Keep this visit's score in memory. */ }
  }
  for (const [id, value] of Object.entries({ score: game.score, best, wave: game.wave, lives: game.lives })) {
    const text = String(value).padStart(id === 'wave' ? 2 : id === 'lives' ? 1 : 4, '0');
    if ($(id).textContent !== text) $(id).textContent = text;
  }
  if (game.wave !== lastWave || game.lives !== lastLives) {
    announcement.textContent = `Wave ${game.wave}. ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} remaining.`;
    lastWave = game.wave;
    lastLives = game.lives;
  }
  const mode = titleScreen ? 'ready' : game.mode;
  if (booting || mode === lastMode) return;
  lastMode = mode;
  shell.dataset.mode = mode;
  board.textContent = renderBoard(game, reducedMotion.matches, preferences.ship);
  setAudioState({ playing: mode === 'playing' && !document.hidden });
  overlay.hidden = mode === 'playing';
  pause.disabled = mode !== 'playing';
  pause.hidden = mode !== 'playing';
  play.hidden = ['paused', 'upgrade'].includes(mode);
  board.inert = titleScreen;
  board.tabIndex = titleScreen || !focused ? -1 : 0;
  $('title-art').hidden = !titleScreen;
  menuSettings.hidden = !titleScreen;
  $('menu-help').hidden = !titleScreen;
  $('welcome-art').hidden = titleScreen || mode === 'upgrade';
  $('message').classList.toggle('sr-only', titleScreen);
  $('detail').hidden = ['paused', 'upgrade'].includes(mode) || titleScreen;
  const upgrades = $('upgrade-options');
  upgrades.hidden = mode !== 'upgrade';
  if (mode === 'upgrade') {
    clearInput();
    upgrades.replaceChildren(...upgradeChoices(game).map(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `[ ${choice === 'health' ? 'refill health' : `upgrade ${choice}`} ]`;
      button.addEventListener('click', () => {
        if (!chooseUpgrade(game, choice)) return;
        clearInput();
        updateUI();
        board.focus({ preventScroll: true });
      });
      return button;
    }));
    $('message').textContent = 'select upgrade';
    announcement.textContent = 'Wave 3. Hallucinator. Select an upgrade.';
    if (focused && settings.hidden) upgrades.firstElementChild.focus({ preventScroll: true });
    return;
  }
  if (mode === 'playing') return;
  const label = game.mode === 'over' ? 'play again' : 'play';
  play.firstElementChild.textContent = titleScreen ? '┌──────────────┐\n│     play     │\n└──────────────┘' : `[ ${label} ]`;
  play.setAttribute('aria-label', titleScreen ? 'Play' : label);
  $('message').textContent = titleScreen ? 'Space Invaders' : game.mode === 'paused' ? 'paused' : 'game over';
  $('detail').textContent = game.mode === 'paused' ? '' : game.mode === 'over' ? `${game.score} points`
    : 'Press space once per shot.';
  if (!titleScreen) {
    clearInput();
    announcement.textContent = game.mode === 'paused' ? 'Game paused.' : `Game over. Score ${game.score}.`;
    if (focused && document.body.dataset.view === 'game' && shell.contains(document.activeElement)) (game.mode === 'paused' ? board : play).focus({ preventScroll: true });
  }
  if (titleScreen && focused && !booting && settings.hidden && document.body.dataset.view === 'game') {
    play.focus({ preventScroll: true });
    announcement.textContent = 'Space Invaders. Choose Play or Settings.';
  }
}

function frame(now) {
  const input = { left: false, right: false, fire: touchPointer !== null, firePressed };
  firePressed = false;
  for (const key of keys) input[keyControls[key]] = true;
  const { score, lives, wave, fire } = game;
  if (!titleScreen && !booting && focused) step(game, input, previous ? (now - previous) / 1000 : 0);
  if (game.fire > fire) playSound('shot');
  if (game.score > score) playSound('hit');
  if (game.lives < lives) playSound('damage');
  if (game.wave > wave) playSound('wave');
  previous = now;
  if (game.mode === 'playing' && now - lastDraw >= 1000 / 30) {
    const text = renderBoard(game, reducedMotion.matches, preferences.ship);
    if (board.textContent !== text) board.textContent = text;
    lastDraw = now;
  }
  const previewFrame = reducedMotion.matches ? 0 : Math.floor(now / 125);
  if (!cover.hidden && settings.hidden && !document.hidden && previewFrame !== lastPreview) {
    $('preview-art').textContent = renderPreview(previewFrame / 8, preferences.ship, reducedMotion.matches);
    lastPreview = previewFrame;
  }
  updateUI();
  requestAnimationFrame(frame);
}
if (!autoIntro) {
  $('stay-profile').hidden = true;
  $('skip-intro').textContent = '[ play intro ]';
}
requestAnimationFrame(() => {
  if (autoIntro && document.body.dataset.view === 'profile') focusGame();
});
requestAnimationFrame(frame);
