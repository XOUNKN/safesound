// Apply the saved cloak (title + favicon) to game pages, music, settings, etc.
// Also wires the backtick panic key and reads panicUrl from localStorage.
(function () {
  const CLOAKS = {
    default:     { title: 'Study Hub',                              letter: 'S', bg: '#2563eb' },
    classroom:   { title: 'Classes',                                letter: 'C', bg: '#f59e0b' },
    docs:        { title: 'Docs',                                   letter: 'D', bg: '#2563eb' },
    drive:       { title: 'My Drive - Google Drive',                letter: 'D', bg: '#22c55e' },
    khan:        { title: 'Khan Academy',                           letter: 'K', bg: '#0ea5e9' },
    canvas:      { title: 'Dashboard',                              letter: 'C', bg: '#dc2626' },
    schoology:   { title: 'Home | Schoology',                       letter: 'S', bg: '#0073b2' },
    powerschool: { title: 'PowerSchool',                            letter: 'P', bg: '#1f3f66' },
    wiki:        { title: 'Wikipedia, the free encyclopedia',       letter: 'W', bg: '#111111' },
  };
  // Back-compat aliases so an older saved value still resolves.
  const ALIASES = {
    'Study Hub': 'default',
    'wikipedia': 'wiki',
    'google-classroom': 'classroom',
    'google-docs': 'docs',
    'google-drive': 'drive',
    'khan-academy': 'khan',
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
  if (ALIASES[saved]) saved = ALIASES[saved];
  if (!(saved in CLOAKS)) saved = 'default';
  const c = CLOAKS[saved];
  document.title = c.title;
  const link = document.getElementById('favicon') || (() => {
    const l = document.createElement('link');
    l.rel = 'icon'; l.id = 'favicon'; document.head.appendChild(l); return l;
  })();
  link.href = favicon(c.letter, c.bg);

  // Panic key works on every page.
  document.addEventListener('keydown', (e) => {
    if (e.key === '`') {
      // Don't steal keystrokes from text fields where backtick is legitimate.
      const t = e.target;
      const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (isTyping) return;
      e.preventDefault();
      let url = 'https://classroom.google.com';
      try { url = localStorage.getItem('panicUrl') || url; } catch {}
      window.location.replace(url);
    }
  });

  // Expose for pages that want it.
  window.__CLOAKS__ = CLOAKS;
})();
