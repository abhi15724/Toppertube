// YouTube Data API v3 access: the home catalog (newest uploads per channel) and whole-library paging per channel.
const channels = require('../channels.json');
const API = 'https://www.googleapis.com/youtube/v3';
const PER_CHANNEL = 25;      // newest uploads per channel in the home catalog
const MIN_SECONDS = 240;     // skip Shorts and tiny clips
const TTL = 3 * 60 * 60 * 1000;

let cache = null, cacheAt = 0, inflight = null;

async function yt(endpoint, params) {
  const u = new URL(`${API}/${endpoint}`);
  Object.entries({ ...params, key: process.env.YT_API_KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || `HTTP ${r.status}`);
  return d;
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}
const seconds = iso => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
};
const uploadsOf = id => 'UU' + id.slice(2);   // uploads playlist id = channel id with "UC" -> "UU"

// raw: [{ id, channel, category }]  ->  full video objects (public, embeddable, long enough, not live)
async function hydrate(raw, withText = false) {
  const batches = [];
  for (let i = 0; i < raw.length; i += 50) batches.push(raw.slice(i, i + 50));
  const items = [], seen = new Set();
  await pool(batches, 6, async batch => {
    try {
      const d = await yt('videos', { part: 'snippet,contentDetails,statistics,status', id: batch.map(v => v.id).join(',') });
      const info = new Map((d.items || []).map(v => [v.id, v]));
      for (const v of batch) {
        const x = info.get(v.id);
        if (!x || seen.has(v.id) || !x.status.embeddable || x.status.privacyStatus !== 'public') continue;
        if (x.snippet.liveBroadcastContent && x.snippet.liveBroadcastContent !== 'none') continue;
        const sec = seconds(x.contentDetails.duration);
        if (sec < MIN_SECONDS) continue;
        seen.add(v.id);
        const item = { id: v.id, title: x.snippet.title, channel: v.channel, category: v.category,
                       publishedAt: x.snippet.publishedAt, seconds: sec, views: +x.statistics.viewCount || 0 };
        if (withText) {   // searchable text for channel-library search: first 500 chars of the description + tags
          const desc = (x.snippet.description || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
          item.d = (desc + ' ' + (x.snippet.tags || []).slice(0, 8).join(' ')).trim();
        }
        items.push(item);
      }
    } catch (e) { console.warn('Details batch failed:', e.message); }
  });
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

async function build() {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const skipped = [];
  const lists = await pool(channels, 10, async ch => {
    try {
      const d = await yt('playlistItems', { part: 'contentDetails', playlistId: uploadsOf(ch.id), maxResults: PER_CHANNEL });
      return (d.items || []).map(i => ({ id: i.contentDetails.videoId, channel: ch.title || ch.name, category: ch.category }));
    } catch (e) { console.warn(`Skipped ${ch.name}: ${e.message}`); skipped.push(ch.name); return []; }
  });
  const items = await hydrate(lists.flat());
  if (!items.length) throw new Error('no videos could be loaded');
  return { items, categories: [...new Set(channels.map(c => c.category))], skipped, updatedAt: new Date().toISOString(),
           channels: channels.map(c => ({ name: c.title || c.name, id: c.id, category: c.category })) };
}

async function getCatalog() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  if (!inflight) inflight = build().then(c => { cache = c; cacheAt = Date.now(); return c; }).finally(() => { inflight = null; });
  try { return await inflight; } catch (e) { if (cache) return cache; throw e; }
}

// One page (up to 50 uploads, newest first) of a channel's whole library. Only channels in channels.json are allowed.
async function channelPage(id, pageToken) {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const ch = channels.find(c => c.id === id);
  if (!ch) { const e = new Error('unknown channel'); e.status = 404; throw e; }
  const p = { part: 'contentDetails', playlistId: uploadsOf(id), maxResults: 50 };
  if (pageToken) p.pageToken = pageToken;
  const d = await yt('playlistItems', p);
  const raw = (d.items || []).map(i => ({ id: i.contentDetails.videoId, channel: ch.title || ch.name, category: ch.category }));
  return { items: await hydrate(raw, true), next: d.nextPageToken || null };
}
module.exports = { getCatalog, channelPage };
