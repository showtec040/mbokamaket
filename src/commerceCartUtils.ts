import type { CommerceCartItem } from "./CommercePage";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isCommerceCartItem = (value: unknown): value is CommerceCartItem => {
  if (!isRecord(value) || !isRecord(value.product)) return false;
  if (value.selectedSpecifications !== undefined
    && (!isRecord(value.selectedSpecifications)
      || Object.values(value.selectedSpecifications).some((selection) => typeof selection !== "string"))) return false;
  if (value.product.specifications !== undefined
    && (!isRecord(value.product.specifications)
      || Object.values(value.product.specifications).some((specification) => typeof specification !== "string"))) return false;
  return typeof value.quantity === "number"
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && value.quantity <= 1000
    && typeof value.product.id === "string"
    && typeof value.product.title === "string"
    && typeof value.product.price === "number"
    && Number.isFinite(value.product.price)
    && value.product.price >= 0
    && typeof value.product.currency === "string"
    && typeof value.product.image === "string"
    && typeof value.product.sellerId === "string"
    && typeof value.product.seller === "string"
    && typeof value.product.categoryId === "string";
};

export const getCommerceCartItemKey = (item: Pick<CommerceCartItem, "product" | "selectedSpecifications">) => {
  const selection = Object.entries(item.selectedSpecifications ?? {}).sort(([left], [right]) => left.localeCompare(right));
  return `${item.product.id}:${JSON.stringify(selection)}`;
};
