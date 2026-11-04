// POST /api/quiz { title, ref?, modules:[{title, lessons:[{t, v}]}] } -> { questions:[{q, options}], token }
// The answer key travels only inside the encrypted token, so the browser never sees it.
const { buildQuiz } = require('../lib/quizgen');
const { seal, secretOk } = require('../lib/cert');
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const hits = [];   // per-instance cap, because each generated quiz costs a little
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!secretOk()) return res.status(503).json({ error: 'Certificates are not set up on this server yet (the site owner must add CERT_SECRET).' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const title = clean(b.title, 120), ref = /^[\w-]{10,60}$/.test(String(b.ref || '')) ? b.ref : '';
  let count = 0;
  const modules = (Array.isArray(b.modules) ? b.modules : []).slice(0, 60).map(m => ({
    title: clean(m && m.title, 120),
    lessons: (Array.isArray(m && m.lessons) ? m.lessons : []).filter(l => l && /^[\w-]{11}$/.test(String(l.v))).slice(0, 150).map(l => ({ t: clean(l.t, 200), v: l.v }))
  })).filter(m => { count += m.lessons.length; return m.lessons.length && count <= 300; });
  if (!title || !modules.length) return res.status(400).json({ error: 'Missing course details.' });
  const now = Date.now(); while (hits.length && now - hits[0] > 3600e3) hits.shift();
  if (hits.length >= 30) return res.status(429).json({ error: 'Many students are taking assessments right now. Please try again in a few minutes.' });
  hits.push(now);
  try {
    const qs = await buildQuiz({ title, ref, modules });
    const token = seal({ a: qs.map(q => q.answer), t: title, exp: now + 3 * 3600e3 });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ questions: qs.map(({ q, options }) => ({ q, options })), token });
  } catch (e) {
    console.error(e);
    const m = { 501: 'Assessments are not set up for this course yet. The site owner needs to add a quiz to courses.json or an ANTHROPIC_API_KEY.',
      422: 'This course does not have enough information (lesson titles and descriptions) to build a fair assessment.' }[e.status];
    res.status(m ? e.status : 503).json({ error: m || 'Could not prepare the assessment right now. Please try again in a minute.' });
  }
};
