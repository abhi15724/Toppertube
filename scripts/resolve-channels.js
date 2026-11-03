// Turns channel NAMES (channels.names.json) into channel IDs (channels.json). Run on your computer:
//   Mac/Linux:  YT_API_KEY=your_key node scripts/resolve-channels.js
//   Windows:    set YT_API_KEY=your_key && node scripts/resolve-channels.js
// Cheap handle lookups (1 unit) are tried first, then search (100 units). If the daily quota runs out,
// progress is saved: just run it again tomorrow. Review channels.report.txt for wrong matches.
const fs = require('fs'), path = require('path');
const KEY = process.env.YT_API_KEY;
if (!KEY) { console.error('Set YT_API_KEY first (see the top of this file).'); process.exit(1); }
const root = path.join(__dirname, '..');
const names = JSON.parse(fs.readFileSync(path.join(root, 'channels.names.json'), 'utf8'));
let done = []; try { done = JSON.parse(fs.readFileSync(path.join(root, 'channels.json'), 'utf8')); } catch {}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const similar = (a, b) => { a = norm(a); b = norm(b); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)); };

async function yt(ep, p) {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + ep);
  Object.entries({ ...p, key: KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u); const d = await r.json();
  if (!r.ok) { const e = new Error(d.error && d.error.message || r.status); e.quota = /quota/i.test(e.message); throw e; }
  return d;
}
const save = () => fs.writeFileSync(path.join(root, 'channels.json'), JSON.stringify(done, null, 1));

(async () => {
  const report = [];
  // 1) verify IDs we already have (50 per call, 1 unit)
  for (let i = 0; i < done.length; i += 50) {
    const chunk = done.slice(i, i + 50);
    const d = await yt('channels', { part: 'snippet', id: chunk.map(c => c.id).join(','), maxResults: 50 });
    const found = new Map((d.items || []).map(x => [x.id, x.snippet.title]));
    for (const c of chunk) { if (found.has(c.id)) { c.title = found.get(c.id); report.push(`OK      ${c.name} -> ${c.title} (${c.id})`); } else report.push(`DROPPED ${c.name}: id ${c.id} not found`); }
    done = done.filter(c => !chunk.includes(c) || found.has(c.id));
  }
  save();
  // 2) resolve the rest
  const have = new Set(done.map(c => norm(c.name)));
  let stopped = false;
  for (const n of names) {
    if (have.has(norm(n.name))) continue;
    try {
      let id = null, title = '', how = '';
      const h = norm(n.name);
      if (h) {
        const d = await yt('channels', { part: 'snippet', forHandle: '@' + h });
        const it = d.items && d.items[0];
        if (it && similar(it.snippet.title, n.name)) { id = it.id; title = it.snippet.title; how = 'handle'; }
      }
      if (!id) {
        const d = await yt('search', { part: 'snippet', type: 'channel', q: n.name, maxResults: 1 });
        const it = d.items && d.items[0];
        if (it) { id = it.snippet.channelId || it.id.channelId; title = it.snippet.title; how = 'search'; }
      }
      if (!id) { report.push(`MISSING ${n.name}`); continue; }
      done.push({ name: n.name, id, category: n.category, title });
      report.push(`${similar(title, n.name) ? 'OK     ' : 'CHECK  '} ${n.name} -> ${title} (${id}) via ${how}`);
      save();
    } catch (e) {
      if (e.quota) { report.push('STOPPED: daily YouTube quota used up. Run again tomorrow to continue.'); stopped = true; break; }
      report.push(`ERROR   ${n.name}: ${e.message}`);
    }
  }
  fs.writeFileSync(path.join(root, 'channels.report.txt'), report.join('\n') + '\n');
  console.log(report.join('\n'));
  console.log(`\n${done.length} channels saved in channels.json. Details: channels.report.txt` + (stopped ? ' (not finished: run again tomorrow)' : ''));
})().catch(e => { console.error(e.message); process.exit(1); });
