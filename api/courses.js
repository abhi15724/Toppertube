// GET /api/courses -> featured courses you curate in courses.json (each is a YouTube playlist)
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.status(200).json(require('../courses.json'));
};
