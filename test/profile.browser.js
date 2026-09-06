// Open ?profile=1, then: agent-browser eval --stdin < test/profile.browser.js
(async () => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const menus = [...document.querySelectorAll('.nav-menu')];
  for (const menu of menus) {
    menu.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    assert(menu.open, 'Hover must open the menu immediately, without clicking');
    assert(menus.filter(item => item.open).length === 1, 'Previous menu did not close immediately');
    await wait(180);
    assert(menu.open, 'Menu did not open');
    assert(menus.filter(item => item.open).length === 1, 'Multiple menus open');
    const rect = menu.querySelector('.nav-panel').getBoundingClientRect();
    assert(rect.left >= 0 && rect.right <= innerWidth, 'Menu overflows viewport');
    assert(rect.height > 200, 'Menu contents missing');
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(menus.every(menu => !menu.open), 'Escape did not close the menu');

  const link = document.querySelector('.repo-card h3>a');
  link.focus();
  const preview = document.querySelector('.repo-hovercard');
  assert(!preview.hidden && preview.textContent.includes('142'), 'Repository preview missing');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(preview.hidden, 'Escape did not close the preview');
  for (const row of document.querySelectorAll('details.timeline-item')) {
    row.querySelector('summary').click();
    assert(!row.open, 'Activity did not collapse');
    row.querySelector('summary').click();
    assert(row.open, 'Activity did not expand');
  }
  const left = document.querySelector('.bio').getBoundingClientRect().left;
  for (const icon of document.querySelectorAll('.followers svg,.profile-details svg')) {
    assert(Math.abs(icon.getBoundingClientRect().left - left) < 1, 'Sidebar icon is indented');
  }
  const days = document.querySelectorAll('#contribution-days>span');
  assert(days.length >= 365 && days.length <= 371, 'Calendar cells missing');
  assert(Date.parse(days[days.length - 1].dataset.date) - Date.parse(days[0].dataset.date) === (days.length - 1) * 86400000, 'Calendar dates must cover consecutive days');
  for (const cell of document.querySelectorAll('#contribution-days>span')) {
    const rect = cell.getBoundingClientRect();
    assert(rect.width === 10 && rect.height === 10, 'Contribution cells must be visible squares');
    assert(getComputedStyle(cell).backgroundColor !== 'rgba(0, 0, 0, 0)', 'Contribution cell has no fill');
  }
  assert([...document.querySelectorAll('svg[data-icon]')].every(svg => svg.querySelector('path')), 'Empty icon');
  assert(document.documentElement.scrollWidth <= innerWidth, 'Page overflows viewport');
  const scene = document.querySelector('#profile-scene');
  const card = document.querySelector('#game-shell');
  const parent = card.parentElement;
  const board = document.querySelector('#game');
  const profile = document.querySelector('#profile-view');
  const avatar = document.querySelector('#avatar');
  scrollTo(0, 100);
  await new Promise(requestAnimationFrame);
  const original = card.getBoundingClientRect();
  const originalScroll = scrollY;
  const originalWidth = avatar.getBoundingClientRect().width;
  const headings = [...document.querySelectorAll('.full-name,.markdown-body>h2')];
  const headingPositions = headings.map(node => {
    const rect = node.getBoundingClientRect(), page = scene.getBoundingClientRect();
    return { left: rect.left - page.left, top: rect.top - page.top, width: rect.width, height: rect.height };
  });
  const cameraMotion = () => scene.getAnimations()[0];
  const finishMotion = async () => { cameraMotion()?.finish(); await wait(40); };
  const sameCard = () => {
    assert(document.querySelector('#game-shell') === card && card.parentElement === parent, 'Game card was replaced or moved');
    assert(card.contains(board) && card.closest('.readme'), 'Game must remain inside the README');
    assert(!document.querySelector('#game-layer,#stage-backdrop'), 'Separate game screen must not exist');
    assert(getComputedStyle(scene).opacity === '1' && getComputedStyle(scene).zoom === '2', 'Page must remain visible at a fixed rendering resolution');
    const scale = new DOMMatrixReadOnly(getComputedStyle(scene).transform).a * 2;
    const page = scene.getBoundingClientRect();
    headings.forEach((node, i) => {
      const rect = node.getBoundingClientRect(), initial = headingPositions[i];
      assert(Math.abs((rect.left - page.left) / scale - initial.left) < .05 && Math.abs((rect.top - page.top) / scale - initial.top) < .05, 'Heading position jittered inside the page');
      assert(Math.abs(rect.width / scale - initial.width) < .05 && Math.abs(rect.height / scale - initial.height) < .05, 'Heading reflowed during the camera move');
    });
  };
  document.querySelector('#enter').click();
  const camera = cameraMotion();
  assert(camera, 'Whole-page camera animation missing');
  assert(camera.effect.getTiming().duration >= 2000, 'Zoom should be slow');
  camera.pause();
  let previousWidth = originalWidth;
  for (const time of [300, 1000, 1800, 2399]) {
    camera.currentTime = time;
    await new Promise(requestAnimationFrame);
    sameCard();
    const width = avatar.getBoundingClientRect().width;
    assert(width > previousWidth, 'The page must only zoom inward');
    previousWidth = width;
    const zoom = new DOMMatrixReadOnly(getComputedStyle(scene).transform).a * 2;
    assert(Math.abs(card.getBoundingClientRect().height / zoom - original.height) < 1, 'Card changed shape during the zoom');
    assert(document.querySelector('#game-console').hidden, 'Console must boot after the camera stops');
  }
  assert(previousWidth > originalWidth * 1.2 && previousWidth <= originalWidth * 1.71, 'Zoom must enlarge the page while leaving some context');
  await finishMotion();
  assert(document.body.dataset.view === 'game', 'Camera did not stop at the card');
  assert(!document.querySelector('#boot-log').hidden, 'In-card console boot missing');
  await wait(250);
  assert(document.querySelector('#boot-log').textContent.split('\n').length > 6, 'Boot commands should arrive quickly');
  const destination = card.getBoundingClientRect();
  assert(destination.left > 16 && destination.right < innerWidth - 16 && destination.top > 16 && destination.bottom < innerHeight - 16, 'Card needs visible profile context around it');
  await wait(300);
  assert(document.querySelector('#boot-log').textContent.includes('> launching in\n> 3'), 'Countdown needs separate lines');
  await wait(1050);
  assert(document.querySelector('#boot-log').textContent.includes('> 3\n> 2\n> 1'), 'Countdown numbers did not arrive on separate lines');
  await wait(450);
  sameCard();
  assert(document.querySelector('#boot-log').hidden && !document.querySelector('#overlay').hidden && card.dataset.mode === 'ready', 'Boot must stop at the title screen');
  const title = document.querySelector('#title-art');
  assert(!title.hidden && title.textContent.includes('█'), 'Text-art title missing');
  const playButton = document.querySelector('#play'), menuSettings = document.querySelector('#menu-settings');
  assert(document.activeElement === playButton, 'Title should focus Play');
  playButton.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
  assert(document.activeElement === menuSettings, 'Arrow keys did not select Settings');
  assert(getComputedStyle(menuSettings).color === 'rgb(173, 240, 192)', 'Selected option should be green');
  assert(getComputedStyle(playButton).color !== 'rgb(173, 240, 192)', 'Previous option stayed green');
  menuSettings.click();
  assert(!document.querySelector('#game-settings').hidden && card.dataset.mode === 'ready', 'Title Settings started the game');
  document.querySelector('#settings-close').click();
  assert(document.activeElement === menuSettings && !document.querySelector('#overlay').hidden, 'Settings did not return to the title');
  const waitingBoard = board.textContent;
  await wait(100);
  assert(board.textContent === waitingBoard, 'Game advanced behind the title screen');
  assert(board.inert && board.tabIndex === -1, 'The covered game should not receive keyboard focus');
  profile.click();
  await finishMotion();
  document.querySelector('#enter').click();
  await finishMotion();
  assert(!document.querySelector('#boot-log').hidden, 'Re-entry must replay the boot');
  await wait(2100);
  assert(card.dataset.mode === 'ready' && !document.querySelector('#overlay').hidden, 'Returning to the title unexpectedly started the game');
  playButton.click();
  assert(document.querySelector('#overlay').hidden && card.dataset.mode === 'playing', 'Play did not start the game');
  const field = document.querySelector('#playfield').getBoundingClientRect();
  const pixels = board.getBoundingClientRect();
  assert(pixels.width <= field.width && pixels.height <= field.height, 'Game characters overflow the card');
  const before = board.textContent.split('\n').slice(-6).join('\n');
  board.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
  await wait(250);
  board.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
  assert(board.textContent.split('\n').slice(-6).join('\n') !== before, 'Ship controls did not work');
  profile.click();
  const returning = cameraMotion();
  assert(returning, 'Back to profile must animate');
  returning.pause();
  await wait(50);
  const pausedBoard = board.textContent;
  const score = document.querySelector('#score').textContent;
  for (const time of [200, 700, 1400, 1799]) {
    returning.currentTime = time;
    await new Promise(requestAnimationFrame);
    sameCard();
    const width = avatar.getBoundingClientRect().width;
    assert(width < previousWidth + 1, 'Return camera must move outward');
    previousWidth = width;
  }
  await finishMotion();
  assert(document.body.dataset.view === 'profile', 'Return did not restore profile mode');
  assert(Math.abs(avatar.getBoundingClientRect().width - originalWidth) < 1, 'Profile did not restore after the game');
  assert(Math.abs(card.getBoundingClientRect().top - original.top) < 1 && scrollY === originalScroll, 'Return lost the original scroll position');
  assert(!document.querySelector('.sidebar').inert, 'Profile controls stayed inert');
  await wait(100);
  assert(board.textContent === pausedBoard && document.querySelector('#score').textContent === score, 'Returning to profile did not preserve the game');

  // Reverse twice mid-flight; stale animation completions must not change the destination.
  document.querySelector('#enter').click();
  cameraMotion().pause();
  cameraMotion().currentTime = 900;
  await new Promise(requestAnimationFrame);
  profile.click();
  cameraMotion().pause();
  cameraMotion().currentTime = 300;
  await new Promise(requestAnimationFrame);
  profile.click();
  await finishMotion();
  assert(!document.querySelector('#boot-log').hidden, 'Interrupted re-entry must replay the boot');
  await wait(2100);
  assert(document.body.dataset.view === 'game' && !document.querySelector('#overlay').hidden, 'Re-entry must return to the title');
  playButton.click();
  assert(document.querySelector('#overlay').hidden, 'Play failed to resume');
  assert(document.querySelector('#score').textContent === score, 'Re-entry reset the score');
  assert(board.textContent.split('\n').slice(-6).join('\n') === pausedBoard.split('\n').slice(-6).join('\n'), 'Re-entry reset the ship position');
  sameCard();
  profile.click();
  await finishMotion();
  assert(document.body.dataset.view === 'profile' && !cameraMotion(), 'Repeated return left a stale animation');
  return 'Passed: menus, previews, heat map, icons, live in-card zoom, local boot, controls, reverse motion, saved state, and interrupted transitions.';
})()
