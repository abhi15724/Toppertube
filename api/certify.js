// POST /api/certify { name, course, lessons:[{ v: videoId, d: seconds }] } -> { n, c, k, m, d, i, code }
// Issues a signed certificate. Before signing it checks on YouTube that the course is made of real videos (at least 80% must exist)
// and works out the real minutes of video. It cannot prove that the student watched them: completion is recorded by the student's own browser.
const { issue, secretOk } = require('../lib/cert');
const { fetchVideos } = require('../lib/catalog');
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const hits = [];   // per-instance cap
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!secretOk()) return res.status(503).json({ error: 'Certificates are not set up on this server yet.' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const name = clean(b.name, 50), course = clean(b.course, 100);
  const lessons = (Array.isArray(b.lessons) ? b.lessons : []).filter(l => l && /^[\w-]{11}$/.test(String(l.v)))
    .slice(0, 300).map(l => ({ v: l.v, d: Math.max(0, Math.min(+l.d || 0, 86400)) }));
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!course) return res.status(400).json({ error: 'Please enter the course name.' });
  if (!lessons.length) return res.status(400).json({ error: 'This course has no lessons.' });
  const now = Date.now(); while (hits.length && now - hits[0] > 3600e3) hits.shift();
  if (hits.length >= 40) return res.status(429).json({ error: 'Many certificates are being created right now. Please try again in a few minutes.' });
  hits.push(now);
  try {
    const info = await fetchVideos([...new Set(lessons.map(l => l.v))]);
    let ok = 0, secs = 0;
    for (const l of lessons) {
      const v = info.get(l.v); if (!v) continue;
      ok++; secs += Math.min(l.d > 0 ? l.d : v.seconds, v.seconds || l.d || 0);
    }
    if (ok < Math.ceil(lessons.length * 0.8)) return res.status(422).json({ error: 'Most videos in this course could not be found on YouTube, so a certificate cannot be issued.' });
    const minutes = Math.round(secs / 60);
    if (minutes < 5) return res.status(422).json({ error: 'This course is too short to earn a certificate (at least 5 minutes of video).' });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(issue({ n: name, c: course, k: ok, m: minutes }));
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not check the course on YouTube right now. Please try again in a few minutes.' });
  }
};
