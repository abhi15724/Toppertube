// GET /api/feed -> whole catalog. Vercel's CDN keeps it 3 hours (and serves a stale copy while refreshing),
// so YouTube's daily quota is barely touched however many students visit.
const { getCatalog } = require('../lib/catalog');
module.exports = async (req, res) => {
  try {
    const c = await getCatalog();
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(c);
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: process.env.YT_API_KEY ? 'Lessons could not be loaded right now. Please try again shortly.'
                                                         : 'Lessons are not set up yet: the site owner must add YT_API_KEY in Vercel.' });
  }
};
