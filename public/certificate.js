'use strict';
/* ====== Course completion certificate: finish every lesson, confirm your name, download ====== */
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
  const F = `font-family="Georgia, 'Times New Roman', 'Noto Serif', serif"`, lines = wrapText(c.c, 38);
  const ns = c.n.length > 48 ? 26 : c.n.length > 38 ? 32 : c.n.length > 30 ? 40 : c.n.length > 22 ? 48 : 58;
  const fs = lines.length > 2 ? 30 : 38, lh = lines.length > 2 ? 38 : 48, sy = 520 + (lines.length - 1) * lh + 44;
  const t = (y, size, txt, extra = '') => `<text x="550" y="${y}" text-anchor="middle" ${F} font-size="${size}" ${extra}>${esc(txt)}</text>`;
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
${t(sy, 24, c.k ? `by completing all ${c.k} lessons` : 'by completing all lessons', 'fill="#555"')}
<line x1="130" y1="668" x2="380" y2="668" stroke="#1b1f3b" stroke-width="1.5"/>
<text x="255" y="696" text-anchor="middle" ${F} font-size="20" fill="#1b1f3b">${esc(fmtDate(c.d))}</text>
<line x1="720" y1="668" x2="970" y2="668" stroke="#1b1f3b" stroke-width="1.5"/>
<text x="845" y="696" text-anchor="middle" ${F} font-size="20" fill="#1b1f3b">Toppertube</text>
${t(726, 14, `Certificate ID ${c.i}`, 'fill="#777"')}
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
const newCertId = () => [...crypto.getRandomValues(new Uint8Array(5))].map(b => b.toString(16).padStart(2, '0')).join('');
const todayISO = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

PAGES.certificate = id => {
  const course = S.courses.find(x => x.id === id), c = S.certs[id];
  if (!c) {
    if (!course) { main.append(msg('Course not found.'), el('a', { class: 'btn', href: '#/courses' }, 'All courses')); return; }
    if (pctOf(course) < 100) { main.append(el('h2', null, course.title), msg('Finish all lessons to get your certificate.'), el('a', { class: 'btn pri', href: '#/course/' + id }, 'Back to course')); return; }
    const nameI = el('input', { type: 'text', maxlength: 60, value: S.name || '', placeholder: 'Your full name', 'aria-label': 'Your full name', style: 'width:100%' });
    const courseI = el('input', { type: 'text', maxlength: 120, value: course.title, 'aria-label': 'Course name', style: 'width:100%' });
    const st = el('p', { class: 'err', role: 'alert' });
    const make = () => {
      const n = nameI.value.trim().replace(/\s+/g, ' '), t = courseI.value.trim().replace(/\s+/g, ' ');
      if (n.length < 2) { st.textContent = 'Please enter your full name.'; nameI.focus(); return; }
      if (!t) { st.textContent = 'Please enter the course name.'; courseI.focus(); return; }
      S.name = n; S.certs[id] = { n, c: t, k: lessonsOf(course).length, d: todayISO(), i: newCertId() }; save(); route();
    };
    main.append(el('div', { class: 'top' }, el('h2', null, 'Congratulations, you completed the course!')),
      el('section', { class: 'panel' }, el('p', null, 'Enter your name and confirm the course name. They will be printed on your certificate. You can open it again any time from Courses → My certificates.'),
        el('label', { class: 'mut' }, 'Your name', nameI), el('p'), el('label', { class: 'mut' }, 'Course name', courseI), el('p'),
        el('div', { class: 'row' }, el('button', { class: 'btn pri', type: 'button', onclick: make }, 'Create my certificate')), st));
    return;
  }
  main.append(el('div', { class: 'top' }, el('h2', null, 'Your certificate'), el('div', { class: 'row' },
    el('button', { class: 'btn pri', type: 'button', onclick: () => printCert(c) }, 'Download PDF'),
    el('button', { class: 'btn', type: 'button', onclick: () => certPNG(c) }, 'Download image (PNG)'),
    el('button', { class: 'btn', type: 'button', onclick: () => { delete S.certs[id]; save(); route(); } }, 'Change name or course name'),
    course ? el('a', { class: 'btn', href: '#/course/' + id }, 'Back to course') : el('a', { class: 'btn', href: '#/courses' }, 'All courses'))),
    el('div', { class: 'certbox', html: certSVG(c) }),
    el('p', { class: 'mut' }, 'For PDF, choose “Save as PDF” in the print window.'));
};
