// GET /api/oembed?ids=<id,id,...>[&list=<playlist id>] -> { title, items: [{ id, title, channel }] }
// A backup that needs no YouTube API key and uses none of its daily quota: YouTube's public oEmbed service gives the title and channel of a video
// (and the title of a playlist). Used when the data service is out of quota, so a playlist can still become a course.
// Private, removed and non-embeddable videos are left out, because they could not be played here anyway.
const ID = /^[\w-]{11}$/;
module.exports = async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(x => ID.test(x)).slice(0, 50);
  const list = String(req.query.list || '');
  const get = async url => {
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
    return r.ok ? r.json() : null;
  };
  try {
    let title = '';
    if (/^[\w-]{10,60}$/.test(list)) { const d = await get('https://www.youtube.com/playlist?list=' + list).catch(() => null); if (d) title = d.title || ''; }
    const items = []; let i = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (i < ids.length) {
        const k = i++, id = ids[k];
        try { const d = await get('https://www.youtube.com/watch?v=' + id); if (d) items[k] = { id, title: d.title || 'YouTube video', channel: d.author_name || 'YouTube' }; } catch (e) {}
      }
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ title, items: items.filter(Boolean) });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'We could not load that right now. Please try again in a little while.' });
  }
};
