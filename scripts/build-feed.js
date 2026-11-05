// Runs at deploy time (see "buildCommand" in vercel.json). It does three things, none of which can fail the deploy:
//  1. stamps a version on the script files in index.html, so browsers can cache them for a year and still get every update;
//  2. writes public/feed.json, a ready-made copy of the lesson list that is served instantly as a static file;
//  3. writes channels.resolved.json, so the server does not have to look channels up again at run time.
// Needs YT_API_KEY in the Vercel environment (steps 2 and 3 are skipped without it).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');

try {
  const htmlFile = process.env.HTML_PATH || path.join(root, 'public', 'index.html');
  const stamp = Date.now().toString(36);
  const html = fs.readFileSync(htmlFile, 'utf8');
  fs.writeFileSync(htmlFile, html.replace(/((?:app|courses|certificate)\.js\?v=)[^"]*/g, '$1' + stamp));
  console.log('Script version stamp:', stamp);
} catch (e) { console.warn('Could not stamp script versions:', e.message); }

(async () => {
  if (!process.env.YT_API_KEY) { console.log('YT_API_KEY is not set: skipping the feed snapshot (the site will load the feed from /api/feed instead).'); return; }
  try {
    const { getCatalog, resolvedMap } = require('../lib/catalog');
    const cat = await getCatalog();
    fs.writeFileSync(process.env.FEED_OUT || path.join(root, 'public', 'feed.json'), JSON.stringify(cat));
    fs.writeFileSync(process.env.RESOLVED_OUT || path.join(root, 'channels.resolved.json'), JSON.stringify(resolvedMap()));
    console.log(`Feed snapshot written: ${cat.items.length} videos from ${cat.channels.length} channels.`);
    if (cat.skipped.length) console.log(`Channels that could not be matched (${cat.skipped.length}): ${cat.skipped.join(', ')}`);
  } catch (e) { console.warn('Feed snapshot failed (the deploy continues):', e.message); }
})();
