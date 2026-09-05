// Public GitHub measurements, 1280px or 390px viewport, 2026-09-05. Open ?profile=1.
(async () => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  assert([1280, 390].includes(innerWidth), 'Use a 1280px or 390px viewport for the reference checks');
  const mobile = innerWidth === 390;
  const expected = mobile ? {
    '.identity': [16, 96, 358, 86],
    '#avatar': [16, 109.171875, 59.65625, 59.65625],
    '.bio': [16, 240, 358, 24],
    '.profile-details': [16, 280, 358, 83],
    '.followers': [16, 371, 358, 21],
    '.follow-button': [16, 408, 358, 32],
    '.achievements': [16, 456, 358, 118],
    '.report-link': [16, 590, 358, 38],
    '.mobile-tabs a': [32, 644, 103.140625, 30],
    '.readme': [16, 716, 358, 416.125],
    '#game-shell': [41, 891.875, 308, 173.25],
  } : {
    '#avatar': [32, 113, 296, 296],
    '.user-status': [288, 339, 38, 38],
    '.profile-tabs a': [368, 105, 103.140625, 30],
    '.markdown-body>h2': [377, 228, 846, 21.875],
    '#game-shell': [377, 344.875, 640, 360],
    '.socials': [377, 725.875, 846, 21],
    '.badge-count': [63.390625, 900, 32.609375, 20],
    '.report-link': [32, 940, 296, 38],
    '.repo-card': [352, 827.875, 440, 125],
    '.days': [397.828125, 1218.875, 686, 88],
    '.organizations a': [369, 1360.875, 101.484375, 31],
    '.activity-chart': [771.484375, 1407.875, 281, 246],
    '.contribution-activity>h2': [352, 1702.875, 746.65625, 24],
    '.commit-bar': [922.25, 1826.875, 176.40625, 8],
    '.timeline-language': [905.9375, 1914.375, 117.609375, 22],
    '.more-activity': [352, 2044.375, 746.65625, 38],
    '.github-footer': [0, 2082.375, 1280, 114],
  };
  for (const [selector, values] of Object.entries(expected)) {
    const rect = document.querySelector(selector).getBoundingClientRect();
    [rect.x, rect.y + scrollY, rect.width, rect.height].forEach((value, i) => {
      assert(Math.abs(value - values[i]) < .6, `${selector}: dimension ${i} differs (${value} vs ${values[i]})`);
    });
  }
  assert(getComputedStyle(document.querySelector('.user-status')).fontSize === '12px', 'Zombie size drifted');
  assert(getComputedStyle(document.querySelector('#local-time strong')).fontWeight === '600', 'Time should be bold');
  assert(getComputedStyle(document.querySelector('.file-label')).fontWeight === '400', 'README filename should use regular weight');
  assert(document.querySelector('.profile-organizations').hidden, 'Organizations are not on the public profile');
  assert(!document.querySelector('#arcade-link'), 'Removed return link reappeared');
  assert(document.querySelector('.overview-grid').children.length === 2, 'Activity markup changed structure');
  assert(document.querySelectorAll('.timeline-item>summary').length === 2, 'Activity controls missing');
  assert(document.querySelectorAll('#preview-art .preview-frame').length === 16, 'Shared card animation missing');
  for (const id of ['enter', 'settings-open']) {
    const button = document.getElementById(id), rect = button.getBoundingClientRect();
    // Enter can be below the viewport in the unzoomed profile.
    button.scrollIntoView({ block: 'center' });
    const visible = button.getBoundingClientRect();
    const hit = document.elementFromPoint(visible.x + visible.width / 2, visible.y + visible.height / 2);
    assert(hit === button || button.contains(hit), `${id}: artwork blocks clicks`);
    assert(rect.width > 20 && rect.height >= 28, `${id}: hit target is too small`);
  }
  scrollTo(0, 0);
  assert(document.documentElement.scrollWidth <= innerWidth, 'Page overflows the viewport');
  if (mobile) {
    const menu = document.querySelector('.mobile-menu-toggle');
    menu.click();
    assert(menu.getAttribute('aria-expanded') === 'true' && getComputedStyle(document.querySelector('.global-nav')).display !== 'none', 'Mobile menu did not open');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(menu.getAttribute('aria-expanded') === 'false', 'Escape did not close the mobile menu');
    menu.click();
    document.dispatchEvent(new Event('profile-exit'));
    assert(menu.getAttribute('aria-expanded') === 'false', 'Profile exit left the mobile menu open');
    document.getElementById('enter').click();
    document.getElementById('profile-scene').getAnimations()[0]?.finish();
    await new Promise(resolve => setTimeout(resolve, 2300));
    const title = document.getElementById('title-art').getBoundingClientRect();
    const heading = document.querySelector('.game-heading').getBoundingClientRect();
    const play = document.getElementById('play').getBoundingClientRect();
    const card = document.getElementById('game-shell').getBoundingClientRect();
    assert(title.top >= heading.bottom && play.bottom <= card.bottom, 'Mobile title overlaps card controls');
    document.getElementById('play').click();
    const field = document.getElementById('playfield').getBoundingClientRect();
    const board = document.getElementById('game').getBoundingClientRect();
    assert(board.width <= field.width && board.height <= field.height, 'Mobile game characters overflow');
    document.getElementById('profile-view').click();
    document.getElementById('profile-scene').getAnimations()[0]?.finish();
  }
  return `Passed: ${Object.keys(expected).length} reference rectangles, badge size, bold time, shared SVG, clickable controls, and mobile navigation.`;
})()
