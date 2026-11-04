// GET /api/playlist?list=<id> -> { title, channel, items, total, truncated }  (up to 300 videos, in playlist order)
const { playlistPage } = require('../lib/catalog');
module.exports = async (req, res) => {
  const list = String(req.query.list || '');
  if (!/^[\w-]{10,60}$/.test(list)) return res.status(400).json({ error: 'That is not a valid playlist link.' });
  try {
    const out = await playlistPage(list);
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(e.status || 503).json({ error: e.status === 404 ? 'Playlist not found, or it is private.' : 'Could not load that from YouTube right now. Please try again shortly.' });
  }
};
