// Apply the saved cloak (title + favicon) to game pages too.
(function () {
  const CLOAKS = {
    default:   { title: 'Study Hub', letter: 'S', bg: '#2563eb' },
    classroom: { title: 'Classes', letter: 'C', bg: '#f59e0b' },
    docs:      { title: 'Docs', letter: 'D', bg: '#2563eb' },
    drive:     { title: 'My Drive - Google Drive', letter: 'D', bg: '#22c55e' },
    khan:      { title: 'Khan Academy', letter: 'K', bg: '#0ea5e9' },
    canvas:    { title: 'Dashboard', letter: 'C', bg: '#dc2626' },
    wiki:      { title: 'Wikipedia, the free encyclopedia', letter: 'W', bg: '#111' },
  };
  function favicon(letter, bg) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <rect width='64' height='64' rx='12' fill='${bg}'/>
      <text x='32' y='44' font-family='Arial' font-size='40' font-weight='bold' fill='white' text-anchor='middle'>${letter}</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  let saved = 'default';
  try { saved = localStorage.getItem('cloak') || 'default'; } catch {}
  const c = CLOAKS[saved] || CLOAKS.default;
  document.title = c.title;
  const link = document.getElementById('favicon') || (() => {
    const l = document.createElement('link');
    l.rel = 'icon'; l.id = 'favicon'; document.head.appendChild(l); return l;
  })();
  link.href = favicon(c.letter, c.bg);

  // Panic key works on game pages too.
  document.addEventListener('keydown', (e) => {
    if (e.key === '`') { e.preventDefault(); window.location.replace('https://www.google.com/'); }
  });
})();
