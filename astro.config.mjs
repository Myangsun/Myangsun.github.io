import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const site = (process.env.SITE_URL || 'https://myangsun.com').replace(/^http:/, 'https:');

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  redirects: Object.fromEntries(Object.entries({
    "/ai-more/urban-fusion": "/projects/urban-fusion/",
    "/ai-more/multimodal-inferface": "/projects/multimodal-inferface/",
    "/ai-more/404-housing-not-found": "/projects/404-housing-not-found/",
    "/ai-more/recitygen": "/projects/recitygen/",
    "/ai-more/urban-echoes": "/projects/urban-echoes/",
    "/ai-more/cognitive-landscapes": "/projects/cognitive-landscapes/",
    "/ai-more/sectional-sampling": "/projects/sectional-sampling/",
    "/ai-more/spatial-symmetry": "/projects/spatial-symmetry/"
  }).map(([from, to]) => [from, `${base}${to.replace(/^\//, '')}`])),
  integrations: [mdx()],
  devToolbar: { enabled: false },
});
