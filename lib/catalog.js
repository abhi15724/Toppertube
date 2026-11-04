// YouTube Data API v3 access: the home catalog (newest uploads per channel) and whole-library paging per channel.
const channels = require('../channels.json');
const API = 'https://www.googleapis.com/youtube/v3';
const PER_CHANNEL = 25;      // newest uploads per channel in the home catalog
const MIN_SECONDS = 240;     // skip Shorts and tiny clips
const TTL = 6 * 60 * 60 * 1000;

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

// channels.json lists names (optionally a handle or id). Names are turned into channel ids here, 1 quota unit each,
// and a channel is only accepted when the YouTube channel title matches the name, so a wrong guess is skipped, never mixed in.
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const similar = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)); };
const known = new Map();   // name -> { at, value }, kept while this server instance stays warm
async function resolveChannel(ch) {
  if (ch.playlist) return { ...ch, title: ch.title || ch.name };                  // a fixed playlist: nothing to look up
  if (ch.id && !ch.check) return { ...ch, title: ch.title || ch.name };
  const hit = known.get(ch.name);
  if (hit && Date.now() - hit.at < (hit.value ? 24 : 6) * 3600e3) return hit.value;
  let value = null;
  if (ch.id) {                                                                     // an id that must match the channel title
    const d = await yt('channels', { part: 'snippet', id: ch.id }), it = d.items && d.items[0];
    if (it && similar(it.snippet.title, ch.name)) value = { ...ch, title: it.snippet.title };
  }
  if (!value) {
    const handle = (ch.handle || norm(ch.name)).replace(/^@/, '');
    if (handle) {
      const d = await yt('channels', { part: 'snippet', forHandle: '@' + handle }), it = d.items && d.items[0];   // network or quota errors throw and are not cached
      if (it && similar(it.snippet.title, ch.name)) value = { ...ch, id: it.id, title: it.snippet.title };
    }
  }
  known.set(ch.name, { at: Date.now(), value });
  return value;
}

async function build() {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const skipped = [], ok = [];
  const lists = await pool(channels, 15, async ch => {
    try {
      const r = await resolveChannel(ch);
      if (!r) { skipped.push(ch.name); return []; }
      const d = await yt('playlistItems', { part: 'contentDetails', playlistId: r.playlist || uploadsOf(r.id), maxResults: PER_CHANNEL });
      ok.push(r);
      return (d.items || []).map(i => ({ id: i.contentDetails.videoId, channel: r.title || r.name, category: r.category }));
    } catch (e) { console.warn(`Skipped ${ch.name}: ${e.message}`); skipped.push(ch.name); return []; }
  });
  const items = await hydrate(lists.flat());
  if (!items.length) throw new Error('no videos could be loaded');
  const names = new Set(ok.map(c => c.name));
  const reg = new Map(ok.filter(c => c.id).map(c => [c.id, { name: c.title || c.name, id: c.id, category: c.category }]));
  return { items, categories: [...new Set(channels.filter(c => names.has(c.name)).map(c => c.category))], skipped, updatedAt: new Date().toISOString(), channels: [...reg.values()] };
}

async function getCatalog() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  if (!inflight) inflight = build().then(c => { cache = c; cacheAt = Date.now(); return c; }).finally(() => { inflight = null; });
  try { return await inflight; } catch (e) { if (cache) return cache; throw e; }
}

// One page (up to 50 uploads, newest first) of a channel's whole library. Only channels in channels.json are allowed.
async function channelPage(id, pageToken) {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const ch = (await getCatalog()).channels.find(c => c.id === id);
  if (!ch) { const e = new Error('unknown channel'); e.status = 404; throw e; }
  const p = { part: 'contentDetails', playlistId: uploadsOf(id), maxResults: 50 };
  if (pageToken) p.pageToken = pageToken;
  const d = await yt('playlistItems', p);
  const raw = (d.items || []).map(i => ({ id: i.contentDetails.videoId, channel: ch.title || ch.name, category: ch.category }));
  return { items: await hydrate(raw, true), next: d.nextPageToken || null };
}

// Search beyond our channel list. search.list costs 100 quota units, so results are cached by the CDN
// and each server instance allows at most 40 searches an hour.
const hits = [];
async function searchVideos(q) {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const now = Date.now();
  while (hits.length && now - hits[0] > 3600e3) hits.shift();
  if (hits.length >= 40) { const e = new Error('busy'); e.status = 429; throw e; }
  hits.push(now);
  const d = await yt('search', { part: 'snippet', type: 'video', q, maxResults: 25, videoEmbeddable: 'true', safeSearch: 'strict', relevanceLanguage: 'en' });
  const raw = (d.items || []).filter(i => i.id && i.id.videoId).map(i => ({ id: i.id.videoId, channel: i.snippet.channelTitle, category: 'YouTube' }));
  return { items: await hydrate(raw) };
}

// ---- single videos, playlists and chapters (used by courses and "open any video") ----
async function fetchVideos(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const d = await yt('videos', { part: 'snippet,contentDetails,statistics,status', id: ids.slice(i, i + 50).join(',') });
    for (const x of d.items || []) {
      out.set(x.id, { id: x.id, title: x.snippet.title, channel: x.snippet.channelTitle, category: 'YouTube', publishedAt: x.snippet.publishedAt,
        seconds: seconds(x.contentDetails.duration), views: +x.statistics.viewCount || 0,
        embeddable: !!x.status.embeddable && x.status.privacyStatus !== 'private', description: x.snippet.description || '' });
    }
  }
  return out;
}
// YouTube chapters: lines like "00:00 Intro" (needs 3+ entries, the first at 0:00, in increasing order).
function parseChapters(desc, total) {
  const out = [];
  for (const line of String(desc || '').split(/\r?\n/)) {
    const m = /^[\s•*▪>\-–—]*[\[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*[-–—:.)|]*\s*(\S.*?)\s*$/.exec(line);
    if (!m) continue;
    const s = m[1].split(':').reverse().reduce((a, x, i) => a + x * 60 ** i, 0);
    if (total && s > total) continue;
    out.push({ s, t: m[2].slice(0, 120) });
  }
  if (out.length < 3 || out[0].s !== 0) return [];
  for (let i = 1; i < out.length; i++) if (out[i].s <= out[i - 1].s) return [];
  return out;
}
async function videoPage(id) {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const v = (await fetchVideos([id])).get(id);
  if (!v) { const e = new Error('not found'); e.status = 404; throw e; }
  const chapters = parseChapters(v.description, v.seconds);
  delete v.description;
  return { video: v, chapters };
}
async function videosByIds(ids) {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const m = await fetchVideos(ids);
  return { items: ids.map(id => m.get(id)).filter(v => v && v.embeddable).map(({ description, ...v }) => v) };
}
async function playlistPage(listId) {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY is not set');
  const pl = await yt('playlists', { part: 'snippet', id: listId });
  const meta = pl.items && pl.items[0];
  if (!meta) { const e = new Error('not found'); e.status = 404; throw e; }
  const ids = []; let token = '';
  for (let n = 0; n < 6; n++) {       // up to 300 videos
    const d = await yt('playlistItems', { part: 'contentDetails', playlistId: listId, maxResults: 50, ...(token ? { pageToken: token } : {}) });
    ids.push(...(d.items || []).map(i => i.contentDetails.videoId));
    token = d.nextPageToken || ''; if (!token) break;
  }
  const info = await fetchVideos(ids);
  const items = ids.map(id => info.get(id)).filter(v => v && v.embeddable).map(({ description, ...v }) => v);
  return { title: meta.snippet.title, channel: meta.snippet.channelTitle, items, total: ids.length, truncated: !!token };
}
module.exports = { getCatalog, channelPage, searchVideos, videoPage, videosByIds, playlistPage, parseChapters, fetchVideos };
