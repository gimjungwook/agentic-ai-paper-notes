/* ============================================================
   wiki.js — 전역 사이드바 + On-this-page TOC + 테마 + 모바일
   각 페이지의 본문은 그대로, 내비/헤더 크롬만 주입한다.
   ============================================================ */
(function () {
  const GROUPS = [
    { g: 'Jacob Andreas · MIT', items: [
      { dir: 'p1-andreas-shoot', t: 'P1 · Shoot First' },
      { dir: 'p2-andreas-gate', t: 'P2 · GATE' } ] },
    { g: 'Diyi Yang · Stanford', items: [
      { dir: 'p3-yang-future-of-work', t: 'P3 · Future of Work' },
      { dir: 'p4-yang-cooperbench', t: 'P4 · CooperBench' } ] },
    { g: 'Graham Neubig · CMU', items: [
      { dir: 'p5-neubig-agentcompany', t: 'P5 · TheAgentCompany' },
      { dir: 'p6-neubig-nemo', t: 'P6 · NEMO' } ] },
    { g: 'Daniel Fried · CMU', items: [
      { dir: 'p7-fried-coordination', t: 'P7 · Coordination' },
      { dir: 'p8-fried-asi', t: 'P8 · ASI' } ] },
  ];

  const path = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  const m = path.match(/\/(p\d-[^/]+)$/);
  const curDir = m ? m[1] : '';
  const base = curDir ? '../' : './';

  function run() {
    // ---------- 0. 테마 ----------
    const saved = (function(){ try { return localStorage.getItem('wk-theme'); } catch(e){ return null; } })();
    const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved || (sysDark ? 'dark' : 'light'), false);

    // ---------- 1. 헤더 크롬 ----------
    let topbar = document.querySelector('.topbar');
    if (!topbar) { topbar = document.createElement('div'); topbar.className = 'topbar'; document.body.insertBefore(topbar, document.body.firstChild); }
    const homeEl = topbar.querySelector('.home');
    const miniEl = topbar.querySelector('.ch-mini');
    topbar.innerHTML = '';

    const menuBtn = el('button', 'wk-btn wk-menu', '☰');
    menuBtn.setAttribute('aria-label', '메뉴');
    menuBtn.addEventListener('click', () => document.documentElement.classList.toggle('wk-open'));

    const brand = document.createElement('a');
    brand.className = 'wk-brand'; brand.href = base + 'index.html';
    brand.innerHTML = '<span class="dot"></span>Agentic AI 정독';

    const spacer = el('div', 'wk-spacer', '');
    const themeBtn = el('button', 'wk-btn wk-theme', themeIcon());
    themeBtn.setAttribute('aria-label', '테마 전환');
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next, true); themeBtn.innerHTML = themeIcon();
    });

    topbar.appendChild(menuBtn);
    topbar.appendChild(brand);
    topbar.appendChild(spacer);
    if (homeEl) { homeEl.textContent = '← 전체 목록'; homeEl.setAttribute('href', base + 'index.html'); topbar.appendChild(homeEl); }
    if (miniEl) topbar.appendChild(miniEl);
    topbar.appendChild(themeBtn);

    // ---------- 2. 스크롤 진행 바 ----------
    let prog = document.querySelector('.scroll-progress');
    if (!prog) { prog = document.createElement('div'); prog.className = 'scroll-progress'; document.body.insertBefore(prog, document.body.firstChild); }
    Object.assign(prog.style, { position: 'fixed', top: '0', left: '0', width: '0', zIndex: '100' });

    // ---------- 3. 본문 섹션 → 우측 TOC 재료 캡처 (ch-nav 덮기 전에) ----------
    const layout = document.querySelector('.ch-layout');
    let tocItems = [];
    const nav = document.querySelector('.ch-nav');
    if (nav) {
      tocItems = [...nav.querySelectorAll('a[href^="#"]')].map(a => ({ href: a.getAttribute('href'), t: a.textContent.trim() }));
    }
    // 섹션 실재 확인
    tocItems = tocItems.filter(it => document.querySelector(it.href.replace(/^#/, '#')) || document.getElementById(it.href.slice(1)));

    // ---------- 4. 좌측 전역 사이드바 ----------
    if (nav) {
      const navHtml = [];
      navHtml.push('<a class="wk-home" href="' + base + 'index.html">⌂ 전체 목록</a>');
      GROUPS.forEach(grp => {
        navHtml.push('<div class="wk-side-group"><span class="gh">' + grp.g + '</span><ul>' +
          grp.items.map(it => {
            const cur = it.dir === curDir ? ' class="wk-current"' : '';
            return '<li><a' + cur + ' href="' + base + it.dir + '/index.html">' + it.t + '</a></li>';
          }).join('') + '</ul></div>');
      });
      const navInner = nav.querySelector('nav') || nav;
      navInner.innerHTML = navHtml.join('');
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => document.documentElement.classList.remove('wk-open')));
    }

    // ---------- 5. 우측 On-this-page ----------
    if (layout && tocItems.length) {
      const toc = document.createElement('aside');
      toc.className = 'wk-toc';
      toc.innerHTML = '<div class="th">On this page</div><ul>' +
        tocItems.map(it => '<li><a href="' + it.href + '">' + it.t + '</a></li>').join('') + '</ul>';
      layout.appendChild(toc);

      // scrollspy
      const links = [...toc.querySelectorAll('a')];
      const map = {};
      links.forEach(a => { map[a.getAttribute('href').slice(1)] = a; });
      const secs = tocItems.map(it => document.getElementById(it.href.slice(1))).filter(Boolean);
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            links.forEach(a => a.classList.remove('wk-active'));
            const a = map[e.target.id]; if (a) a.classList.add('wk-active');
          }
        });
      }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 });
      secs.forEach(s => obs.observe(s));
    }

    // ---------- 6. 진행 바 갱신 ----------
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 배경 클릭 시 모바일 메뉴 닫기
    document.addEventListener('click', e => {
      if (document.documentElement.classList.contains('wk-open') &&
          !e.target.closest('.ch-nav') && !e.target.closest('.wk-menu')) {
        document.documentElement.classList.remove('wk-open');
      }
    });
  }

  function setTheme(t, persist) {
    document.documentElement.setAttribute('data-theme', t);
    if (persist) { try { localStorage.setItem('wk-theme', t); } catch (e) {} }
  }
  function themeIcon() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '☀︎' : '☾';
  }
  function el(tag, cls, html) { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
