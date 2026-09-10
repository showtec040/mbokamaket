const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ryxrnpomqxkhggelduwj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wm4Fn_mr5UQnyKKlbtYhiA_PXjfODqz';
const SITE_URL = 'https://www.mbokamaket.com';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const firstImage = (value) => {
  if (Array.isArray(value)) return value.find((item) => typeof item === 'string' && item) || '';
  if (typeof value !== 'string') return '';
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.find((item) => typeof item === 'string' && item) || '' : '';
  } catch {
    return value.startsWith('http') ? value : '';
  }
};

const querySupabase = async (table, id, columns) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}&id=eq.${encodeURIComponent(id)}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return rows[0] || null;
  } catch (error) {
    console.error('[share] Supabase request failed', error);
    return null;
  }
};

const render = ({ title, description, image, canonical, content }) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = image ? escapeHtml(image) : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><meta name="description" content="${safeDescription}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="MbokaMarket"><meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}"><meta property="og:url" content="${escapeHtml(canonical)}">${safeImage ? `<meta property="og:image" content="${safeImage}"><meta property="og:image:alt" content="${safeTitle}">` : ''}<meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${safeTitle}"><meta name="twitter:description" content="${safeDescription}">${safeImage ? `<meta name="twitter:image" content="${safeImage}">` : ''}<style>body{font-family:system-ui,sans-serif;margin:0;background:#f5f7fb;color:#12213f}.page{max-width:720px;margin:auto;padding:28px 18px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}.cover{display:block;width:100%;max-height:420px;object-fit:cover}.body{padding:22px}.eyebrow{color:#2563eb;font-weight:700}.title{font-size:27px}.description{color:#52627a;line-height:1.55}.button{display:inline-block;margin:18px 10px 0 0;padding:12px 17px;border-radius:9px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700}.secondary{background:#e8eefb;color:#1d4ed8}</style></head><body><main class="page"><section class="card">${content}</section></main></body></html>`;
};

export default async function handler(request, response) {
  try {
    const query = request.query || {};
    const type = Array.isArray(query.type) ? query.type[0] : query.type;
    const id = Array.isArray(query.id) ? query.id[0] : query.id;
    if (!id || (type !== 'product' && type !== 'profile')) return response.status(404).send('Lien invalide.');

  if (type === 'product') {
    const product = await querySupabase('produits', id, 'id,title,description,price,currency,images,location');
    if (!product) return response.status(404).send('Produit introuvable.');
    const title = product.title || 'Produit MbokaMarket';
    const description = String(product.description || `Découvrez ${title} sur MbokaMarket.`).slice(0, 240);
    const image = firstImage(product.images);
    const canonical = `${SITE_URL}/product/${encodeURIComponent(id)}`;
    const appUrl = `mbokamaket://product/${encodeURIComponent(id)}`;
    const price = Number(product.price || 0).toLocaleString('fr-FR');
    const currency = product.currency === 'USD' ? '$' : product.currency || 'FC';
    const content = `${image ? `<img class="cover" src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}<div class="body"><div class="eyebrow">Produit MbokaMarket</div><h1 class="title">${escapeHtml(title)}</h1><p class="description">${escapeHtml(description)}</p><p><strong>${escapeHtml(price)} ${escapeHtml(currency)}</strong>${product.location ? ` · ${escapeHtml(product.location)}` : ''}</p><a class="button" href="${appUrl}">Ouvrir dans l’application</a><a class="button secondary" href="/?produit=${encodeURIComponent(id)}">Voir sur le site</a></div>`;
      return response.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(render({ title: `${title} | MbokaMarket`, description, image, canonical, content }));
  }

    const profile = await querySupabase('public_profiles', id, 'id,name,business_name,username,bio,avatar');
    if (!profile) return response.status(404).send('Profil introuvable.');
    const name = profile.business_name || profile.name || 'Profil MbokaMarket';
    const description = String(profile.bio || `Découvrez le profil de ${name} sur MbokaMarket.`).slice(0, 240);
    const canonical = `${SITE_URL}/profile/${encodeURIComponent(id)}`;
    const content = `${profile.avatar ? `<img class="cover" src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(name)}">` : ''}<div class="body"><div class="eyebrow">Profil MbokaMarket</div><h1 class="title">${escapeHtml(name)}</h1>${profile.username ? `<p class="description">@${escapeHtml(profile.username)}</p>` : ''}<p class="description">${escapeHtml(description)}</p><a class="button" href="mbokamaket://profile/${encodeURIComponent(id)}">Ouvrir dans l’application</a><a class="button secondary" href="/?profil=${encodeURIComponent(id)}">Voir sur le site</a></div>`;
    return response.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(render({ title: `${name} | MbokaMarket`, description, image: profile.avatar, canonical, content }));
  } catch (error) {
    console.error('[share] handler failed', error);
    return response.status(500).send('Le lien de partage est temporairement indisponible.');
  }
}
