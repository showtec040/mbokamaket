import { useEffect, useState } from "react";
import { BellPlus, LoaderCircle, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { normalizeSearchCity, searchCityLabel } from "./searchCity";

type SavedSearch = {
  id: string;
  query: string;
  category_id: string;
  city: string;
};

export default function SearchAlerts({
  userId,
  query,
  categoryId,
  city,
  onApply,
}: {
  userId: string;
  query: string;
  categoryId: string;
  city: string;
  onApply: (query: string, categoryId: string, city: string) => void;
}) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const loadSavedSearches = async () => {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { data, error: loadError } = await supabase
        .from("saved_searches")
        .select("id,query,category_id,city")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (loadError) throw loadError;
      if (!active) return;
      setSavedSearches((data ?? []) as SavedSearch[]);
    };
    void loadSavedSearches()
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error("[saved-search] chargement impossible", loadError);
        setError(loadError instanceof Error && loadError.message.includes("configuration")
          ? loadError.message
          : "Impossible de charger vos alertes de recherche.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const saveSearch = async () => {
    const cleanQuery = query.trim();
    const cleanCity = normalizeSearchCity(city);
    if (!cleanQuery || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { data: existing, error: lookupError } = await supabase
        .from("saved_searches")
        .select("id")
        .eq("user_id", userId)
        .eq("query", cleanQuery)
        .eq("category_id", categoryId)
        .eq("city", cleanCity)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) {
        setNotice("Cette alerte existe déjà.");
        return;
      }
      const { data, error: insertError } = await supabase
        .from("saved_searches")
        .insert({ user_id: userId, query: cleanQuery, category_id: categoryId, city: cleanCity })
        .select("id,query,category_id,city")
        .single();
      if (insertError?.code === "23505") {
        setNotice("Cette alerte existe déjà.");
        return;
      }
      if (insertError) throw insertError;
      setSavedSearches((current) => [data as SavedSearch, ...current]);
      setNotice("Vous serez averti lorsqu’un nouveau produit correspondra à cette recherche.");
    } catch (saveError) {
      console.error("[saved-search] enregistrement impossible", saveError);
      setError(saveError instanceof Error && saveError.message.includes("configuration")
        ? saveError.message
        : "Impossible d’enregistrer cette alerte. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const removeSearch = async (savedSearch: SavedSearch) => {
    if (!supabase) return;
    setError("");
    try {
      const { error: deleteError } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", savedSearch.id)
        .eq("user_id", userId);
      if (deleteError) throw deleteError;
      setSavedSearches((current) => current.filter((item) => item.id !== savedSearch.id));
    } catch (deleteError) {
      console.error("[saved-search] suppression impossible", deleteError);
      setError("Impossible de supprimer cette alerte. Réessayez.");
    }
  };

  return (
    <section className="mt-3 rounded-2xl border border-blue-100 bg-white p-3 sm:p-4" aria-label="Alertes de recherche">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Alertes de recherche</h3>
          <p className="text-xs text-slate-500">Recevez une notification quand un nouveau produit correspond à vos critères.</p>
        </div>
        <button
          type="button"
          onClick={() => void saveSearch()}
          disabled={!query.trim() || saving}
          className="btn btn-sm min-h-9 border-blue-200 bg-blue-50 text-[#143ca8] hover:bg-blue-100"
        >
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <BellPlus size={16} />}
          {query.trim() ? "M’alerter pour cette recherche" : "Saisissez une recherche"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700" role="status">{notice}</p>}
      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin" /> Chargement des recherches suivies…</div>
      ) : savedSearches.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">Mes recherches suivies</p>
          <ul className="flex flex-wrap gap-2">
            {savedSearches.map((item) => (
              <li key={item.id} className="flex max-w-full items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => onApply(item.query, item.category_id, item.city)}
                  className="max-w-56 truncate px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:text-[#143ca8]"
                  title={`Relancer « ${item.query} »`}
                >
                  {item.query}{item.category_id ? ` · ${categoryLabel(item.category_id)}` : ""}{item.city ? ` · ${searchCityLabel(item.city)}` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => void removeSearch(item)}
                  className="grid size-8 shrink-0 place-items-center border-l border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Supprimer l’alerte ${item.query}`}
                  title="Supprimer l’alerte"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function categoryLabel(categoryId: string) {
  const labels: Record<string, string> = {
    "1": "Électronique",
    "2": "Mode",
    "3": "Immobilier",
    "4": "Auto & Moto",
    "5": "Sports",
    "6": "Smartphone",
    "7": "Ordinateur",
    "8": "Accessoire",
    "9": "Consoles et jeux vidéo",
  };
  return labels[categoryId] || "Catégorie";
}
