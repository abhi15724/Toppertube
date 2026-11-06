// Verifiable certificates without a database: the certificate details are signed with a secret only the server knows.
// Anyone can check a certificate at /api/verify; an edited or invented one fails the check.
// Secret: CERT_SECRET (recommended). Falls back to YT_API_KEY, but then rotating that key invalidates old certificates.
const crypto = require('crypto');
const secret = () => process.env.CERT_SECRET || process.env.YT_API_KEY || '';
const b64 = s => Buffer.from(s).toString('base64url');
const sig = s => crypto.createHmac('sha256', 'tt-cert:' + secret()).update(s).digest('base64url').slice(0, 24);

function issue({ n, c, k, m }) {            // name, course, lessons, minutes of video
  const d = new Date().toISOString().slice(0, 10), i = crypto.randomBytes(5).toString('hex');
  const body = b64(JSON.stringify([n, c, k, m, d, i]));
  return { n, c, k, m, d, i, code: body + '.' + sig(body) };
}
function verify(code) {
  const [body, sg] = String(code || '').split('.');
  if (!body || !sg) return null;
  const want = Buffer.from(sig(body)), got = Buffer.from(sg);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try { const [n, c, k, m, d, i] = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); return { n, c, k, m, d, i }; } catch (e) { return null; }
}
module.exports = { issue, verify, secretOk: () => !!secret() };
