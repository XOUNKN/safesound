// Study Hub — homepage interactions.
// Depends on games.js providing window.GAMES and window.CATEGORIES.
// Vanilla JS. No external calls. No frameworks.

(function () {
  'use strict';

  // ---------- storage helpers --------------------------------------------
  const LS = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : v;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    },
    getJSON(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        if (v == null) return fallback;
        return JSON.parse(v);
      } catch { return fallback; }
    },
    setJSON(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
    del(key) { try { localStorage.removeItem(key); } catch {} },
  };

  // ---------- cloak presets (shared with settings.js & cloak-inherit) ----
  const CLOAKS = {
    default:     { title: 'Study Hub',                              label: 'Study Hub',        letter: 'S', bg: '#2563eb' },
    classroom:   { title: 'Classes',                                label: 'Google Classroom', letter: 'C', bg: '#f59e0b' },
    docs:        { title: 'Docs',                                   label: 'Google Docs',      letter: 'D', bg: '#2563eb' },
    drive:       { title: 'My Drive - Google Drive',                label: 'Google Drive',     letter: 'D', bg: '#22c55e' },
    khan:        { title: 'Khan Academy',                           label: 'Khan Academy',     letter: 'K', bg: '#0ea5e9' },
    canvas:      { title: 'Dashboard',                              label: 'Canvas',           letter: 'C', bg: '#dc2626' },
    schoology:   { title: 'Home | Schoology',                       label: 'Schoology',        letter: 'S', bg: '#0073b2' },
    powerschool: { title: 'PowerSchool',                            label: 'PowerSchool',      letter: 'P', bg: '#1f3f66' },
    wiki:        { title: 'Wikipedia, the free encyclopedia',       label: 'Wikipedia',        letter: 'W', bg: '#111111' },
  };
  const CLOAK_ALIASES = {
    'wikipedia': 'wiki', 'google-classroom': 'classroom',
    'google-docs': 'docs', 'google-drive': 'drive', 'khan-academy': 'khan',
  };
  function faviconFor(letter, bg) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <rect width='64' height='64' rx='12' fill='${bg}'/>
      <text x='32' y='44' font-family='Arial' font-size='40' font-weight='bold' fill='white' text-anchor='middle'>${letter}</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function resolveCloakKey(raw) {
    if (!raw) return 'default';
    if (CLOAK_ALIASES[raw]) raw = CLOAK_ALIASES[raw];
    return raw in CLOAKS ? raw : 'default';
  }
  function applyCloak(key) {
    const resolved = resolveCloakKey(key);
    const c = CLOAKS[resolved];
    document.title = c.title;
    let fav = document.getElementById('favicon');
    if (!fav) {
      fav = document.createElement('link');
      fav.rel = 'icon';
      fav.id = 'favicon';
      document.head.appendChild(fav);
    }
    fav.href = faviconFor(c.letter, c.bg);
    LS.set('cloak', resolved);
  }
  // Expose on window so other pages can reuse without re-defining.
  window.STUDYHUB_CLOAKS = CLOAKS;
  window.STUDYHUB_APPLY_CLOAK = applyCloak;
  window.STUDYHUB_RESOLVE_CLOAK = resolveCloakKey;
  window.STUDYHUB_FAVICON = faviconFor;

  // ---------- theme ------------------------------------------------------
  function applyTheme(t) {
    const html = document.documentElement;
    if (t === 'light' || t === 'dark') {
      html.setAttribute('data-theme', t);
    } else {
      html.removeAttribute('data-theme');
    }
    LS.set('theme', t || 'system');
  }
  function initTheme() {
    const t = LS.get('theme', 'system');
    applyTheme(t);
  }
  window.STUDYHUB_APPLY_THEME = applyTheme;

  // ---------- panic ------------------------------------------------------
  function panicUrl() {
    return LS.get('panicUrl', 'https://classroom.google.com');
  }
  function panic() {
    const url = panicUrl();
    try { window.location.replace(url); }
    catch { window.location.href = url; }
  }
  window.STUDYHUB_PANIC = panic;

  // ---------- about:blank cloak window -----------------------------------
  function openInAboutBlank() {
    const w = window.open('about:blank');
    if (!w) { alert('Pop-up blocked. Allow pop-ups to use about:blank mode.'); return; }
    const url = window.location.href;
    const cloakKey = resolveCloakKey(LS.get('cloak', 'default'));
    const c = CLOAKS[cloakKey];
    w.document.open();
    w.document.write(`<!doctype html><html><head><title>${c.title}</title>
      <link rel="icon" href="${faviconFor(c.letter, c.bg)}"/>
      <style>html,body,iframe{margin:0;padding:0;border:0;width:100%;height:100%;background:#000;}</style>
      </head><body><iframe src="${url}" allow="autoplay; fullscreen"></iframe></body></html>`);
    w.document.close();
    try { window.location.replace(panicUrl()); } catch {}
  }
  window.STUDYHUB_ABOUT_BLANK = openInAboutBlank;

  // ---------- favorites + recent -----------------------------------------
  function getFavorites() { return LS.getJSON('favorites', []); }
  function setFavorites(list) { LS.setJSON('favorites', list); }
  function isFavorite(slug) { return getFavorites().indexOf(slug) !== -1; }
  function toggleFavorite(slug) {
    const list = getFavorites();
    const i = list.indexOf(slug);
    if (i === -1) list.push(slug); else list.splice(i, 1);
    setFavorites(list);
    renderAll();
  }
  window.toggleFavorite = toggleFavorite;

  function getRecent() { return LS.getJSON('recent', []); }
  function pushRecent(slug) {
    let list = getRecent().filter(s => s !== slug);
    list.unshift(slug);
    if (list.length > 8) list = list.slice(0, 8);
    LS.setJSON('recent', list);
  }

  // ---------- rendering --------------------------------------------------
  function buildCard(g) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-slug', g.slug);
    const fav = isFavorite(g.slug);
    const starTitle = fav ? 'Unfavorite' : 'Favorite';
    const thumbLetter = (g.name || '?').trim().charAt(0).toUpperCase() || '?';
    card.innerHTML = `
      <button class="fav-btn" title="${starTitle}" aria-label="${starTitle}" data-fav="${g.slug}">${fav ? '★' : '☆'}</button>
      <div class="thumb" style="background:linear-gradient(135deg, ${g.color || '#4f8dff'}, #0b1020)">${thumbLetter}</div>
      <h3>${g.name}</h3>
      <p>${g.controls || ''}</p>
      <div class="card-meta"><span class="pill">${g.category}</span>${g.is_vendored ? ' <span class="pill pill-muted">vendored</span>' : ''}</div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('fav-btn')) return;
      openGame(g);
    });
    const fb = card.querySelector('.fav-btn');
    if (fb) fb.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(g.slug); });
    return card;
  }

  function openGame(g) {
    pushRecent(g.slug);
    window.location.href = g.file;
  }

  function filterByQuery(games, q) {
    const s = (q || '').trim().toLowerCase();
    if (!s) return games;
    return games.filter(g =>
      (g.name || '').toLowerCase().includes(s) ||
      (g.category || '').toLowerCase().includes(s) ||
      (g.controls || '').toLowerCase().includes(s)
    );
  }

  function renderRow(containerId, list) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const grid = wrap.querySelector('.grid');
    const section = wrap;
    if (!list.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    grid.innerHTML = '';
    for (const g of list) grid.appendChild(buildCard(g));
  }

  function renderCategories(query) {
    const host = document.getElementById('categorySections');
    if (!host) return;
    host.innerHTML = '';
    const q = (query || '').trim();
    const all = filterByQuery(window.GAMES || [], q);
    for (const cat of (window.CATEGORIES || [])) {
      const list = all.filter(g => g.category === cat.key);
      if (!list.length) continue;
      const section = document.createElement('section');
      section.className = 'row';
      section.setAttribute('data-category', cat.key);
      section.innerHTML = `<h2 class="row-title">${cat.label}</h2><div class="grid"></div>`;
      const grid = section.querySelector('.grid');
      for (const g of list) grid.appendChild(buildCard(g));
      host.appendChild(section);
    }
    const emptyEl = document.getElementById('emptyState');
    if (emptyEl) emptyEl.style.display = (q && !all.length) ? '' : 'none';
  }

  function renderAll() {
    const q = (document.getElementById('search') || {}).value || '';
    // Favorites + recent respect current query too.
    const games = window.GAMES || [];
    const bySlug = Object.create(null);
    for (const g of games) bySlug[g.slug] = g;
    const filtered = filterByQuery(games, q);
    const favSet = new Set(getFavorites());
    const favList = filtered.filter(g => favSet.has(g.slug));
    const recentList = getRecent()
      .map(s => bySlug[s])
      .filter(Boolean)
      .filter(g => !q || filtered.includes(g));
    renderRow('favoritesSection', favList);
    renderRow('recentSection', recentList);
    renderCategories(q);
  }
  window.STUDYHUB_RENDER = renderAll;

  // ---------- shortcuts modal -------------------------------------------
  function ensureShortcutsModal() {
    let m = document.getElementById('shortcutsModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'shortcutsModal';
    m.className = 'modal';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = `
      <div class="modal-card" role="dialog" aria-label="Keyboard shortcuts">
        <h2>Keyboard shortcuts</h2>
        <ul class="shortcut-list">
          <li><kbd>/</kbd><span>Focus search</span></li>
          <li><kbd>?</kbd><span>Toggle this help</span></li>
          <li><kbd>Esc</kbd><span>Close help</span></li>
          <li><kbd>\`</kbd><span>Panic (jump to your saved URL)</span></li>
          <li><kbd>Space</kbd><span>On music: play/pause</span></li>
          <li><kbd>M</kbd><span>On music: mute</span></li>
          <li><kbd>&uarr;</kbd> / <kbd>&darr;</kbd><span>On music: volume</span></li>
        </ul>
        <button id="shortcutsClose">Close</button>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) closeShortcuts(); });
    m.querySelector('#shortcutsClose').addEventListener('click', closeShortcuts);
    return m;
  }
  function openShortcuts() {
    const m = ensureShortcutsModal();
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
  }
  function closeShortcuts() {
    const m = document.getElementById('shortcutsModal');
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }
  window.STUDYHUB_OPEN_SHORTCUTS = openShortcuts;
  window.STUDYHUB_CLOSE_SHORTCUTS = closeShortcuts;

  // ---------- service worker (safety net on every page) ------------------
  function registerSW() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
      }
    } catch {}
  }

  // ---------- cloak selector wiring (shared across pages) ----------------
  function wireCloakSelect(sel) {
    if (!sel) return;
    // Ensure every known preset is present as an <option>.
    if (sel.options.length < Object.keys(CLOAKS).length) {
      sel.innerHTML = '';
      for (const key of Object.keys(CLOAKS)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = CLOAKS[key].label;
        sel.appendChild(opt);
      }
    }
    sel.value = resolveCloakKey(LS.get('cloak', 'default'));
    sel.addEventListener('change', () => applyCloak(sel.value));
  }
  window.STUDYHUB_WIRE_CLOAK = wireCloakSelect;

  // ---------- init -------------------------------------------------------
  function init() {
    initTheme();
    applyCloak(LS.get('cloak', 'default'));
    registerSW();

    const sel = document.getElementById('cloakSel');
    wireCloakSelect(sel);

    const aboutBtn = document.getElementById('aboutBlankBtn');
    if (aboutBtn) aboutBtn.addEventListener('click', openInAboutBlank);
    const panicBtn = document.getElementById('panicBtn');
    if (panicBtn) panicBtn.addEventListener('click', panic);
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      const cur = LS.get('theme', 'system');
      const next = cur === 'dark' ? 'light' : cur === 'light' ? 'system' : 'dark';
      applyTheme(next);
    });

    const search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', () => renderAll());
    }

    // Keyboard shortcuts.
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '/' && !typing) {
        if (search) { e.preventDefault(); search.focus(); search.select(); }
      } else if (e.key === '?' && !typing) {
        e.preventDefault();
        const m = document.getElementById('shortcutsModal');
        if (m && m.classList.contains('open')) closeShortcuts(); else openShortcuts();
      } else if (e.key === 'Escape') {
        closeShortcuts();
      }
      // Panic key is also handled; keep it here as a fallback when
      // cloak-inherit.js isn't loaded on a page.
      if (e.key === '`' && !typing) {
        e.preventDefault(); panic();
      }
    });

    // Only render the catalog on pages that actually have the containers.
    if (document.getElementById('categorySections')) renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
