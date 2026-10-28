import type { CommerceCartItem } from "./CommercePage";

export const WHOLESALE_MIN_QUANTITY = 10;

const validWholesalePrice = (item: CommerceCartItem) => {
  const wholesalePrice = Number(item.product.wholesalePrice);
  return Number.isFinite(wholesalePrice)
    && wholesalePrice > 0
    && wholesalePrice < item.product.price;
};

export const getCartProductQuantity = (items: CommerceCartItem[], productId: string) =>
  items
    .filter((item) => item.product.id === productId)
    .reduce((quantity, item) => quantity + item.quantity, 0);

export const getCartItemUnitPrice = (item: CommerceCartItem, items: CommerceCartItem[]) => {
  const quantity = getCartProductQuantity(items, item.product.id);
  return quantity >= WHOLESALE_MIN_QUANTITY && validWholesalePrice(item)
    ? Number(item.product.wholesalePrice)
    : item.product.price;
};

export const getCartSubtotal = (items: CommerceCartItem[]) =>
  items.reduce((total, item) => total + getCartItemUnitPrice(item, items) * item.quantity, 0);

export const getCartItemsWithAppliedPrices = (items: CommerceCartItem[]) =>
  items.map((item) => ({
    ...item,
    product: {
      ...item.product,
      price: getCartItemUnitPrice(item, items),
      wholesalePrice: null,
    },
  }));

export const hasWholesaleOffer = (item: CommerceCartItem) => validWholesalePrice(item);
