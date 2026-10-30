import { useEffect, useRef, useState } from "react";
import { BellCheck, LoaderCircle, X } from "lucide-react";
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
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const processedSearches = useRef(new Set<string>());

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
      setLoaded(true);
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

  useEffect(() => {
    const cleanQuery = query.trim();
    const cleanCity = normalizeSearchCity(city);
    if (!loaded || loading || !cleanQuery) return;

    const searchKey = JSON.stringify([cleanQuery, categoryId, cleanCity]);
    const alreadySaved = savedSearches.some((item) =>
      item.query === cleanQuery && item.category_id === categoryId && normalizeSearchCity(item.city) === cleanCity,
    );
    if (alreadySaved || processedSearches.current.has(searchKey)) return;

    const timer = window.setTimeout(() => {
      processedSearches.current.add(searchKey);
      setSaving(true);
      setError("");
      void (async () => {
        try {
          if (!supabase) throw new Error("La configuration Supabase est absente.");
          const { data: existing, error: lookupError } = await supabase
            .from("saved_searches")
            .select("id,query,category_id,city")
            .eq("user_id", userId)
            .eq("query", cleanQuery)
            .eq("category_id", categoryId)
            .eq("city", cleanCity)
            .maybeSingle();
          if (lookupError) throw lookupError;
          if (existing) {
            setSavedSearches((current) => current.some((item) => item.id === existing.id)
              ? current
              : [existing as SavedSearch, ...current]);
            return;
          }

          const { data, error: insertError } = await supabase
            .from("saved_searches")
            .insert({ user_id: userId, query: cleanQuery, category_id: categoryId, city: cleanCity })
            .select("id,query,category_id,city")
            .single();
          if (insertError?.code === "23505") return;
          if (insertError) throw insertError;
          setSavedSearches((current) => [data as SavedSearch, ...current]);
        } catch (saveError) {
          console.error("[saved-search] enregistrement automatique impossible", saveError);
          setError(saveError instanceof Error && saveError.message.includes("configuration")
            ? saveError.message
            : "Impossible d’enregistrer automatiquement cette alerte.");
        } finally {
          setSaving(false);
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [categoryId, city, error, loaded, loading, query, savedSearches, userId]);

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
      processedSearches.current.add(JSON.stringify([
        savedSearch.query,
        savedSearch.category_id,
        normalizeSearchCity(savedSearch.city),
      ]));
    } catch (deleteError) {
      console.error("[saved-search] suppression impossible", deleteError);
      setError("Impossible de supprimer cette alerte. Réessayez.");
    }
  };

  const activeSearch = savedSearches.find((item) =>
    item.query === query.trim()
    && item.category_id === categoryId
    && normalizeSearchCity(item.city) === normalizeSearchCity(city),
  );

  return (
    <section className="mt-3 rounded-2xl border border-blue-100 bg-white p-3 sm:p-4" aria-label="Alertes de recherche">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {activeSearch ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <BellCheck size={15} /> Alerte active
          </span>
        ) : saving ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500" role="status">
            <LoaderCircle size={15} className="animate-spin" /> Activation automatique…
          </span>
        ) : null}
      </div>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
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
