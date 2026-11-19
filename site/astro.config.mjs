import { defineConfig } from 'astro/config';

// Static output only. scripts/build-site.js copies dist/ into ../public (landing.html, blog.html, blog/*.html).
export default defineConfig({
  site: 'https://www.toppertube.online',
  outDir: './dist',
  trailingSlash: 'never',
  compressHTML: true,
  build: { format: 'file', assets: '_site', inlineStylesheets: 'always' },
  devToolbar: { enabled: false }
});
