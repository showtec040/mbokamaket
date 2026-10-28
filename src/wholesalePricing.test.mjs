import assert from "node:assert/strict";
import test from "node:test";
import {
  getCartItemsWithAppliedPrices,
  getCartSubtotal,
  getCartItemUnitPrice,
} from "./wholesalePricing.ts";

const product = {
  id: "product-1",
  title: "Produit",
  price: 100,
  wholesalePrice: 80,
  currency: "FC",
  image: "",
  sellerId: "seller-1",
  seller: "Vendeur",
  categoryId: "1",
};

test("keeps the unit price under the 10-unit threshold", () => {
  const items = [{ product, quantity: 9 }];

  assert.equal(getCartItemUnitPrice(items[0], items), 100);
  assert.equal(getCartSubtotal(items), 900);
});

test("applies wholesale pricing to every variant of the product at 10 units", () => {
  const items = [
    { product, quantity: 6, selectedSpecifications: { Taille: "S" } },
    { product, quantity: 4, selectedSpecifications: { Taille: "M" } },
  ];

  assert.equal(getCartSubtotal(items), 800);
  assert.deepEqual(
    getCartItemsWithAppliedPrices(items).map((item) => item.product.price),
    [80, 80],
  );
});

test("ignores wholesale prices that are not below the retail price", () => {
  const items = [{ product: { ...product, wholesalePrice: 100 }, quantity: 10 }];

  assert.equal(getCartSubtotal(items), 1000);
});

test("freezes the applied price in order items and removes the future offer", () => {
  const items = getCartItemsWithAppliedPrices([{ product, quantity: 10 }]);

  assert.equal(items[0].product.price, 80);
  assert.equal(items[0].product.wholesalePrice, null);
});
