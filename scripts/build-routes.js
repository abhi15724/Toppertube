// Runs at deploy time after build-feed.js and build-seo.js (see "buildCommand" in vercel.json).
// Copies the finished index.html to one real file per app page (courses.html, longs.html ...) and to 404.html,
// so /courses, /longs ... always load the app with a normal 200 response, even in a new tab or for Google.
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const ROUTES = ['longs', 'courses', 'course', 'learn', 'certificate', 'verify', 'progress', 'podcasts', 'liked', 'later', 'history',
  'cats', 'cat', 'channels', 'channel', 'playlists', 'pl', 'notes', 'settings', 'search'];
try {
  const html = fs.readFileSync(path.join(pub, 'index.html'));
  ['404', ...ROUTES].forEach(r => fs.writeFileSync(path.join(pub, r + '.html'), html));
  console.log('Page copies written:', ROUTES.length + 1);
} catch (e) { console.warn('Could not write page copies (the deploy continues):', e.message); }
