// Local-only catalogue. No external URLs. No fetches.
const GAMES = [
  { id: 'snake',    title: 'Serpent',   desc: 'Classic snake. Arrow keys.',    color: '#22c55e', file: 'games/snake.html' },
  { id: 't2048',    title: '2048',      desc: 'Merge tiles. Arrow keys.',       color: '#f59e0b', file: 'games/2048.html' },
  { id: 'tetris',   title: 'Blocks',    desc: 'Falling blocks. Arrow keys.',    color: '#06b6d4', file: 'games/tetris.html' },
  { id: 'pong',     title: 'Paddles',   desc: 'Pong vs the computer.',          color: '#ef4444', file: 'games/pong.html' },
  { id: 'breakout', title: 'Breaker',   desc: 'Bricks and a paddle.',           color: '#a855f7', file: 'games/breakout.html' },
  { id: 'flappy',   title: 'Flapper',   desc: 'Tap / Space to flap.',           color: '#eab308', file: 'games/flappy.html' },
];

const CLOAKS = {
  default:   { title: 'Study Hub', favicon: faviconFor('S', '#2563eb') },
  classroom: { title: 'Classes', favicon: faviconFor('C', '#f59e0b') },
  docs:      { title: 'Docs', favicon: faviconFor('D', '#2563eb') },
  drive:     { title: 'My Drive - Google Drive', favicon: faviconFor('D', '#22c55e') },
  khan:      { title: 'Khan Academy', favicon: faviconFor('K', '#0ea5e9') },
  canvas:    { title: 'Dashboard', favicon: faviconFor('C', '#dc2626') },
  wiki:      { title: 'Wikipedia, the free encyclopedia', favicon: faviconFor('W', '#111') },
};

function faviconFor(letter, bg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect width='64' height='64' rx='12' fill='${bg}'/>
    <text x='32' y='44' font-family='Arial' font-size='40' font-weight='bold' fill='white' text-anchor='middle'>${letter}</text>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function renderGrid(filter = '') {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const q = filter.trim().toLowerCase();
  const list = q ? GAMES.filter(g => g.title.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q)) : GAMES;
  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nothing matches that search.';
    grid.appendChild(empty);
    return;
  }
  for (const g of list) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb" style="background:linear-gradient(135deg, ${g.color}, #111)">${g.title[0]}</div>
      <h3>${g.title}</h3>
      <p>${g.desc}</p>
    `;
    card.addEventListener('click', () => openGame(g));
    grid.appendChild(card);
  }
}

function openGame(g) {
  // Load relative file. Keeps everything in this origin.
  window.location.href = g.file;
}

function applyCloak(key) {
  const c = CLOAKS[key] || CLOAKS.default;
  document.title = c.title;
  const fav = document.getElementById('favicon');
  fav.href = c.favicon;
  try { localStorage.setItem('cloak', key); } catch {}
}

function openInAboutBlank() {
  // Re-opens this same document inside an about:blank iframe so the URL bar shows about:blank.
  // Works only when started by a user gesture.
  const w = window.open('about:blank');
  if (!w) { alert('Pop-up blocked. Allow pop-ups to use about:blank mode.'); return; }
  const url = window.location.href;
  const cloak = (document.getElementById('cloakSel')?.value) || 'default';
  const c = CLOAKS[cloak] || CLOAKS.default;
  w.document.open();
  w.document.write(`<!doctype html><html><head><title>${c.title}</title>
    <link rel="icon" href="${c.favicon}"/>
    <style>html,body,iframe{margin:0;padding:0;border:0;width:100%;height:100%;background:#000;}</style>
    </head><body><iframe src="${url}" allow="autoplay; fullscreen"></iframe></body></html>`);
  w.document.close();
  // Try to blank this page as a hint to close it manually.
  try { window.location.replace('https://www.google.com/'); } catch {}
}

function panic() {
  try { window.location.replace('https://www.google.com/'); }
  catch { window.location.href = 'https://www.google.com/'; }
}

// Wire up
document.addEventListener('DOMContentLoaded', () => {
  // Restore cloak
  let saved = 'default';
  try { saved = localStorage.getItem('cloak') || 'default'; } catch {}
  const sel = document.getElementById('cloakSel');
  if (sel) {
    sel.value = saved in CLOAKS ? saved : 'default';
    sel.addEventListener('change', () => applyCloak(sel.value));
  }
  applyCloak(saved);

  renderGrid();

  const search = document.getElementById('search');
  search.addEventListener('input', () => renderGrid(search.value));

  document.getElementById('aboutBlankBtn').addEventListener('click', openInAboutBlank);
  document.getElementById('panicBtn').addEventListener('click', panic);

  document.addEventListener('keydown', (e) => {
    if (e.key === '`') { e.preventDefault(); panic(); }
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
  });
});
