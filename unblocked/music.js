// Music page logic — tabs, player controls, local files, URL add, station search.
// Depends on window.STATIONS (baked into music.html).
(function () {
  'use strict';

  const player = document.getElementById('player');
  if (!player) return;

  const LS = {
    get(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    getJSON(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch { return f; } },
    setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- playlist / state ------------------------------------------
  // queue entries: { kind: 'station'|'local'|'url'|'search', name, src, codec?, genre?, secure?, duration? }
  let queue = [];
  let queueIndex = -1;

  function setStatus(msg) { document.getElementById('statusLine').textContent = msg || ''; }
  function fmtTime(s) {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function updateNowPlaying(entry) {
    const t = document.getElementById('npTitle');
    const s = document.getElementById('npSub');
    const art = document.getElementById('artwork');
    if (!entry) {
      t.textContent = 'Nothing playing';
      s.textContent = 'Pick a station or a track';
      art.classList.remove('live');
      return;
    }
    t.textContent = entry.name || entry.src || 'Track';
    const bits = [];
    if (entry.genre) bits.push(entry.genre);
    if (entry.codec) bits.push(entry.codec);
    if (entry.kind === 'station') bits.push('live');
    s.textContent = bits.join(' · ');
    art.classList.toggle('live', entry.kind === 'station');
  }

  function playEntry(entry) {
    if (!entry) return;
    try { player.pause(); } catch {}
    player.src = entry.src;
    player.load();
    const p = player.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    updateNowPlaying(entry);
    LS.set('lastPlayed', JSON.stringify({ src: entry.src, name: entry.name, kind: entry.kind }));
    setStatus(entry.kind === 'station' ? 'Connecting to stream...' : 'Loading...');
  }

  function enqueueAndPlay(entry) {
    queue.push(entry);
    queueIndex = queue.length - 1;
    playEntry(entry);
  }
  function playAt(i) {
    if (i < 0 || i >= queue.length) return;
    queueIndex = i;
    playEntry(queue[i]);
  }

  // ---------- radio list -------------------------------------------------
  function getFavoriteStations() { return LS.getJSON('favoriteStations', []); }
  function toggleFavoriteStation(name) {
    const list = getFavoriteStations();
    const i = list.indexOf(name);
    if (i === -1) list.push(name); else list.splice(i, 1);
    LS.setJSON('favoriteStations', list);
    renderRadioList();
  }

  function stationTile(s) {
    const el = document.createElement('div');
    el.className = 'station';
    const favs = getFavoriteStations();
    const isFav = favs.indexOf(s.name) !== -1;
    el.innerHTML = `
      <button class="heart-btn" title="${isFav ? 'Unfavorite' : 'Favorite'}" aria-pressed="${isFav}">${isFav ? '♥' : '♡'}</button>
      <div class="station-info">
        <div class="station-name">${escapeHtml(s.name)}</div>
        <div class="station-meta muted">
          <span class="pill">${escapeHtml(s.genre || 'radio')}</span>
          <span class="pill pill-muted">${escapeHtml(s.codec || '')}</span>
          ${s.secure === false ? '<span class="pill pill-warn">http only</span>' : ''}
        </div>
      </div>
      <button class="play-tile" title="Play">Play</button>
    `;
    el.querySelector('.heart-btn').addEventListener('click', (e) => {
      e.stopPropagation(); toggleFavoriteStation(s.name);
    });
    const play = () => enqueueAndPlay({ kind: 'station', name: s.name, src: s.stream, codec: s.codec, genre: s.genre, secure: s.secure });
    el.querySelector('.play-tile').addEventListener('click', play);
    el.addEventListener('dblclick', play);
    return el;
  }

  function renderRadioList() {
    const host = document.getElementById('radioList');
    if (!host) return;
    host.innerHTML = '';
    const all = window.STATIONS || [];
    const favSet = new Set(getFavoriteStations());
    const favs = all.filter(s => favSet.has(s.name));
    const rest = all.filter(s => !favSet.has(s.name));
    if (favs.length) {
      const group = document.createElement('div');
      group.className = 'station-group';
      group.innerHTML = `<h3>Favorites</h3>`;
      const wrap = document.createElement('div');
      wrap.className = 'station-tiles';
      favs.forEach(s => wrap.appendChild(stationTile(s)));
      group.appendChild(wrap);
      host.appendChild(group);
    }
    // Group remaining by genre.
    const byGenre = Object.create(null);
    for (const s of rest) {
      const g = s.genre || 'other';
      (byGenre[g] = byGenre[g] || []).push(s);
    }
    const keys = Object.keys(byGenre).sort();
    for (const g of keys) {
      const group = document.createElement('div');
      group.className = 'station-group';
      group.innerHTML = `<h3>${escapeHtml(g)}</h3>`;
      const wrap = document.createElement('div');
      wrap.className = 'station-tiles';
      byGenre[g].forEach(s => wrap.appendChild(stationTile(s)));
      group.appendChild(wrap);
      host.appendChild(group);
    }
  }

  // ---------- local files ------------------------------------------------
  // Local tracks hold revocable object URLs; keep refs so we can revoke.
  const localTracks = []; // { name, src, duration }

  function addLocalFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const f of files) {
      if (!f.type || !/^audio\//.test(f.type)) continue;
      const src = URL.createObjectURL(f);
      const entry = { kind: 'local', name: f.name, src, duration: null };
      localTracks.push(entry);
    }
    renderLocalList();
  }

  function renderLocalList() {
    const host = document.getElementById('localList');
    if (!host) return;
    host.innerHTML = '';
    if (!localTracks.length) {
      host.innerHTML = '<p class="muted">No local tracks yet.</p>';
      return;
    }
    localTracks.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.innerHTML = `
        <button class="play-row" title="Play">&#9654;</button>
        <div class="track-name">${escapeHtml(t.name)}</div>
        <div class="track-dur muted">${t.duration ? fmtTime(t.duration) : ''}</div>
        <button class="row-remove" title="Remove">&times;</button>
      `;
      row.querySelector('.play-row').addEventListener('click', () => enqueueAndPlay(t));
      row.querySelector('.row-remove').addEventListener('click', () => {
        try { URL.revokeObjectURL(t.src); } catch {}
        localTracks.splice(i, 1); renderLocalList();
      });
      host.appendChild(row);
    });
  }

  // ---------- By URL -----------------------------------------------------
  const urlTracks = []; // { kind:'url', name, src }
  const URL_OK = /\.(mp3|aac|ogg|opus|m4a|wav|flac|m3u|pls)(\?.*)?$|\/stream(\?.*)?$/i;

  function addUrl() {
    const input = document.getElementById('urlInput');
    const err = document.getElementById('urlError');
    err.style.display = 'none'; err.textContent = '';
    const raw = (input.value || '').trim();
    if (!/^https?:\/\//i.test(raw)) {
      err.textContent = 'Needs to start with http:// or https://';
      err.style.display = ''; return;
    }
    if (!URL_OK.test(raw)) {
      err.textContent = 'URL must end with .mp3, .aac, .ogg, .m3u, .pls, or /stream.';
      err.style.display = ''; return;
    }
    let host = raw;
    try { host = new URL(raw).host; } catch {}
    urlTracks.push({ kind: 'url', name: host, src: raw });
    input.value = '';
    renderUrlList();
  }

  function renderUrlList() {
    const host = document.getElementById('urlList');
    if (!host) return;
    host.innerHTML = '';
    if (!urlTracks.length) {
      host.innerHTML = '<p class="muted">No URL streams added.</p>';
      return;
    }
    urlTracks.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.innerHTML = `
        <button class="play-row" title="Play">&#9654;</button>
        <div class="track-name">${escapeHtml(t.name)}</div>
        <div class="track-dur muted"></div>
        <button class="row-remove" title="Remove">&times;</button>
      `;
      row.querySelector('.play-row').addEventListener('click', () => enqueueAndPlay(t));
      row.querySelector('.row-remove').addEventListener('click', () => { urlTracks.splice(i, 1); renderUrlList(); });
      host.appendChild(row);
    });
  }

  // ---------- Search (radio-browser) ------------------------------------
  async function runSearch() {
    const q = (document.getElementById('searchInput').value || '').trim();
    const status = document.getElementById('searchStatus');
    const list = document.getElementById('searchList');
    list.innerHTML = '';
    if (!q) { status.textContent = 'Type something, then press Search.'; return; }
    status.textContent = 'Searching...';
    const url = 'https://de1.api.radio-browser.info/json/stations/search?limit=25&hidebroken=true&order=votes&reverse=true&name=' + encodeURIComponent(q);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (!Array.isArray(data) || !data.length) { status.textContent = 'No results.'; return; }
      status.textContent = data.length + ' result' + (data.length === 1 ? '' : 's');
      const tiles = document.createElement('div');
      tiles.className = 'station-tiles';
      data.forEach(d => {
        const s = {
          name: d.name || '(unnamed)',
          stream: d.url_resolved || d.url,
          codec: d.codec || '',
          genre: (d.tags || '').split(',')[0] || 'radio',
          secure: /^https:/i.test(d.url_resolved || d.url || ''),
        };
        if (!s.stream) return;
        tiles.appendChild(stationTile(s));
      });
      list.appendChild(tiles);
    } catch (err) {
      status.textContent = 'Radio directory unreachable from this network.';
    }
  }

  // ---------- player wiring ---------------------------------------------
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const muteBtn = document.getElementById('muteBtn');
  const seek = document.getElementById('seek');
  const volume = document.getElementById('volume');
  const timeCur = document.getElementById('timeCur');
  const timeTot = document.getElementById('timeTot');

  playBtn.addEventListener('click', () => {
    if (!player.src) {
      // If nothing queued, play the first station.
      const first = (window.STATIONS || [])[0];
      if (first) enqueueAndPlay({ kind: 'station', name: first.name, src: first.stream, codec: first.codec, genre: first.genre, secure: first.secure });
      return;
    }
    if (player.paused) player.play().catch(() => {}); else player.pause();
  });
  prevBtn.addEventListener('click', () => { if (queueIndex > 0) playAt(queueIndex - 1); });
  nextBtn.addEventListener('click', () => { if (queueIndex >= 0 && queueIndex < queue.length - 1) playAt(queueIndex + 1); });
  muteBtn.addEventListener('click', () => { player.muted = !player.muted; updateMuteBtn(); });

  function updateMuteBtn() { muteBtn.textContent = player.muted ? '\u{1F507}' : '\u{1F50A}'; }

  // Volume: restore + persist.
  const savedVol = parseFloat(LS.get('volume', '0.8'));
  player.volume = Number.isFinite(savedVol) ? Math.min(1, Math.max(0, savedVol)) : 0.8;
  volume.value = String(player.volume);
  volume.addEventListener('input', () => {
    const v = parseFloat(volume.value);
    player.volume = v;
    LS.set('volume', String(v));
    if (v > 0 && player.muted) { player.muted = false; updateMuteBtn(); }
  });

  // Seek bar: only meaningful when duration is finite.
  let seeking = false;
  seek.addEventListener('mousedown', () => { seeking = true; });
  seek.addEventListener('touchstart', () => { seeking = true; }, { passive: true });
  seek.addEventListener('change', () => {
    if (Number.isFinite(player.duration)) player.currentTime = parseFloat(seek.value);
    seeking = false;
  });

  player.addEventListener('play',   () => { playBtn.innerHTML = '&#10074;&#10074;'; setStatus(''); });
  player.addEventListener('pause',  () => { playBtn.innerHTML = '&#9654;'; });
  player.addEventListener('ended',  () => {
    if (queueIndex < queue.length - 1) playAt(queueIndex + 1);
    else { playBtn.innerHTML = '&#9654;'; setStatus('Finished.'); }
  });
  player.addEventListener('timeupdate', () => {
    if (!seeking && Number.isFinite(player.duration)) {
      seek.max = String(player.duration);
      seek.value = String(player.currentTime);
    }
    timeCur.textContent = fmtTime(player.currentTime);
    timeTot.textContent = Number.isFinite(player.duration) ? fmtTime(player.duration) : 'LIVE';
  });
  player.addEventListener('loadedmetadata', () => {
    if (queue[queueIndex] && Number.isFinite(player.duration)) {
      queue[queueIndex].duration = player.duration;
    }
  });
  player.addEventListener('error', () => {
    setStatus('Stream unreachable. Try another station.');
  });
  player.addEventListener('stalled', () => setStatus('Buffering...'));
  player.addEventListener('waiting', () => setStatus('Buffering...'));

  // ---------- tabs -------------------------------------------------------
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.getAttribute('data-panel') === name));
    });
  });

  // ---------- local-file wiring -----------------------------------------
  const fileInput = document.getElementById('localFileInput');
  fileInput.addEventListener('change', () => addLocalFiles(fileInput.files));
  const drop = document.getElementById('localDrop');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { addLocalFiles(e.dataTransfer && e.dataTransfer.files); });

  document.getElementById('urlAddBtn').addEventListener('click', addUrl);
  document.getElementById('urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addUrl(); });
  document.getElementById('searchBtn').addEventListener('click', runSearch);
  document.getElementById('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

  // ---------- keyboard shortcuts ----------------------------------------
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) return;
    if (e.code === 'Space') {
      e.preventDefault(); playBtn.click();
    } else if (e.key === 'm' || e.key === 'M') {
      player.muted = !player.muted; updateMuteBtn();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      player.volume = Math.min(1, player.volume + 0.05);
      volume.value = String(player.volume); LS.set('volume', String(player.volume));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      player.volume = Math.max(0, player.volume - 0.05);
      volume.value = String(player.volume); LS.set('volume', String(player.volume));
    }
  });

  // ---------- init -------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  renderRadioList();
  renderLocalList();
  renderUrlList();
  updateMuteBtn();
})();
