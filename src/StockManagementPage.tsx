/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, LoaderCircle, Package, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";

type StockProduct = {
  id: string;
  title: string;
  price: number | string;
  currency: string;
  images: unknown;
  status: string;
  stock: number | string | null;
};

type Props = {
  userId: string;
  onClose: () => void;
};

const imageFrom = (images: unknown) => {
  if (Array.isArray(images)) return String(images[0] || "");
  if (typeof images === "string") {
    try {
      const parsed: unknown = JSON.parse(images);
      return Array.isArray(parsed) ? String(parsed[0] || "") : images;
    } catch {
      return images;
    }
  }
  return "";
};

export default function StockManagementPage({ userId, onClose }: Props) {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingProductId, setWorkingProductId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    if (!supabase) {
      setError("La configuration Supabase est absente.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("produits")
      .select("id,title,price,currency,images,status,stock")
      .or(`seller_profile_id.eq.${userId},seller_id.eq.${userId}`)
      .order("title", { ascending: true });
    if (loadError) {
      setError(loadError.message);
    } else {
      setProducts(((data ?? []) as StockProduct[]).filter((product) => product.status !== "archived"));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const totalUnits = useMemo(
    () => products.reduce((total, product) => total + Math.max(0, Number(product.stock) || 0), 0),
    [products],
  );
  const alertCount = useMemo(
    () => products.filter((product) => Number(product.stock) <= 3 && product.status !== "sold").length,
    [products],
  );

  const restock = async (product: StockProduct) => {
    if (!supabase || workingProductId) return;
    const quantity = Number(quantities[product.id] ?? "1");
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Saisissez une quantité entière supérieure à zéro.");
      return;
    }

    setWorkingProductId(product.id);
    setError("");
    setNotice("");
    try {
      const { data, error: restockError } = await supabase.rpc("restock_product", {
        p_product_id: product.id,
        p_quantity: quantity,
      });
      if (restockError) {
        setError(restockError.message || "Le stock n’a pas pu être réapprovisionné.");
      } else if (typeof data !== "number") {
        setError("Le réapprovisionnement n’a pas retourné la nouvelle quantité.");
      } else {
        setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: data } : item));
        setQuantities((current) => ({ ...current, [product.id]: "1" }));
        setNotice(`Stock de « ${product.title} » renouvelé : ${data} unité(s).`);
      }
    } catch (restockError) {
      console.error("[stock-management] réapprovisionnement impossible", restockError);
      setError(restockError instanceof Error ? restockError.message : "Le stock n’a pas pu être réapprovisionné.");
    } finally {
      setWorkingProductId(null);
    }
  };

  const removeProduct = async (product: StockProduct) => {
    if (!supabase || workingProductId) return;
    if (!window.confirm(`Supprimer définitivement « ${product.title} » ?`)) return;

    setWorkingProductId(product.id);
    setError("");
    setNotice("");
    try {
      const { data, error: deleteError } = await supabase
        .from("produits")
        .delete()
        .eq("id", product.id)
        .or(`seller_profile_id.eq.${userId},seller_id.eq.${userId}`)
        .select("id");
      if (deleteError) {
        setError(deleteError.message || "Le produit n’a pas pu être supprimé.");
      } else if (!data?.length) {
        setError("Le produit n’a pas été supprimé. Il est peut-être déjà absent ou vous n’avez pas les droits nécessaires.");
      } else {
        setProducts((current) => current.filter((item) => item.id !== product.id));
        setNotice("Le produit a été supprimé définitivement.");
      }
    } catch (deleteError) {
      console.error("[stock-management] suppression impossible", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Le produit n’a pas pu être supprimé.");
    } finally {
      setWorkingProductId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f8fc] text-slate-900" role="dialog" aria-modal="true" aria-label="Gestion des stocks">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Retour">
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#143ca8]">Espace vendeur</p>
            <h1 className="truncate font-display text-xl font-bold">Gestion des stocks</h1>
          </div>
          <button type="button" onClick={() => void loadProducts()} disabled={loading} className="btn btn-ghost btn-sm" aria-label="Actualiser les stocks">
            {loading ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        <p className="mb-5 text-sm text-slate-600">Suivez les quantités disponibles et réapprovisionnez vos produits.</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Summary value={products.length} label="Références" />
          <Summary value={totalUnits} label="Unités en stock" />
          <Summary value={alertCount} label="Alertes (≤ 3)" warning />
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

        {loading ? (
          <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-[#143ca8]" size={30} /></div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
            <Package className="mx-auto text-slate-300" size={40} />
            <h2 className="mt-3 font-bold">Aucun produit à suivre</h2>
            <p className="mt-1 text-sm text-slate-500">Publiez un produit pour commencer à gérer votre stock.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {products.map((product) => {
              const stock = Math.max(0, Number(product.stock) || 0);
              const isSold = product.status === "sold";
              const isLow = stock <= 3 && !isSold;
              const image = imageFrom(product.images);
              return (
                <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {image ? (
                        <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400"><Package size={22} /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{product.title || "Produit sans titre"}</span>
                        <span className="mt-1 block text-sm text-slate-500">{Number(product.price || 0).toLocaleString("fr-FR")} {product.currency || "FC"}</span>
                      </span>
                    </div>
                    <div className="min-w-[68px] text-right">
                      <p className={`text-xl font-black ${isSold ? "text-slate-500" : isLow ? "text-amber-600" : "text-emerald-600"}`}>{stock}</p>
                      <p className="text-xs text-slate-500">{isSold ? "Vendu" : stock === 0 ? "Rupture" : isLow ? "À surveiller" : "En stock"}</p>
                    </div>
                    <button type="button" onClick={() => void removeProduct(product)} disabled={workingProductId !== null} className="btn btn-ghost btn-square btn-sm text-red-600" aria-label={`Supprimer ${product.title}`}>
                      {workingProductId === product.id ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                    </button>
                  </div>
                  {!isSold && (
                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={quantities[product.id] ?? "1"}
                        onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value }))}
                        aria-label={`Quantité à ajouter pour ${product.title}`}
                        className="input input-bordered input-sm w-20 text-center"
                      />
                      <button type="button" onClick={() => void restock(product)} disabled={workingProductId !== null} className="btn btn-primary btn-sm flex-1 bg-[#143ca8]">
                        {workingProductId === product.id ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
                        Ajouter au stock
                      </button>
                    </div>
                  )}
                  {isLow && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle size={13} /> Ce produit doit être réapprovisionné.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Summary({ value, label, warning = false }: { value: number; label: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className={`text-xl font-black sm:text-2xl ${warning ? "text-amber-600" : "text-slate-900"}`}>{value.toLocaleString("fr-FR")}</p>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">{label}</p>
    </div>
  );
}
