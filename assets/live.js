// Live parts of the site: typing terminals, the local-first diagram, and pausing everything for reduced motion
// or while a diagram is off screen.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // SVG <animate> elements (SMIL) do not follow CSS: pause them for reduced motion, and while off screen.
  const svgs = document.querySelectorAll('svg.live');
  if (reduced) svgs.forEach((s) => s.pauseAnimations && s.pauseAnimations());
  else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const s = e.target; if (!s.pauseAnimations) return; if (e.isIntersecting) s.unpauseAnimations(); else s.pauseAnimations(); }));
    svgs.forEach((s) => io.observe(s));
  }

  // A terminal types its script line by line, waits, then starts again. data-script is the id of a <template>
  // whose lines are "class|text" (class: p prompt, ok, m muted, w warning, or empty).
  document.querySelectorAll('.term[data-script]').forEach((term) => {
    const tpl = document.getElementById(term.dataset.script);
    if (!tpl) return;
    const lines = tpl.innerHTML.trim().split('\n').map((l) => { const i = l.indexOf('|'); return { cls: l.slice(0, i).trim(), text: l.slice(i + 1) }; });
    const span = (cls, text) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; };
    const cursor = () => { const c = document.createElement('span'); c.className = 'cursor'; return c; };
    if (reduced) { term.textContent = ''; lines.forEach((l) => { term.append(span(l.cls, l.text), '\n'); }); return; }
    let visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(term);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function run() {
      for (;;) {
        term.textContent = ''; const c = cursor(); term.append(c);
        for (const l of lines) {
          while (!visible) await wait(400);
          const s = span(l.cls, ''); term.insertBefore(s, c);
          if (l.cls === 'p') { for (const ch of l.text) { s.textContent += ch; await wait(28); } await wait(250); }
          else { s.textContent = l.text; await wait(l.cls === 'ok' ? 380 : 220); }
          term.insertBefore(document.createTextNode('\n'), c);
        }
        await wait(3800);
      }
    }
    run();
  });
})();
