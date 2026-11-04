// GET /api/search?q=... -> { items }  (videos from all of YouTube, used only when the student asks for more results)
const { searchVideos } = require('../lib/catalog');
module.exports = async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  if (q.length < 2) return res.status(400).json({ error: 'Type at least 2 letters.' });
  try {
    const out = await searchVideos(q);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(e.status || 503).json({ error: e.status === 429 ? 'Search is busy right now. Please try again in a few minutes.' : 'Could not search YouTube right now. Please try again shortly.' });
  }
};
