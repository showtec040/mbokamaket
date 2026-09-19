import type { Product } from "../../types/marketplace";

type PriceDisplayProps = {
  product: Product;
  compact?: boolean;
};

export function PriceDisplay({ product, compact = false }: PriceDisplayProps) {
  const hasDiscount = product.originalPrice !== null && product.originalPrice > product.price;

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${compact ? "mt-2" : "mt-4"}`}>
      <span className={`${compact ? "text-lg" : "text-2xl"} font-black text-[#143ca8]`}>
        {product.price.toLocaleString("fr-FR")} {product.currency}
      </span>
      {hasDiscount && (
        <span className="text-sm font-semibold text-slate-400 line-through">
          {product.originalPrice!.toLocaleString("fr-FR")} {product.currency}
        </span>
      )}
      {hasDiscount && <span className="badge badge-sm border-0 bg-orange-100 text-orange-700">Prix réduit</span>}
    </div>
  );
}
