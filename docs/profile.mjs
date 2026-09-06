const menus = [...document.querySelectorAll('.nav-menu')];
const mobileMenu = document.querySelector('.mobile-menu-toggle');
function setMobileMenu(open) {
  mobileMenu.setAttribute('aria-expanded', String(open));
  document.querySelector('.github-header').classList.toggle('mobile-nav-open', open);
}
mobileMenu.addEventListener('click', () => setMobileMenu(mobileMenu.getAttribute('aria-expanded') !== 'true'));
function positionMenu(menu) {
  const panel = menu.querySelector('.nav-panel');
  const scale = menu.getBoundingClientRect().width / menu.offsetWidth;
  panel.style.maxWidth = `${(innerWidth - 32) / scale}px`;
  panel.style.left = '0px';
  const rect = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(16 - rect.left, Math.min(0, innerWidth - 16 - rect.right)) / scale}px`;
}
for (const menu of menus) {
  let closeTimer;
  menu.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    clearTimeout(closeTimer);
    menus.forEach(other => { if (other !== menu) other.open = false; });
    menu.open = true;
    positionMenu(menu);
    document.dispatchEvent(new Event('profile-interaction'));
  });
  menu.addEventListener('pointerleave', () => {
    closeTimer = setTimeout(() => { menu.open = false; }, 120);
  });
  menu.addEventListener('toggle', () => {
    if (!menu.open) return;
    menus.forEach(other => { if (other !== menu) other.open = false; });
    positionMenu(menu);
  });
  menu.addEventListener('focusout', event => {
    if (!menu.contains(event.relatedTarget)) menu.open = false;
  });
}
document.addEventListener('click', event => {
  menus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = menus.find(item => item.open);
  if (menu) { menu.open = false; menu.querySelector('summary').focus(); }
  else if (mobileMenu.getAttribute('aria-expanded') === 'true') { setMobileMenu(false); mobileMenu.focus(); }
  hideRepository();
});

const hovercard = document.createElement('aside');
const repositories = [...document.querySelectorAll('.repo-card')];
hovercard.className = 'repo-hovercard';
hovercard.hidden = true;
hovercard.setAttribute('aria-label', 'Repository preview');
document.body.append(hovercard);
let previewTimer;
function hideRepository() {
  clearTimeout(previewTimer);
  hovercard.hidden = true;
}
function scheduleHide() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(hideRepository, 150);
}
function showRepository(link) {
  const card = repositories.find(repo => repo.querySelector('h3>a').href === link.href);
  hovercard.replaceChildren(...[...card.children].map(child => child.cloneNode(true)));
  hovercard.hidden = false;
  const rect = link.getBoundingClientRect();
  const left = Math.max(12, Math.min(rect.left - 16, innerWidth - hovercard.offsetWidth - 12));
  const below = rect.top < hovercard.offsetHeight + 20;
  hovercard.classList.toggle('below', below);
  hovercard.style.left = `${left}px`;
  hovercard.style.top = `${below ? rect.bottom + 12 : rect.top - hovercard.offsetHeight - 12}px`;
  hovercard.style.setProperty('--arrow-left', `${Math.min(hovercard.offsetWidth - 28, Math.max(16, rect.left - left + 16))}px`);
}
for (const link of document.querySelectorAll('.repo-card h3>a,.overview-grid a')) {
  if (!repositories.some(repo => repo.querySelector('h3>a').href === link.href)) continue;
  link.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => showRepository(link), 350);
  });
  link.addEventListener('pointerleave', scheduleHide);
  link.addEventListener('focus', () => showRepository(link));
  link.addEventListener('blur', event => { if (!hovercard.contains(event.relatedTarget)) scheduleHide(); });
}
hovercard.addEventListener('pointerenter', () => clearTimeout(previewTimer));
hovercard.addEventListener('pointerleave', scheduleHide);
hovercard.addEventListener('focusout', event => { if (!hovercard.contains(event.relatedTarget)) scheduleHide(); });
document.addEventListener('click', event => { if (!hovercard.contains(event.target)) hideRepository(); });
window.addEventListener('scroll', hideRepository, { passive: true });
window.addEventListener('resize', () => { hideRepository(); menus.filter(menu => menu.open).forEach(positionMenu); });
document.addEventListener('profile-exit', () => { hideRepository(); setMobileMenu(false); menus.forEach(menu => { menu.open = false; }); });

const mobileTabs = document.querySelector('.profile-tabs').cloneNode(true);
mobileTabs.classList.add('mobile-tabs');
document.querySelector('.sidebar').after(mobileTabs);

// GitHub's public profile is configured to UTC-12, independent of the bio locations.
function showLocalTime() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Etc/GMT+12' }).format(now);
  const difference = -12 + now.getTimezoneOffset() / 60;
  const offset = difference === 0 ? 'local time' : `${Math.abs(difference)}h ${difference < 0 ? 'behind' : 'ahead'}`;
  const clock = document.createElement('span');
  clock.textContent = time;
  document.querySelector('#local-time').replaceChildren(clock, ` - ${offset}`);
}
showLocalTime();
setInterval(showLocalTime, 60000);
