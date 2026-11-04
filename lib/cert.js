// Tamper-proof assessments and certificates without a database.
// - seal/open: AES-256-GCM "token" that carries the answer key between quiz start and grading (students cannot read or change it).
// - issue/verify: HMAC-signed certificate codes anyone can check at /api/verify.
// Secret: CERT_SECRET (recommended). Falls back to YT_API_KEY, but then rotating that key invalidates old certificates.
const crypto = require('crypto');
const secret = () => process.env.CERT_SECRET || process.env.YT_API_KEY || '';
const key = () => crypto.createHash('sha256').update('tt-enc:' + secret()).digest();
const b64 = b => Buffer.from(b).toString('base64url');

function seal(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return b64(Buffer.concat([iv, c.getAuthTag(), enc]));
}
function open(token) {
  const b = Buffer.from(String(token), 'base64url');
  if (b.length < 30) throw new Error('bad token');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}
const sig = s => crypto.createHmac('sha256', 'tt-sign:' + secret()).update(s).digest('base64url').slice(0, 32);
function issue({ n, c, s }) {
  const p = { n, c, s, d: new Date().toISOString().slice(0, 10), i: crypto.randomBytes(5).toString('hex') };
  const body = b64(JSON.stringify(p));
  return { ...p, code: body + '.' + sig(body) };
}
function verify(code) {
  const [body, sg] = String(code || '').split('.');
  if (!body || !sg) return null;
  const want = Buffer.from(sig(body)), got = Buffer.from(sg);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
}
module.exports = { seal, open, issue, verify, secretOk: () => !!secret() };
