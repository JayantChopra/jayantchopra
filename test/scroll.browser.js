// Open ?profile=1, then evaluate this file in the browser.
(async () => {
  const $ = id => document.getElementById(id);
  const assert = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const scene = $('profile-scene'), shell = $('game-shell'), board = $('game');
  const finish = async () => { scene.getAnimations()[0]?.finish(); await wait(40); };
  const enter = async () => { $('enter').click(); await finish(); await wait(2100); };
  const wheel = (delta, target = document.body, extra = {}) => {
    const event = new WheelEvent('wheel', { deltaY: delta, bubbles: true, cancelable: true, ...extra });
    target.dispatchEvent(event);
    return event;
  };
  scrollTo(0, 0);
  await wait(40);
  const headings = [...document.querySelectorAll('.full-name,.markdown-body>h2')];
  const positions = headings.map(node => {
    const rect = node.getBoundingClientRect(), page = scene.getBoundingClientRect();
    return { x: rect.left - page.left, y: rect.top - page.top, width: rect.width, height: rect.height };
  });
  await enter();
  assert(!document.querySelector('.sidebar').inert, 'Zoomed profile must stay interactive');
  const link = document.querySelector('.socials a'), rect = link.getBoundingClientRect();
  assert(getComputedStyle(link).pointerEvents === 'auto', 'Profile link blocks the pointer');
  const hit = document.elementFromPoint(rect.left + 8, rect.top + rect.height / 2);
  assert(hit === link || link.contains(hit), 'Visible profile link cannot be hovered');
  assert(!wheel(80, document.body, { ctrlKey: true }).defaultPrevented, 'Browser pinch zoom must remain native');
  assert(document.body.dataset.view === 'game', 'Pinch gesture reset the round');
  $('play').click();
  const initialShip = board.textContent.split('\n').slice(-6).join('\n');
  board.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
  board.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
  await wait(350);
  assert(Number($('score').textContent) > 0, 'Need a scored round to check the reset');
  link.focus({ preventScroll: true });
  assert(document.activeElement === link && shell.dataset.mode === 'paused', 'Exploring the profile should pause without stealing focus');
  assert(wheel(120).defaultPrevented, 'Wheel should trigger the camera instead of jumping the document');
  const camera = scene.getAnimations()[0];
  assert(camera && document.body.dataset.view === 'zoom', 'Scroll did not start zoom-out');
  assert($('score').textContent === '0000' && $('wave').textContent === '01' && $('lives').textContent === '3', 'Scroll did not reset the round');
  assert(wheel(240).defaultPrevented && scene.getAnimations()[0] === camera, 'Trackpad momentum restarted the camera');
  camera.pause();
  let previousScale = Infinity;
  for (const time of [100, 350, 650, 999]) {
    camera.currentTime = time;
    await new Promise(requestAnimationFrame);
    const scale = new DOMMatrixReadOnly(getComputedStyle(scene).transform).a * 2;
    assert(scale < previousScale, 'Scroll return must only zoom outward');
    previousScale = scale;
    const page = scene.getBoundingClientRect();
    headings.forEach((node, index) => {
      const rect = node.getBoundingClientRect(), before = positions[index];
      assert(Math.abs((rect.left - page.left) / scale - before.x) < .1 && Math.abs((rect.top - page.top) / scale - before.y) < .1, 'Text jumped during scroll return');
      assert(Math.abs(rect.width / scale - before.width) < .1 && Math.abs(rect.height / scale - before.height) < .1, 'Text reflowed during scroll return');
    });
  }
  await finish();
  assert(document.body.dataset.view === 'profile' && scrollY === 120, 'Return should land at the requested scroll position');
  assert(!$('game-cover').hidden && $('game-console').hidden, 'Scroll return did not restore the cover');
  assert(!wheel(120).defaultPrevented, 'Normal profile scrolling stayed blocked');
  await enter();
  assert(shell.dataset.mode === 'ready' && !$('title-art').hidden, 'Re-entry must boot to a fresh title');
  $('play').click();
  assert(board.textContent.split('\n').slice(-6).join('\n') === initialShip, 'Scroll reset kept the old ship position');
  assert(Number($('best').textContent) > 0, 'Reset should preserve the best score');
  board.dispatchEvent(new KeyboardEvent('keydown', { code: 'PageDown', bubbles: true, cancelable: true }));
  assert(document.body.dataset.view === 'zoom', 'Keyboard scrolling did not exit');
  await finish();
  // A scroll during boot or entry must cancel stale completion callbacks.
  $('enter').click();
  await finish();
  assert(!$('boot-log').hidden, 'Expected boot log');
  wheel(40);
  await finish();
  await wait(2100);
  assert(document.body.dataset.view === 'profile' && $('boot-log').hidden, 'Cancelled boot reopened the game');
  $('enter').click();
  const inward = scene.getAnimations()[0];
  inward.pause(); inward.currentTime = 700;
  await new Promise(requestAnimationFrame);
  wheel(40);
  await finish();
  assert(document.body.dataset.view === 'profile' && !scene.getAnimations().length, 'Scroll during entry left a stale camera');
  $('enter').click();
  await finish();
  const touch = (type, y, target) => target.dispatchEvent(new TouchEvent(type, {
    bubbles: true, cancelable: true, touches: [new Touch({ identifier: 1, target, clientX: 20, clientY: y })],
  }));
  touch('touchstart', 300, $('playfield')); touch('touchmove', 200, $('playfield'));
  assert(document.body.dataset.view === 'game', 'Game touch controls should not scroll out');
  touch('touchstart', 300, link); touch('touchmove', 200, link);
  assert(document.body.dataset.view === 'zoom', 'Swiping the profile did not exit');
  await finish();
  return 'Passed: zoomed links, focus, wheel/reset, momentum, rendering stability, re-entry, best score, keyboard/touch scrolling, and interrupted boot/entry.';
})()
