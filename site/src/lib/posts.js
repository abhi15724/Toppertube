// Reads every article in src/posts/*.md. File names look like 01-my-title.md: the number only sets the order, the rest is the address (/blog/my-title).
const modules = import.meta.glob('../posts/*.md', { eager: true });

export function getPosts() {
  return Object.entries(modules)
    .map(([file, m]) => {
      const slug = file.split('/').pop().replace(/\.md$/, '').replace(/^\d+-/, '');
      const order = Number((file.split('/').pop().match(/^(\d+)-/) || [])[1] || 99);
      const words = m.rawContent().split(/\s+/).filter(Boolean).length;
      return { slug, order, words, minutes: Math.max(1, Math.round(words / 200)), Content: m.Content, ...m.frontmatter };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.order - b.order);
}

export const fmtDate = d => new Date(String(d) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
