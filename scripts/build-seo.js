// Runs at deploy time (see "buildCommand" in vercel.json) and can be run by hand: node scripts/build-seo.js
// The app itself lives behind #/hash routes, which search engines cannot index one by one. This script writes real, crawlable pages
// from channels.json (no API key needed), so Google, Bing and AI answer engines have something to read and link to:
//   public/categories.html            /categories          every category
//   public/category/<slug>.html       /category/<slug>     one page per category, listing its channels
//   public/about.html                 /about               what Toppertube is, how it works, FAQ (with FAQPage markup)
//   public/sitemap.xml (index), sitemap-pages.xml, sitemap-videos-N.xml (one URL per lesson, /watch/<id>), public/llms.txt
//   and the crawlable intro block inside public/app.html (between the seo:start / seo:end markers)
// It never fails the deploy.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), pub = path.join(root, 'public');
const SITE = process.env.SITE_URL || 'https://www.toppertube.online';
const NAME = 'Toppertube';
const TODAY = new Date().toISOString().slice(0, 10);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Real visitors (any browser, any way of arriving) go straight into the app instead of this plain page. Only crawlers and speed/SEO checkers, which identify themselves in the user agent, get to read the page itself.
const toApp = to => `<script>try{if(!/bot|crawl|spider|slurp|lighthouse|inspect|preview|facebookexternalhit/i.test(navigator.userAgent))location.replace(${JSON.stringify(to)})}catch(e){}</script>\n`;
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// What each category is about, in plain words (no claims about individual channels).
const BLURB = {
  'Science & Maths': 'Physics, chemistry, mathematics and general science explained clearly, from school basics to university-level ideas.',
  'School (India)': 'Class-wise lessons for Indian school students, covering the NCERT-style syllabus in English and Hindi.',
  'Exam Prep': 'Preparation videos for competitive exams such as UPSC, SSC, banking, GATE, JEE and NEET, plus English and aptitude practice.',
  'AI': 'Artificial intelligence, machine learning, large language models, AI agents and prompt engineering, from beginner explainers to research talks and hands-on tutorials.',
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
  // one page per channel that has at least 3 lessons in the index (needs the lesson index, so none on a deploy without a YouTube key)
  let resolved = {}; try { resolved = JSON.parse(fs.readFileSync(path.join(root, 'channels.resolved.json'), 'utf8')); } catch (e) {}
  const nk = x => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
  const byChan = new Map(); for (const r of vids) { const k = nk(r[2]); if (!byChan.has(k)) byChan.set(k, []); byChan.get(k).push(r); }
  const chanPages = [], usedSlugs = new Set();
  for (const c of channels) {
    const t = resolved[c.name] && resolved[c.name].title;
    const rows = (t && byChan.get(nk(t))) || byChan.get(nk(c.name)) || [];
    if (rows.length < 3) continue;
    let sl = slug(c.name) || 'channel'; if (usedSlugs.has(sl)) { let i = 2; while (usedSlugs.has(sl + '-' + i)) i++; sl += '-' + i; }
    usedSlugs.add(sl); chanPages.push({ c, rows, slug: sl });
  }
  const hasCreators = chanPages.length > 0;
  const cpOf = n => chanPages.find(o => o.c.name === n);
  // the Astro blog (site/, copied into public/ by build-site.js); the links only appear when it was built
  const blogSlugs = fs.existsSync(path.join(pub, 'blog')) ? fs.readdirSync(path.join(pub, 'blog')).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, '')).sort() : [];
  const hasBlog = fs.existsSync(path.join(pub, 'blog.html'));
  const posts = [];   // title, description and date of each article, read from the markdown files in site/src/posts
  try {
    const dir = path.join(root, 'site', 'src', 'posts');
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.md'))) {
      const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^---\n([\s\S]*?)\n---\n/); if (!m) continue;
      const g = k => ((m[1].match(new RegExp('^' + k + ': "(.*)"$', 'm'))) || [])[1] || '';
      posts.push({ slug: f.replace(/\.md$/, '').replace(/^\d+-/, ''), title: g('title'), description: g('description'), date: g('date') });
    }
    posts.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {}
  const postDate = Object.fromEntries(posts.map(p => [p.slug, p.date]));
  const catUrl = c => `/category/${slug(c)}`;
  const css = `:root{--bg:#fafaf8;--card:#fff;--ink:#14141a;--mut:#5d6068;--line:#e7e7e1;--brand:#d62839;--link:#b3162a;--tint:rgba(214,40,57,.08);--shadow:0 1px 2px rgba(20,20,26,.05),0 8px 24px rgba(20,20,26,.06);color-scheme:light dark}
@media(prefers-color-scheme:dark){:root{--bg:#0e1014;--card:#171a21;--ink:#f3f3f5;--mut:#a4a8b2;--line:#272b35;--link:#ff8a97;--tint:rgba(255,107,122,.10);--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35)}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif;background:var(--bg);color:var(--ink);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
a{color:var(--link);text-decoration-thickness:1px;text-underline-offset:3px}a:focus-visible,summary:focus-visible{outline:3px solid var(--brand);outline-offset:3px;border-radius:8px}
img{max-width:100%;height:auto}
.hd{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 86%,transparent);-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line);padding-top:env(safe-area-inset-top)}
.hd-in{max-width:1120px;margin:0 auto;padding:10px clamp(14px,3vw,28px);display:flex;align-items:center;gap:8px 18px;flex-wrap:wrap}
.logo{font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--ink);text-decoration:none}.logo b{color:var(--brand)}
.nav{display:flex;gap:4px;margin-left:auto;align-items:center}.nav a{color:var(--ink);text-decoration:none;font-weight:600;font-size:15px;padding:8px 14px;border-radius:999px;transition:background .15s}
.nav a:hover{background:var(--tint)}.nav a[aria-current=page]{background:var(--tint);color:var(--link)}.nav a.open{background:var(--brand);color:#fff;margin-left:6px}.nav a.open:hover{filter:brightness(1.08)}
@media(max-width:620px){.nav{order:3;width:100%;margin-left:0;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.nav::-webkit-scrollbar{display:none}.nav a{white-space:nowrap;padding:8px 11px;font-size:14px}.nav a.open{margin-left:auto}}
main{max-width:1120px;margin:0 auto;padding:clamp(16px,3vw,32px) clamp(14px,3vw,28px) 56px}
.hero{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:24px;padding:clamp(24px,5vw,56px);background:radial-gradient(900px 300px at 100% 0,var(--tint),transparent 70%),var(--card);box-shadow:var(--shadow)}
.eyebrow{display:inline-block;margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--link)}
h1{font-size:clamp(1.8rem,1.1rem + 3.2vw,3rem);line-height:1.12;letter-spacing:-.02em;margin:0 0 .45em}
h2{font-size:clamp(1.3rem,1rem + 1vw,1.75rem);letter-spacing:-.01em;margin:2.2em 0 .7em}h3{font-size:1.05rem;margin:0 0 .35em}
.lead{font-size:clamp(1.02rem,.95rem + .35vw,1.2rem);color:var(--mut);max-width:62ch;margin:0 0 1.2em}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.cta,.ghost{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 22px;border-radius:999px;font-weight:700;text-decoration:none;transition:transform .15s,filter .15s}
.cta{background:var(--brand);color:#fff;box-shadow:0 6px 18px rgba(214,40,57,.28)}.cta:hover{filter:brightness(1.08);transform:translateY(-1px)}
.ghost{border:1px solid var(--line);color:var(--ink);background:var(--card)}.ghost:hover{border-color:var(--brand);color:var(--link)}
.stats{display:flex;gap:10px 28px;flex-wrap:wrap;margin-top:24px;color:var(--mut);font-size:15px}.stats b{display:block;font-size:1.6rem;line-height:1.1;color:var(--ink)}
.grid{list-style:none;margin:0;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))}
.grid.wide{grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))}
.card{display:flex;gap:14px;align-items:center;height:100%;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink);text-decoration:none;transition:transform .15s,box-shadow .15s,border-color .15s}
a.card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--brand) 45%,var(--line))}
.av{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-weight:800;color:#fff;background:linear-gradient(135deg,hsl(var(--h) 78% 52%),hsl(calc(var(--h) + 40) 78% 42%))}
.card b{display:block;line-height:1.3}.card small,.mut{color:var(--mut)}.card small{display:block;font-size:13.5px;line-height:1.4}
.tile{align-items:flex-start}.tile .av{width:48px;height:48px}
.vid{display:block;padding:0;overflow:hidden;align-items:stretch;flex-direction:column;gap:0}.vid img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--line)}
.vid span{display:block;padding:12px 14px 14px}.vid b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:15px}.vid small{margin-top:4px}
.feat{display:block;align-items:flex-start}.feat .ic{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:var(--tint);font-size:22px;margin-bottom:12px}.feat p{margin:0;color:var(--mut);font-size:15px}
.steps{counter-reset:s}.steps .card{display:block;position:relative;padding-top:22px}.steps .card:before{counter-increment:s;content:counter(s);position:absolute;top:-14px;left:16px;width:30px;height:30px;border-radius:50%;background:var(--brand);color:#fff;font-weight:800;display:grid;place-items:center}
.steps{gap:22px 14px;margin-top:20px}.steps p{margin:0;color:var(--mut);font-size:15px}
.faq{display:grid;gap:12px}.faq .card{display:block;padding:18px 20px}.faq p{margin:0;color:var(--mut)}
.band{margin-top:48px;text-align:center;padding:clamp(24px,5vw,44px);border-radius:24px;background:linear-gradient(135deg,#d62839,#ff6b4a);color:#fff}.band h2{margin:0 0 8px;color:#fff}.band p{margin:0 0 18px;opacity:.92}.band .cta{background:#fff;color:#b3162a;box-shadow:none}
.crumbs{font-size:14px;color:var(--mut);margin:0 0 14px}.crumbs a{color:var(--mut)}
.ft{border-top:1px solid var(--line);margin-top:24px;padding:28px clamp(14px,3vw,28px) calc(28px + env(safe-area-inset-bottom));color:var(--mut);font-size:14.5px}
.ft-in{max-width:1120px;margin:0 auto;display:flex;gap:18px 40px;flex-wrap:wrap;justify-content:space-between}.ft p{margin:0 0 6px;max-width:44ch}.ft nav{display:flex;gap:6px 18px;flex-wrap:wrap}.ft a{color:var(--mut)}.ft a:hover{color:var(--link)}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}`;

  const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const initials = s => String(s).replace(/&/g, ' ').trim().replace(/[^A-Za-z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const firstSentence = t => (String(t).split('. ')[0] + '.').replace(/\.\.$/, '.');

  function page({ p, title, desc, h1, body, extraLd = [], crumbs = [] }) {
    const url = SITE + p, bc = [['Home', '/'], ...crumbs, [h1, p]];
    const act = p === '/about' ? 'about' : p.startsWith('/categor') ? 'cats' : '';
    const cur = k => act === k ? ' aria-current="page"' : '';
    const graph = [{
      '@type': 'BreadcrumbList', itemListElement: bc.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[0], item: SITE + b[1] }))
    }, { '@type': 'Organization', '@id': SITE + '/#org', name: NAME, url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/favicon-512.png', width: 512, height: 512 } }, ...extraLd];
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
<link rel="preconnect" href="https://i.ytimg.com">
<style>${css}</style>
${ld({ '@context': 'https://schema.org', '@graph': graph })}
</head>
<body>
<header class="hd"><div class="hd-in"><a class="logo" href="/">Topper<b>Tube</b></a><nav class="nav" aria-label="Main"><a href="/categories"${cur('cats')}>Categories</a>${hasBlog ? '<a href="/blog">Blog</a>' : ''}<a href="/about"${cur('about')}>About</a><a href="/courses">Courses</a><a class="open" href="/start">Open app</a></nav></div></header>
<main>
${body}
</main>
<footer class="ft"><div class="ft-in"><div><p><b>${NAME}</b>: free learning videos, courses, notes and certificates.</p><p>Videos belong to their creators and play from YouTube.</p></div><nav aria-label="Footer"><a href="/">Home</a><a href="/categories">All categories</a>${hasCreators ? '<a href="/creators">Creators</a>' : ''}<a href="/free-online-courses">Free online courses</a><a href="/free-education">Free education</a>${hasBlog ? '<a href="/blog">Blog</a>' : ''}<a href="/about">About</a><a href="/courses">Courses</a></nav></div></footer>
</body>
</html>
`;
  }
  const write = (rel, text) => { const f = path.join(pub, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  const urls = [['/', '1.0'], ['/categories', '0.8'], ['/about', '0.5']];
  const steps = `<ol class="grid steps" style="list-style:none;padding:0"><li class="card"><div><h3>Pick a lesson</h3><p>Choose a channel or lesson from any subject. No account is needed.</p></div></li><li class="card"><div><h3>Watch and take notes</h3><p>Write notes beside the video, then download them as text, Markdown or PDF.</p></div></li><li class="card"><div><h3>Finish and get certified</h3><p>Complete every lesson in a course to earn a certificate you can share and verify.</p></div></li></ol>`;

  // Category pages
  for (const [cat, names] of cats) {
    const blurb = BLURB[cat] || `Free ${cat} videos from trusted educational channels.`;
    const lessons = byCat.get(cat) || [];
    const body = toApp('/cat/' + encodeURIComponent(cat)) + `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/categories">Categories</a> / ${esc(cat)}</nav>
<section class="hero"><p class="eyebrow">Category</p><h1>${esc(cat)}: free learning videos</h1>
<p class="lead">${esc(blurb)} ${NAME} brings together ${names.length} YouTube channel${names.length === 1 ? '' : 's'} in this category, so you can learn, take notes and build a course without leaving one place.</p>
<div class="actions"><a class="cta" href="/cat/${encodeURIComponent(cat)}">Watch ${esc(cat)} lessons</a><a class="ghost" href="/categories">All categories</a></div>
<div class="stats"><span><b>${names.length}</b>channel${names.length === 1 ? '' : 's'}</span>${lessons.length ? `<span><b>${lessons.length.toLocaleString('en')}</b>lessons</span>` : ''}<span><b>Free</b>no sign-up</span></div></section>
<h2>Channels in ${esc(cat)}</h2>
<ul class="grid">${names.map(n => `<li><a class="card" style="--h:${hue(n)}" href="${cpOf(n) ? '/creators/' + cpOf(n).slug : '/channel/' + encodeURIComponent(n)}"><span class="av" aria-hidden="true">${esc(initials(n))}</span><b>${esc(n)}</b></a></li>`).join('')}</ul>
${lessons.length ? `<h2>Latest ${esc(cat)} lessons</h2>
<ul class="grid wide">${lessons.slice(0, 30).map(r => `<li><a class="card vid" href="/watch/${r[0]}"><img loading="lazy" decoding="async" width="320" height="180" alt="" src="https://i.ytimg.com/vi/${r[0]}/mqdefault.jpg"><span><b>${esc(r[1])}</b><small>${esc(r[2])}</small></span></a></li>`).join('')}</ul>` : ''}
<h2>How to learn with ${NAME}</h2>
${steps}
<p class="mut" style="margin-top:22px">Want to follow a topic in order? <a href="/courses">Create a course</a> from a playlist or a long video. Your progress is saved in your browser.</p>
<p class="mut">See also: <a href="/categories">all categories</a> · <a href="/about">about ${NAME}</a></p>`;
    write(`category/${slug(cat)}.html`, page({
      p: catUrl(cat), title: `${cat} videos & courses - ${NAME}`,
      desc: `${blurb} ${names.length} trusted channels, free notes and certificates.`.slice(0, 158),
      h1: cat, crumbs: [['Categories', '/categories']], body,
      extraLd: [{ '@type': 'CollectionPage', name: `${cat}: free learning videos`, url: SITE + catUrl(cat), description: blurb, isPartOf: { '@type': 'WebSite', name: NAME, url: SITE + '/' },
        mainEntity: { '@type': 'ItemList', numberOfItems: names.length, itemListElement: names.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n })) } }]
    }));
    urls.push([catUrl(cat), '0.7']);
  }

  // Categories index
  write('categories.html', page({
    p: '/categories', title: `All learning categories - ${NAME}`, h1: 'All categories',
    desc: `Browse ${nCat} subjects, from science, maths and programming to exam prep, languages, finance and the arts. ${nCh} trusted YouTube channels, one free place to learn.`.slice(0, 158),
    body: toApp('/cats') + `<section class="hero"><p class="eyebrow">Browse</p><h1>All learning categories</h1>
<p class="lead">${NAME} organises ${nCh} trusted educational YouTube channels into ${nCat} subjects. Choose a category to see its channels and start learning.</p>
<div class="actions"><a class="cta" href="/start">Open ${NAME}</a><a class="ghost" href="/about">About ${NAME}</a></div></section>
<h2>Choose a subject</h2>
<ul class="grid wide">${[...cats].map(([c, n]) => `<li><a class="card tile" style="--h:${hue(c)}" href="${catUrl(c)}"><span class="av" aria-hidden="true">${esc(initials(c))}</span><span><b>${esc(c)}</b><small>${esc(firstSentence(BLURB[c] || `Free ${c} videos.`))}</small><small>${n.length} channel${n.length === 1 ? '' : 's'}</small></span></a></li>`).join('')}</ul>`
  }));

  // About + FAQ (the FAQPage markup repeats exactly what is visible on the page)
  write('about.html', page({
    p: '/about', title: `About ${NAME}: free learning videos, courses and certificates`.slice(0, 70), h1: `About ${NAME}`,
    desc: `${NAME} is a free place to learn from trusted YouTube channels: build courses, take notes, track progress and earn verifiable certificates, with no sign-up.`.slice(0, 158),
    body: `<section class="hero"><p class="eyebrow">About</p><h1>About ${NAME}</h1>
<p class="lead">${NAME} is a free learning website. It collects educational videos from ${nCh} trusted YouTube channels across ${nCat} subjects and adds the tools that turn watching into learning: courses with progress, notes beside the video, a study timer, playlists and certificates.</p>
<div class="actions"><a class="cta" href="/start">Start learning</a><a class="ghost" href="/categories">Browse categories</a></div>
<div class="stats"><span><b>${nCh}</b>channels</span><span><b>${nCat}</b>subjects</span><span><b>Free</b>no sign-up</span></div></section>
<h2>What you can do</h2>
<ul class="grid wide" style="list-style:none;padding:0">
<li class="card feat"><div class="ic" aria-hidden="true">📚</div><h3>Browse by subject</h3><p>Explore <a href="/categories">${nCat} categories</a>, from science and maths to programming, exam preparation and languages.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">🎓</div><h3>Build courses</h3><p>Make a course from a YouTube playlist, a long video with chapters, or your own list of lessons, and watch them in order with a progress bar.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">📝</div><h3>Take notes</h3><p>Write notes while you watch, then download them as text, Markdown or PDF, or upload them later to carry on.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">🏅</div><h3>Earn certificates</h3><p>Complete a course to earn a certificate. Each one has a code that can be checked on the verify page.</p></li></ul>
<h2>Frequently asked questions</h2>
<div class="faq">${FAQ.map(([q, a]) => `<div class="card"><div><h3>${esc(q)}</h3><p>${esc(a)}</p></div></div>`).join('\n')}</div>
<section class="band"><h2>Ready to learn?</h2><p>Free videos, notes and certificates in one place.</p><a class="cta" href="/start">Open ${NAME}</a></section>`,
    extraLd: [{ '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      { '@type': 'AboutPage', name: `About ${NAME}`, url: SITE + '/about' }]
  }));

  // ---- Creator (channel) pages, the creators directory and two keyword landing pages ----
  const total = vids.length;
  if (hasCreators) {
    for (const cp of chanPages) {
      const c = cp.c, rows = cp.rows, cat = c.category;
      const same = chanPages.filter(o => o.c.category === cat && o !== cp).slice(0, 12);
      const body = toApp('/channel/' + encodeURIComponent(c.name)) + `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/creators">Creators</a> / ${esc(c.name)}</nav>
<section class="hero"><p class="eyebrow">${esc(cat)}</p><h1>${esc(c.name)}: free videos and lessons</h1>
<p class="lead">Watch ${rows.length.toLocaleString('en')} lessons from ${esc(c.name)} free on ${NAME}, a ${esc(cat)} channel. Take notes beside each video, add lessons to a course, and earn a certificate when you finish.</p>
<div class="actions"><a class="cta" href="/channel/${encodeURIComponent(c.name)}">Watch ${esc(c.name)} lessons</a><a class="ghost" href="${catUrl(cat)}">More ${esc(cat)}</a></div>
<div class="stats"><span><b>${rows.length.toLocaleString('en')}</b>lessons</span><span><b>${esc(cat)}</b>subject</span><span><b>Free</b>no sign-up</span></div></section>
<h2>Latest lessons from ${esc(c.name)}</h2>
<ul class="grid wide">${rows.slice(0, 24).map(r => `<li><a class="card vid" href="/watch/${r[0]}"><img loading="lazy" decoding="async" width="320" height="180" alt="" src="https://i.ytimg.com/vi/${r[0]}/mqdefault.jpg"><span><b>${esc(r[1])}</b><small>${esc(r[2])}</small></span></a></li>`).join('')}</ul>
${same.length ? `<h2>More ${esc(cat)} channels</h2><ul class="grid">${same.map(o => `<li><a class="card" style="--h:${hue(o.c.name)}" href="/creators/${o.slug}"><span class="av" aria-hidden="true">${esc(initials(o.c.name))}</span><b>${esc(o.c.name)}</b></a></li>`).join('')}</ul>` : ''}
<p class="mut" style="margin-top:22px">Videos are hosted by YouTube and belong to ${esc(c.name)}. ${NAME} links to them and plays them through YouTube's own player. See also <a href="/creators">all creators</a> and <a href="/categories">all categories</a>.</p>`;
      write(`creators/${cp.slug}.html`, page({
        p: `/creators/${cp.slug}`, title: `${c.name} videos and free lessons - ${NAME}`.slice(0, 70),
        desc: `Watch ${rows.length} free ${cat} lessons from ${c.name} on ${NAME}: take notes, build a course and earn a certificate. Latest: ${rows[0][1]}`.slice(0, 158),
        h1: c.name, crumbs: [['Creators', '/creators']], body,
        extraLd: [{ '@type': 'CollectionPage', name: `${c.name}: free videos and lessons`, url: SITE + '/creators/' + cp.slug, isPartOf: { '@type': 'WebSite', name: NAME, url: SITE + '/' },
          mainEntity: { '@type': 'ItemList', numberOfItems: Math.min(rows.length, 24), itemListElement: rows.slice(0, 24).map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/watch/${r[0]}`, name: r[1] })) } }]
      }));
      urls.push([`/creators/${cp.slug}`, '0.6']);
    }
    const catsWith = [...cats.keys()].filter(k => chanPages.some(o => o.c.category === k));
    write('creators.html', page({
      p: '/creators', title: `Education creators and YouTube channels - ${NAME}`, h1: 'Creators',
      desc: `Browse ${chanPages.length} trusted education channels on ${NAME} across ${catsWith.length} subjects, from school lessons and exam prep to programming and AI. Free videos, notes and certificates.`.slice(0, 158),
      body: toApp('/channels') + `<section class="hero"><p class="eyebrow">Directory</p><h1>Education creators on ${NAME}</h1>
<p class="lead">${chanPages.length} trusted YouTube channels, grouped by subject. Open a creator to see their latest lessons, then watch free with notes and course tools.</p>
<div class="actions"><a class="cta" href="/start">Open ${NAME}</a><a class="ghost" href="/categories">Browse categories</a></div></section>
${catsWith.map(k => `<h2><a href="${catUrl(k)}" style="color:inherit;text-decoration:none">${esc(k)}</a></h2><ul class="grid">${chanPages.filter(o => o.c.category === k).map(o => `<li><a class="card" style="--h:${hue(o.c.name)}" href="/creators/${o.slug}"><span class="av" aria-hidden="true">${esc(initials(o.c.name))}</span><span><b>${esc(o.c.name)}</b><small>${o.rows.length} lessons</small></span></a></li>`).join('')}</ul>`).join('\n')}`
    }));
    urls.push(['/creators', '0.7']);
  }

  const topCats = [...cats.keys()].slice(0, 12);
  const catGrid = list => `<ul class="grid wide">${list.filter(k => cats.has(k)).map(k => `<li><a class="card tile" style="--h:${hue(k)}" href="${catUrl(k)}"><span class="av" aria-hidden="true">${esc(initials(k))}</span><span><b>${esc(k)}</b><small>${esc(firstSentence(BLURB[k] || `Free ${k} videos.`))}</small></span></a></li>`).join('')}</ul>`;
  const faqBlock = list => `<div class="faq">${list.map(([q, a]) => `<div class="card"><div><h3>${esc(q)}</h3><p>${esc(a)}</p></div></div>`).join('\n')}</div>`;
  const faqLd = list => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

  const FAQ_COURSES = [
    ['Are the online courses on Toppertube really free?', `Yes. Every lesson, course tool, note feature and certificate on ${NAME} is free, and you do not need an account or a credit card.`],
    ['Can I get a certificate for a free online course?', `Yes. Create a course from a YouTube playlist, a long video or your own list of lessons, finish every lesson, and ${NAME} issues a certificate with a code anyone can check on the verify page. It confirms that you completed the course on ${NAME}. It is not an accredited degree or an exam-board qualification.`],
    ['How do I turn a YouTube playlist into a course?', 'Open the Courses page, choose "From a playlist", paste the playlist link and press Create course. Each video becomes a lesson, grouped into modules you can rename and reorder.'],
    ['Can I make a course from one long video?', 'Yes. If the video has chapters in its description, each chapter becomes a lesson with its own name. If it has none, the video is split into equal lessons that you can rename.'],
    ['What subjects can I learn?', `${nCat} subjects, including ${topCats.slice(0, 6).join(', ')} and more, taught by ${nCh} trusted YouTube channels.`]
  ];
  const FAQ_FREE = [
    ['Where can I learn for free online?', `${NAME} brings together free video lessons from ${nCh} trusted YouTube channels in ${nCat} subjects, with notes, courses and progress tracking added on top.`],
    ['Is there free help for school and exam preparation?', `Yes. The ${cats.has('School (India)') ? 'School (India)' : 'school'} and ${cats.has('Exam Prep') ? 'Exam Prep' : 'exam'} categories have class-wise lessons and preparation videos for competitive exams, all free to watch and turn into study courses.`],
    ['Do I have to pay or register to use Toppertube?', 'No. There is no sign-up and no payment. Your notes, progress and courses are saved in your own browser, so your personal data stays on your device.'],
    ['Who creates the videos?', 'The videos belong to independent educators and institutions on YouTube. Toppertube links to them and plays them through YouTube, and credits the original channel.'],
    ['Is a Toppertube certificate recognised by schools or employers?', 'A Toppertube certificate shows that you completed a self-made course with a verifiable code. It is a record of your effort, not an accredited qualification, so check with your school or employer before relying on it for admission or hiring.']
  ];

  write('free-online-courses.html', page({
    p: '/free-online-courses', title: `Free Online Courses with Certificates - ${NAME}`, h1: 'Free online courses',
    desc: `Take free online courses on ${NAME}: build a course from any YouTube playlist, learn ${nCat} subjects, take notes and earn a certificate you can verify. No sign-up.`.slice(0, 158),
    body: toApp('/courses') + `<section class="hero"><p class="eyebrow">Free online courses</p><h1>Free online courses with certificates</h1>
<p class="lead">${NAME} turns trusted YouTube lessons into structured online courses: lessons in order, a progress bar, notes beside the video and a verifiable certificate when you finish. It is free and needs no sign-up.</p>
<div class="actions"><a class="cta" href="/courses">Create a free course</a><a class="ghost" href="/categories">Browse subjects</a></div>
<div class="stats"><span><b>${nCat}</b>subjects</span><span><b>${nCh}</b>channels</span><span><b>Free</b>no sign-up</span></div></section>
<h2>How a free course works</h2>
${steps}
<h2>Subjects you can learn</h2>
${catGrid(topCats)}
<h2>Why learners use ${NAME}</h2>
<ul class="grid wide" style="list-style:none;padding:0">
<li class="card feat"><div class="ic" aria-hidden="true">🎓</div><h3>Courses from any playlist</h3><p>Paste a playlist link or a long video and get lessons, modules and a progress bar.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">📝</div><h3>Notes you keep</h3><p>Write notes while you watch and download them as text, Markdown or PDF.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">🏅</div><h3>Verifiable certificates</h3><p>Finish a course to earn a certificate with a code that can be checked online.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">🔒</div><h3>Private by design</h3><p>Your courses and notes are saved in your own browser. No account is needed.</p></li></ul>
<h2>Frequently asked questions</h2>
${faqBlock(FAQ_COURSES)}
<section class="band"><h2>Start your first free course</h2><p>Pick a playlist and learn at your own pace.</p><a class="cta" href="/courses">Create a course</a></section>`,
    extraLd: [faqLd(FAQ_COURSES), { '@type': 'WebPage', name: 'Free online courses', url: SITE + '/free-online-courses' }]
  }));
  urls.push(['/free-online-courses', '0.8']);

  write('free-education.html', page({
    p: '/free-education', title: `Free Education for Everyone - Learn Online Free - ${NAME}`.slice(0, 70), h1: 'Free education',
    desc: `Free education for students and lifelong learners: school lessons, exam preparation, programming, AI and more from ${nCh} trusted channels. No fees, no sign-up. ${NAME}.`.slice(0, 158),
    body: toApp('/') + `<section class="hero"><p class="eyebrow">Free education</p><h1>Free education for everyone, everywhere</h1>
<p class="lead">Good teachers already share their lessons for free. ${NAME} gathers them in one place and adds the tools that turn watching into learning: courses, notes, progress and certificates. No fees, no sign-up.</p>
<div class="actions"><a class="cta" href="/start">Start learning free</a><a class="ghost" href="/free-online-courses">Free online courses</a></div></section>
<h2>Who ${NAME} is for</h2>
<ul class="grid wide" style="list-style:none;padding:0">
<li class="card feat"><div class="ic" aria-hidden="true">🏫</div><h3>School students</h3><p>Class-wise explanations in science, maths and more, in English and Hindi.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">🎯</div><h3>Exam aspirants</h3><p>Preparation videos for UPSC, SSC, banking, GATE, JEE, NEET and other exams.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">💻</div><h3>Skill builders</h3><p>Programming, AI, web development, electronics, finance and communication skills.</p></li>
<li class="card feat"><div class="ic" aria-hidden="true">🌱</div><h3>Curious minds</h3><p>History, politics, music, art and long conversations on big ideas.</p></li></ul>
<h2>Start with a subject</h2>
${catGrid(['School (India)', 'Exam Prep', 'Science & Maths', 'Programming & Tech', 'AI', 'History & GK', 'Business & Finance', 'Languages', 'Communication & Soft Skills', 'Stock Market & Investing'])}
<p class="mut" style="margin-top:14px">Or see <a href="/categories">all ${nCat} subjects</a>${hasCreators ? ' or browse the <a href="/creators">creators</a>' : ''}.</p>
<h2>How to learn well with free videos</h2>
${steps}
<h2>Frequently asked questions</h2>
${faqBlock(FAQ_FREE)}
<section class="band"><h2>Learning should not cost a fortune</h2><p>Pick a subject, make a course and keep going.</p><a class="cta" href="/start">Open ${NAME}</a></section>`,
    extraLd: [faqLd(FAQ_FREE), { '@type': 'WebPage', name: 'Free education', url: SITE + '/free-education' }]
  }));
  urls.push(['/free-education', '0.8']);

  // Crawlable intro block for the home page (the app replaces it as soon as it loads)
  const block = `<!--seo:start-->
<section class="seo" id="seo-intro">
<h1>${NAME}: free learning videos, courses and certificates</h1>
<p>Learn from ${nRound}+ trusted YouTube education channels in one place. Build your own courses, take notes beside the video, track your progress and earn a verifiable certificate. It is free and needs no sign-up.</p>
<h2>Browse by subject</h2>
<ul>${[...cats.keys()].map(c => `<li><a href="${catUrl(c)}">${esc(c)}</a></li>`).join('')}</ul>
<p><a href="/categories">All categories</a> · ${hasCreators ? '<a href="/creators">Creators</a> · ' : ''}<a href="/free-online-courses">Free online courses</a> · <a href="/free-education">Free education</a> · ${hasBlog ? '<a href=\"/blog\">Blog</a> · ' : ''}<a href="/about">About ${NAME} and FAQ</a></p>
</section>
<!--seo:end-->`;
  const htmlFile = path.join(pub, 'app.html');
  let html = fs.readFileSync(htmlFile, 'utf8');
  if (/<!--seo:start-->[\s\S]*<!--seo:end-->/.test(html)) html = html.replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, () => block);
  else html = html.replace(/(<main id="main"[^>]*>)(<\/main>)/, (m, a, b) => a + '\n' + block + '\n' + b);
  html = html.replace(/\d+\+ trusted YouTube/g, nRound + '+ trusted YouTube');   // title, description, share tags and structured data always show the true channel count
  if (!html.includes('SearchAction')) html = html.replace('"inLanguage": "en", "publisher": {"@id": "' + SITE + '/#org"}}', '"inLanguage": "en", "potentialAction": {"@type": "SearchAction", "target": {"@type": "EntryPoint", "urlTemplate": "' + SITE + '/search/{search_term_string}"}, "query-input": "required name=search_term_string"}, "publisher": {"@id": "' + SITE + '/#org"}}');
  fs.writeFileSync(htmlFile, html);

  if (hasBlog) { urls.push(['/blog', '0.7']); for (const b of blogSlugs) urls.push([`/blog/${b}`, '0.7', postDate[b]]); }

  // sitemap.xml and llms.txt
  // sitemap.xml is an index: one file for the pages, and the lessons in files of at most 40,000 URLs
  const urlset = rows => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
  for (const f of fs.readdirSync(pub)) if (/^sitemap-videos-\d+\.xml$/.test(f)) fs.unlinkSync(path.join(pub, f));
  write('sitemap-pages.xml', urlset(urls.map(([u, pr, lm]) => `  <url><loc>${SITE}${u === '/' ? '/' : u}</loc><lastmod>${lm || TODAY}</lastmod><priority>${pr}</priority></url>`)));
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
- [About and FAQ](${SITE}/about): what ${NAME} is, how courses, notes and certificates work\n- [Free online courses](${SITE}/free-online-courses): how free courses and certificates work\n- [Free education](${SITE}/free-education): who ${NAME} is for and where to start${hasCreators ? `\n- [Creators](${SITE}/creators): ${chanPages.length} channels with their latest lessons` : ''}${hasBlog ? `\n- [Blog](${SITE}/blog): ${blogSlugs.length} guides on learning, note-taking, memory and study habits` : ''}\n- [Full description for AI](${SITE}/llms-full.txt) and [catalog.json](${SITE}/catalog.json)${vids.length ? `\n- Lesson pages: ${SITE}/watch/<YouTube video id> (${vids.length} lessons, listed in the sitemap)` : ''}

${hasBlog && posts.length ? `## Blog articles (each also as plain markdown at the same address ending in .md)
${posts.map(p => `- [${p.title}](${SITE}/blog/${p.slug}): ${p.description}`).join('\n')}

` : ''}## Categories
${[...cats].map(([c, n]) => `- [${c}](${SITE}${catUrl(c)}): ${(BLURB[c] || '').split('. ')[0].replace(/\.$/, '')}. ${n.length} channels.`).join('\n')}

## Notes for AI assistants
- ${NAME} does not host video; every lesson plays from YouTube. Credit the original channel when describing a lesson.
- Certificates are issued by ${NAME} for completing a course on the site. They confirm completion, not accreditation by a school or exam board.
`);
  const chanUrl = c => { const cp = chanPages.find(o => o.c === c); return cp ? `${SITE}/creators/${cp.slug}` : `${SITE}/channel/${encodeURIComponent(c.name)}`; };
  write('llms-full.txt', `# ${NAME}: full description for AI assistants and agents

${NAME} (${SITE}/) is a free learning website. It gathers educational videos from ${nCh} trusted YouTube channels in ${nCat} subjects and adds learning tools: courses with progress, notes beside the video, playlists, a study timer and certificates that anyone can verify. No account or payment is needed; learners' data stays in their own browser. Videos are hosted by YouTube and belong to their creators.

## What a learner can do
- Browse lessons by subject, or search by topic (the search also finds videos across YouTube).
- Build a course from a YouTube playlist, from one long video (chapters become lessons; without chapters it is split into equal lessons), or from several links.
- Take notes while watching and download them as text, Markdown or PDF.
- Earn a certificate after finishing a course. It carries a code checkable on ${SITE}/verify. It confirms completion on ${NAME}; it is not an accredited qualification.

## Key pages
- ${SITE}/ : home, lessons to browse
- ${SITE}/categories : all ${nCat} subjects
${hasCreators ? `- ${SITE}/creators : ${chanPages.length} channels with their latest lessons\n` : ''}- ${SITE}/free-online-courses : how free courses and certificates work
- ${SITE}/free-education : who ${NAME} is for and where to start
${hasBlog ? `- ${SITE}/blog : ${blogSlugs.length} guides on learning, note-taking, memory, study schedules and habits\n` : ''}- ${SITE}/about : about and FAQ
- ${SITE}/catalog.json : the subjects and channels in machine-readable form
${vids.length ? `- ${SITE}/watch/<YouTube video id> : a lesson page (${vids.length} lessons, listed in ${SITE}/sitemap.xml)\n` : ''}
## Subjects and channels
${[...cats].map(([k, names]) => `### ${k}\n${(BLURB[k] || '').trim()}\nPage: ${SITE}${catUrl(k)}\nChannels: ${names.join(', ')}`).join('\n\n')}

## Frequently asked questions
${[...FAQ, ...FAQ_COURSES, ...FAQ_FREE].map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

## Guidance for AI assistants
- Credit the original YouTube channel when describing a lesson, and link to the lesson or creator page on ${NAME} when recommending it.
- ${NAME} does not host or re-upload video. Say so if asked who owns the content.
- Do not describe a ${NAME} certificate as accredited.
`);
  write('catalog.json', JSON.stringify({ name: NAME, url: SITE + '/', description: `Free learning videos from ${nCh} trusted YouTube channels in ${nCat} subjects, with courses, notes and certificates.`, updated: TODAY,
    categories: [...cats].map(([k, names]) => ({ name: k, url: SITE + catUrl(k), description: BLURB[k] || '', channels: names.map(n => { const c = channels.find(x => x.name === n); return { name: n, url: chanUrl(c) }; }) })) }, null, 1));
  console.log(`SEO pages written: ${cats.size} categories, ${urls.length} page URLs, ${vids.length} lesson URLs.`);
} catch (e) { console.warn('SEO build failed (the deploy continues):', e.message); }
