'use strict';
/* ====== Courses: build a curriculum from any playlist / lecture / list of links, track progress, take notes ====== */
const YTID = /^[\w-]{11}$/;
function parseYT(input) {
  const s = String(input).trim();
  if (YTID.test(s)) return { video: s, list: null };
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return { video: null, list: null }; }
  const h = u.hostname.replace(/^(www|m)\./, ''), list = u.searchParams.get('list');
  let video = null;
  if (h === 'youtu.be') video = u.pathname.slice(1, 12);
  else if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) video = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1] || null;
  else return { video: null, list: null };
  return { video: video && YTID.test(video) ? video : null, list };
}
async function api(path) {
  const r = await fetch(path), d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
// Make a video known to the app (so it can be played, liked, noted, saved) even if it is not in our catalog.
function ingest(v) {
  let k = V.get(v.id);
  if (!k) { k = v; k.ext = true; V.set(k.id, k); }
  remember(k); return k;
}
async function openAny(input) {
  const { video, list } = parseYT(input);
  if (!video && list) { location.hash = '#/courses?list=' + encodeURIComponent(input); return; }
  if (!video) { alert('That does not look like a YouTube link.'); return; }
  try {
    const d = await api('/api/video?v=' + video);
    if (!d.video.embeddable) throw new Error("The owner doesn't allow this video to play outside YouTube.");
    ingest(d.video); save(); location.hash = '#/watch/' + video;
  } catch (e) { alert(e.message); }
}

/* ---------- building courses ---------- */
const lk = l => l.v + '@' + (l.s || 0);
const lessonsOf = c => c.modules.flatMap(m => m.lessons);
const prog = id => S.prog[id] || (S.prog[id] = { done: {}, last: '' });
const pctOf = c => { const l = lessonsOf(c), p = prog(c.id); return l.length ? Math.round(100 * l.filter(x => p.done[lk(x)]).length / l.length) : 0; };
const learnHref = (c, l) => `#/learn/${c.id}/${encodeURIComponent(lk(l))}`;
const contOf = c => { const l = lessonsOf(c), p = prog(c.id); return l.find(x => lk(x) === p.last && !p.done[lk(x)]) || l.find(x => !p.done[lk(x)]) || l[0]; };
const bar = n => el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': n, 'aria-label': 'Progress' }, el('i', { style: `width:${n}%` }));
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
function modulesOf(lessons, size = 10) {   // short courses stay in one module; long ones are grouped (editable later)
  if (lessons.length <= 12) return [{ id: uid(), title: 'Lessons', lessons }];
  return chunk(lessons, size).map((g, i) => ({ id: uid(), title: `Module ${i + 1}`, lessons: g }));
}
const mkCourse = (title, lessons, src, ref, note) => ({ id: uid(), title: (title || 'My course').slice(0, 120), modules: modulesOf(lessons), src, ref: ref || '', note: note || '', created: Date.now() });

async function courseFromPlaylist(input, title) {
  const { list } = parseYT(input);
  if (!list) throw new Error('Paste a YouTube playlist link (it contains list=…).');
  const d = await api('/api/playlist?list=' + encodeURIComponent(list));
  if (!d.items.length) throw new Error('No playable videos were found in that playlist.');
  const lessons = d.items.map(v => { ingest(v); return { v: v.id, t: v.title, s: 0, d: v.seconds }; });
  const note = (d.truncated ? 'Only the first 300 videos were imported. ' : '') + (d.items.length < d.total ? `${d.total - d.items.length} private or non-embeddable videos were skipped.` : '');
  return mkCourse(title || d.title, lessons, 'playlist', list, note.trim());
}
async function courseFromVideo(input, title) {
  const { video } = parseYT(input);
  if (!video) throw new Error('Paste a YouTube video link.');
  const d = await api('/api/video?v=' + video), v = d.video;
  if (!v.embeddable) throw new Error("The owner doesn't allow this video to play outside YouTube.");
  ingest(v);
  let lessons, note;
  if (d.chapters.length >= 3) {
    lessons = d.chapters.map((c, i) => { const e = i + 1 < d.chapters.length ? d.chapters[i + 1].s : v.seconds; return { v: v.id, t: c.t, s: c.s, e, d: e - c.s }; });
    note = 'Built from the chapters in the video description.';
  } else if (v.seconds > 1800) {
    lessons = Array.from({ length: Math.ceil(v.seconds / 1200) }, (_, i) => { const s = i * 1200, e = Math.min(s + 1200, v.seconds); return { v: v.id, t: `Part ${i + 1}`, s, e, d: e - s }; });
    note = 'This video has no chapters, so it was split into 20-minute parts. Rename them in Edit structure.';
  } else { lessons = [{ v: v.id, t: v.title, s: 0, d: v.seconds }]; note = 'This is a short video with no chapters, so the course has one lesson.'; }
  return mkCourse(title || v.title, lessons, 'video', video, note);
}
async function courseFromLinks(text, title) {
  const ids = [...new Set(text.split(/[\s,]+/).map(x => parseYT(x).video).filter(Boolean))].slice(0, 50);
  if (!ids.length) throw new Error('Paste at least one YouTube video link.');
  const d = await api('/api/videos?ids=' + ids.join(',')), by = new Map(d.items.map(v => [v.id, v]));
  const lessons = ids.map(id => by.get(id)).filter(Boolean).map(v => { ingest(v); return { v: v.id, t: v.title, s: 0, d: v.seconds }; });
  if (!lessons.length) throw new Error('None of those videos can be played here.');
  return mkCourse(title, lessons, 'links', '', lessons.length < ids.length ? `${ids.length - lessons.length} videos were skipped (private or not embeddable).` : '');
}
async function makeCourseHere(v) {
  try { const c = await courseFromVideo('https://www.youtube.com/watch?v=' + v.id, ''); S.courses.unshift(c); save(); location.hash = '#/course/' + c.id; }
  catch (e) { alert(e.message); }
}

/* ---------- Courses page ---------- */
PAGES.courses = (arg, q) => {
  main.append(el('div', { class: 'top' }, el('h2', null, 'Courses')));
  // open any video
  const oi = el('input', { type: 'text', placeholder: 'Paste any YouTube video link', 'aria-label': 'YouTube video link', style: 'flex:1;min-width:220px' });
  const go = () => { if (oi.value.trim()) openAny(oi.value.trim()); };
  oi.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  main.append(el('section', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, 'Open any YouTube video'),
    el('p', { class: 'mut' }, 'Watch it here with notes, likes and playlists, just like our own lessons. You can also paste a link in the search bar.'),
    el('div', { class: 'row' }, oi, el('button', { class: 'btn pri', type: 'button', onclick: go }, 'Open'))));
  // create a course
  let mode = 'playlist';
  const HINT = { playlist: 'Paste a playlist link. Every video becomes a lesson, grouped into modules you can edit.',
    video: 'Paste a long lecture. If its description has chapters (like 00:00 Intro), each chapter becomes a lesson. Otherwise it is split into 20-minute parts.',
    links: 'Paste one video link per line, in the order you want to study them.' };
  const inp = el('textarea', { rows: 1, 'aria-label': 'Link or links' }), ti = el('input', { type: 'text', placeholder: 'Course title (optional)', 'aria-label': 'Course title', maxlength: 120, style: 'width:100%' });
  const hint = el('p', { class: 'mut' }), st = el('p', { class: 'mut', role: 'status' }), chips = el('div', { class: 'chips' });
  const btn = el('button', { class: 'btn pri', type: 'button', onclick: build }, 'Create course');
  function setMode(m) {
    mode = m; hint.textContent = HINT[m]; inp.rows = m === 'links' ? 5 : 1; inp.placeholder = m === 'links' ? 'https://youtu.be/…\nhttps://youtu.be/…' : 'https://www.youtube.com/' + (m === 'playlist' ? 'playlist?list=…' : 'watch?v=…');
    chips.replaceChildren(...[['playlist', 'From a playlist'], ['video', 'From one video'], ['links', 'From several links']].map(([k, t]) =>
      el('button', { class: 'chip', type: 'button', 'aria-pressed': String(k === mode), onclick: () => setMode(k) }, t)));
  }
  async function build() {
    const text = inp.value.trim(); if (!text) return;
    btn.disabled = true; st.className = 'mut'; st.textContent = 'Building your course…';
    try {
      const t = ti.value.trim();
      const c = mode === 'playlist' ? await courseFromPlaylist(text, t) : mode === 'video' ? await courseFromVideo(text, t) : await courseFromLinks(text, t);
      S.courses.unshift(c); save(); location.hash = '#/course/' + c.id;
    } catch (e) { st.className = 'err'; st.textContent = e.message; btn.disabled = false; }
  }
  main.append(el('section', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, 'Create a course'), chips, hint, inp, ti, el('p'), el('div', { class: 'row' }, btn), st));
  setMode('playlist'); if (q.get('list')) inp.value = q.get('list');
  // my courses
  main.append(el('h3', null, 'My courses'));
  main.append(S.courses.length ? el('div', { class: 'tiles' }, S.courses.map(c => { const n = pctOf(c);
    return el('a', { class: 'tile', href: '#/course/' + c.id }, el('b', null, c.title), el('span', { class: 'mut' }, `${lessonsOf(c).length} lessons · ${n}% complete${S.certs[c.id] ? ' · Certified' : ''}`), bar(n)); }))
    : msg('No courses yet. Create one above and it will appear here.'));
  const certs = Object.entries(S.certs);
  if (certs.length) main.append(el('h3', null, 'My certificates'), el('div', { class: 'tiles' }, certs.map(([id, k]) => el('a', { class: 'tile', href: '#/certificate/' + id }, el('b', null, k.c), el('span', { class: 'mut' }, `${k.n} · ${fmtDate(k.d)}`)))));
  // featured (curated in courses.json)
  const feat = el('div'); main.append(feat);
  api('/api/courses').then(list => {
    if (!list.length) return;
    feat.replaceChildren(el('h3', null, 'Featured courses'), el('div', { class: 'tiles' }, list.map(f => el('div', { class: 'tile' },
      el('b', null, f.title), el('span', { class: 'mut' }, [f.category, f.description].filter(Boolean).join(' · ')),
      el('div', { class: 'row', style: 'margin-top:10px' }, el('button', { class: 'btn pri', type: 'button', onclick: async e => {
        const have = S.courses.find(c => c.ref === f.playlist); if (have) { location.hash = '#/course/' + have.id; return; }
        e.target.disabled = true; e.target.textContent = 'Building…';
        try { const c = await courseFromPlaylist('https://www.youtube.com/playlist?list=' + f.playlist, f.title); S.courses.unshift(c); save(); location.hash = '#/course/' + c.id; }
        catch (x) { alert(x.message); e.target.disabled = false; e.target.textContent = 'Start course'; } } }, 'Start course'))))));
  }).catch(() => {});
};

/* ---------- one course: curriculum, progress, editing ---------- */
PAGES.course = id => {
  const c = S.courses.find(x => x.id === id);
  if (!c) { main.append(msg('Course not found.'), el('a', { class: 'btn', href: '#/courses' }, 'All courses')); return; }
  let edit = false; const head = el('div'), box = el('div'); main.append(head, box);
  const noteKeys = () => lessonsOf(c).map(l => `c:${id}:${lk(l)}`).filter(k => S.notes[k]);
  const outline = () => download(slug(c.title) + '-outline.md', `# ${c.title}\n\n` + c.modules.map((m, i) => `## ${i + 1}. ${m.title}\n\n` + m.lessons.map((l, j) => `${j + 1}. ${l.t}${l.d ? ' (' + fmtDur(l.d) + ')' : ''}`).join('\n')).join('\n\n') + '\n', 'text/markdown;charset=utf-8');
  const del = () => { if (confirm(`Delete the course “${c.title}”? Your notes stay in Notes.`)) { S.courses = S.courses.filter(x => x !== c); delete S.prog[id]; save(); location.hash = '#/courses'; } };
  function drawHead() {
    const ls = lessonsOf(c), p = prog(id), done = ls.filter(x => p.done[lk(x)]).length, n = pctOf(c), cl = contOf(c);
    head.replaceChildren(el('div', { class: 'top' }, el('h2', null, c.title), el('div', { class: 'row' },
      n === 100 ? el('a', { class: 'btn pri', href: '#/certificate/' + id }, S.certs[id] ? 'View certificate' : 'Get your certificate') : null,
      cl ? el('a', { class: n === 100 ? 'btn' : 'btn pri', href: learnHref(c, cl) }, n === 100 ? 'Review lessons' : done ? 'Continue' : 'Start course') : null,
      el('button', { class: 'btn', type: 'button', onclick: () => { edit = !edit; draw(); } }, edit ? 'Done editing' : 'Edit structure'),
      el('button', { class: 'btn', type: 'button', onclick: outline }, 'Outline (.md)'),
      el('button', { class: 'btn', type: 'button', onclick: () => exportNotes(noteKeys(), 'md') }, 'My notes (.md)'),
      el('button', { class: 'btn', type: 'button', onclick: () => exportNotes(noteKeys(), 'pdf') }, 'Notes PDF'),
      el('button', { class: 'btn', type: 'button', onclick: del }, 'Delete'))),
      bar(n), el('p', { class: 'mut' }, `${done} of ${ls.length} lessons complete · ${n}%` + (S.certs[id] ? ' · Course completed and certified' : n === 100 ? ' · Course complete! Get your certificate' : ' · Finish all lessons to get your certificate')), ...(c.note ? [el('p', { class: 'mut' }, c.note)] : []));
  }
  const swap = (a, i, d) => { const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(); draw(); };
  const ib = (t, label, f) => el('button', { class: 'btn', type: 'button', 'aria-label': label, onclick: f }, t);
  function draw() {
    drawHead(); box.replaceChildren(); const p = prog(id);
    c.modules.forEach((m, mi) => {
      const d = m.lessons.filter(x => p.done[lk(x)]).length;
      box.append(edit
        ? el('div', { class: 'lesson' }, el('input', { type: 'text', value: m.title, 'aria-label': 'Module title', onchange: e => { m.title = e.target.value.trim() || 'Module'; save(); } }),
            ib('↑', 'Move module up', () => swap(c.modules, mi, -1)), ib('↓', 'Move module down', () => swap(c.modules, mi, 1)),
            ib('Delete', 'Delete module', () => { if (c.modules.length < 2) return alert('A course needs at least one module.'); const to = c.modules[mi ? mi - 1 : 1]; to.lessons.push(...m.lessons); c.modules.splice(mi, 1); save(); draw(); }))
        : el('h3', null, `${mi + 1}. ${m.title}`, el('span', { class: 'mut', style: 'font-weight:400' }, `  ${d}/${m.lessons.length}`)));
      m.lessons.forEach((l, li) => {
        const k = lk(l), on = !!p.done[k];
        if (edit) {
          const sel = el('select', { 'aria-label': 'Move lesson to module', onchange: e => { const to = c.modules[+e.target.value]; m.lessons.splice(li, 1); to.lessons.push(l); save(); draw(); } },
            c.modules.map((x, i) => el('option', { value: i, selected: i === mi ? '' : null }, x.title)));
          box.append(el('div', { class: 'lesson' }, el('input', { type: 'text', value: l.t, 'aria-label': 'Lesson title', onchange: e => { l.t = e.target.value.trim() || 'Lesson'; save(); } }), sel,
            ib('↑', 'Move lesson up', () => swap(m.lessons, li, -1)), ib('↓', 'Move lesson down', () => swap(m.lessons, li, 1)),
            ib('✕', 'Remove lesson', () => { m.lessons.splice(li, 1); delete p.done[k]; save(); draw(); })));
        } else {
          const cb = el('input', { type: 'checkbox', 'aria-label': 'Mark complete: ' + l.t }); cb.checked = on;
          cb.onchange = () => { if (cb.checked) p.done[k] = 1; else delete p.done[k]; save(); draw(); };
          box.append(el('div', { class: 'lesson' + (on ? ' done' : '') }, cb, el('a', { href: learnHref(c, l) }, l.t),
            S.notes[`c:${id}:${k}`] ? el('span', { class: 'mut', title: 'Has notes' }, '✎') : null, el('span', { class: 'mut' }, l.d ? fmtDur(l.d) : '')));
        }
      });
    });
    if (edit) {
      const n = el('input', { type: 'number', min: 2, max: 50, value: 10, 'aria-label': 'Lessons per module', style: 'width:70px' });
      box.append(el('div', { class: 'row', style: 'margin-top:16px' },
        el('button', { class: 'btn', type: 'button', onclick: () => { c.modules.push({ id: uid(), title: 'New module', lessons: [] }); save(); draw(); } }, 'Add module'),
        el('span', { class: 'mut' }, 'or group every'), n, el('span', { class: 'mut' }, 'lessons into a module'),
        el('button', { class: 'btn', type: 'button', onclick: () => { c.modules = chunk(lessonsOf(c), Math.max(2, +n.value || 10)).map((g, i) => ({ id: uid(), title: `Module ${i + 1}`, lessons: g })); save(); draw(); } }, 'Group')));
    }
  }
  draw();
};

/* ---------- lesson player: video + notes + outline, auto-completes and moves on ---------- */
PAGES.learn = arg => {
  const cut = arg.indexOf('/'), cid = arg.slice(0, cut), key = arg.slice(cut + 1);
  const c = S.courses.find(x => x.id === cid);
  if (!c) { main.append(msg('Course not found.'), el('a', { class: 'btn', href: '#/courses' }, 'All courses')); return; }
  const ls = lessonsOf(c);
  if (!ls.length) { main.append(msg('This course has no lessons yet.'), el('a', { class: 'btn', href: '#/course/' + cid }, 'Edit course')); return; }
  const i = Math.max(0, ls.findIndex(x => lk(x) === key)), l = ls[i], k = lk(l), p = prog(cid), m = c.modules.find(x => x.lessons.includes(l));
  const v = getV(l.v) || { id: l.v, title: l.t, channel: '', category: 'Course', seconds: l.d || 0, views: 0, publishedAt: new Date().toISOString(), ext: true };
  remember(v); p.last = k; S.hist = [l.v, ...S.hist.filter(x => x !== l.v)].slice(0, 200); bump(v, 1); save();
  const box = el('div'), err = el('p', { class: 'err', role: 'alert' }), side = el('aside');
  const doneB = el('button', { class: 'btn', type: 'button' }), likeB = el('button', { class: 'btn', type: 'button' }), laterB = el('button', { class: 'btn', type: 'button' });
  const goNext = () => { if (i + 1 < ls.length) location.hash = learnHref(c, ls[i + 1]); else if (pctOf(c) === 100) location.hash = '#/certificate/' + cid; };
  const outline = () => side.replaceChildren(el('h3', null, c.title), bar(pctOf(c)), el('p', { class: 'mut' }, pctOf(c) + '% complete'),
    ...c.modules.map(mm => el('div', null, el('b', { style: 'display:block;margin:10px 0 4px' }, mm.title),
      ...mm.lessons.map(x => el('a', { class: 'lesson' + (x === l ? ' cur' : '') + (p.done[lk(x)] ? ' done' : ''), href: learnHref(c, x), 'aria-current': x === l ? 'true' : null },
        el('span', null, p.done[lk(x)] ? '✓' : '○'), el('span', null, x.t))))));
  const sync = () => {
    const on = !!p.done[k], lk2 = S.liked.includes(v.id), w = S.later.includes(v.id);
    doneB.replaceChildren(on ? '✓ Completed' : 'Mark complete'); doneB.classList.toggle('on', on);
    likeB.replaceChildren(ico('thumb'), lk2 ? 'Liked' : 'Like'); likeB.classList.toggle('on', lk2);
    laterB.replaceChildren(ico('clock'), w ? 'Saved' : 'Watch later'); laterB.classList.toggle('on', w);
  };
  const setDone = on => { if (on) { if (!p.done[k]) { p.done[k] = 1; bump(v, 1); } } else delete p.done[k]; save(); sync(); outline(); };
  doneB.onclick = () => setDone(!p.done[k]);
  likeB.onclick = () => { toggle('liked', v, 3); sync(); }; laterB.onclick = () => { toggle('later', v, 2); sync(); };
  sync(); outline();
  let fin = false;
  const blocked = () => {
    err.replaceChildren("The owner doesn't allow this video to play here. ", el('a', { href: 'https://www.youtube.com/watch?v=' + l.v, target: '_blank', rel: 'noopener', style: 'text-decoration:underline' }, 'Watch on YouTube'));
    setTimeout(() => { if (!fin) { fin = true; goNext(); } }, 3000);
  };
  loadYT().then(() => {
    if (!box.isConnected) return;
    YTP = new YT.Player(box, { videoId: l.v, host: 'https://www.youtube-nocookie.com', playerVars: { autoplay: 1, rel: 0, playsinline: 1, fs: 0, start: l.s || 0 },
      events: { onStateChange: e => { if (e.data === 0 && !fin) { fin = true; setDone(true); goNext(); } }, onError: blocked } });
    TICK = setInterval(() => {
      try {
        const t = YTP.getCurrentTime(), dur = YTP.getDuration();
        if (l.e && t >= l.e - 0.5 && !fin) { fin = true; setDone(true); goNext(); }       // end of a chapter
        else if (!l.e && dur > 0 && t >= dur * 0.92) setDone(true);                      // watched 92% of a whole video
      } catch (e) {}
    }, 1000);
  }).catch(() => box.replaceWith(el('iframe', { src: `https://www.youtube-nocookie.com/embed/${l.v}?autoplay=1&rel=0&fs=0&start=${l.s || 0}`, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', title: l.t })));
  const time = () => { try { return Math.floor(YTP.getCurrentTime()); } catch (e) { return 0; } };
  const seek = t => { try { YTP.seekTo(t, true); YTP.playVideo(); } catch (e) {} };
  const acts = el('div', { class: 'acts' }, doneB,
    i > 0 ? el('a', { class: 'btn', href: learnHref(c, ls[i - 1]) }, '← Previous') : null, i + 1 < ls.length ? el('a', { class: 'btn pri', href: learnHref(c, ls[i + 1]) }, 'Next lesson →') : null,
    likeB, laterB, el('button', { class: 'btn', type: 'button', onclick: () => playlistDlg(v) }, ico('list'), 'Add to playlist'),
    el('a', { class: 'btn', href: `https://www.youtube.com/watch?v=${l.v}${l.s ? '&t=' + l.s + 's' : ''}`, target: '_blank', rel: 'noopener' }, 'Open on YouTube'));
  const vcol = el('div', { class: 'vcol' }, el('div', { class: 'frame' }, box), err, el('h1', { class: 'vt' }, l.t),
    el('div', { class: 'mut' }, el('a', { class: 'cl', href: '#/course/' + cid }, c.title), ` · ${m ? m.title : ''} · Lesson ${i + 1} of ${ls.length}`), acts);
  const notes = el('section', { class: 'notes', 'aria-label': 'My notes for this lesson' }, el('h2', { style: 'font-size:17px;margin-bottom:8px' }, 'My notes'),
    noteBox(`c:${cid}:${k}`, { title: `${c.title}: ${l.t}`, sub: `Course: ${c.title}${m ? ' · ' + m.title : ''} · https://www.youtube.com/watch?v=${l.v}${l.s ? '&t=' + l.s + 's' : ''}` }, { time, seek }));
  const lay = layoutBox(vcol, notes), wrap = el('div', { class: 'watch' }, el('div', null, lay.box), side);
  acts.append(...layoutButtons(wrap, lay.enter));
  main.append(wrap);
};
