// GET /api/videos?ids=a,b,c -> { items }  (up to 50 videos, in the order given)
const { videosByIds } = require('../lib/catalog');
module.exports = async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean);
  if (!ids.length || ids.length > 50 || !ids.every(i => /^[\w-]{11}$/.test(i))) return res.status(400).json({ error: 'Send 1 to 50 valid video ids.' });
  try {
    const out = await videosByIds(ids);
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(e.status || 503).json({ error: e.status === 404 ? 'Videos not found.' : 'Could not load that from YouTube right now. Please try again shortly.' });
  }
};
