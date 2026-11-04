// OPTIONAL. The server already finds channel ids by itself (1 quota unit per channel on every refresh).
// Run this once on your computer to write the ids INTO channels.json so the server can skip those lookups,
// and to fix channels the automatic lookup could not match (it also uses YouTube search, 100 units each).
//   Mac/Linux:  YT_API_KEY=your_key node scripts/resolve-channels.js
//   Windows:    set YT_API_KEY=your_key && node scripts/resolve-channels.js
// If the daily quota runs out, it saves progress: run it again tomorrow. Read channels.report.txt afterwards.
const fs = require('fs'), path = require('path');
const KEY = process.env.YT_API_KEY;
if (!KEY) { console.error('Set YT_API_KEY first (see the top of this file).'); process.exit(1); }
const file = path.join(__dirname, '..', 'channels.json');
const list = JSON.parse(fs.readFileSync(file, 'utf8'));
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const similar = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)); };
async function yt(ep, p) {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + ep);
  Object.entries({ ...p, key: KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u), d = await r.json();
  if (!r.ok) { const e = new Error(d.error && d.error.message || r.status); e.quota = /quota/i.test(e.message); throw e; }
  return d;
}
(async () => {
  const report = []; let stopped = false;
  for (const ch of list) {
    if (ch.id) continue;
    try {
      let id = null, title = '', how = '';
      const h = (ch.handle || norm(ch.name)).replace(/^@/, '');
      if (h) { const d = await yt('channels', { part: 'snippet', forHandle: '@' + h }), it = d.items && d.items[0]; if (it && similar(it.snippet.title, ch.name)) { id = it.id; title = it.snippet.title; how = 'handle'; } }
      if (!id) { const d = await yt('search', { part: 'snippet', type: 'channel', q: ch.name, maxResults: 1 }), it = d.items && d.items[0]; if (it) { id = it.snippet.channelId || it.id.channelId; title = it.snippet.title; how = 'search'; } }
      if (!id) { report.push(`MISSING ${ch.name}`); continue; }
      ch.id = id; ch.title = title;
      report.push(`${similar(title, ch.name) ? 'OK     ' : 'CHECK  '} ${ch.name} -> ${title} (${id}) via ${how}`);
      fs.writeFileSync(file, JSON.stringify(list, null, 1));
    } catch (e) {
      if (e.quota) { report.push('STOPPED: daily YouTube quota used up. Run again tomorrow to continue.'); stopped = true; break; }
      report.push(`ERROR   ${ch.name}: ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(__dirname, '..', 'channels.report.txt'), report.join('\n') + '\n');
  console.log(report.join('\n') + `\n\nDone${stopped ? ' (not finished, run again tomorrow)' : ''}. Lines marked CHECK may be the wrong channel: confirm them in channels.json.`);
})().catch(e => { console.error(e.message); process.exit(1); });
