// Movies page — searches Internet Archive for public-domain / CC films,
// resolves the best MP4 file for each item, and plays in an inline modal.
// Also supports local file playback via the Local tab.
//
// No auth key. No iframes to third-party players. One origin for fetch
// (archive.org) that advertises Access-Control-Allow-Origin: *.
(function () {
  'use strict';

  const ARCHIVE_SEARCH = 'https://archive.org/advancedsearch.php';
  const ARCHIVE_META   = 'https://archive.org/metadata/';
  const ARCHIVE_DL     = 'https://archive.org/download/';
  const ARCHIVE_IMG    = 'https://archive.org/services/img/';

  const LS = {
    get(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    getJSON(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch { return f; } },
    setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const status = (msg) => { const el = document.getElementById('movieStatus'); if (el) el.textContent = msg || ''; };
  const playerStatus = (msg) => { const el = document.getElementById('playerStatus'); if (el) el.textContent = msg || ''; };

  // ---------- Search / resolve -----------------------------------------
  function buildSearchUrl({ q = '', collection = 'feature_films', rows = 24 } = {}) {
    const parts = ['mediatype:(movies)'];
    if (collection) parts.push('collection:(' + collection + ')');
    if (q.trim()) parts.push('(' + q.trim() + ')');
    const query = parts.join(' AND ');
    const u = new URL(ARCHIVE_SEARCH);
    u.searchParams.set('q', query);
    ['identifier','title','creator','date','description','downloads','subject','licenseurl','year'].forEach(f => u.searchParams.append('fl[]', f));
    u.searchParams.set('sort[]', 'downloads desc');
    u.searchParams.set('rows', String(rows));
    u.searchParams.set('page', '1');
    u.searchParams.set('output', 'json');
    return u.toString();
  }

  async function searchArchive(opts) {
    const url = buildSearchUrl(opts);
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const docs = (data && data.response && data.response.docs) || [];
    return docs.map(d => ({
      id: d.identifier,
      title: Array.isArray(d.title) ? d.title[0] : (d.title || d.identifier),
      creator: Array.isArray(d.creator) ? d.creator.join(', ') : (d.creator || ''),
      year: (d.year != null) ? d.year : (d.date ? String(d.date).slice(0, 4) : ''),
      description: Array.isArray(d.description) ? d.description.join(' ') : (d.description || ''),
      subject: Array.isArray(d.subject) ? d.subject.slice(0, 4).join(', ') : (d.subject || ''),
      licenseurl: d.licenseurl || '',
      poster: ARCHIVE_IMG + encodeURIComponent(d.identifier),
    }));
  }

  // Map an archive item identifier to a best playable video URL.
  // Prefers h.264 MP4, then any MP4, then WEBM, then OGV.
  // Returns { url, mime, title, description, creator, year, duration }.
  async function resolveVideo(id) {
    const r = await fetch(ARCHIVE_META + encodeURIComponent(id));
    if (!r.ok) throw new Error('metadata HTTP ' + r.status);
    const m = await r.json();
    const files = (m && m.files) || [];
    function pickByFormat(formatRe) { return files.find(f => f.format && formatRe.test(f.format)); }
    function pickByExt(extRe) { return files.find(f => f.name && extRe.test(f.name)); }
    const pick =
      pickByFormat(/^h\.?264$|^MPEG4$|^mp4$/i) ||
      pickByExt(/\.mp4$/i) ||
      pickByFormat(/webm/i) ||
      pickByExt(/\.webm$/i) ||
      pickByFormat(/ogg\s*video|ogv/i) ||
      pickByExt(/\.(ogv|ogg)$/i);
    if (!pick) throw new Error('No playable video file for ' + id);
    const url = ARCHIVE_DL + encodeURIComponent(id) + '/' + encodeURIComponent(pick.name);
    const mime =
      /\.mp4$/i.test(pick.name) ? 'video/mp4' :
      /\.webm$/i.test(pick.name) ? 'video/webm' :
      /\.(ogv|ogg)$/i.test(pick.name) ? 'video/ogg' : '';
    const meta = (m && m.metadata) || {};
    const title = (Array.isArray(meta.title) ? meta.title[0] : meta.title) || id;
    const creator = Array.isArray(meta.creator) ? meta.creator.join(', ') : (meta.creator || '');
    const year = meta.year || (meta.date ? String(meta.date).slice(0, 4) : '');
    const description = Array.isArray(meta.description) ? meta.description.join(' ') : (meta.description || '');
    return { url, mime, title, description, creator, year, duration: Number(pick.length) || null };
  }

  // ---------- Rendering ------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function stripTags(s) { return String(s == null ? '' : s).replace(/<[^>]+>/g, ''); }

  function movieCard(m) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const posterStyle = m.poster ? 'background-image:url(' + JSON.stringify(m.poster).replace(/</g, '&lt;') + ')' : '';
    const yearBit = m.year ? '<span>' + escapeHtml(m.year) + '</span>' : '';
    const creatorBit = m.creator ? '<span>' + escapeHtml(m.creator) + '</span>' : '';
    card.innerHTML =
      '<div class="movie-poster" style="' + posterStyle + '">' +
        (m.poster ? '' : '<span class="poster-fallback">&#9835;</span>') +
      '</div>' +
      '<div class="movie-meta">' +
        '<p class="movie-title" title="' + escapeHtml(m.title) + '">' + escapeHtml(m.title) + '</p>' +
        '<div class="movie-sub">' + [yearBit, creatorBit].filter(Boolean).join('<span>&middot;</span>') + '</div>' +
      '</div>';
    card.addEventListener('click', () => openPlayer(m));
    return card;
  }

  function renderGrid(host, items) {
    host.innerHTML = '';
    if (!items || !items.length) {
      host.innerHTML = '<p class="muted">Nothing here.</p>';
      return;
    }
    items.forEach(m => host.appendChild(movieCard(m)));
  }

  // ---------- Featured + favorites ------------------------------------
  async function loadFeatured(collection) {
    const section = document.getElementById('featuredSection');
    const grid = document.getElementById('featuredGrid');
    const label = document.getElementById('featuredCollectionLabel');
    if (label) label.textContent = collection.replace(/_/g, ' ');
    section.style.display = '';
    grid.innerHTML = '<p class="muted">Loading featured films...</p>';
    try {
      const results = await searchArchive({ q: '', collection, rows: 12 });
      if (!results.length) {
        grid.innerHTML = '<p class="muted">No featured films from this collection right now. Try the search above.</p>';
        return;
      }
      renderGrid(grid, results);
    } catch (e) {
      grid.innerHTML = '<p class="muted">Featured films unavailable from this network (archive.org unreachable). Search still works if your network allows it.</p>';
    }
  }

  function getFavorites() { return LS.getJSON('favoriteMovies', []); }
  function toggleFavorite(m) {
    const favs = getFavorites();
    const i = favs.findIndex(x => x.id === m.id);
    if (i === -1) favs.push({ id: m.id, title: m.title, creator: m.creator, year: m.year, poster: m.poster });
    else favs.splice(i, 1);
    LS.setJSON('favoriteMovies', favs);
    renderFavorites();
    updateFavoriteButton();
  }
  function isFavorite(id) { return getFavorites().some(x => x.id === id); }
  function renderFavorites() {
    const section = document.getElementById('favoritesSection');
    const grid = document.getElementById('favoritesGrid');
    const favs = getFavorites();
    if (!favs.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    renderGrid(grid, favs);
  }

  // ---------- Modal player --------------------------------------------
  const overlay = document.getElementById('playerOverlay');
  const video = document.getElementById('playerVideo');
  const frame = document.getElementById('playerFrame');
  const titleEl = document.getElementById('playerTitle');
  const metaEl = document.getElementById('playerMeta');
  const descEl = document.getElementById('playerDesc');
  let currentMovie = null;
  let currentMode = 'video'; // 'video' or 'iframe'

  function ensureFavButton() {
    const bar = document.querySelector('.player-topbar');
    let b = document.getElementById('playerFavBtn');
    if (!b) {
      b = document.createElement('button');
      b.id = 'playerFavBtn';
      b.title = 'Favorite';
      bar.insertBefore(b, document.getElementById('playerFullscreen'));
      b.addEventListener('click', () => { if (currentMovie) toggleFavorite(currentMovie); });
    }
    return b;
  }
  function updateFavoriteButton() {
    const b = ensureFavButton();
    if (!currentMovie || currentMode === 'iframe') { b.style.display = 'none'; return; }
    b.style.display = '';
    const on = isFavorite(currentMovie.id);
    b.textContent = on ? '♥ Unfavorite' : '♡ Favorite';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function setPlayerMode(mode) {
    currentMode = mode;
    if (mode === 'iframe') {
      video.style.display = 'none';
      frame.style.display = '';
    } else {
      frame.style.display = 'none';
      frame.src = 'about:blank';
      video.style.display = '';
    }
  }

  async function openPlayer(m, preResolved) {
    currentMovie = m;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    titleEl.textContent = m.title || m.id;
    metaEl.textContent = [m.creator, m.year].filter(Boolean).join(' · ');
    descEl.textContent = stripTags(m.description || '').slice(0, 480);
    setPlayerMode('video');
    video.pause();
    video.removeAttribute('src');
    video.load();
    updateFavoriteButton();
    if (preResolved) {
      // Local file or already-resolved: skip the archive metadata fetch.
      video.src = preResolved.url;
      if (preResolved.mime) video.setAttribute('type', preResolved.mime);
      video.load();
      const p = video.play();
      if (p && p.catch) p.catch(() => { playerStatus('Press play to start. (Autoplay blocked.)'); });
      playerStatus('');
      return;
    }
    playerStatus('Resolving stream...');
    try {
      const resolved = await resolveVideo(m.id);
      titleEl.textContent = resolved.title || titleEl.textContent;
      metaEl.textContent = [resolved.creator, resolved.year].filter(Boolean).join(' · ');
      if (resolved.description) descEl.textContent = stripTags(resolved.description).slice(0, 480);
      video.src = resolved.url;
      if (resolved.mime) video.setAttribute('type', resolved.mime);
      video.load();
      const p = video.play();
      if (p && p.catch) p.catch(() => { playerStatus('Press play to start. (Autoplay blocked.)'); });
      playerStatus('');
    } catch (e) {
      playerStatus('Could not load this film: ' + (e && e.message ? e.message : 'unknown error'));
    }
  }

  function closePlayer() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    try { video.pause(); } catch {}
    try { video.removeAttribute('src'); video.load(); } catch {}
    // Kill the iframe too, otherwise the player keeps running audio in the background.
    try { frame.src = 'about:blank'; } catch {}
    setPlayerMode('video');
    currentMovie = null;
    playerStatus('');
  }

  // ---------- Stream by ID (vidsrc) -----------------------------------
  const VIDSRC_BASE = 'https://vidsrc.su/movie/';
  const BYID_RECENT_KEY = 'byidRecent';

  function normalizeMovieId(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    // Full TMDB URL: https://www.themoviedb.org/movie/299534-avengers-endgame
    const tmdbUrl = s.match(/themoviedb\.org\/movie\/(\d+)/i);
    if (tmdbUrl) return { id: tmdbUrl[1], kind: 'tmdb' };
    // Full IMDb URL: https://www.imdb.com/title/tt4154796/
    const imdbUrl = s.match(/imdb\.com\/title\/(tt\d+)/i);
    if (imdbUrl) return { id: imdbUrl[1], kind: 'imdb' };
    // Bare IMDb ID
    if (/^tt\d{5,}$/i.test(s)) return { id: s.toLowerCase(), kind: 'imdb' };
    // Bare TMDB numeric
    if (/^\d{1,8}$/.test(s)) return { id: s, kind: 'tmdb' };
    return null;
  }

  function vidsrcUrl(id) {
    const params = new URLSearchParams({
      autoplay: 'true',
      colour: '4f8dff',
      backbutton: window.location.href.split('#')[0],
    });
    return VIDSRC_BASE + encodeURIComponent(id) + '?' + params.toString();
  }

  function openById(parsed) {
    currentMovie = { id: 'external:' + parsed.id, title: parsed.kind.toUpperCase() + ' ' + parsed.id,
                     creator: 'vidsrc.su', year: '', description: 'External embed. Streams via vidsrc.su.', poster: '' };
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    titleEl.textContent = (parsed.kind === 'imdb' ? 'IMDb ' : 'TMDB ') + parsed.id;
    metaEl.textContent = 'vidsrc.su';
    descEl.textContent = 'Third-party embed. First tap may open a popup — allow or block as you prefer.';
    setPlayerMode('iframe');
    frame.src = vidsrcUrl(parsed.id);
    playerStatus('');
    updateFavoriteButton();
    rememberById(parsed);
    renderByIdRecent();
  }

  function rememberById(parsed) {
    const list = LS.getJSON(BYID_RECENT_KEY, []);
    const key = parsed.kind + ':' + parsed.id;
    const existing = list.findIndex(e => (e.kind + ':' + e.id) === key);
    if (existing !== -1) list.splice(existing, 1);
    list.unshift({ id: parsed.id, kind: parsed.kind, at: null });
    if (list.length > 12) list.length = 12;
    LS.setJSON(BYID_RECENT_KEY, list);
  }

  function renderByIdRecent() {
    const section = document.getElementById('byidRecentSection');
    const grid = document.getElementById('byidRecentGrid');
    if (!section || !grid) return;
    const list = LS.getJSON(BYID_RECENT_KEY, []);
    if (!list.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    grid.innerHTML = '';
    list.forEach(e => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.innerHTML =
        '<div class="movie-poster"><span class="poster-fallback">&#9835;</span></div>' +
        '<div class="movie-meta">' +
          '<p class="movie-title">' + escapeHtml((e.kind === 'imdb' ? 'IMDb ' : 'TMDB ') + e.id) + '</p>' +
          '<div class="movie-sub"><span>vidsrc.su</span></div>' +
        '</div>';
      card.addEventListener('click', () => openById(e));
      grid.appendChild(card);
    });
  }

  function runByIdWatch() {
    const input = document.getElementById('byidInput');
    const status = document.getElementById('byidStatus');
    const parsed = normalizeMovieId(input.value);
    if (!parsed) {
      status.textContent = 'Not a recognized ID. Expected a TMDB number (299534) or IMDb tt-ID (tt4154796), or a full URL from either site.';
      return;
    }
    status.textContent = 'Opening ' + parsed.kind.toUpperCase() + ' ' + parsed.id + '...';
    openById(parsed);
    status.textContent = '';
  }

  document.getElementById('playerClose').addEventListener('click', closePlayer);
  document.getElementById('playerFullscreen').addEventListener('click', () => {
    const el = currentMode === 'iframe' ? frame : video;
    if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePlayer(); });

  // ---------- Search wiring -------------------------------------------
  async function runSearch() {
    const q = (document.getElementById('movieSearchInput').value || '').trim();
    const coll = document.getElementById('movieCollection').value;
    const results = document.getElementById('resultsSection');
    const grid = document.getElementById('resultsGrid');
    const header = document.getElementById('resultsHeader');
    results.style.display = '';
    grid.innerHTML = '<p class="muted">Searching...</p>';
    status(q ? ('Searching "' + q + '" in ' + coll + '...') : ('Top in ' + coll + '...'));
    try {
      const data = await searchArchive({ q, collection: coll, rows: 36 });
      header.textContent = q ? ('Results for "' + q + '"') : ('Top in ' + coll.replace(/_/g, ' '));
      if (!data.length) {
        grid.innerHTML = '<p class="muted">No results.</p>';
        status('No results.');
      } else {
        renderGrid(grid, data);
        status(data.length + ' result' + (data.length === 1 ? '' : 's') + '.');
      }
    } catch (e) {
      grid.innerHTML = '<p class="muted">Archive.org is unreachable from this network. The search endpoint is https://archive.org/advancedsearch.php — your school network may be blocking it.</p>';
      status('Archive unreachable.');
    }
  }

  document.getElementById('movieSearchBtn').addEventListener('click', runSearch);
  document.getElementById('movieSearchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
  document.getElementById('movieCollection').addEventListener('change', () => {
    const coll = document.getElementById('movieCollection').value;
    loadFeatured(coll);
  });

  document.getElementById('byidWatchBtn').addEventListener('click', runByIdWatch);
  document.getElementById('byidInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runByIdWatch(); });

  // ---------- Local files ---------------------------------------------
  const localFiles = []; // { name, url (object url), duration? }
  function renderLocal() {
    const host = document.getElementById('localMovieList');
    host.innerHTML = '';
    if (!localFiles.length) {
      host.innerHTML = '<p class="muted" style="grid-column:1/-1;margin:4px 0 0">No local files yet.</p>';
      return;
    }
    localFiles.forEach((f, i) => {
      const card = document.createElement('div');
      card.className = 'local-file';
      card.innerHTML =
        '<div class="local-name" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</div>' +
        '<div class="local-actions"><button class="lf-play">Play</button><button class="lf-remove">Remove</button></div>';
      card.querySelector('.lf-play').addEventListener('click', () => {
        openPlayer(
          { id: 'local:' + i, title: f.name, creator: 'Local file', year: '', description: '', poster: '' },
          { url: f.url, mime: '' }
        );
      });
      card.querySelector('.lf-remove').addEventListener('click', () => {
        try { URL.revokeObjectURL(f.url); } catch {}
        localFiles.splice(i, 1); renderLocal();
      });
      host.appendChild(card);
    });
  }
  function addLocalFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const f of files) {
      if (!f.type || !/^video\//.test(f.type)) continue;
      localFiles.push({ name: f.name, url: URL.createObjectURL(f) });
    }
    renderLocal();
  }
  document.getElementById('localMovieInput').addEventListener('change', (e) => addLocalFiles(e.target.files));
  const drop = document.getElementById('localMovieDrop');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { addLocalFiles(e.dataTransfer && e.dataTransfer.files); });

  // ---------- Tabs ----------------------------------------------------
  document.querySelectorAll('.movie-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-panel');
      document.querySelectorAll('.movie-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.movie-panel').forEach(p => p.classList.toggle('active', p.getAttribute('data-panel') === name));
    });
  });

  // ---------- Keyboard shortcuts --------------------------------------
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (overlay.classList.contains('open')) {
      if (e.key === 'Escape') { e.preventDefault(); closePlayer(); return; }
      if (typing) return;
      // Iframe-mode players have their own key handlers inside the frame; don't try to drive the hidden <video>.
      if (currentMode === 'iframe') {
        if (e.key === 'f' || e.key === 'F') {
          if (!document.fullscreenElement) frame.requestFullscreen && frame.requestFullscreen();
          else document.exitFullscreen && document.exitFullscreen();
        }
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {}); else video.pause();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) video.requestFullscreen && video.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
      } else if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
      else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); }
      else if (e.key === 'm' || e.key === 'M') { video.muted = !video.muted; }
    }
  });

  // ---------- Init ----------------------------------------------------
  renderFavorites();
  loadFeatured('feature_films');
  renderLocal();
  renderByIdRecent();
})();
