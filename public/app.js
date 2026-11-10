'use strict';
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
// Clean addresses: /watch/<id>, /courses, /cat/Biology ... (the code below still writes routes as '#/watch/<id>'; they become real paths here)
function toPath(h) { const u = String(h).replace(/^#?\/?/, '/'); return u === '/home' ? '/' : u.replace(/^\/home\?/, '/?'); }
const fixHref = v => typeof v === 'string' && v.startsWith('#/') ? toPath(v) : v;
function navTo(h) { const u = toPath(h); if (u !== location.pathname + location.search) history.pushState(null, '', u); route(); }
function el(t, a, ...k) {
  const e = document.createElement(t);
  for (const [x, v] of Object.entries(a || {})) {
    if (x === 'class') e.className = v; else if (x === 'html') e.innerHTML = v;
    else if (x.startsWith('on')) e.addEventListener(x.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(x, x === 'href' ? fixHref(v) : v);
  }
  k.flat(9).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}
const IC = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  film: '<rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>',
  thumb: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
  history: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  left: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  right: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  rot: '<rect x="2" y="7" width="20" height="10" rx="2"/><line x1="18" y1="12" x2="18.01" y2="12"/>',
  clip: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'
};
const ico = n => el('span', { html: `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>` });
const msg = t => el('p', { class: 'mut' }, t);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- saved state: lives only in this browser, no login ---------- */
const DEF = { split: true, certs: {}, name: '', courses: [], prog: {}, podcasts: true, follow: [], liked: [], later: [], hist: [], lists: [], notes: {}, meta: {}, bad: [], prof: { ch: {}, cat: {}, kw: {} }, theme: 'auto' };
const S = Object.assign(structuredClone(DEF), LS.get('tt2', {}));
const save = () => LS.set('tt2', S);
const remember = v => { S.meta[v.id] = { id: v.id, title: v.title, channel: v.channel, category: v.category, seconds: v.seconds, views: v.views, publishedAt: v.publishedAt, ext: v.ext, blocked: v.blocked }; };

/* ---------- formatting ---------- */
const fmtDur = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const fmtViews = n => n >= 1e9 ? (n / 1e9).toFixed(1).replace('.0', '') + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n || 0);
const ageDays = v => (Date.now() - new Date(v.publishedAt)) / 864e5;
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's') + ' ago';
const ago = v => { const d = ageDays(v); if (d < 1) return 'today'; if (d < 30) return plural(Math.floor(d), 'day'); if (d < 365) return plural(Math.floor(d / 30), 'month'); return plural(Math.floor(d / 365), 'year'); };

/* ---------- recommendation engine (runs in the browser; learns from this device only) ---------- */
const STOP = new Set('the and for with how what why this that your you from part lecture lesson class full video new best into are not can all any one two'.split(' '));
const TOKC = new Map();   // remembered results: thousands of titles are tokenised again on every screen otherwise
const toks = t => {
  const s = String(t); let r = TOKC.get(s);
  if (!r) { r = [...new Set((s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(w => !STOP.has(w)))]; if (TOKC.size > 20000) TOKC.clear(); TOKC.set(s, r); }
  return r;
};
function bump(v, w) {
  const p = S.prof;
  for (const m of [p.ch, p.cat, p.kw]) for (const k in m) { m[k] *= 0.97; if (Math.abs(m[k]) < 0.05) delete m[k]; }
  p.ch[v.channel] = (p.ch[v.channel] || 0) + w;
  p.cat[v.category] = (p.cat[v.category] || 0) + w * 0.6;
  toks(v.title).forEach(k => p.kw[k] = (p.kw[k] || 0) + w * 0.25);
  const keys = Object.keys(p.kw);
  if (keys.length > 1200) keys.sort((a, b) => p.kw[b] - p.kw[a]).slice(800).forEach(k => delete p.kw[k]);
}
const seed = Math.random().toString(36).slice(2);
const jit = id => { let h = 0; const s = id + seed; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (Math.abs(h) % 1000) / 1000; };
function score(v) {
  const p = S.prof;
  let s = Math.tanh((p.ch[v.channel] || 0) / 4) * 3 + Math.tanh((p.cat[v.category] || 0) / 4) * 1.5, k = 0;
  for (const w of toks(v.title)) k += p.kw[w] || 0;
  s += Math.tanh(k / 3) * 2 + Math.exp(-ageDays(v) / 365) * 0.8 + Math.min(Math.log10((v.views || 0) + 1) / 7, 1) * 0.7 + jit(v.id) * 0.5;
  if (S.follow.includes(v.channel)) s += 1.2;
  return S.hist.includes(v.id) ? s - 4 : s;
}
function rank(list) {
  const sc = list.map(v => [v, score(v)]).sort((a, b) => b[1] - a[1]);
  const top = sc.slice(0, 300), rest = sc.slice(300).map(x => x[0]), out = [], cnt = {};
  while (top.length) {      // pick the best, but spread across channels
    let bi = 0, bs = -1e9;
    top.forEach((x, i) => { const s = x[1] - 0.6 * (cnt[x[0].channel] || 0); if (s > bs) { bs = s; bi = i; } });
    const v = top.splice(bi, 1)[0][0]; cnt[v.channel] = (cnt[v.channel] || 0) + 1; out.push(v);
  }
  return out.concat(rest);
}
function related(v, n = 12) {
  const t = new Set(toks(v.title)), cnt = {};
  return CAT.filter(x => x.id !== v.id).map(x => {
    const u = toks(x.title), j = u.filter(w => t.has(w)).length / (new Set([...t, ...u]).size || 1);
    return [x, (x.channel === v.channel ? 1.2 : 0) + (x.category === v.category ? 1 : 0) + j * 5 + score(x) * 0.25];
  }).sort((a, b) => b[1] - a[1]).slice(0, n * 3).map(x => x[0])
    .filter(x => (cnt[x.channel] = (cnt[x.channel] || 0) + 1) <= 3).slice(0, n);
}

/* ---------- search: forgiving, ranked by relevance ---------- */
const GENERIC = new Set('course courses tutorial tutorials full lecture lectures class classes learn video videos free complete the and for with how what why from into best new part series playlist channel channels lessons lesson guide explained explain topic topics top'.split(' '));
const SYN = { ds: ['data science'], genai: ['generative ai'], nlp: ['natural language processing'], cs: ['computer science'], py: ['python'], ux: ['user experience'], ui: ['user interface'],
  chem: ['chemistry'], bio: ['biology'], eco: ['economics'], acc: ['accounting', 'accountancy'], ai: ['artificial intelligence', 'machine learning', 'deep learning', 'llm', 'gpt'], ml: ['machine learning'], dsa: ['data structures', 'algorithms'],
  js: ['javascript'], os: ['operating system'], dbms: ['database'], cpp: ['c++'], maths: ['math', 'mathematics'], math: ['maths', 'mathematics'] };
const WORDC = new Map();
const wordsOf = t => {
  const s = String(t); let r = WORDC.get(s);
  if (!r) { r = s.toLowerCase().match(/[\p{L}\p{N}+#]+/gu) || []; if (WORDC.size > 20000) WORDC.clear(); WORDC.set(s, r); }
  return r;
};
const stem = w => w.length > 5 ? w.replace(/(ing|es|ed|s)$/, '') : w;
const near = (a, b) => {   // true when two words differ by one letter at most (typing mistakes)
  const la = a.length, lb = b.length;
  if (a === b) return true;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
  return la === lb ? a.slice(i + 1) === b.slice(i + 1) : la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
};
const wmatch = (h, q) => h === q || (q.length >= 4 && h.length >= 4 && (stem(h).startsWith(stem(q)) || stem(q).startsWith(stem(h)))) || (q.length >= 6 && h.length >= 5 && near(h, q));
// Returns a function: video -> relevance score (0 = no match). Generic words like "course" never block a match,
// at least half of the real words must match, and AI/ML-style shorthand is expanded.
function makeMatcher(query) {
  const all = wordsOf(query), core = all.filter(w => !GENERIC.has(w)), qs = core.length ? core : all;
  const need = Math.max(1, Math.ceil(qs.length * 0.5));
  const hasAll = (ws, a) => a.every(x => ws.some(h => wmatch(h, x)));
  return v => {
    const tw = wordsOf(v.title), ow = wordsOf(v.channel + ' ' + v.category), dw = v.d ? wordsOf(v.d) : [];
    let got = 0, pts = 0;
    for (const q of qs) {
      let hit = 0;
      [[q], ...(SYN[q] || []).map(wordsOf)].forEach((a, i) => {
        const w = i ? 0.7 : 1;
        hit = Math.max(hit, hasAll(tw, a) ? 2 * w : hasAll(ow, a) ? w : dw.length && hasAll(dw, a) ? 0.6 * w : 0);
      });
      if (hit) { got++; pts += hit; }
    }
    if (got < need) return 0;
    return pts + all.filter(w => GENERIC.has(w) && tw.some(h => wmatch(h, w))).length * 0.3 + got / qs.length;
  };
}

/* ---------- data + routing ---------- */
let CAT = [], V = new Map(), CATS = [], CHANS = [], LIB = {}, loadError = '';
const getV = id => V.get(id) || S.meta[id];
const main = $('#main'), dlg = $('#dlg');
const F = { dur: 'any', date: 'any', sort: 'rec', cat: 'all' };
let FLUSH = null, YTP = null, TICK = null, EXITFS = null, LANDEXIT = null;
const PAGES = {};
const setTitle = t => { document.title = t ? t + ' – Toppertube' : 'Toppertube – Free Learning Videos, Courses & Certificates'; };
const NAV = [['home', 'Home', 'home'], ['longs', 'Longs', 'film'], ['courses', 'Courses', 'book'], ['progress', 'Progress', 'chart'], ['podcasts', 'Podcasts', 'mic'], ['liked', 'Liked', 'thumb'], ['history', 'History', 'history'],
             ['later', 'Watch later', 'clock'], ['cats', 'Categories', 'grid'], ['channels', 'Channels', 'user'], ['playlists', 'Playlists', 'list'], ['notes', 'Notes', 'pen'], ['settings', 'Settings', 'sliders']];

function route() {
  const stay = ['watch', 'learn'].includes(location.pathname.split('/').filter(Boolean)[0]);   // next lesson: keep full screen / landscape
  const panel = document.body.dataset.panel || '';
  if (EXITFS) EXITFS(stay);
  if (!stay) { FSWANT = false; if (LANDEXIT) LANDEXIT(); }
  UPDLINE = null;
  document.body.classList.remove('onwatch');
  document.body.dataset.panel = stay ? panel : ''; RAILREFRESH = null;
  if (FLUSH) { FLUSH(); FLUSH = null; }
  stopPlayer();
  const qs = location.search.slice(1), parts = location.pathname.split('/').filter(Boolean);
  const page = PAGES[parts[0]] ? parts[0] : 'home', arg = decodeURIComponent(parts.slice(1).join('/'));
  const rm = document.querySelector('meta[name="robots"]');   // only the home page and the lesson pages (served by api/watch.js) belong in search results
  if (rm && page !== 'watch') rm.setAttribute('content', page === 'home' ? 'index,follow,max-image-preview:large,max-snippet:-1' : 'noindex,follow');
  setTitle(page === 'search' ? 'Search: ' + arg : ['cat', 'channel'].includes(page) ? arg : '');
  const navKey = { cat: 'cats', pl: 'playlists', channel: 'channels', course: 'courses', learn: 'courses', certificate: 'courses', verify: 'courses' }[page] || page;
  document.querySelectorAll('nav a').forEach(a => a.getAttribute('href') === toPath('#/' + navKey) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  main.replaceChildren(); document.body.classList.remove('navopen');
  if (!CAT.length && ['home', 'longs', 'cats', 'cat', 'channels', 'channel', 'search', 'watch'].includes(page)) {
    main.append(msg(loadError || 'Loading lessons…')); return;
  }
  PAGES[page](arg, new URLSearchParams(qs || ''));
  window.scrollTo(0, 0);
}

/* ---------- cards and lists ---------- */
function toggle(arr, v, w) {
  const i = S[arr].indexOf(v.id); remember(v);
  if (i >= 0) S[arr].splice(i, 1); else { S[arr].unshift(v.id); bump(v, w); }
  save(); return i < 0;
}
const chanHref = c => '#/channel/' + encodeURIComponent(c);
function card(v, o = {}) {
  const href = o.href || ('#/watch/' + v.id + (o.list ? '?list=' + encodeURIComponent(o.list) : ''));
  const pr = POS[v.id], frac = o.frac != null ? o.frac : (pr && pr.d ? pr.t / pr.d : 0);   // how much of it was watched
  const thumb = el('div', { class: 'th' }, el('img', { src: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, alt: '', width: 320, height: 180, loading: o.eager ? 'eager' : 'lazy', decoding: 'async', fetchpriority: o.eager ? 'high' : 'auto' }), v.seconds ? el('span', { class: 'dur' }, fmtDur(v.seconds)) : null,
    frac > 0.02 && frac < 0.97 ? el('div', { class: 'pbar' }, el('i', { style: `width:${Math.round(frac * 100)}%` })) : null);
  const stats = `${fmtViews(v.views)} views • ${ago(v)}`;
  const w = el('div', { class: 'cw' + (o.small ? ' sm' : '') + (o.cur ? ' cur' : '') });
  if (o.small) {
    w.append(el('a', { href }, thumb, el('div', null, el('div', { class: 'ct' }, v.title), el('div', { class: 'cm' }, v.channel), el('div', { class: 'cm' }, stats))));
    return w;
  }
  w.append(el('a', { href }, thumb, el('div', { class: 'ct' }, v.title)),
    el('div', { class: 'cm' }, o.chan !== undefined ? o.chan : v.ext ? v.channel : el('a', { class: 'cl', href: chanHref(v.channel) }, v.channel)), el('div', { class: 'cm' }, stats), ...(o.note ? [el('div', { class: 'cm snip' }, o.note)] : []));
  const b = el('button', { class: 'cb', type: 'button', onclick: () => {
    if (o.remove) o.remove(); else b.textContent = toggle('later', v, 2) ? '✓ Saved' : 'Watch later';
  } }, o.remove ? 'Remove' : (S.later.includes(v.id) ? '✓ Saved' : 'Watch later'));
  w.append(b);
  return w;
}
function applyF(l) {
  const lim = { w: 7, m: 30, y: 365 }[F.date];
  return l.filter(v => (F.cat === 'all' || v.category === F.cat) &&
    (F.dur === 'any' || (F.dur === 's' && v.seconds < 600) || (F.dur === 'm' && v.seconds >= 600 && v.seconds < 1800) || (F.dur === 'l' && v.seconds >= 1800)) &&
    (!lim || ageDays(v) <= lim));
}
function filterBar(onChange) {
  const sel = (key, label, opts) => el('label', null, label, el('select', { onchange: e => { F[key] = e.target.value; onChange(); } },
    opts.map(([v, t]) => el('option', { value: v, selected: F[key] === v ? '' : null }, t))));
  const panel = el('div', { class: 'fpanel', hidden: '' },
    sel('dur', 'Duration', [['any', 'Any'], ['s', 'Under 10 min'], ['m', '10–30 min'], ['l', 'Over 30 min']]),
    sel('date', 'Uploaded', [['any', 'Any time'], ['w', 'This week'], ['m', 'This month'], ['y', 'This year']]),
    sel('sort', 'Sort by', [['rec', 'Recommended'], ['new', 'Newest'], ['views', 'Most viewed']]));
  const b = el('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', onclick: () => { panel.hidden = !panel.hidden; b.setAttribute('aria-expanded', String(!panel.hidden)); } }, ico('sliders'), 'Filters');
  return el('div', null, b, panel);
}
function listPage(title, get, o = {}) {
  if (!o.chips) F.cat = 'all';
  main.append(el('div', { class: 'top' }, title ? el('h2', null, title) : el('span'), o.actions ? el('div', { class: 'row' }, o.actions) : null));
  let chips = null;
  if (o.chips) { chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Subjects' }); main.append(chips); }
  main.append(filterBar(draw));
  const box = el('div'), more = el('button', { class: 'btn more', type: 'button', onclick: () => { n += 24; paint(); } }, 'Show more');
  main.append(box, more);
  let n = 24, items = [];
  function drawChips() {
    if (!chips) return; chips.replaceChildren();
    ['all', ...CATS].forEach(c => chips.append(el('button', { class: 'chip', type: 'button', 'aria-pressed': String(F.cat === c), onclick: () => { F.cat = c; draw(); } }, c === 'all' ? 'All' : c)));
  }
  function paint() {
    box.replaceChildren(items.length ? el('div', { class: 'grid' }, items.slice(0, n).map((v, i) => card(v, { eager: i < 4, list: o.list, note: o.note && o.note(v), remove: o.remove && (() => { o.remove(v); draw(); }) }))) : msg(o.empty || 'No lessons match.'));
    more.hidden = n >= items.length;
  }
  function draw() {
    let l = applyF(get());
    if (F.sort === 'new') l = l.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    else if (F.sort === 'views') l = l.slice().sort((a, b) => b.views - a.views);
    else if (o.ranked) l = rank(l);
    items = l; n = 24; drawChips(); paint();
  }
  draw();
  return draw;
}

/* ---------- pages ---------- */
// "Lessons updated 2 hours ago" line on Home. It changes by itself when the live feed arrives.
let UPDLINE = null;
const sinceStr = iso => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)), n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'} ago`;
  return m < 1 ? 'just now' : m < 60 ? n(m, 'minute') : m < 1440 ? n(Math.round(m / 60), 'hour') : n(Math.round(m / 1440), 'day');
};
function updText() {
  if (!UPDLINE) return;
  UPDLINE.hidden = !FEEDAT;
  if (!FEEDAT) return;
  const chs = new Set(CAT.map(v => v.channel)).size;
  UPDLINE.textContent = `Lessons updated ${sinceStr(FEEDAT)} · ${CAT.length.toLocaleString()} lessons from ${chs} channels`;
  UPDLINE.title = new Date(FEEDAT).toLocaleString();
}
// Home: paste any YouTube link, it opens here (player, notes, likes, playlists) like our own lessons
function addLinkDlg() {
  const inp = el('input', { type: 'text', placeholder: 'Paste a YouTube video link', 'aria-label': 'YouTube video link', style: 'flex:1;min-width:200px' });
  const st = el('p', { class: 'mut', role: 'status' });
  const go = async () => {
    const t = inp.value.trim(); if (!t) return;
    st.textContent = 'Opening…';
    dlg.close();
    await openAny(t);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  dlg.replaceChildren(el('div', null, el('h2', null, 'Add a YouTube video'),
    el('p', { class: 'mut' }, 'Paste any YouTube link. You can watch it here and write notes, like or save it, and add it to a playlist.'),
    el('div', { class: 'row', style: 'margin:12px 0' }, inp, el('button', { class: 'btn pri', type: 'button', onclick: go }, 'Open')), st,
    el('div', { class: 'row', style: 'justify-content:flex-end' }, el('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel'))));
  dlg.showModal(); inp.focus();
}
PAGES.home = () => {
  UPDLINE = el('p', { class: 'mut', style: 'font-size:13px;margin:2px 0 10px' }); updText(); main.append(UPDLINE);
  main.append(studyWidget());
  main.append(el('div', { class: 'row', style: 'margin:4px 0 12px' },
    el('button', { class: 'btn pri', type: 'button', onclick: addLinkDlg }, ico('plus'), 'Add YouTube video link'),
    el('a', { class: 'btn', href: '#/courses' }, ico('book'), 'Create course')));
  const cont = continueItems();
  if (cont.length) main.append(el('h3', { style: 'margin:6px 0 10px' }, 'Continue watching'), el('div', { class: 'grid', style: 'margin-bottom:8px' }, cont.map(it =>
    card(it.v, { href: it.href, chan: it.chan, frac: it.frac, note: 'Resume at ' + fmtDur(it.t), remove: () => { delete POS[it.key]; LS.set('tt_pos', POS); route(); } }))));
  listPage('', () => CAT.filter(v => v.category !== 'Podcasts' || F.cat === 'Podcasts' || (S.prof.cat.Podcasts || 0) > 1), { ranked: true, chips: true });
};
// Raj Shamani, Joe Rogan and Nikhil Kamath. If one of them did not load with the channel feed, their latest long episodes
// are searched on YouTube instead, so this page is never empty (costs 100 quota units per search, cached 24 hours).
const PODS = [{ name: 'Raj Shamani', test: /raj ?shamani/i, q: 'raj shamani figuring out podcast' },
  { name: 'Joe Rogan', test: /powerfuljre|joe rogan/i, q: 'joe rogan experience full episode' },
  { name: 'Nikhil Kamath', test: /nikhil ?kamath/i, q: 'nikhil kamath wtf podcast full episode' },
  { name: 'Prakhar Gupta', test: /prakhar ?gupta/i, q: 'prakhar gupta xperience podcast' }];
PAGES.podcasts = () => {
  listPage('Podcasts', () => CAT.filter(v => v.category === 'Podcasts'), { ranked: true, empty: 'No podcast episodes are loaded yet.' });
  const missing = PODS.filter(p => !CAT.some(v => v.category === 'Podcasts' && p.test.test(v.channel)));
  if (!missing.length) return;
  const box = el('div', null, msg('Loading podcast episodes from YouTube…')); main.append(box);
  Promise.all(missing.map(p => fetch('/api/search?q=' + encodeURIComponent(p.q)).then(r => r.ok ? r.json() : { items: [] })
    .then(d => (d.items || []).filter(v => v.seconds >= 1200 && (p.test.test(v.channel) || p.test.test(v.title))).slice(0, 12)).catch(() => [])))
    .then(groups => {
      const items = groups.flat().filter(v => !S.bad.includes(v.id));
      items.forEach(v => { v.ext = true; v.category = 'Podcasts'; if (!V.has(v.id)) V.set(v.id, v); });
      box.replaceChildren(items.length ? el('div', null, el('h3', null, 'More podcast episodes from YouTube'), el('div', { class: 'grid' }, items.map(v => card(v))))
        : msg('Could not load podcast episodes right now. Please try again later.'));
    });
};
PAGES.longs = () => listPage('Longs', () => CAT.filter(v => v.seconds >= 1200), { ranked: true });
PAGES.liked = () => listPage('Liked', () => S.liked.map(getV).filter(Boolean), { list: 'liked', empty: 'Nothing liked yet. Open a lesson and tap Like.', remove: v => { S.liked = S.liked.filter(x => x !== v.id); save(); } });
PAGES.later = () => listPage('Watch later', () => S.later.map(getV).filter(Boolean), { list: 'later', empty: 'Nothing saved yet. Use “Watch later” on any lesson.', remove: v => { S.later = S.later.filter(x => x !== v.id); save(); } });
PAGES.history = () => listPage('History', () => S.hist.map(getV).filter(Boolean), { empty: 'Lessons you watch will appear here.', remove: v => { S.hist = S.hist.filter(x => x !== v.id); save(); },
  actions: [el('button', { class: 'btn', type: 'button', onclick: () => { if (confirm('Clear your watch history?')) { S.hist = []; save(); route(); } } }, 'Clear history')] });
PAGES.cat = arg => listPage(arg, () => CAT.filter(v => v.category === arg), { ranked: true });
PAGES.cats = () => {
  main.append(el('div', { class: 'top' }, el('h2', null, 'Categories')));
  main.append(el('div', { class: 'tiles' }, CATS.map(c => {
    const l = CAT.filter(v => v.category === c), chs = [...new Set(l.map(v => v.channel))];
    return el('a', { class: 'tile', href: '#/cat/' + encodeURIComponent(c) }, el('b', null, c), el('span', { class: 'mut' }, `${l.length} lessons · ${chs.slice(0, 3).join(', ')}${chs.length > 3 ? '…' : ''}`));
  })));
};
PAGES.channels = () => {
  const by = new Map();
  CAT.forEach(v => { const c = by.get(v.channel) || { name: v.channel, category: v.category, n: 0 }; c.n++; by.set(v.channel, c); });
  const all = [...by.values()].sort((a, b) => (S.follow.includes(b.name) - S.follow.includes(a.name)) || a.name.localeCompare(b.name));
  const find = el('input', { type: 'text', placeholder: 'Find a channel', 'aria-label': 'Find a channel' }), box = el('div');
  main.append(el('div', { class: 'top' }, el('h2', null, `Channels (${all.length})`), find), box);
  const draw = () => {
    const q = find.value.trim().toLowerCase(), l = all.filter(c => !q || c.name.toLowerCase().includes(q));
    box.replaceChildren(l.length ? el('div', { class: 'tiles' }, l.map(c => el('a', { class: 'tile', href: chanHref(c.name) },
      el('b', null, (S.follow.includes(c.name) ? '★ ' : '') + c.name), el('span', { class: 'mut' }, `${c.category} · ${c.n} lessons`)))) : msg('No channel found.'));
  };
  find.addEventListener('input', draw); draw();
};
PAGES.channel = arg => {
  const l = CAT.filter(v => v.channel === arg);
  if (!l.length) { main.append(msg('Channel not found.'), el('a', { class: 'btn', href: '#/channels' }, 'All channels')); return; }
  const fb = el('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' });
  const sync = () => { const on = S.follow.includes(arg); fb.textContent = on ? '★ Following' : 'Follow'; fb.classList.toggle('on', on); fb.setAttribute('aria-pressed', String(on)); };
  fb.onclick = () => {
    if (S.follow.includes(arg)) S.follow = S.follow.filter(x => x !== arg);
    else { S.follow.push(arg); bump({ channel: arg, category: l[0].category, title: '' }, 3); }
    save(); sync();
  };
  sync();
  const lib = LIB[arg] || (LIB[arg] = { items: l.slice(), next: '', started: false, done: false });
  const info = CHANS.find(c => c.name === arg);
  let cq = '', busy = false, stop = false;
  const words = () => cq.split(/\s+/).filter(Boolean);
  const inTitle = v => { const t = v.title.toLowerCase(); return words().every(w => t.includes(w)); };
  const match = v => { const t = (v.title + ' ' + (v.d || '')).toLowerCase(); return words().every(w => t.includes(w)); };
  const results = () => lib.items.filter(match).sort((a, b) => inTitle(b) - inTitle(a));   // title matches first, then newest
  const note = v => {
    if (!cq || inTitle(v) || !v.d) return '';
    const d = v.d, i = Math.max(0, d.toLowerCase().indexOf(words()[0]));
    return 'In description: ' + (i > 40 ? '…' : '') + d.slice(Math.max(0, i - 40), i + 70).trim() + '…';
  };
  const qi = el('input', { type: 'search', class: 'cs', placeholder: 'Search titles and descriptions', 'aria-label': 'Search this channel', oninput: e => { cq = e.target.value.trim().toLowerCase(); draw(); upd(); } });
  const draw = listPage(arg, () => cq ? results() : lib.items, { note, empty: 'No matching lessons in what is loaded so far.',
    actions: [qi, el('a', { class: 'btn', href: '#/cat/' + encodeURIComponent(l[0].category) }, l[0].category), fb] });
  if (!info) return;
  const st = el('span', { class: 'mut', role: 'status' });
  const lb = el('button', { class: 'btn pri', type: 'button', onclick: () => run(false) });
  const sb = el('button', { class: 'btn pri', type: 'button', onclick: () => run(true) });
  const upd = err => {
    lb.hidden = lib.done; lb.disabled = busy;
    lb.textContent = lib.started ? 'Load more lessons' : 'Load this channel’s full library';
    sb.hidden = !(cq && !lib.done); sb.textContent = busy ? 'Stop' : 'Search the whole library';
    st.textContent = err || (busy ? `Loading… ${lib.items.length} lessons so far`
      : cq ? `${lib.items.filter(match).length} matches in ${lib.items.length} ${lib.done ? 'lessons (whole library)' : 'loaded lessons'}${lib.started ? '' : ' · descriptions are searched once the library is loaded'}`
      : lib.done ? `Whole library loaded (${lib.items.length} lessons)` : lib.started ? `${lib.items.length} lessons loaded` : 'Showing recent uploads');
  };
  async function loadPage() {
    const r = await fetch('/api/channel?c=' + encodeURIComponent(info.id) + (lib.next ? '&t=' + encodeURIComponent(lib.next) : ''));
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    const byId = new Map(lib.items.map(v => [v.id, v]));
    d.items.forEach(v => { const x = byId.get(v.id); if (x) x.d = v.d; else if (!S.bad.includes(v.id)) { lib.items.push(v); V.set(v.id, v); } });
    lib.items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    lib.next = d.next || ''; lib.started = true; lib.done = !d.next; draw();
  }
  async function run(all) {          // all = keep loading pages (up to 60 = 3000 lessons) so search covers everything
    if (busy) { stop = true; return; }
    busy = true; stop = false; let err = '', pages = 0; upd();
    try { do { await loadPage(); pages++; upd(); } while (all && !lib.done && !stop && pages < 60); } catch (e) { err = e.message; }
    busy = false; upd(err);
  }
  main.append(el('div', { class: 'row', style: 'margin-top:20px' }, lb, sb, st)); upd();
};
// A short piece of a video's description around the words that were searched for, with those words highlighted.
function snippet(text, words, max = 120) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const low = t.toLowerCase(); let at = -1;
  for (const w of words) { const i = low.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; }
  const start = at > 30 ? at - 30 : 0, part = t.slice(start, start + max), out = [];
  if (start > 0) out.push('…');
  const re = words.length ? new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig') : null;
  (re ? part.split(re) : [part]).forEach((seg, i) => { if (seg) out.push(re && i % 2 ? el('mark', null, seg) : seg); });
  if (start + max < t.length) out.push('…');
  return out;
}
const YTC = new Map();   // YouTube results already fetched during this visit, by query
const ytQuery = q => { const w = q.toLowerCase().split(/\s+/).filter(Boolean), k = w.filter(x => !['channel', 'channels', 'video', 'videos'].includes(x)); return (k.length ? k : w).join(' ').slice(0, 80); };
PAGES.search = arg => {
  toks(arg).forEach(k => S.prof.kw[k] = (S.prof.kw[k] || 0) + 1); save();
  const m = makeMatcher(arg);
  const get = () => CAT.map(v => [v, m(v)]).filter(x => x[1] > 0).sort((a, b) => (b[1] + score(b[0]) * 0.1) - (a[1] + score(a[0]) * 0.1)).map(x => x[0]);
  // channels whose name matches the words typed ("khan" shows Khan Academy)
  const chans = CHANS.map(c => [c, m({ title: c.name, channel: '', category: '' })]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  if (chans.length) main.append(el('div', { class: 'chips', role: 'group', 'aria-label': 'Matching channels' }, el('span', { class: 'mut', style: 'align-self:center' }, 'Channels:'), ...chans.map(c => el('a', { class: 'chip', href: chanHref(c.name) }, c.name))));
  const total = get().length;
  const qw = wordsOf(arg).filter(w => !GENERIC.has(w)), note = v => snippet(v.d, qw.length ? qw : wordsOf(arg));   // why a result matched
  listPage(`Results for “${arg}”`, get, { note, empty: 'No lessons in our channels match this search.' });
  const box = el('div'), st = el('span', { class: 'mut', role: 'status' });
  const btn = el('button', { class: 'btn pri', type: 'button', onclick: go }, 'Search more on YouTube');
  main.append(el('div', { class: 'row', style: 'margin-top:24px' }, btn, st), box);
  async function go() {
    btn.disabled = true; st.className = 'mut'; st.textContent = 'Finding more videos on YouTube…';
    const q = ytQuery(arg);
    try {
      let d = YTC.get(q);
      if (!d) { const r = await fetch('/api/search?q=' + encodeURIComponent(q)); d = await r.json(); if (!r.ok) throw new Error(d.error || 'Request failed'); YTC.set(q, d); }
      const have = new Set(get().map(v => v.id));
      const items = d.items.map(v => V.get(v.id) || v).filter(v => !S.bad.includes(v.id) && !have.has(v.id));
      items.forEach(v => { if (!V.has(v.id)) { v.ext = true; V.set(v.id, v); } });
      box.replaceChildren(el('h3', null, 'More from YouTube'), el('p', { class: 'mut' }, `Videos about “${q}” from across YouTube, including channels outside our trusted list.`),
        items.length ? el('div', { class: 'grid' }, items.map(v => card(v, { note: note(v) }))) : msg('Nothing more found.'));
      st.textContent = ''; btn.hidden = true;
    } catch (e) { st.className = 'err'; st.textContent = e.message; btn.disabled = false; }
  }
  if (total < 8) go();   // too few answers in our own channels: look on YouTube straight away
};

/* playlists */
const listIds = id => id === 'later' ? S.later : id === 'liked' ? S.liked : (S.lists.find(l => l.id === id) || { ids: [] }).ids;
const listName = id => id === 'later' ? 'Watch later' : id === 'liked' ? 'Liked' : (S.lists.find(l => l.id === id) || { name: 'Playlist' }).name;
PAGES.playlists = () => {
  main.append(el('div', { class: 'top' }, el('h2', null, 'Playlists')));
  const inp = el('input', { type: 'text', maxlength: 60, placeholder: 'New playlist name', 'aria-label': 'New playlist name' });
  const add = () => { const n = inp.value.trim(); if (n) { S.lists.push({ id: uid(), name: n, ids: [] }); save(); route(); } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  main.append(el('div', { class: 'row' }, inp, el('button', { class: 'btn pri', type: 'button', onclick: add }, 'Create')), el('p'));
  main.append(S.lists.length ? el('div', { class: 'tiles' }, S.lists.map(L => el('a', { class: 'tile', href: '#/pl/' + L.id }, el('b', null, L.name), el('span', { class: 'mut' }, L.ids.length + ' lessons')))) : msg('No playlists yet. Create one above, then add lessons from any video page.'));
};
PAGES.pl = id => {
  const L = S.lists.find(l => l.id === id);
  if (!L) { main.append(msg('Playlist not found.')); return; }
  listPage(L.name, () => L.ids.map(getV).filter(Boolean), { list: id, empty: 'This playlist is empty.', remove: v => { L.ids = L.ids.filter(x => x !== v.id); save(); },
    actions: [L.ids.length ? el('a', { class: 'btn pri', href: `#/watch/${L.ids[0]}?list=${id}` }, 'Play all') : null,
      el('button', { class: 'btn', type: 'button', onclick: () => { const n = prompt('Rename playlist', L.name); if (n && n.trim()) { L.name = n.trim().slice(0, 60); save(); route(); } } }, 'Rename'),
      el('button', { class: 'btn', type: 'button', onclick: () => { if (confirm(`Delete “${L.name}”?`)) { S.lists = S.lists.filter(x => x !== L); save(); navTo('#/playlists'); } } }, 'Delete')] });
};
function playlistDlg(v) {
  remember(v);
  const box = el('div', null, el('h2', null, 'Save to…'), el('p', { class: 'mut' }, v.title));
  const rows = () => {
    list.replaceChildren(...[{ id: 'later', name: 'Watch later' }, ...S.lists].map(L => {
      const cb = el('input', { type: 'checkbox' }); cb.checked = listIds(L.id).includes(v.id);
      cb.onchange = () => { const ids = listIds(L.id), i = ids.indexOf(v.id); if (i >= 0) ids.splice(i, 1); else { ids.push(v.id); bump(v, 2); } save(); };
      return el('label', { class: 'opt' }, cb, L.name);
    }));
  };
  const list = el('div'), inp = el('input', { type: 'text', maxlength: 60, placeholder: 'New playlist name', 'aria-label': 'New playlist name' });
  const add = () => { const n = inp.value.trim(); if (!n) return; S.lists.push({ id: uid(), name: n, ids: [v.id] }); bump(v, 2); save(); inp.value = ''; rows(); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  box.append(list, el('div', { class: 'row', style: 'margin:14px 0' }, inp, el('button', { class: 'btn', type: 'button', onclick: add }, 'Create')),
    el('div', { class: 'row', style: 'justify-content:flex-end' }, el('button', { class: 'btn pri', type: 'button', onclick: () => dlg.close() }, 'Done')));
  rows(); dlg.replaceChildren(box); dlg.showModal();
}

/* ---------- notes: write, download (.txt / .md) or save as PDF ---------- */
const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 50) || 'notes';
function download(name, text, mime) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function printNotes(items) {
  const f = el('iframe', { style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0', title: 'print' });
  document.body.append(f);
  const d = f.contentDocument; d.open();
  d.write(`<!doctype html><meta charset="utf-8"><title>Toppertube notes</title><style>body{font:14px/1.6 system-ui,"Segoe UI",sans-serif;margin:28px;color:#111}h1{font-size:20px;margin:0 0 2px}.s{color:#555;font-size:12px;margin-bottom:12px;word-break:break-all}pre{white-space:pre-wrap;font:inherit;margin:0}section{break-after:page}section:last-child{break-after:auto}</style>` +
    items.map(n => `<section><h1>${esc(n.title)}</h1><div class="s">${esc(n.sub || '')}</div><pre>${esc(n.text)}</pre></section>`).join(''));
  d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 300);
}
function exportNotes(keys, fmt) {
  const items = keys.map(k => S.notes[k]).filter(Boolean);
  if (!items.length) { alert('Write something in your notes first.'); return; }
  const name = items.length === 1 ? slug(items[0].title) : 'toppertube-notes';
  if (fmt === 'pdf') return printNotes(items);
  if (fmt === 'txt') return download(name + '.txt', items.map(n => `${n.title}\n${n.sub || ''}\n\n${n.text}`).join('\n\n----------\n\n'), 'text/plain;charset=utf-8');
  download(name + '.md', items.map(n => `# ${n.title}\n\n${n.sub || ''}\n\n${n.text}\n`).join('\n---\n\n'), 'text/markdown;charset=utf-8');
}
// Reading a notes PDF back in: pdf.js is loaded from a CDN only when somebody uploads a PDF.
let PDFJS = null;
async function pdfLib() {
  if (PDFJS) return PDFJS;
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = base + 'pdf.min.js'; s.onload = ok; s.onerror = () => no(new Error('load')); document.head.append(s); });
  PDFJS = window.pdfjsLib; PDFJS.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
  return PDFJS;
}
async function pdfText(file) {
  const lib = await pdfLib(), doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent(); let out = '', lastY = null;
    for (const it of tc.items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) out += '\n';
      out += it.str; lastY = it.hasEOL ? null : y; if (it.hasEOL) out += '\n';
    }
    pages.push(out.replace(/[ \t]+\n/g, '\n').trim());
  }
  return pages.join('\n\n').replace(/\n{3,}/g, '\n\n');
}
// drop s from the start of t, ignoring line breaks and spaces (a PDF wraps long lines); returns t unchanged if it doesn't start with s
function dropHead(t, s) {
  const sc = (s || '').replace(/\s/g, ''); if (!sc) return t;
  let m = 0, k = 0; for (; k < t.length && m < sc.length; k++) { if (/\s/.test(t[k])) continue; if (t[k] === sc[m]) m++; else return t; }
  return m === sc.length ? t.slice(k).replace(/^\s+/, '') : t;
}
function noteBox(key, info, o = {}) {
  const ta = el('textarea', { class: 'nt', placeholder: 'Type your notes here. They save automatically on this device.', 'aria-label': 'Notes' });
  ta.value = (S.notes[key] || {}).text || '';
  const st = el('span', { class: 'mut' }, ta.value ? 'Saved' : ''), chips = el('div', { class: 'row', style: 'margin-top:8px' });
  const drawChips = () => {
    chips.replaceChildren(); if (!o.seek) return;
    [...new Set(ta.value.match(/\[(?:\d{1,2}:)?\d{1,2}:\d{2}\]/g) || [])].forEach(m => {
      const t = m.slice(1, -1).split(':').reverse().reduce((a, x, i) => a + x * 60 ** i, 0);
      chips.append(el('button', { class: 'chip', type: 'button', onclick: () => o.seek(t) }, '▶ ' + m.slice(1, -1)));
    });
  };
  const commit = () => {
    if (ta.value.trim()) S.notes[key] = { title: info.title, sub: info.sub, text: ta.value, at: Date.now() }; else delete S.notes[key];
    save(); st.textContent = 'Saved'; drawChips();
  };
  let tm; ta.addEventListener('input', () => { st.textContent = 'Saving…'; clearTimeout(tm); tm = setTimeout(commit, 500); });
  ta.addEventListener('blur', commit); FLUSH = commit;
  const ex = f => el('button', { class: 'btn', type: 'button', onclick: () => { commit(); exportNotes([key], f); } }, f === 'pdf' ? 'PDF' : '.' + f);
  const stamp = o.time ? el('button', { class: 'btn', type: 'button', onclick: () => {
    const t = `[${o.stampPre || ''}${fmtDur(o.time())}] `, p = ta.selectionStart ?? ta.value.length;
    ta.value = ta.value.slice(0, p) + t + ta.value.slice(ta.selectionEnd ?? p); ta.focus(); ta.selectionStart = ta.selectionEnd = p + t.length; ta.dispatchEvent(new Event('input'));
  } }, ico('clock'), 'Add timestamp') : null;
  // Upload: bring back a downloaded .txt / .md file and carry on writing at the end of it
  const strip = t => {
    t = t.replace(/\r\n/g, '\n');
    for (const h of [`# ${info.title}\n\n${info.sub || ''}\n\n`, `${info.title}\n${info.sub || ''}\n\n`]) if (t.startsWith(h)) { t = t.slice(h.length); break; }
    return t.replace(/\n---\s*$/, '').trim();
  };
  const pick = el('input', { type: 'file', accept: '.txt,.md,.pdf,text/plain,text/markdown,application/pdf', hidden: '', onchange: async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
    if (f.size > (isPdf ? 25e6 : 2e6)) { alert('That file is too big to be notes.'); return; }
    let add = '';
    if (isPdf) {
      st.textContent = 'Reading PDF…';
      try { add = dropHead(dropHead(await pdfText(f), info.title), info.sub).trim(); }
      catch (err) { st.textContent = ta.value ? 'Saved' : ''; alert('Could not read that PDF. Check your internet connection, or upload a .txt or .md file instead.'); return; }
      st.textContent = ta.value ? 'Saved' : '';
      if (!add) { alert('No text found in that PDF. Scanned or image-only PDFs cannot be read.'); return; }
    } else add = strip(await f.text());
    if (!add) { alert('That file is empty.'); return; }
    if (ta.value.trim() && !confirm('Add the file to the end of the notes you already have here?\n\nOK = add it below your notes\nCancel = change nothing')) return;
    ta.value = ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n\n' + add + '\n' : add + '\n';
    commit(); ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; ta.scrollTop = ta.scrollHeight;
  } });
  const up = el('button', { class: 'btn', type: 'button', title: 'Open a notes file (.txt, .md or .pdf) you downloaded earlier and carry on writing', onclick: () => pick.click() }, 'Upload notes');
  drawChips();
  return el('div', null, el('div', { class: 'hd' }, el('div', { class: 'row' }, stamp, st), el('div', { class: 'row' }, el('span', { class: 'mut' }, 'Download:'), ex('txt'), ex('md'), ex('pdf'), up, pick)), ta, chips);
}
const noteHref = k => { if (k.startsWith('cn:')) return '#/course/' + k.slice(3); if (k.startsWith('c:')) { const m = k.split(':'); return '#/learn/' + m[1] + '/' + encodeURIComponent(m.slice(2).join(':')); } return getV(k) ? '#/watch/' + k : ''; };
PAGES.notes = () => {
  let NEW = null; const open = new Set(), box = el('div');
  main.append(el('div', { class: 'top' }, el('h2', null, 'My notes'), el('div', { class: 'row' },
    el('button', { class: 'btn pri', type: 'button', onclick: () => { NEW = 'g' + uid(); draw(); } }, ico('plus'), 'New note'),
    el('button', { class: 'btn', type: 'button', onclick: () => exportNotes(Object.keys(S.notes), 'md') }, 'All (.md)'),
    el('button', { class: 'btn', type: 'button', onclick: () => exportNotes(Object.keys(S.notes), 'pdf') }, 'All as PDF'))), box);
  function editor(k, info) {
    const isG = k[0] === 'g' && !V.has(k) && !S.meta[k];
    const t = isG ? el('input', { type: 'text', value: info.title, 'aria-label': 'Note title', style: 'width:100%;margin-bottom:8px;font-weight:700', oninput: e => { info.title = e.target.value || 'Untitled note'; } }) : el('b', null, info.title);
    return el('div', { class: 'nrow' }, t, noteBox(k, info), el('div', { class: 'row', style: 'margin-top:8px' }, el('button', { class: 'btn', type: 'button', onclick: () => { if (FLUSH) FLUSH(); open.delete(k); if (k === NEW) NEW = null; draw(); } }, 'Close')));
  }
  function draw() {
    box.replaceChildren(); const keys = Object.keys(S.notes).sort((a, b) => S.notes[b].at - S.notes[a].at);
    if (NEW) box.append(editor(NEW, { title: 'Untitled note', sub: '' }));
    if (!keys.length && !NEW) box.append(msg('No notes yet. Open a lesson and write beside the video, or tap New note.'));
    keys.forEach(k => {
      const n = S.notes[k];
      if (open.has(k)) { box.append(editor(k, n)); return; }
      box.append(el('div', { class: 'nrow' }, el('b', null, n.title), el('p', { class: 'mut' }, n.sub || ''), el('p', null, n.text.length > 220 ? n.text.slice(0, 220) + '…' : n.text),
        el('div', { class: 'row' }, el('button', { class: 'btn', type: 'button', onclick: () => { open.add(k); draw(); } }, 'Edit'),
          noteHref(k) ? el('a', { class: 'btn', href: noteHref(k) }, k.startsWith('cn:') ? 'Open course' : 'Open lesson') : null,
          ...['txt', 'md', 'pdf'].map(f => el('button', { class: 'btn', type: 'button', onclick: () => exportNotes([k], f) }, f === 'pdf' ? 'PDF' : '.' + f)),
          el('button', { class: 'btn', type: 'button', onclick: () => { if (confirm('Delete this note?')) { delete S.notes[k]; save(); draw(); } } }, 'Delete'))));
    });
  }
  draw();
};

/* ---------- notes beside the video, and full screen that keeps the notes next to it ---------- */
// Icon buttons for a phone held sideways (CSS shows this rail only then). items: { ico, label, fn | href, on? }
// One slide-over panel at a time in the sideways layout: the notes or the lesson list ("up next" on a plain video).
let RAILREFRESH = null;
function togglePanel(name) { document.body.dataset.panel = document.body.dataset.panel === name ? '' : name; if (RAILREFRESH) RAILREFRESH(); }
function railBox(items) {
  const btns = items.map(it => ({ it, node: it.href
    ? el('a', { class: 'rb', href: it.href, 'aria-label': it.label, title: it.label, target: it.ext ? '_blank' : null, rel: it.ext ? 'noopener' : null }, ico(it.ico))
    : el('button', { class: 'rb', type: 'button', 'aria-label': it.label, title: it.label, onclick: it.fn }, ico(it.ico)) }));
  return { rail: el('div', { class: 'rail', role: 'toolbar', 'aria-label': 'Video controls' }, btns.map(b => b.node)),
           refresh: () => btns.forEach(b => { if (b.it.on) b.node.classList.toggle('on', !!b.it.on()); if (b.it.show) b.node.hidden = !b.it.show(); }) };
}
// Landscape button (phones): full screen + rotation lock where the browser allows it; otherwise (iPhone) the page itself is turned sideways with body.fl.
let LANDON = false, LANDLOCK = false;
async function landFullscreen() {   // browser full screen + rotation lock, as far as this browser allows; needs a tap to start
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    if (screen.orientation && screen.orientation.lock) { await screen.orientation.lock('landscape'); LANDLOCK = true; }
  } catch (e) {}
  if (!LANDON) return;
  document.body.classList.toggle('fl', !LANDLOCK && !phoneSideways.matches);   // no lock (iPhone, or the browser let go): turn the page sideways ourselves
  if (RAILREFRESH) RAILREFRESH();
}
function enterLand() {
  if (EXITFS) EXITFS(true);
  FSWANT = false;
  LANDON = true; LANDLOCK = false; LANDEXIT = leaveLand;
  return landFullscreen();
}
function leaveLand() {
  if (!LANDON) return;
  LANDON = false; LANDLOCK = false; LANDEXIT = null;
  document.body.classList.remove('fl');
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (RAILREFRESH) RAILREFRESH();
}
// The browser can drop full screen by itself (keyboard opening for the notes, a system swipe, the video player). Landscape mode stays on:
// the layout keeps itself sideways, and the next tap puts the browser back in full screen. Only "Exit landscape" or leaving the page ends it.
document.addEventListener('fullscreenchange', () => {
  if (!LANDON || document.fullscreenElement) return;
  LANDLOCK = false;
  document.body.classList.toggle('fl', !phoneSideways.matches);
  if (RAILREFRESH) RAILREFRESH();
});
document.addEventListener('click', () => { if (LANDON && !document.fullscreenElement) landFullscreen(); });
// "Full screen + notes": the whole page goes full screen (not just the box), so it survives the box being rebuilt when the next lesson opens.
// It ends only with the Exit button. If the browser drops full screen on its own, the layout stays and the next tap puts it back.
let FSWANT = false;
function goFS() {
  const r = document.documentElement;
  if (!document.fullscreenElement && r.requestFullscreen) r.requestFullscreen().catch(() => {});
  try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(() => {}); } catch (e) {}   // typing Esc in the notes should not leave full screen (hold Esc to leave)
}
document.addEventListener('click', () => { if (FSWANT && !LANDON && !document.fullscreenElement) goFS(); });
// Videos whose owner does not allow them to play outside YouTube: a card with a big "Watch on YouTube" button takes the player's place
function blockedCard(id, t, extra, why) {
  const url = `https://www.youtube.com/watch?v=${id}${t ? '&t=' + t + 's' : ''}`;
  return el('div', { class: 'blockedcard', style: `background-image:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` },
    el('b', null, 'Watch this one on YouTube'),
    el('p', null, why || "The owner of this video doesn't allow it to play outside YouTube. Open it in a new tab, watch it there, then come back here to write your notes."),
    el('div', { class: 'row' }, el('a', { class: 'btn pri', href: url, target: '_blank', rel: 'noopener' }, 'Watch on YouTube ↗'), ...(extra || [])));
}
const blockedWhy = code => code === 100 ? 'YouTube says this video was removed or is private.' : code === 2 || code === 5 ? 'YouTube could not play this video here.' : undefined;
function layoutBox(vcol, notes, title = '', railItems = []) {   // box = (full-screen top bar) + video column + notes panel + sideways-phone button rail
  const exitB = el('button', { class: 'btn pri', type: 'button' }, 'Exit full screen');
  const bar = el('div', { class: 'fsbar', hidden: '' }, el('span', { class: 'fst' }, title), exitB);
  const rb = railBox([{ ico: 'left', label: 'Back', fn: () => { if (history.length > 1) history.back(); else navTo('#/home'); } }, ...railItems,
    { ico: 'rot', label: 'Exit landscape', fn: () => leaveLand(), show: () => LANDON },
    { ico: 'pen', label: 'Notes', fn: () => togglePanel('notes'), on: () => document.body.dataset.panel === 'notes' }]);
  const box = el('div', { class: 'fsbox' }, bar, vcol, notes, rb.rail);
  document.body.classList.add('onwatch');   // route() clears this again on every page change
  RAILREFRESH = rb.refresh;
  rb.refresh();
  let on = false;
  // keepFS: the page is only being swapped (next lesson), so the layout is torn down but the browser stays in full screen
  function exit(keepFS) {
    if (!on) return; on = false; EXITFS = null;
    box.classList.remove('fsmode'); document.body.classList.remove('fsbody'); bar.hidden = true;
    if (!keepFS) { FSWANT = false; if (document.fullscreenElement && !LANDON) document.exitFullscreen().catch(() => {}); }
  }
  function enter() {
    on = true; FSWANT = true; EXITFS = exit; box.classList.add('fsmode'); document.body.classList.add('fsbody'); bar.hidden = false;
    goFS();
  }
  exitB.onclick = () => exit();
  if (FSWANT) enter();   // the last lesson ended and the next one opened: stay in full screen
  return { box, enter, refresh: rb.refresh };
}
function layoutButtons(wrap, enter) {
  const sb = el('button', { class: 'btn', type: 'button' });
  const sync = () => { sb.textContent = S.split ? 'Notes below video' : 'Notes beside video'; wrap.classList.toggle('split', S.split); };
  sb.onclick = () => { S.split = !S.split; save(); sync(); };
  sync();
  return [sb, el('button', { class: 'btn', type: 'button', onclick: enter }, 'Full screen + notes'),
    el('button', { class: 'btn landbtn', type: 'button', onclick: enterLand }, ico('rot'), 'Landscape')];
}

/* ---------- continue watching, study time and streaks (saved on this device) ---------- */
const POS = LS.get('tt_pos', {});                              // where each video / lesson was left: { key: { t, d, at, v } }
const STUDY = LS.get('tt_study', { days: {}, goal: 20 });       // seconds studied per day, and the daily goal in minutes
if (!STUDY.days) STUDY.days = {}; if (!STUDY.goal) STUDY.goal = 20;
let POSHOOK = null;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
function savePos(key, vid, t, d) {
  if (!(d > 0) || !(t >= 0)) return;
  POS[key] = { t: Math.floor(t), d: Math.floor(d), at: Date.now(), v: vid };
  const keys = Object.keys(POS);
  if (keys.length > 60) keys.sort((a, b) => POS[a].at - POS[b].at).slice(0, keys.length - 60).forEach(k => delete POS[k]);
  LS.set('tt_pos', POS);
}
function recordPlay(key, vid, seconds = 5) {   // runs every 5 seconds while a player is open (and once when leaving, with seconds = 0)
  try {
    if (seconds && YTP.getPlayerState() === 1) { const k = dayKey(); STUDY.days[k] = (STUDY.days[k] || 0) + seconds; LS.set('tt_study', STUDY); }
    savePos(key, vid, YTP.getCurrentTime(), YTP.getDuration());
  } catch (e) {}
}
// where to start: the saved spot if it is inside the lesson and not right at the beginning or the end
const resumeAt = (key, from = 0, to = Infinity) => { const p = POS[key]; return p && p.t > Math.max(15, from + 10) && p.t < Math.min(p.d - 20, to - 10) ? p.t : 0; };
function studyInfo() {
  const goal = STUDY.goal * 60, days = STUDY.days, today = dayKey(), done = k => (days[k] || 0) >= goal;
  let cur = 0, k = done(today) ? today : addDays(today, -1);       // today not finished yet does not break the streak
  while (done(k)) { cur++; k = addDays(k, -1); }
  let best = 0, run = 0;
  Object.keys(days).filter(done).sort().forEach((d, i, a) => { run = i && addDays(a[i - 1], 1) === d ? run + 1 : 1; best = Math.max(best, run); });
  return { goal, today: days[today] || 0, cur, best: Math.max(best, cur), total: Object.values(days).reduce((a, b) => a + b, 0), active: Object.keys(days).length };
}
function continueItems() {
  const out = [];
  Object.entries(POS).sort((a, b) => b[1].at - a[1].at).forEach(([key, p]) => {
    if (out.length >= 4) return;
    if (key.startsWith('c:')) {                                     // a course lesson
      const [, cid, ...rest] = key.split(':'), lkey = rest.join(':'), c = S.courses.find(x => x.id === cid), l = c && lessonsOf(c).find(x => lk(x) === lkey);
      if (!l || prog(cid).done[lkey] || !resumeAt(key, l.s || 0, l.e || Infinity)) return;
      const v = getV(l.v) || { id: l.v, title: l.t, channel: '', seconds: l.d || 0, views: 0, publishedAt: new Date().toISOString() };
      out.push({ key, v: { ...v, title: l.t }, href: learnHref(c, l), chan: c.title, t: p.t, frac: (p.t - (l.s || 0)) / ((l.e || p.d) - (l.s || 0)) });
    } else {
      const v = getV(key);
      if (v && resumeAt(key)) out.push({ key, v, href: '#/watch/' + key, t: p.t, frac: p.t / p.d });
    }
  });
  return out;
}
function studyWidget() {
  const s = studyInfo(), pct = Math.min(100, Math.round(100 * s.today / s.goal));
  return el('a', { class: 'panel stw', href: '#/progress', 'aria-label': 'Open your progress' },
    el('span', { class: 'stk' }, ico('zap'), s.cur ? `${s.cur}-day streak` : 'Start your streak'),
    el('div', null, el('div', { class: 'cm' }, `Today: ${Math.floor(s.today / 60)} of ${STUDY.goal} minutes${s.today >= s.goal ? ' · goal reached!' : ''}`), bar(pct)),
    el('span', { class: 'mut' }, 'Progress →'));
}
PAGES.progress = () => {
  const s = studyInfo(), pct = Math.min(100, Math.round(100 * s.today / s.goal)), mins = n => Math.round(n / 60);
  const goalSel = el('select', { 'aria-label': 'Daily goal in minutes', onchange: e => { STUDY.goal = +e.target.value; LS.set('tt_study', STUDY); route(); } },
    [10, 20, 30, 45, 60, 90].map(m => el('option', { value: m, selected: STUDY.goal === m ? '' : null }, m + ' minutes')));
  main.append(el('div', { class: 'top' }, el('h2', null, 'Your progress'), el('label', { class: 'mut' }, 'Daily goal ', goalSel)));
  const long = n => n < 3600 ? mins(n) + ' min' : (n / 3600).toFixed(1).replace('.0', '') + ' h', dd = n => `${n} ${n === 1 ? 'day' : 'days'}`;
  main.append(el('div', { class: 'tiles' },
    el('div', { class: 'tile' }, el('b', null, `${mins(s.today)} / ${STUDY.goal} min`), el('span', { class: 'mut' }, s.today >= s.goal ? 'Today’s goal reached' : 'Studied today'), bar(pct)),
    el('div', { class: 'tile' }, el('b', null, dd(s.cur)), el('span', { class: 'mut' }, 'Current streak')),
    el('div', { class: 'tile' }, el('b', null, dd(s.best)), el('span', { class: 'mut' }, 'Best streak')),
    el('div', { class: 'tile' }, el('b', null, long(s.total)), el('span', { class: 'mut' }, `Total study time · ${dd(s.active)} studied`))));
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(dayKey(), i - 6)), top = Math.max(s.goal, ...days7.map(k => STUDY.days[k] || 0));
  const lab = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' }); };
  main.append(el('h3', null, 'Last 7 days'), el('div', { class: 'chart', role: 'img', 'aria-label': 'Minutes studied in the last 7 days' }, days7.map(k => {
    const sec = STUDY.days[k] || 0;
    return el('div', { class: 'cbar' }, el('div', { class: 'plot' }, el('i', { class: sec >= s.goal ? 'hit' : '', style: `height:${Math.max(2, Math.round(100 * sec / top))}%` })), el('span', null, lab(k)), el('small', null, mins(sec) + ' m'));
  })));
  const doneL = Object.values(S.prog).reduce((n, p) => n + Object.keys((p && p.done) || {}).length, 0);
  const BADGES = [['First lesson finished', doneL >= 1], ['3-day streak', s.best >= 3], ['7-day streak', s.best >= 7], ['30-day streak', s.best >= 30],
    ['10 hours of study', s.total >= 36000], ['50 hours of study', s.total >= 180000], ['10 notes written', Object.keys(S.notes).length >= 10], ['First certificate', Object.keys(S.certs).length >= 1]];
  main.append(el('h3', null, 'Badges'), el('div', { class: 'badges' }, BADGES.map(([t, on]) => el('span', { class: 'badge' + (on ? ' on' : ''), title: on ? 'Earned' : 'Not yet' }, (on ? '✓ ' : '○ ') + t))),
    el('p', { class: 'mut' }, 'Study time counts while a video is playing on Toppertube. A day counts toward your streak when you reach your daily goal.'));
};

/* ---------- watch page ---------- */
function stopPlayer() { if (POSHOOK) { try { POSHOOK(); } catch (e) {} POSHOOK = null; } clearInterval(TICK); TICK = null; try { YTP && YTP.destroy && YTP.destroy(); } catch (e) {} YTP = null; }
function loadYT() {
  if (window.YT && YT.Player) return Promise.resolve();
  return new Promise((res, rej) => {
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    if (!document.getElementById('ytapi')) { const s = el('script', { id: 'ytapi', src: 'https://www.youtube.com/iframe_api' }); s.onerror = rej; document.head.append(s); }
    setTimeout(() => rej(new Error('timeout')), 12000);
  });
}
PAGES.watch = (id, q) => {
  const v = getV(id);
  if (!v) {   // not in the feed (for example a /watch/<id> link to another video): ask the server for it once
    const gone = () => main.replaceChildren(msg('This lesson is no longer in the feed.'), el('a', { class: 'btn', href: '#/home' }, 'Back to home'));
    main.append(msg('Loading lesson…'));
    getJSON('/api/video?v=' + encodeURIComponent(id)).then(d => {
      if (!d.video || !location.pathname.includes(id)) throw new Error('gone');
      d.video.ext = true; remember(d.video); route();
    }).catch(() => { if (location.pathname.includes(id)) gone(); });
    return;
  }
  remember(v); S.hist = [v.id, ...S.hist.filter(x => x !== v.id)].slice(0, 200); bump(v, 1); save(); setTitle(v.title);
  const list = q.get('list'), ids = list ? listIds(list) : null, idx = ids ? ids.indexOf(v.id) : -1;
  const next = () => { if (ids && idx >= 0 && idx < ids.length - 1) navTo(`#/watch/${ids[idx + 1]}?list=${encodeURIComponent(list)}`); };
  const startAt = resumeAt(v.id);
  const box = el('div'), err = el('p', { class: 'err', role: 'alert' });
  const likeB = el('button', { class: 'btn', type: 'button' }), laterB = el('button', { class: 'btn', type: 'button' });
  const sync = () => {
    const l = S.liked.includes(v.id), w = S.later.includes(v.id);
    likeB.replaceChildren(ico('thumb'), l ? 'Liked' : 'Like'); likeB.classList.toggle('on', l);
    laterB.replaceChildren(ico('clock'), w ? 'Saved' : 'Watch later'); laterB.classList.toggle('on', w);
  };
  likeB.onclick = () => { toggle('liked', v, 3); sync(); }; laterB.onclick = () => { toggle('later', v, 2); sync(); }; sync();
  const frame = el('div', { class: 'frame' }, box);
  const nextBtn = ids && idx >= 0 && idx < ids.length - 1 ? [el('a', { class: 'btn', href: `#/watch/${ids[idx + 1]}?list=${encodeURIComponent(list)}` }, 'Next →')] : [];
  const showBlocked = code => {   // never plays here: swap the player for the "Watch on YouTube" card
    clearInterval(TICK); TICK = null; POSHOOK = null;
    try { YTP.destroy(); } catch (e) {} YTP = null;
    frame.replaceChildren(blockedCard(v.id, 0, nextBtn, blockedWhy(code)));
  };
  const blocked = e => {
    if (!S.bad.includes(v.id)) S.bad.push(v.id);
    v.blocked = true; remember(v); save(); showBlocked(e && e.data);
  };
  if (v.blocked) showBlocked();
  else loadYT().then(() => {
    if (!box.isConnected) return;
    YTP = new YT.Player(box, { videoId: v.id, host: 'https://www.youtube-nocookie.com', playerVars: { autoplay: 1, rel: 0, playsinline: 1, fs: 0, start: startAt },
      events: { onStateChange: e => { if (e.data === 0) { bump(v, 2); save(); next(); } }, onError: blocked } });
    TICK = setInterval(() => recordPlay(v.id, v.id), 5000); POSHOOK = () => recordPlay(v.id, v.id, 0);   // remember the spot and the study time
  }).catch(() => box.replaceWith(el('iframe', { src: `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&fs=0`, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', title: v.title })));
  const time = () => { try { return Math.floor(YTP.getCurrentTime()); } catch (e) { return 0; } };
  const seek = t => { try { YTP.seekTo(t, true); YTP.playVideo(); } catch (e) {} };
  const side = el('aside');
  if (ids) {
    side.append(el('h3', null, `Playlist: ${listName(list)} (${idx + 1}/${ids.length})`), ...ids.map(getV).filter(Boolean).map(x => card(x, { list, small: true, cur: x.id === v.id })));
  }
  side.append(el('h3', null, 'Up next for you'), ...related(v).map(x => card(x, { small: true })));
  const acts = el('div', { class: 'acts' }, likeB, laterB, el('button', { class: 'btn', type: 'button', onclick: () => playlistDlg(v) }, ico('list'), 'Add to playlist'),
    el('button', { class: 'btn', type: 'button', onclick: () => makeCourseHere(v) }, ico('book'), 'Make a course'),
    el('a', { class: 'btn', href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener' }, 'Open on YouTube'));
  const resumeNote = startAt ? el('p', { class: 'mut resume' }, `Resuming from ${fmtDur(startAt)} · `, el('button', { class: 'btn', type: 'button', onclick: () => { seek(0); delete POS[v.id]; LS.set('tt_pos', POS); resumeNote.remove(); } }, 'Start over')) : null;
  const vcol = el('div', { class: 'vcol' }, frame, err, ...(resumeNote ? [resumeNote] : []), el('h1', { class: 'vt' }, v.title),
    el('div', { class: 'mut' }, v.ext ? v.channel : el('a', { class: 'cl', href: chanHref(v.channel), style: 'font-weight:600;color:var(--fg)' }, v.channel), ` · ${fmtViews(v.views)} views · ${ago(v)}`), acts);
  const notes = el('section', { class: 'notes', 'aria-label': 'My notes for this lesson' }, el('h2', { style: 'font-size:17px;margin-bottom:8px' }, 'My notes'),
    noteBox(v.id, { title: v.title, sub: `${v.channel} · https://www.youtube.com/watch?v=${v.id}` }, { time, seek }));
  const rail = [
    { ico: 'menu', label: 'Up next', fn: () => togglePanel('lessons'), on: () => document.body.dataset.panel === 'lessons' },
    { ico: 'thumb', label: 'Like', fn: () => { likeB.onclick(); lay.refresh(); }, on: () => S.liked.includes(v.id) },
    { ico: 'clock', label: 'Watch later', fn: () => { laterB.onclick(); lay.refresh(); }, on: () => S.later.includes(v.id) },
    { ico: 'list', label: 'Add to playlist', fn: () => playlistDlg(v) },
    { ico: 'book', label: 'Make a course', fn: () => makeCourseHere(v) },
    { ico: 'ext', label: 'Open on YouTube', href: 'https://www.youtube.com/watch?v=' + v.id, ext: true }];
  const lay = layoutBox(vcol, notes, v.title, rail), wrap = el('div', { class: 'watch' }, el('div', null, lay.box), side);
  acts.append(...layoutButtons(wrap, lay.enter));
  main.append(wrap);
};

/* ---------- settings ---------- */
PAGES.settings = () => {
  main.append(el('div', { class: 'top' }, el('h2', null, 'Settings')));
  const th = el('select', { 'aria-label': 'Theme', onchange: e => { S.theme = e.target.value; save(); applyTheme(); } },
    [['auto', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, t]) => el('option', { value: v, selected: S.theme === v ? '' : null }, t)));
  const file = el('input', { type: 'file', accept: 'application/json', hidden: '', onchange: async e => {
    try { const d = JSON.parse(await e.target.files[0].text());
      for (const k of Object.keys(DEF)) if (k in d && typeof d[k] === typeof DEF[k] && Array.isArray(d[k]) === Array.isArray(DEF[k])) S[k] = d[k];
      if (d.pos && typeof d.pos === 'object') LS.set('tt_pos', d.pos);
      if (d.study && typeof d.study === 'object' && d.study.days) LS.set('tt_study', d.study);
      save(); alert('Backup restored.'); location.reload(); } catch (x) { alert('That file is not a Toppertube backup.'); } } });
  const b = (t, f) => el('button', { class: 'btn', type: 'button', onclick: f }, t);
  const pc = el('input', { type: 'checkbox', onchange: e => { S.podcasts = e.target.checked; save(); location.reload(); } }); pc.checked = S.podcasts;
  main.append(el('div', { class: 'row' }, el('label', null, 'Theme ', th)), el('div', { class: 'row', style: 'margin-top:12px' }, el('label', { class: 'row' }, pc, 'Show podcasts (they may contain mature language)')),
    el('p', { class: 'mut' }, 'Your likes, history, playlists, notes and recommendations are saved only in this browser, with no login. Download a backup to keep them safe or move them to another device.'),
    el('div', { class: 'row' }, b('Download backup', () => download('toppertube-backup.json', JSON.stringify({ ...S, pos: POS, study: STUDY }), 'application/json')), b('Restore backup', () => file.click()), file),
    el('h3', null, 'Recommendations'), el('p', { class: 'mut' }, 'The Home page learns from what you watch, like and save. You can start fresh any time.'),
    el('div', { class: 'row' }, b('Reset recommendations', () => { if (confirm('Forget what Toppertube learned about your interests?')) { S.prof = structuredClone(DEF.prof); save(); alert('Done.'); } })),
    el('h3', null, 'Delete everything'), el('div', { class: 'row' }, b('Delete all my data', () => { if (confirm('Delete likes, history, playlists and notes from this browser?')) { localStorage.removeItem('tt2'); localStorage.removeItem('tt_pos'); localStorage.removeItem('tt_study'); history.replaceState(null, '', '/'); location.reload(); } })));
};

/* ---------- shell ---------- */
function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
$('#menuBtn').append(ico('menu')); $('#sb').append(ico('search')); $('#themeBtn').append(ico('moon'));
$('#menuBtn').onclick = () => document.body.classList.toggle(innerWidth > 900 ? 'nonav' : 'navopen');
$('#themeBtn').onclick = () => { S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };
// suggestions while typing: channels, subjects and lesson titles that contain the typed text
let sugT;
$('#q').addEventListener('input', () => {
  clearTimeout(sugT);
  sugT = setTimeout(() => {
    const t = $('#q').value.trim().toLowerCase(), dl = $('#sugg');
    if (t.length < 2 || !CAT.length) { dl.replaceChildren(); return; }
    const out = [], seen = new Set(), add = s => { const k = s.toLowerCase(); if (out.length < 8 && !seen.has(k)) { seen.add(k); out.push(s); } };
    CHANS.forEach(c => { if (c.name.toLowerCase().includes(t)) add(c.name); });
    CATS.forEach(c => { if (c.toLowerCase().includes(t)) add(c); });
    CAT.filter(v => v.title.toLowerCase().includes(t)).sort((a, b) => b.views - a.views).slice(0, 8).forEach(v => add(v.title));
    dl.replaceChildren(...out.map(s => el('option', { value: s })));
  }, 120);
});
$('#sf').onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (!q) return; if (/youtu\.?be/i.test(q)) { openAny(q); return; } navTo('#/search/' + encodeURIComponent(q)); };
$('#nav').append(...NAV.map(([k, t, i]) => el('a', { href: '#/' + k }, ico(i), t)));
addEventListener('popstate', route);
addEventListener('hashchange', () => { if (location.hash.startsWith('#/')) { history.replaceState(null, '', toPath(location.hash)); route(); } });   // old /#/... links and bookmarks
// links inside the app change the page without a reload; /about, /categories and /category/... are separate pages and load normally
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !PAGES[u.pathname.split('/')[1] || 'home']) return;
  e.preventDefault(); navTo(u.pathname + u.search);
});
// turning a phone sideways: leave the "full screen + notes" mode, the sideways layout (video + button rail) takes over
const phoneSideways = matchMedia('(orientation: landscape) and (max-height: 520px) and (pointer: coarse)');
if (phoneSideways.addEventListener) phoneSideways.addEventListener('change', e => {
  if (e.matches && EXITFS) { EXITFS(true); FSWANT = false; }
  if (LANDON && !LANDLOCK) document.body.classList.toggle('fl', !e.matches);   // really turned sideways: the normal sideways layout takes over; back upright: turn the page ourselves
});

let FEEDAT = '';
function applyFeed(d) {
  const old = V;
  CAT = d.items.filter(v => !S.bad.includes(v.id) && (S.podcasts || v.category !== 'Podcasts'));
  CATS = (d.categories || []).filter(c => CAT.some(v => v.category === c)); CHANS = d.channels || []; V = new Map(CAT.map(v => [v.id, v]));
  for (const [k, x] of old) if (!V.has(k)) V.set(k, x);      // keep videos opened from channel libraries, searches and courses
  FEEDAT = d.updatedAt || '';
  if (UPDLINE && UPDLINE.isConnected) updText();
}
async function getJSON(url) { const r = await fetch(url), d = await r.json(); if (!r.ok) throw new Error(d.error || 'Request failed'); return d; }
(async () => {
  if (location.hash.startsWith('#/')) history.replaceState(null, '', toPath(location.hash));   // an old /#/watch/<id> style address becomes /watch/<id>
  applyTheme();
  main.replaceChildren(msg('Loading lessons…'));
  // 1) /feed.json is a plain static file made at deploy time, so the page can show lessons almost instantly
  let snap = null;
  try { snap = await getJSON('/feed.json'); applyFeed(snap); route(); } catch (e) { snap = null; }
  // warm up the YouTube player while the student browses, so the first video starts quickly
  const warm = () => loadYT().catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
  // 2) the live feed (/api/feed) is only needed when there is no snapshot or it is more than 6 hours old; it is applied quietly
  //    and shows up on the next page change, so the screen never jumps while someone is reading
  if (!snap || Date.now() - new Date(snap.updatedAt || 0) > 6 * 3600e3) {
    try { applyFeed(await getJSON('/api/feed')); } catch (e) { if (!snap) loadError = e.message; }
    if (!snap) route();
  }
})();
// remembers thumbnails, the lesson list and scripts on the device (see sw.js): repeat visits open much faster
if ('serviceWorker' in navigator) addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
