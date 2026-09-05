// Test-only iframe seeds wave 2; no debug controls are included in the shipped bundle.
(async () => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const html = await (await fetch('/')).text();
  const source = (await (await fetch('/game.mjs')).text())
    .replaceAll("'./", `'${location.origin}/`)
    .replace('let game = createGame()', "let game = Object.assign(createGame(), { mode: 'paused', wave: 2, nextWave: .01, score: 620 })")
    .replace("let autoIntro = location.protocol !== 'file:'", 'let autoIntro = false');
  const url = URL.createObjectURL(new Blob([source + '\nwindow.testGame = () => game;'], { type: 'text/javascript' }));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999';
  frame.srcdoc = html.replace(/<script defer src="\.\/app\.js[^>]+><\/script>/, `<script type="module" src="${url}"></script>`);
  document.body.append(frame);
  await new Promise(resolve => frame.onload = resolve);
  const win = frame.contentWindow, $ = id => frame.contentDocument.getElementById(id);
  const finish = async () => { $('profile-scene').getAnimations()[0]?.finish(); await wait(40); };
  try {
    $('enter').click();
    await finish();
    await wait(2100);
    $('play').click();
    await wait(80);
    assert(win.testGame().mode === 'upgrade', 'Wave 3 must stop for an upgrade');
    assert($('message').textContent === 'select upgrade', 'Upgrade heading missing');
    assert($('upgrade-options').textContent.includes('upgrade speed') && !$('upgrade-options').textContent.includes('refill'), 'Full health choices incorrect');
    const time = win.testGame().time;
    await wait(100);
    assert(win.testGame().time === time, 'Boss moved behind upgrade screen');
    $('settings-open').click();
    $('settings-close').click();
    assert(win.testGame().mode === 'upgrade', 'Settings skipped the upgrade');
    $('upgrade-options').children[1].click();
    assert(win.testGame().damage === 2 && $('overlay').hidden, 'Damage selection failed');
    await wait(100);
    assert($('game').textContent.includes('hallucinator ['), 'Boss health bar missing');
    $('profile-view').click();
    await finish();
    const hp = win.testGame().boss.hp;
    $('enter').click();
    await finish();
    assert(!$('boot-log').hidden, 'Boss re-entry skipped boot');
    await wait(2100);
    assert(win.testGame().boss.hp === hp && !$('title-art').hidden, 'Boot lost the boss state');
    $('play').click();
    assert(win.testGame().mode === 'playing', 'Boss failed to resume');
    const game = win.testGame();
    game.lives = 1;
    game.invulnerable = 0;
    game.bombs.push({ x: game.player.x + 10, y: game.player.y, w: 8, h: 16, active: true });
    await wait(80);
    assert(game.mode === 'over' && $('detail').textContent === '620 points', 'Death must show only points');
    game.mode = 'upgrade'; game.lives = 2;
    await wait(80);
    assert($('upgrade-options').textContent.includes('refill health') && !$('upgrade-options').textContent.includes('upgrade speed'), 'Damaged choices incorrect');
    $('upgrade-options').children[1].click();
    assert(game.lives === 3 && game.mode === 'playing', 'Health refill failed');
    game.bullets = []; game.player.x = 18;
    const space = (type, repeat = false) => $('game').dispatchEvent(new win.KeyboardEvent(type, { code: 'Space', bubbles: true, repeat }));
    space('keydown');
    for (let i = 0; i < 10; i++) { await wait(40); space('keydown', true); }
    assert(game.bullets.length === 1, 'Holding Space must not repeat shots');
    space('keyup'); space('keydown');
    await wait(40);
    space('keyup');
    assert(game.bullets.length === 2, 'Releasing and pressing Space must shoot again');
    return 'Passed: boss upgrade UI, settings, health bar, re-entry boot, preserved boss state, points-only death, refill, and one shot per Space press.';
  } finally { frame.remove(); URL.revokeObjectURL(url); }
})()
