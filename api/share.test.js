import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from './share.js';

const productId = '45d617f7-1de4-413b-adc2-e4ad2ca90103';
const product = {
  id: productId,
  title: 'Robe très élégante pour le dame',
  description: 'Une robe élégante.',
  price: 25000,
  currency: 'FC',
  images: ['https://example.com/robe.jpg'],
  location: 'Kinshasa',
};
const profile = {
  id: 'b77a9be2-4aac-4c5b-81f2-8cd372b5b0c1',
  name: 'Mboutique',
  business_name: 'B Mboutique',
  username: 'bmboutique',
  bio: 'Notre boutique.',
  avatar: 'https://example.com/boutique.jpg',
};

const invokeShareHandler = async (path, resolveRows) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    return {
      ok: true,
      json: async () => resolveRows(url),
    };
  };

  const response = {
    headers: {},
    statusCode: 0,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };

  try {
    await handler({ url: path, query: Object.fromEntries(new URL(path, 'https://www.mbokamaket.com').searchParams) }, response);
    return response;
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('renders metadata and preview for product slugs ending in a UUID', async () => {
  const response = await invokeShareHandler(
    `/api/share?type=product&id=robe-tres-elegante-pour-le-dame-${productId}`,
    (url) => url.searchParams.get('id') === `eq.${productId}` ? [product] : [],
  );

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /og:title/);
  assert.match(response.body, /Robe très élégante pour le dame/);
  assert.match(response.body, new RegExp(`mbokamaket://product/robe-tres-elegante-pour-le-dame-${productId}`));
});

test('renders metadata and preview for profile usernames', async () => {
  const response = await invokeShareHandler(
    '/api/share?type=profile&id=bmboutique',
    (url) => url.searchParams.get('username') === 'eq.bmboutique' ? [profile] : [],
  );

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /og:title/);
  assert.match(response.body, /B Mboutique/);
  assert.match(response.body, /mbokamaket:\/\/profile\/bmboutique/);
});
