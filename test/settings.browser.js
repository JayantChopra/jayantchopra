// Open ?profile=1, click '.markdown-body>h2' to allow audio, then eval --stdin this file.
(async () => {
  const $ = id => document.getElementById(id);
  const assert = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const audio = { contexts: [], tones: 0 };
  const NativeAudioContext = window.AudioContext;
  window.AudioContext = class extends NativeAudioContext {
    constructor() { super(); audio.contexts.push(this); }
    createOscillator() { audio.tones++; return super.createOscillator(); }
  };
  const preview = $('preview-art').textContent;
  await wait(400);
  assert($('preview-art').textContent !== preview, 'Attract-mode preview does not animate');
  $('settings-open').click();
  assert(!$('game-settings').hidden && $('game-cover').inert, 'Settings did not open in the card');
  assert(document.querySelectorAll('input[name="ship"]').length === 4, 'Ship choices missing');
  document.querySelector('input[name="ship"][value="2"]').click();
  assert(JSON.parse(localStorage.getItem('space-invaders-settings')).ship === 2, 'Ship preference was not saved');
  $('ship-tab').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert($('audio-tab').getAttribute('aria-selected') === 'true' && !$('audio-panel').hidden, 'Settings tab keyboard navigation failed');
  for (const id of ['music-enabled', 'sfx-enabled']) {
    if ($(id).checked) $(id).click();
    $(id).click();
  }
  await wait(60);
  assert(audio.contexts.length === 1, 'Sound settings should share one audio context');
  assert(audio.contexts[0].state === 'running', 'Audio did not unlock after interaction');
  assert(audio.tones === 0, 'Audio must stay quiet on the profile');
  $('settings-close').click();
  $('enter').click();
  $('profile-scene').getAnimations()[0]?.finish();
  await wait(2100);
  assert(!$('overlay').hidden && $('game-shell').dataset.mode === 'ready', 'Boot did not stop at the title');
  assert(audio.tones === 0, 'Game audio started before Play');
  $('play').click();
  assert($('overlay').hidden, 'Game failed to launch');
  assert(audio.tones > 0, 'Enabled music did not play');
  $('settings-open').click();
  const paused = audio.tones;
  await wait(220);
  assert(audio.tones === paused, 'Opening settings did not stop music');
  $('music-enabled').click();
  $('settings-close').click();
  const beforeShot = audio.tones;
  $('game').dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
  await wait(300);
  $('game').dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
  assert(audio.tones > beforeShot, 'Enabled sound effects did not play');
  $('settings-open').click();
  $('sfx-enabled').click();
  $('settings-close').click();
  const muted = audio.tones;
  $('game').dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
  await wait(300);
  $('game').dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
  assert(audio.tones === muted, 'Muted audio still generated sound');
  $('pause').click();
  assert($('game-shell').dataset.mode === 'paused' && $('detail').hidden && $('play').hidden && $('pause').hidden, 'Pause screen contains removed controls or copy');
  $('game').dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', bubbles: true }));
  assert($('game-shell').dataset.mode === 'playing', 'P did not unpause');
  $('profile-view').click();
  $('profile-scene').getAnimations()[0]?.finish();
  await wait(60);
  assert(!$('game-cover').hidden && $('game-console').hidden, 'Return should restore the shooting preview');
  assert(audio.contexts.length === 1, 'Settings leaked audio contexts');
  window.AudioContext = NativeAudioContext;
  return 'Passed: animated preview, four ships, saved settings, keyboard tabs, music, sound effects, mute, pause, and profile return.';
})()
