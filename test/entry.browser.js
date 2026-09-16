// Open ?profile=1, then: agent-browser eval --stdin < test/entry.browser.js
(async () => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const html = await (await fetch('./index.html')).text();
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999';
  const init = `<base href="${new URL('./', location.href)}"><script>
    window.testHidden = true;
    Object.defineProperty(document, 'hidden', {get: () => window.testHidden});
    window.profilePaints = 0;
    function sample() {
      if (!document.hidden && document.body?.dataset.view === 'profile') window.profilePaints++;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  <\/script>`;
  frame.srcdoc = html.replace('<head>', `<head>${init}`);
  document.body.append(frame);
  try {
    await new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    const win = frame.contentWindow, doc = win.document;
    assert(!win.matchMedia('(prefers-reduced-motion: reduce)').matches, 'Run this test with normal motion');
    const visibility = hidden => {
      win.testHidden = hidden;
      doc.dispatchEvent(new win.Event('visibilitychange'));
    };
    const scene = doc.getElementById('profile-scene');
    await wait(2700);
    assert(doc.body.dataset.view === 'profile', 'Hidden entry consumed the zoom');
    visibility(false);
    await wait(300);
    assert(win.profilePaints >= 2, 'Profile did not paint before zoom');
    assert(doc.body.dataset.view === 'zoom', 'Visible entry skipped the zoom');
    const animation = scene.getAnimations()[0];
    assert(animation && animation.currentTime < 1000, 'Camera did not start from the beginning');
    visibility(true);
    await wait(80);
    const pausedTime = animation.currentTime;
    await wait(2600);
    assert(animation.currentTime === pausedTime, 'Camera advanced in a hidden tab');
    assert(doc.body.dataset.view === 'zoom', 'Hidden camera skipped to the console');
    visibility(false);
    await wait(300);
    assert(animation.currentTime > pausedTime && doc.body.dataset.view === 'zoom', 'Camera did not resume');
    await wait(2300);
    assert(doc.body.dataset.view === 'game', 'Zoom did not reach console');
    assert(!doc.getElementById('boot-log').hidden, 'Boot must follow the zoom');
    await wait(2200);
    doc.getElementById('profile-view').click();
    await wait(2000);
    assert(doc.body.dataset.view === 'profile', 'Return did not restore profile');
    doc.getElementById('enter').click();
    await wait(300);
    assert(doc.body.dataset.view === 'zoom', 'Re-entry skipped the zoom');
    return 'PASS: visible first paint, hidden entry, paused/resumed zoom, boot, return and re-entry';
  } finally {
    frame.remove();
  }
})();
