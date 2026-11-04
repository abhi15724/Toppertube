// POST /api/grade { token, answers:[index...], name } -> { score, correct, total, passed, wrong:[question numbers], cert? }
// Grades on the server. 80% or more earns a signed certificate. Each token can be graded only once on a warm server instance.
const { open, issue, secretOk } = require('../lib/cert');
const PASS = 80;
const used = new Map();
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!secretOk()) return res.status(503).json({ error: 'Certificates are not set up on this server yet.' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  let t;
  try { t = open(b.token); } catch (e) { return res.status(400).json({ error: 'This assessment is not valid. Please start a new one.' }); }
  const now = Date.now();
  for (const [k, v] of used) if (v < now) used.delete(k);
  if (!t || now > t.exp || used.has(b.token)) return res.status(400).json({ error: 'This assessment has expired or was already submitted. Please start a new one.' });
  const name = clean(b.name, 60);
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!Array.isArray(b.answers) || b.answers.length !== t.a.length) return res.status(400).json({ error: 'Please answer every question.' });
  used.set(b.token, t.exp);
  const wrong = []; t.a.forEach((ans, i) => { if (b.answers[i] !== ans) wrong.push(i + 1); });
  const correct = t.a.length - wrong.length, score = Math.round(100 * correct / t.a.length), passed = score >= PASS;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ score, correct, total: t.a.length, passed, wrong, cert: passed ? issue({ n: name, c: t.t, s: score }) : null });
};
