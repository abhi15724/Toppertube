// GET /api/video?v=<id> -> { video, chapters }  (any public video; chapters parsed from its description)
const { videoPage, explain, reasonOf } = require('../lib/catalog');
module.exports = async (req, res) => {
  const v = String(req.query.v || '');
  if (!/^[\w-]{11}$/.test(v)) return res.status(400).json({ error: 'That is not a valid YouTube video.' });
  try {
    const out = await videoPage(v);
    // the short copy (no length or chapters, used when YouTube's data service is unavailable) is kept only briefly
    res.setHeader('Cache-Control', out.video && out.video.seconds === 0 ? 'public, s-maxage=300' : 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(e.status || 503).json({ error: e.status === 404 ? 'Video not found, or it is private.' : explain(e), reason: reasonOf(e) });
  }
};
