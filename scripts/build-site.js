// Builds the Astro landing page and blog (folder site/) and copies the result into public/:
//   dist/index.html -> public/landing.html   (shown at "/" to new visitors and search engines, see the rewrites in vercel.json)
//   dist/blog.html, dist/blog/*.html -> public/blog.html, public/blog/*.html
// If anything fails the deploy carries on: landing.html then becomes a copy of the app, so "/" always works.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..'), site = path.join(root, 'site'), pub = path.join(root, 'public'), dist = path.join(site, 'dist');
const run = (cmd, ms) => execSync(cmd, { cwd: site, stdio: 'inherit', timeout: ms, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, f.name), b = path.join(to, f.name); f.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b); } };

// remove what an earlier build left behind
for (const p of ['landing.html', 'blog.html', 'blog', '_site']) fs.rmSync(path.join(pub, p), { recursive: true, force: true });

let built = false;
try {
  if (!fs.existsSync(path.join(site, 'package.json'))) throw new Error('site/package.json not found');
  fs.rmSync(dist, { recursive: true, force: true });
  if (!fs.existsSync(path.join(site, 'node_modules', 'astro'))) run('npm install --no-audit --no-fund --loglevel=error', 240000);
  run('npx astro build', 240000);
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Astro did not write index.html');
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(pub, 'landing.html'));
  if (fs.existsSync(path.join(dist, 'blog.html'))) fs.copyFileSync(path.join(dist, 'blog.html'), path.join(pub, 'blog.html'));
  if (fs.existsSync(path.join(dist, 'blog'))) copyDir(path.join(dist, 'blog'), path.join(pub, 'blog'));
  if (fs.existsSync(path.join(dist, '_site'))) copyDir(path.join(dist, '_site'), path.join(pub, '_site'));
  // plain-markdown copy of every article (/blog/<name>.md): easy for AI assistants and agents to read and quote
  const postsDir = path.join(site, 'src', 'posts');
  for (const f of fs.readdirSync(postsDir).filter(n => n.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(postsDir, f), 'utf8'), m = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const field = k => ((m && m[1].match(new RegExp('^' + k + ': "(.*)"$', 'm'))) || [])[1] || '';
    const slug = f.replace(/\.md$/, '').replace(/^\d+-/, '');
    fs.mkdirSync(path.join(pub, 'blog'), { recursive: true });
    fs.writeFileSync(path.join(pub, 'blog', slug + '.md'), `# ${field('title')}\n\n> ${field('description')}\n\nPublished ${field('date')} on Toppertube: https://www.toppertube.online/blog/${slug}\n\n` + raw.slice(m ? m[0].length : 0));
  }
  built = true;
  console.log('Landing page and blog built with Astro:', fs.existsSync(path.join(pub, 'blog')) ? fs.readdirSync(path.join(pub, 'blog')).filter(n => n.endsWith('.html')).length + ' articles' : 'no articles');
} catch (e) {
  console.warn('Astro build failed, the landing page falls back to the app (the deploy continues):', e.message);
  for (const p of ['landing.html', 'blog.html', 'blog']) fs.rmSync(path.join(pub, p), { recursive: true, force: true });
}
if (!built) { try { fs.copyFileSync(path.join(pub, 'app.html'), path.join(pub, 'landing.html')); } catch (e) { console.warn('No app.html to fall back to:', e.message); } }
