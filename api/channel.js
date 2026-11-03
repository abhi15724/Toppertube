// GET /api/channel?c=<channelId>&t=<pageToken> -> { items, next }
// One page (50 uploads) of a channel's whole library, costing 2 YouTube quota units.
// Cached by Vercel's CDN for 6 hours per page, so repeat visits cost nothing.
const { channelPage } = require('../lib/catalog');
module.exports = async (req, res) => {
  const c = String(req.query.c || ''), t = String(req.query.t || '');
  if (!/^UC[\w-]{22}$/.test(c) || (t && !/^[\w-]{1,100}$/.test(t))) return res.status(400).json({ error: 'Bad request' });
  try {
    const out = await channelPage(c, t);
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(e.status || 503).json({ error: e.status === 404 ? 'Unknown channel.' : 'Could not load more lessons right now. Please try again shortly.' });
  }
};
