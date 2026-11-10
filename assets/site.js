// Shared header, footer, theme switch, mobile menu and scroll reveal for every page of the Project ALEN site.
(function () {
  const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="assets/icons.svg#${id}"/></svg>`;
  const page = document.body.dataset.page || '';
  const link = (href, label, id) => `<a href="${href}"${page === id ? ' aria-current="page"' : ''}>${label}</a>`;

  // Theme: the saved choice, else the system's. Applied before paint by the inline snippet in each page's <head>.
  const saved = () => { try { return localStorage.getItem('alen.theme'); } catch { return null; } };
  const current = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('alen.theme', t); } catch { /* this visit only */ } paintToggle(); };
  function paintToggle() { const b = document.getElementById('theme-btn'); if (b) { const dark = current() === 'dark'; b.innerHTML = icon(dark ? 'sun' : 'moon'); b.setAttribute('aria-label', dark ? 'Use the light theme' : 'Use the dark theme'); } }
  if (saved()) document.documentElement.dataset.theme = saved();

  const head = document.querySelector('[data-site-head]');
  if (head) {
    head.outerHTML = `
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Project ALEN home"><img src="assets/logo.svg" alt="" width="30" height="30"/>Project ALEN</a>
    <button class="icon-btn menu-btn" id="menu-btn" aria-label="Open the menu" aria-expanded="false" aria-controls="site-nav">${icon('menu')}</button>
    <nav class="nav" id="site-nav" aria-label="Site">
      ${link('index.html', 'Product', 'home')}
      ${link('how-it-works.html', 'How it works', 'how')}
      ${link('features.html', 'Features', 'features')}
      ${link('enterprise.html', 'Enterprise', 'enterprise')}
      ${link('walkthrough.html', 'Walkthrough', 'walkthrough')}
      <button class="icon-btn" id="theme-btn" type="button"></button>
      <a class="btn pri sm" href="trial.html">${icon('key')}Get a free trial</a>
    </nav>
  </div>
</header>`;
  }
  const foot = document.querySelector('[data-site-foot]');
  if (foot) {
    foot.outerHTML = `
<footer class="site-foot">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="26" height="26"/>Project ALEN</a>
    <span>The AI architecture workbench for VS Code.</span>
    <nav aria-label="Footer">
      <a href="how-it-works.html">How it works</a><a href="features.html">Features</a><a href="enterprise.html">Enterprise</a><a href="walkthrough.html">Walkthrough</a><a href="trial.html">Free trial</a><a href="privacy.html">Privacy</a>
    </nav>
    <span style="width:100%">© ${new Date().getFullYear()} Project ALEN. Paid plans are coming soon.</span>
  </div>
</footer>`;
  }
  paintToggle();
  document.getElementById('theme-btn')?.addEventListener('click', () => setTheme(current() === 'dark' ? 'light' : 'dark'));
  const menu = document.getElementById('menu-btn'); const nav = document.getElementById('site-nav');
  menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });

  // Sections fade in as they scroll into view (not with reduced motion: the CSS shows them at once).
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add('in'));

  // Walkthrough: the side list follows the step on screen.
  const steps = document.querySelectorAll('.walk-step');
  const links = document.querySelectorAll('.walk-nav a');
  if (steps.length && links.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`)); }), { rootMargin: '-35% 0px -60% 0px' });
    steps.forEach((s) => spy.observe(s));
  }
})();
