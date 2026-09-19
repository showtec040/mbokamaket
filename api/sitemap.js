const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.mbokamaket.com';

const slugify = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
const productPath = (product) => `/annonce/${slugify(product.title) || 'annonce'}-${product.id}`;
const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export default async function handler(_request, response) {
  const pages = ['/', '/immobilier', '/vehicules', '/services', '/emploi', '/contact', '/a-propos', '/annonces', '/boutiques'];
  let products = [];
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const query = `${SUPABASE_URL}/rest/v1/produits?select=id,title,updated_at,status&status=not.in.(sold,archived)&order=updated_at.desc`;
      const result = await fetch(query, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      if (result.ok) products = await result.json();
    } catch (error) {
      console.error('[sitemap] Supabase request failed', error);
    }
  }
  const urls = [
    ...pages.map((path) => ({ path, priority: path === '/' ? '1.0' : '0.8', changefreq: 'daily' })),
    ...products.map((product) => ({ path: productPath(product), priority: '0.7', changefreq: 'weekly', lastmod: product.updated_at })),
  ];
  const body = urls.map(({ path, priority, changefreq, lastmod }) => `<url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`).join('');
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  response.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
}
