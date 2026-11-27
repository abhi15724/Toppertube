// One serverless function for every YouTube-backed request (the free Vercel plan allows at most 12 functions per deployment):
//   /api/yt?op=search&q=…   /api/yt?op=channel&c=…   /api/yt?op=video&v=…   /api/yt?op=videos&ids=…
//   /api/yt?op=playlist&list=…   /api/yt?op=oembed&ids=…[&list=…]
// Each op lives in lib/h/<op>.js, unchanged.
const handlers = {
  search: require('../lib/h/search'),
  channel: require('../lib/h/channel'),
  video: require('../lib/h/video'),
  videos: require('../lib/h/videos'),
  playlist: require('../lib/h/playlist'),
  oembed: require('../lib/h/oembed')
};
module.exports = (req, res) => {
  const h = Object.prototype.hasOwnProperty.call(handlers, req.query.op) ? handlers[req.query.op] : null;
  if (!h) return res.status(404).json({ error: 'Unknown request.' });
  return h(req, res);
};
