// GET /api/verify?code=<certificate code> -> { valid, n, c, s, d, i }
const { verify } = require('../lib/cert');
module.exports = (req, res) => {
  const p = verify(String(req.query.code || '').slice(0, 600));
  res.setHeader('Cache-Control', 'no-store');
  if (!p) return res.status(404).json({ valid: false, error: 'This certificate code is not valid.' });
  res.status(200).json({ valid: true, ...p });
};
