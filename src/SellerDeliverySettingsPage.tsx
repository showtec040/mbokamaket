import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, LoaderCircle, Plus, Trash2, Truck } from "lucide-react";
import { supabase } from "./lib/supabase";

type DeliverySettings = {
  enabled: boolean;
  baseFee: number;
  zoneFees: Record<string, number>;
};

type ZoneFeeDraft = {
  id: number;
  zone: string;
  fee: string;
};

const DEFAULT_SETTINGS: DeliverySettings = {
  enabled: true,
  baseFee: 5,
  zoneFees: {},
};

const parseSettings = (value: unknown): DeliverySettings => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_SETTINGS;
  const settings = value as Record<string, unknown>;
  const rawZoneFees = settings.zoneFees;
  const zoneFees = rawZoneFees && typeof rawZoneFees === "object" && !Array.isArray(rawZoneFees)
    ? Object.fromEntries(Object.entries(rawZoneFees).filter(([, fee]) => Number.isFinite(Number(fee))).map(([zone, fee]) => [zone, Number(fee)]))
    : {};
  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULT_SETTINGS.enabled,
    baseFee: Number.isFinite(Number(settings.baseFee)) ? Math.max(0, Number(settings.baseFee)) : DEFAULT_SETTINGS.baseFee,
    zoneFees,
  };
};

export default function SellerDeliverySettingsPage({
  userId,
  canEdit,
  onClose,
  onSaved,
}: {
  userId: string;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (settings: DeliverySettings) => void;
}) {
  const [enabled, setEnabled] = useState(DEFAULT_SETTINGS.enabled);
  const [baseFee, setBaseFee] = useState(String(DEFAULT_SETTINGS.baseFee));
  const [zoneFees, setZoneFees] = useState<ZoneFeeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextZoneId, setNextZoneId] = useState(0);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("delivery_settings")
        .eq("id", userId)
        .maybeSingle();
      if (loadError) throw loadError;
      if (!data) throw new Error("Le profil vendeur est introuvable.");
      const settings = parseSettings(data.delivery_settings);
      if (!active) return;
      setEnabled(settings.enabled);
      setBaseFee(String(settings.baseFee));
      setZoneFees(Object.entries(settings.zoneFees).map(([zone, fee], id) => ({ id, zone, fee: String(fee) })));
      setNextZoneId(Object.keys(settings.zoneFees).length);
    };
    void loadSettings()
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error("[delivery-settings] chargement impossible", loadError);
        setLoadFailed(true);
        setError(loadError instanceof Error ? loadError.message : "Impossible de charger les paramètres de livraison.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setError("");
    setNotice("");
    const parsedBaseFee = Number(baseFee);
    if (!Number.isFinite(parsedBaseFee) || parsedBaseFee < 0) {
      setError("Le tarif de base doit être un montant positif ou nul.");
      return;
    }

    const normalizedZoneFees: Record<string, number> = {};
    for (const zoneFee of zoneFees) {
      const zone = zoneFee.zone.trim();
      const rawFee = zoneFee.fee.trim();
      if (!zone && !rawFee) continue;
      const fee = Number(rawFee);
      if (!zone || !rawFee || !Number.isFinite(fee) || fee < 0) {
        setError("Chaque zone renseignée doit avoir un nom et un tarif positif ou nul.");
        return;
      }
      if (Object.keys(normalizedZoneFees).some((existingZone) => existingZone.toLocaleLowerCase("fr-FR") === zone.toLocaleLowerCase("fr-FR"))) {
        setError(`La zone « ${zone} » est renseignée plusieurs fois.`);
        return;
      }
      normalizedZoneFees[zone] = fee;
    }

    const settings: DeliverySettings = {
      enabled,
      baseFee: parsedBaseFee,
      zoneFees: normalizedZoneFees,
    };
    setSaving(true);
    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { data, error: saveError } = await supabase
        .from("profiles")
        .update({ delivery_settings: settings })
        .eq("id", userId)
        .select("id")
        .maybeSingle();
      if (saveError) throw saveError;
      if (!data) throw new Error("La mise à jour a été refusée. Vérifiez que vous êtes propriétaire de cette boutique.");
      onSaved(settings);
      setNotice("Vos paramètres de livraison ont été enregistrés.");
    } catch (saveError) {
      console.error("[delivery-settings] enregistrement impossible", saveError);
      setError(saveError instanceof Error ? saveError.message : "Impossible d’enregistrer les paramètres de livraison.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-[#f6f8fc] text-slate-900" role="dialog" aria-modal="true" aria-label="Paramètres de livraison">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:px-6">
        <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Retour">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#143ca8]">Espace vendeur</p>
          <h1 className="truncate font-display text-lg font-bold">Paramètres de livraison</h1>
        </div>
        <Truck className="mr-1 text-[#143ca8]" size={20} />
      </header>
      <main className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6 sm:py-8">
        {!canEdit ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Seul le propriétaire de la boutique peut modifier les paramètres de livraison.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" /> Chargement des paramètres…
          </div>
        ) : loadFailed ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <form onSubmit={(event) => void saveSettings(event)} className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block font-semibold text-slate-900">Livraison disponible</span>
                  <span className="mt-1 block text-sm text-slate-500">Les clients pourront choisir la livraison à la commande.</span>
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label htmlFor="delivery-base-fee" className="form-control max-w-sm gap-1">
                <span className="font-semibold text-slate-900">Tarif de base (FC)</span>
                <span className="text-sm text-slate-500">Appliqué lorsque la commune n’a pas de tarif spécifique.</span>
                <input
                  id="delivery-base-fee"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={baseFee}
                  onChange={(event) => setBaseFee(event.target.value)}
                  disabled={!enabled}
                  className="input input-bordered mt-1 w-full"
                />
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">Tarifs par commune</h2>
                  <p className="mt-1 text-sm text-slate-500">Ajoutez des tarifs spécifiques aux zones que vous desservez.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setZoneFees((current) => [...current, { id: nextZoneId, zone: "", fee: "" }]);
                    setNextZoneId((current) => current + 1);
                  }}
                  disabled={!enabled}
                  className="btn btn-sm border-blue-200 bg-blue-50 text-[#143ca8] hover:bg-blue-100"
                >
                  <Plus size={16} /> Ajouter une zone
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {zoneFees.map((zoneFee) => (
                  <div key={zoneFee.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <label className="form-control gap-1">
                      <span className="text-xs font-semibold text-slate-600">Commune ou zone</span>
                      <input
                        value={zoneFee.zone}
                        onChange={(event) => setZoneFees((current) => current.map((item) => item.id === zoneFee.id ? { ...item, zone: event.target.value } : item))}
                        disabled={!enabled}
                        maxLength={80}
                        placeholder="Ex. Gombe"
                        className="input input-bordered w-full"
                      />
                    </label>
                    <label className="form-control gap-1">
                      <span className="text-xs font-semibold text-slate-600">Tarif (FC)</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={zoneFee.fee}
                        onChange={(event) => setZoneFees((current) => current.map((item) => item.id === zoneFee.id ? { ...item, fee: event.target.value } : item))}
                        disabled={!enabled}
                        placeholder="Ex. 5000"
                        className="input input-bordered w-full"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setZoneFees((current) => current.filter((item) => item.id !== zoneFee.id))}
                      className="btn btn-ghost btn-square self-end text-red-600"
                      aria-label={`Supprimer la zone ${zoneFee.zone || "sans nom"}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
                {zoneFees.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Aucun tarif spécifique : le tarif de base sera appliqué à toutes les communes.</p>}
              </div>
            </section>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
            <button type="submit" disabled={saving || loading} className="btn min-h-11 w-full rounded-xl bg-[#143ca8] text-white hover:bg-[#102f85] sm:w-auto">
              {saving ? <><LoaderCircle size={17} className="animate-spin" /> Enregistrement…</> : "Enregistrer les paramètres"}
            </button>
          </form>
        )}
      </main>
    </section>
  );
}
