'use strict';
/* ====== Final assessment (80% to pass) and certificate ====== */
async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
const verifyUrl = c => location.origin + '/#/verify/' + c.code;
const fmtDate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
function wrapText(t, max) {
  const out = []; let line = '';
  for (const w of String(t).split(' ')) { if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) out.push(line);
  if (out.length > 3) { out.length = 3; out[2] = out[2].slice(0, max - 3) + '…'; }
  return out;
}
// One SVG is the single source for the on-screen certificate, the PDF and the PNG.
function certSVG(c) {
  const F = `font-family="Georgia, 'Times New Roman', 'Noto Serif', serif"`, lines = wrapText(c.c, 38), ns = c.n.length > 48 ? 26 : c.n.length > 38 ? 32 : c.n.length > 30 ? 40 : c.n.length > 22 ? 48 : 58;
  const fs = lines.length > 2 ? 30 : 38, lh = lines.length > 2 ? 38 : 48;
  const t = (y, size, txt, extra = '') => `<text x="550" y="${y}" text-anchor="middle" ${F} font-size="${size}" ${extra}>${esc(txt)}</text>`;
  const sy = 520 + (lines.length - 1) * lh + 44;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 780" width="1100" height="780" role="img" aria-label="Certificate of completion for ${esc(c.n)}">
<rect width="1100" height="780" fill="#fffdf7"/>
<rect x="24" y="24" width="1052" height="732" fill="none" stroke="#d62839" stroke-width="6"/>
<rect x="42" y="42" width="1016" height="696" fill="none" stroke="#1b1f3b" stroke-width="2"/>
${t(120, 30, 'TOPPERTUBE', 'fill="#d62839" letter-spacing="9" font-weight="bold"')}
${t(205, 60, 'Certificate of Completion', 'fill="#1b1f3b"')}
<line x1="380" y1="235" x2="720" y2="235" stroke="#d62839" stroke-width="3"/>
${t(300, 24, 'This is to certify that', 'fill="#555" font-style="italic"')}
${t(385, ns, c.n, 'fill="#1b1f3b" font-weight="bold"')}
<line x1="220" y1="410" x2="880" y2="410" stroke="#bbb" stroke-width="2"/>
${t(462, 24, 'has successfully completed the course', 'fill="#555" font-style="italic"')}
${lines.map((l, i) => t(520 + i * lh, fs, l, 'fill="#d62839" font-weight="bold"')).join('\n')}
${t(sy, 24, `with a score of ${c.s}% in the final assessment`, 'fill="#555"')}
<line x1="130" y1="668" x2="380" y2="668" stroke="#1b1f3b" stroke-width="1.5"/>
<text x="255" y="696" text-anchor="middle" ${F} font-size="20" fill="#1b1f3b">${esc(fmtDate(c.d))}</text>
<line x1="720" y1="668" x2="970" y2="668" stroke="#1b1f3b" stroke-width="1.5"/>
<text x="845" y="696" text-anchor="middle" ${F} font-size="20" fill="#1b1f3b">ToppperTube</text>
${t(726, 14, `Certificate ID ${c.i} · Verify: ${location.host}/#/verify`, 'fill="#777"')}
</svg>`;
}
function printCert(c) {
  const f = el('iframe', { style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0', title: 'print' });
  document.body.append(f);
  const d = f.contentDocument; d.open();
  d.write(`<!doctype html><meta charset="utf-8"><title>Certificate - ${esc(c.n)}</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}svg{width:100%;height:100%;display:block}</style>` + certSVG(c));
  d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 300);
}
function certPNG(c) {
  const url = URL.createObjectURL(new Blob([certSVG(c)], { type: 'image/svg+xml;charset=utf-8' })), img = new Image();
  img.onload = () => {
    const cv = el('canvas', { width: 2200, height: 1560 }); cv.getContext('2d').drawImage(img, 0, 0, 2200, 1560); URL.revokeObjectURL(url);
    cv.toBlob(b => { const a = el('a', { href: URL.createObjectURL(b), download: slug(c.c) + '-certificate.png' }); document.body.append(a); a.click(); setTimeout(() => a.remove(), 500); });
  };
  img.onerror = () => alert('Could not create the image. Use the PDF button instead.');
  img.src = url;
}

PAGES.certificate = id => {
  const c = S.certs[id];
  if (!c) { main.append(msg('No certificate for this course yet.'), el('a', { class: 'btn', href: '#/course/' + id }, 'Back to course')); return; }
  const copy = el('button', { class: 'btn', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(verifyUrl(c)); copy.textContent = 'Link copied'; } catch (e) { prompt('Copy this link', verifyUrl(c)); } } }, 'Copy verification link');
  main.append(el('div', { class: 'top' }, el('h2', null, 'Your certificate'), el('div', { class: 'row' },
    el('button', { class: 'btn pri', type: 'button', onclick: () => printCert(c) }, 'Download PDF'), el('button', { class: 'btn', type: 'button', onclick: () => certPNG(c) }, 'Download image (PNG)'), copy,
    S.courses.some(x => x.id === id) ? el('a', { class: 'btn', href: '#/course/' + id }, 'Back to course') : el('a', { class: 'btn', href: '#/courses' }, 'All courses'))),
    el('div', { class: 'certbox', html: certSVG(c) }),
    el('p', { class: 'mut' }, 'For PDF, choose “Save as PDF” in the print window. Anyone can check this certificate with the verification link.'));
};
PAGES.verify = code => {
  const box = el('div', null, msg('Checking certificate…')); main.append(el('div', { class: 'top' }, el('h2', null, 'Certificate check')), box);
  fetch('/api/verify?code=' + encodeURIComponent(code)).then(r => r.json()).then(d => {
    if (!d.valid) { box.replaceChildren(el('p', { class: 'err' }, 'This certificate code is not valid. It may have been changed or copied incorrectly.')); return; }
    box.replaceChildren(el('p', null, el('b', null, '✓ Valid certificate'), ` issued by ToppperTube. ${d.n} completed “${d.c}” with ${d.s}% on ${fmtDate(d.d)} (ID ${d.i}).`), el('div', { class: 'certbox', html: certSVG(d) }));
  }).catch(() => box.replaceChildren(el('p', { class: 'err' }, 'Could not check the certificate right now.')));
};

/* ---------- the assessment ---------- */
PAGES.quiz = cid => {
  const c = S.courses.find(x => x.id === cid);
  if (!c) { main.append(msg('Course not found.'), el('a', { class: 'btn', href: '#/courses' }, 'All courses')); return; }
  if (pctOf(c) < 100) { main.append(el('h2', null, c.title), msg('Finish all lessons to unlock the final assessment.'), el('a', { class: 'btn pri', href: '#/course/' + cid }, 'Back to course')); return; }
  if (S.certs[cid]) { main.append(el('h2', null, c.title), msg('You have already passed this course.'), el('a', { class: 'btn pri', href: '#/certificate/' + cid }, 'View certificate')); return; }
  const box = el('div'); main.append(el('div', { class: 'top' }, el('h2', null, 'Final assessment')), box);
  const nameI = el('input', { type: 'text', maxlength: 60, value: S.name || '', placeholder: 'Your full name', 'aria-label': 'Your full name', style: 'width:100%' });
  const courseI = el('input', { type: 'text', maxlength: 120, value: c.title, 'aria-label': 'Course name', style: 'width:100%' });
  const st = el('p', { class: 'mut', role: 'status' }), go = el('button', { class: 'btn pri', type: 'button' }, 'Start assessment');
  box.append(el('section', { class: 'panel' },
    el('p', null, 'You have finished every lesson. Answer 10 questions based on the course videos. Score 80% or more to earn your certificate.'),
    el('label', { class: 'mut' }, 'Your name (shown on the certificate)', nameI), el('p'), el('label', { class: 'mut' }, 'Course name', courseI), el('p'), el('div', { class: 'row' }, go), st));
  go.onclick = async () => {
    const name = nameI.value.trim(), title = courseI.value.trim();
    if (name.length < 2) { st.className = 'err'; st.textContent = 'Please enter your full name.'; nameI.focus(); return; }
    if (!title) { st.className = 'err'; st.textContent = 'Please enter the course name.'; return; }
    S.name = name; save(); go.disabled = true; st.className = 'mut'; st.textContent = 'Preparing your questions… this can take up to 30 seconds.';
    try {
      const d = await post('/api/quiz', { title, ref: c.src === 'playlist' ? c.ref : '', modules: c.modules.map(m => ({ title: m.title, lessons: m.lessons.map(l => ({ t: l.t, v: l.v })) })) });
      showQuestions(d, name);
    } catch (e) { st.className = 'err'; st.textContent = e.message; go.disabled = false; }
  };
  function showQuestions(d, name) {
    const form = el('form', { novalidate: '' }), msgEl = el('p', { class: 'mut', role: 'status' }), btn = el('button', { class: 'btn pri', type: 'submit' }, 'Submit answers');
    d.questions.forEach((q, i) => form.append(el('fieldset', { class: 'qf', id: 'q' + i }, el('legend', null, `${i + 1}. ${q.q}`),
      ...q.options.map((o, j) => el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'q' + i, value: j }), o)))));
    form.append(el('div', { class: 'row' }, btn), msgEl);
    form.onsubmit = async e => {
      e.preventDefault();
      const answers = d.questions.map((_, i) => { const r = form.querySelector(`input[name=q${i}]:checked`); return r ? +r.value : -1; });
      const miss = answers.indexOf(-1);
      if (miss >= 0) { msgEl.className = 'err'; msgEl.textContent = `Please answer question ${miss + 1}.`; form.querySelector('#q' + miss).scrollIntoView({ block: 'center' }); return; }
      btn.disabled = true; msgEl.className = 'mut'; msgEl.textContent = 'Grading…';
      try { showResult(await post('/api/grade', { token: d.token, answers, name }), d, form); }
      catch (x) { msgEl.className = 'err'; msgEl.textContent = x.message; btn.disabled = false; }
    };
    box.replaceChildren(el('p', { class: 'mut' }, 'Choose one answer for each question. You need 80% to pass.'), form);
  }
  function showResult(r, d, form) {
    if (r.passed) {
      S.certs[cid] = r.cert; save();
      box.replaceChildren(el('section', { class: 'panel' }, el('h2', null, `You passed with ${r.score}%!`), el('p', null, `${r.correct} of ${r.total} correct. Your certificate is ready.`),
        el('a', { class: 'btn pri', href: '#/certificate/' + cid }, 'View and download certificate')));
      return;
    }
    d.questions.forEach((_, i) => { const f = form.querySelector('#q' + i); if (r.wrong.includes(i + 1)) f.classList.add('wrong'); f.disabled = true; });
    form.querySelector('.row').remove(); form.querySelector('p').remove();
    box.replaceChildren(el('section', { class: 'panel' }, el('h2', null, `Your score: ${r.score}%`),
      el('p', null, `${r.correct} of ${r.total} correct. You need 80% to pass. Review the lessons for the questions marked in red (${r.wrong.join(', ')}), then try again with a new set of questions.`),
      el('div', { class: 'row' }, el('button', { class: 'btn pri', type: 'button', onclick: () => route() }, 'Try again'), el('a', { class: 'btn', href: '#/course/' + cid }, 'Back to course'))), form);
  }
};
