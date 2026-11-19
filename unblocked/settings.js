// Settings page logic. Relies on helpers set on window by main.js.
(function () {
  'use strict';

  const CLOAKS = window.STUDYHUB_CLOAKS || {};
  const applyCloak = window.STUDYHUB_APPLY_CLOAK || function () {};
  const applyTheme = window.STUDYHUB_APPLY_THEME || function () {};
  const resolveCloak = window.STUDYHUB_RESOLVE_CLOAK || function (x) { return x || 'default'; };

  function lsGet(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

  // --- Theme radios ------------------------------------------------------
  const cur = lsGet('theme', 'system');
  document.querySelectorAll('input[name="theme"]').forEach(r => {
    r.checked = (r.value === cur);
    r.addEventListener('change', () => { if (r.checked) applyTheme(r.value); });
  });

  // --- Cloak picker ------------------------------------------------------
  const picker = document.getElementById('cloakPicker');
  if (picker) {
    picker.innerHTML = '';
    Object.keys(CLOAKS).forEach(key => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = CLOAKS[key].label || key;
      picker.appendChild(o);
    });
    picker.value = resolveCloak(lsGet('cloak', 'default'));
    picker.addEventListener('change', () => applyCloak(picker.value));
  }

  // --- Panic URL ---------------------------------------------------------
  const panicInput = document.getElementById('panicInput');
  const panicSave = document.getElementById('panicSave');
  const panicStatus = document.getElementById('panicStatus');
  if (panicInput) panicInput.value = lsGet('panicUrl', 'https://classroom.google.com');
  if (panicSave) panicSave.addEventListener('click', () => {
    const raw = (panicInput.value || '').trim();
    if (!/^https?:\/\//i.test(raw)) {
      panicStatus.textContent = 'Must start with http:// or https://';
      return;
    }
    try { new URL(raw); } catch { panicStatus.textContent = 'That URL looks invalid.'; return; }
    lsSet('panicUrl', raw);
    panicStatus.textContent = 'Saved.';
  });

  // --- Clear data --------------------------------------------------------
  const clearBtn = document.getElementById('clearBtn');
  const clearStatus = document.getElementById('clearStatus');
  // Keys we own. Documented here; clearing wipes every one.
  const OWN_KEYS = [
    'cloak', 'theme', 'panicUrl', 'favorites', 'recent',
    'favoriteStations', 'volume', 'lastPlayed',
  ];
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all Study Hub data saved in this browser?')) return;
    for (const k of OWN_KEYS) { try { localStorage.removeItem(k); } catch {} }
    // Also wipe any legacy keys that start with "safesound." just in case.
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('safesound.') === 0) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    clearStatus.textContent = 'Cleared. Reloading...';
    setTimeout(() => window.location.reload(), 500);
  });
})();
