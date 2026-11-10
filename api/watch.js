// GET /watch/<id>  (rewritten to /api/watch?id=<id> in vercel.json)
// Serves the normal app page (public/index.html) with the lesson's own title, description, canonical address, share tags, VideoObject
// markup and readable text already filled in, so search engines and AI assistants see a real page per lesson. The app then loads as usual
// and turns the address into /#/watch/<id>.
// Facts come from lib/videos.index.json, written at deploy time by scripts/build-feed.js, so this never uses YouTube quota.
// Videos that are not in the index still open (the app fetches them itself) but are marked noindex.
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE_URL || 'https://www.toppertube.online';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clip = (s, n) => s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
const isoDur = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return 'PT' + (h ? h + 'H' : '') + (m ? m + 'M' : '') + (s || (!h && !m) ? s + 'S' : ''); };
const human = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? `${h} h ${m} min` : `${Math.max(1, m)} min`; };
const views = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ' thousand' : String(n || 0);

let TPL = null, IDX = null;
function template() { if (!TPL) TPL = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8'); return TPL; }
function index() {
  if (IDX) return IDX;
  IDX = { by: new Map(), chan: new Map(), cat: new Map() };
  try {
    const rows = require('../lib/videos.index.json').v;   // [id, title, channel, category, publishedAt, seconds, views, text], newest first
    for (const r of rows) {
      IDX.by.set(r[0], r);
      for (const [m, k] of [[IDX.chan, r[2]], [IDX.cat, r[3]]]) { if (!m.has(k)) m.set(k, []); if (m.get(k).length < 12) m.get(k).push(r); }
    }
  } catch (e) { /* no index yet (first deploy without a YouTube key): every lesson is served as noindex */ }
  return IDX;
}

function render(id) {
  const ix = index(), r = ix.by.get(id);
  let html = template();
  const set = (re, to) => { html = html.replace(re, () => to); };
  const canonical = `${SITE}/watch/${id}`;
  set(/<meta charset="utf-8">/, '<meta charset="utf-8">\n<base href="/">');   // the app's files are relative, and this page lives under /watch/
  if (!r) {   // not one of the catalogue lessons: still opens, but is kept out of search results
    set(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,follow">');
    set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`);
    set(/<!--seo:start-->[\s\S]*<!--seo:end-->/, '');
    return html;
  }
  const [, title, channel, category, publishedAt, seconds, viewCount, text] = r;
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const desc = clip(clean.length > 40 ? `${clean} · ${channel} on Toppertube` : `Watch "${title}" from ${channel}: a free ${category} lesson with notes and course tools on Toppertube.`, 158);
  const pageTitle = clip(`${title} | Toppertube`, 70);
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  set(/<title>[^<]*<\/title>/, `<title>${esc(pageTitle)}</title>`);
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`);
  set(/<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="video.other">');
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(pageTitle)}">`);
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`);
  set(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${thumb}">`);
  set(/<meta property="og:image:width" content="[^"]*">\s*<meta property="og:image:height" content="[^"]*">\s*<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${esc(title)}">`);
  set(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(pageTitle)}">`);
  set(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`);
  set(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${thumb}">`);

  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'VideoObject', name: title, description: clean || desc, thumbnailUrl: [thumb], uploadDate: publishedAt, duration: isoDur(seconds),
      embedUrl: `https://www.youtube.com/embed/${id}`, url: canonical, isFamilyFriendly: true,
      interactionStatistic: { '@type': 'InteractionCounter', interactionType: { '@type': 'WatchAction' }, userInteractionCount: viewCount },
      isPartOf: { '@type': 'WebSite', name: 'Toppertube', url: SITE + '/' } },
    { '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], [category, `/category/${slug(category)}`], [title, `/watch/${id}`]].map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[0], item: SITE + b[1] })) }] };
  set(/<\/head>/, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);

  const more = (rows, label) => { const l = rows.filter(x => x[0] !== id).slice(0, 8); return l.length ? `<h2>${label}</h2><ul>${l.map(x => `<li><a href="/watch/${x[0]}">${esc(x[1])}</a> <span>${esc(x[2])}</span></li>`).join('')}</ul>` : ''; };
  const block = `<!--seo:start-->
<section class="seo" id="seo-intro">
<p><a href="/">Toppertube</a> › <a href="/category/${slug(category)}">${esc(category)}</a></p>
<h1>${esc(title)}</h1>
<p>${esc(channel)} · ${esc(category)} · ${human(seconds)} · ${views(viewCount)} views · published ${esc(String(publishedAt).slice(0, 10))}</p>
<p><a href="https://www.youtube.com/watch?v=${id}"><img src="${thumb}" width="480" height="360" alt="${esc(title)}"></a></p>
${clean ? `<p>${esc(clean)}</p>` : ''}
<p>Watch this lesson free on Toppertube, take notes beside the video, and add it to a course to track your progress and earn a certificate.</p>
${more(ix.chan.get(channel) || [], 'More from ' + esc(channel))}
${more(ix.cat.get(category) || [], 'More in ' + esc(category))}
</section>
<!--seo:end-->`;
  set(/<!--seo:start-->[\s\S]*<!--seo:end-->/, block);
  return html;
}

module.exports = (req, res) => {
  const id = String(req.query.id || '');
  if (!/^[\w-]{11}$/.test(id)) { res.statusCode = 302; res.setHeader('Location', '/'); return res.end(); }
  try {
    const html = render(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(html);
  } catch (e) {
    console.error(e);
    res.statusCode = 302; res.setHeader('Location', `/#/watch/${id}`); res.end();   // never leave a visitor on an error: the app can still open it
  }
};
module.exports.render = render;
