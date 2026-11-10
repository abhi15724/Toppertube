// Runs at deploy time (see "buildCommand" in vercel.json) and can be run by hand: node scripts/build-seo.js
// The app itself lives behind #/hash routes, which search engines cannot index one by one. This script writes real, crawlable pages
// from channels.json (no API key needed), so Google, Bing and AI answer engines have something to read and link to:
//   public/categories.html            /categories          every category
//   public/category/<slug>.html       /category/<slug>     one page per category, listing its channels
//   public/about.html                 /about               what Toppertube is, how it works, FAQ (with FAQPage markup)
//   public/sitemap.xml (index), sitemap-pages.xml, sitemap-videos-N.xml (one URL per lesson, /watch/<id>), public/llms.txt
//   and the crawlable intro block inside public/index.html (between the seo:start / seo:end markers)
// It never fails the deploy.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), pub = path.join(root, 'public');
const SITE = process.env.SITE_URL || 'https://www.toppertube.online';
const NAME = 'Toppertube';
const TODAY = new Date().toISOString().slice(0, 10);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// What each category is about, in plain words (no claims about individual channels).
const BLURB = {
  'Science & Maths': 'Physics, chemistry, mathematics and general science explained clearly, from school basics to university-level ideas.',
  'School (India)': 'Class-wise lessons for Indian school students, covering the NCERT-style syllabus in English and Hindi.',
  'Exam Prep': 'Preparation videos for competitive exams such as UPSC, SSC, banking, GATE, JEE and NEET, plus English and aptitude practice.',
  'Programming & Tech': 'Learn programming, web development, data structures, AI, cloud and cybersecurity from free tutorials and university lectures.',
  'History & GK': 'History, geography, current affairs and general knowledge, from world history documentaries to quick explainers.',
  'Business & Finance': 'Business, economics, startups and money, taught through case studies, lectures and plain-language explainers.',
  'Creative & Design': 'Filmmaking, video editing, 3D, graphic design and photography tutorials for people who want to make things.',
  'English & Languages': 'Spoken English, grammar, pronunciation and other languages, taught by experienced language teachers.',
  'Health & Psychology': 'Medicine, anatomy, physiology and psychology lessons for students, plus health science explained simply.',
  'Biology': 'Cells, genetics, ecology, evolution and human biology, made for school and early university students.',
  'Engineering': 'Mechanical, civil, electrical and computer engineering, from first-year lectures to how real structures and machines work.',
  'Pharmacy': 'Pharmacology, pharmaceutics and pharmacy exam preparation for D.Pharm, B.Pharm and GPAT students.',
  'Commerce & Accounts': 'Accounting, bookkeeping and commerce basics for school and college students.',
  'Podcasts': 'Long-form interviews and conversations about business, careers and ideas. Some episodes can contain mature language.',
  'Electronics & Hardware': 'Electronics, circuits, microcontrollers and computer hardware, from first principles to hands-on builds.',
  'Stock Market & Investing': 'Investing, trading, personal finance and how markets work, explained for beginners and experienced learners.',
  'Communication & Soft Skills': 'Public speaking, communication, confidence and personal development talks and lessons.',
  'Politics & Geography': 'How countries, governments and borders work, explained through maps, history and current events.',
  'Law': 'Legal news, case explanations and law-school lectures.',
  'Music & Arts': 'Music theory, instruments, drawing and painting lessons for beginners and improvers.'
};

const FAQ = [
  ['What is Toppertube?', 'Toppertube is a free learning website that gathers educational videos from trusted YouTube channels in one place. You can browse by subject, build your own courses, take notes while you watch, track progress and earn a certificate when you finish a course.'],
  ['Is Toppertube free?', 'Yes. Watching, making courses, taking notes and getting certificates are free, and you do not need an account.'],
  ['Do I need to sign up or log in?', 'No. Your likes, history, playlists, notes, courses and progress are saved in your own browser on your own device. Nothing is sent to a server. Use Settings, then Download backup, to move your data to another device.'],
  ['How do I get a certificate?', 'Create a course from a YouTube playlist, a long video with chapters, or your own list of lessons, then complete every lesson. A link to your certificate appears after the last lesson. Each certificate has a code that anyone can check on the Toppertube verify page.'],
  ['Where do the videos come from?', 'Every video is hosted by YouTube and belongs to its creator. Toppertube links to and plays them through YouTube\'s own player and does not copy or re-upload them.'],
  ['Can I download my notes?', 'Yes. Notes can be downloaded as text, Markdown or PDF, and you can upload a saved file later to carry on writing where you stopped.']
];

try {
  const channels = JSON.parse(fs.readFileSync(path.join(root, 'channels.json'), 'utf8'));
  const cats = new Map();
  for (const c of channels) { if (!cats.has(c.category)) cats.set(c.category, []); cats.get(c.category).push(c.name); }
  const nCh = channels.length, nCat = cats.size;
  const nRound = Math.floor(nCh / 25) * 25;   // "275+" style, so the number stays true as channels come and go

  // lesson facts written by build-feed.js (missing on a deploy without a YouTube key: the video pages are then simply left out)
  let vids = [], vidsUpdated = TODAY;
  try { const j = JSON.parse(fs.readFileSync(path.join(root, 'lib', 'videos.index.json'), 'utf8')); vids = j.v; vidsUpdated = String(j.updatedAt || TODAY).slice(0, 10); } catch (e) {}
  const byCat = new Map(); for (const r of vids) { if (!byCat.has(r[3])) byCat.set(r[3], []); byCat.get(r[3]).push(r); }
  const catUrl = c => `/category/${slug(c)}`;
  const css = `*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,"Segoe UI",Roboto,sans-serif;background:#fdfdfb;color:#0f0f0f}
a{color:#b3162a}header,footer{padding:14px 20px;display:flex;gap:18px;flex-wrap:wrap;align-items:center}header{border-bottom:1px solid #dcdcd6}
header .logo{font-weight:800;font-size:20px;color:inherit;text-decoration:none}header .logo b{color:#d62839}header nav{display:flex;gap:16px;flex-wrap:wrap}
main{max-width:860px;margin:0 auto;padding:24px 20px 48px}h1{font-size:30px;line-height:1.2;margin:.2em 0 .4em}h2{font-size:21px;margin:1.6em 0 .4em}
.cta{display:inline-block;background:#d62839;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600}
ul.cols{columns:2;column-gap:28px;padding-left:20px}ul.cols li{break-inside:avoid;margin:3px 0}.mut{color:#606060}footer{border-top:1px solid #dcdcd6;color:#606060;font-size:14px}
@media(max-width:560px){ul.cols{columns:1}h1{font-size:25px}}
@media(prefers-color-scheme:dark){body{background:#0f1115;color:#f1f1f1}a{color:#ff7a88}header,footer{border-color:#2c313b}.mut,footer{color:#a8abb3}}`;

  function page({ p, title, desc, h1, body, extraLd = [], crumbs = [] }) {
    const url = SITE + p, bc = [['Home', '/'], ...crumbs, [h1, p]];
    const graph = [{
      '@type': 'BreadcrumbList', itemListElement: bc.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[0], item: SITE + b[1] }))
    }, ...extraLd];
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="website"><meta property="og:site_name" content="${NAME}"><meta property="og:locale" content="en">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}/og-image.png">
<meta name="theme-color" content="#d62839">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"><link rel="apple-touch-icon" href="/favicon.png"><link rel="manifest" href="/manifest.webmanifest">
<style>${css}</style>
${ld({ '@context': 'https://schema.org', '@graph': graph })}
</head>
<body>
<header><a class="logo" href="/">Topper<b>Tube</b></a><nav aria-label="Main"><a href="/categories">Categories</a><a href="/about">About</a><a href="/courses">Courses</a></nav></header>
<main>
${body}
</main>
<footer><span>${NAME}: free learning videos, courses, notes and certificates.</span><a href="/about">About</a><a href="/categories">All categories</a><span>Videos belong to their creators and play from YouTube.</span></footer>
</body>
</html>
`;
  }
  const write = (rel, text) => { const f = path.join(pub, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  const urls = [['/', '1.0'], ['/categories', '0.8'], ['/about', '0.5']];

  // Category pages
  for (const [cat, names] of cats) {
    const blurb = BLURB[cat] || `Free ${cat} videos from trusted educational channels.`;
    const body = `<h1>${esc(cat)}: free learning videos</h1>
<p>${esc(blurb)} ${NAME} brings together ${names.length} YouTube channel${names.length === 1 ? '' : 's'} in this category, so you can learn, take notes and build a course without leaving one place.</p>
<p><a class="cta" href="/cat/${encodeURIComponent(cat)}">Watch ${esc(cat)} lessons</a></p>
<h2>Channels in ${esc(cat)}</h2>
<ul class="cols">${names.map(n => `<li><a href="/channel/${encodeURIComponent(n)}">${esc(n)}</a></li>`).join('')}</ul>
${(byCat.get(cat) || []).length ? `<h2>Latest ${esc(cat)} lessons</h2>\n<ul>${(byCat.get(cat) || []).slice(0, 30).map(r => `<li><a href="/watch/${r[0]}">${esc(r[1])}</a> <span class="mut">${esc(r[2])}</span></li>`).join('')}</ul>` : ''}
<h2>How to learn with ${NAME}</h2>
<p>Pick a channel, open any lesson, and write notes next to the video. To follow a topic in order, <a href="/courses">create a course</a> from a playlist or a long video. Finish every lesson to earn a certificate you can share and verify. No account is needed, and your progress is saved in your browser.</p>
<p class="mut">See also: <a href="/categories">all categories</a> · <a href="/about">about ${NAME}</a></p>`;
    write(`category/${slug(cat)}.html`, page({
      p: catUrl(cat), title: `${cat} videos & courses | ${NAME}`,
      desc: `${blurb} ${names.length} trusted channels, free notes and certificates.`.slice(0, 158),
      h1: cat, crumbs: [['Categories', '/categories']], body,
      extraLd: [{ '@type': 'CollectionPage', name: `${cat}: free learning videos`, url: SITE + catUrl(cat), description: blurb, isPartOf: { '@type': 'WebSite', name: NAME, url: SITE + '/' },
        mainEntity: { '@type': 'ItemList', numberOfItems: names.length, itemListElement: names.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n })) } }]
    }));
    urls.push([catUrl(cat), '0.7']);
  }

  // Categories index
  write('categories.html', page({
    p: '/categories', title: `All learning categories | ${NAME}`, h1: 'All categories',
    desc: `Browse ${nCat} subjects, from science, maths and programming to exam prep, languages, finance and the arts. ${nCh} trusted YouTube channels, one free place to learn.`.slice(0, 158),
    body: `<h1>All learning categories</h1>
<p>${NAME} organises ${nCh} trusted educational YouTube channels into ${nCat} subjects. Choose a category to see its channels and start learning.</p>
<ul class="cols">${[...cats].map(([c, n]) => `<li><a href="${catUrl(c)}">${esc(c)}</a> <span class="mut">(${n.length} channels)</span></li>`).join('')}</ul>
<p><a class="cta" href="/">Open ${NAME}</a></p>`
  }));

  // About + FAQ (the FAQPage markup repeats exactly what is visible on the page)
  write('about.html', page({
    p: '/about', title: `About ${NAME}: free learning videos, courses and certificates`.slice(0, 70), h1: `About ${NAME}`,
    desc: `${NAME} is a free place to learn from trusted YouTube channels: build courses, take notes, track progress and earn verifiable certificates, with no sign-up.`.slice(0, 158),
    body: `<h1>About ${NAME}</h1>
<p>${NAME} is a free learning website. It collects educational videos from ${nCh} trusted YouTube channels across ${nCat} subjects and adds the tools that turn watching into learning: courses with progress, notes beside the video, a study timer, playlists and certificates.</p>
<h2>What you can do</h2>
<ul><li><b>Browse by subject</b> in <a href="/categories">${nCat} categories</a>, from science and maths to programming, exam preparation and languages.</li>
<li><b>Build courses</b> from a YouTube playlist, a long video with chapters, or your own list of lessons, and watch them in order with a progress bar.</li>
<li><b>Take notes</b> while you watch, then download them as text, Markdown or PDF, or upload them later to carry on.</li>
<li><b>Earn certificates</b> when you complete a course. Each one has a code that can be checked on the verify page.</li></ul>
<h2>Frequently asked questions</h2>
${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n')}
<p><a class="cta" href="/">Start learning</a></p>`,
    extraLd: [{ '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      { '@type': 'AboutPage', name: `About ${NAME}`, url: SITE + '/about' }]
  }));

  // Crawlable intro block for the home page (the app replaces it as soon as it loads)
  const block = `<!--seo:start-->
<section class="seo" id="seo-intro">
<h1>${NAME}: free learning videos, courses and certificates</h1>
<p>Learn from ${nRound}+ trusted YouTube education channels in one place. Build your own courses, take notes beside the video, track your progress and earn a verifiable certificate. It is free and needs no sign-up.</p>
<h2>Browse by subject</h2>
<ul>${[...cats.keys()].map(c => `<li><a href="${catUrl(c)}">${esc(c)}</a></li>`).join('')}</ul>
<p><a href="/categories">All categories</a> · <a href="/about">About ${NAME} and FAQ</a></p>
</section>
<!--seo:end-->`;
  const htmlFile = path.join(pub, 'index.html');
  let html = fs.readFileSync(htmlFile, 'utf8');
  if (/<!--seo:start-->[\s\S]*<!--seo:end-->/.test(html)) html = html.replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, () => block);
  else html = html.replace(/(<main id="main"[^>]*>)(<\/main>)/, (m, a, b) => a + '\n' + block + '\n' + b);
  fs.writeFileSync(htmlFile, html);

  // sitemap.xml and llms.txt
  // sitemap.xml is an index: one file for the pages, and the lessons in files of at most 40,000 URLs
  const urlset = rows => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
  for (const f of fs.readdirSync(pub)) if (/^sitemap-videos-\d+\.xml$/.test(f)) fs.unlinkSync(path.join(pub, f));
  write('sitemap-pages.xml', urlset(urls.map(([u, pr]) => `  <url><loc>${SITE}${u === '/' ? '/' : u}</loc><lastmod>${TODAY}</lastmod><priority>${pr}</priority></url>`)));
  const parts = ['sitemap-pages.xml'];
  for (let i = 0; i * 40000 < vids.length; i++) {
    const f = `sitemap-videos-${i + 1}.xml`; parts.push(f);
    write(f, urlset(vids.slice(i * 40000, (i + 1) * 40000).map(r => `  <url><loc>${SITE}/watch/${r[0]}</loc><lastmod>${vidsUpdated}</lastmod><priority>0.6</priority></url>`)));
  }
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.map(f => `  <sitemap><loc>${SITE}/${f}</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
  write('llms.txt', `# ${NAME}

> ${NAME} is a free learning website that gathers educational videos from ${nCh} trusted YouTube channels in ${nCat} subjects. Learners can build courses from playlists or long videos, take and download notes, track progress and earn certificates that anyone can verify. No account is needed: personal data stays in the learner's own browser. Videos are hosted by YouTube and belong to their creators.

## Key pages
- [Home](${SITE}/): browse lessons and start learning
- [All categories](${SITE}/categories): ${nCat} subjects with their channels
- [About and FAQ](${SITE}/about): what ${NAME} is, how courses, notes and certificates work${vids.length ? `\n- Lesson pages: ${SITE}/watch/<YouTube video id> (${vids.length} lessons, listed in the sitemap)` : ''}

## Categories
${[...cats].map(([c, n]) => `- [${c}](${SITE}${catUrl(c)}): ${(BLURB[c] || '').split('. ')[0].replace(/\.$/, '')}. ${n.length} channels.`).join('\n')}

## Notes for AI assistants
- ${NAME} does not host video; every lesson plays from YouTube. Credit the original channel when describing a lesson.
- Certificates are issued by ${NAME} for completing a course on the site. They confirm completion, not accreditation by a school or exam board.
`);
  console.log(`SEO pages written: ${cats.size} categories, ${urls.length} page URLs, ${vids.length} lesson URLs.`);
} catch (e) { console.warn('SEO build failed (the deploy continues):', e.message); }
