import { useEffect, useState } from "react";
import { Flag, LoaderCircle, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import type { ReportReason } from "./reportReasons";

export default function ReportDialog({
  targetId,
  targetType,
  title,
  reasons,
  onClose,
  onLogin,
}: {
  targetId: string;
  targetType: "product" | "user";
  title: string;
  reasons: ReportReason[];
  onClose: () => void;
  onLogin: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const submitReport = async (reason: ReportReason) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user || user.is_anonymous) {
        onClose();
        onLogin();
        return;
      }

      const { data: report, error: insertError } = await supabase.from("reports").insert({
          user_id: user.id,
          target_id: targetId,
          target_type: targetType,
          reason: reason.label,
          description: reason.message,
          evidence_urls: [],
          status: "pending",
        })
        .select("id")
        .single();
      if (insertError?.code === "23505") {
        throw new Error("Vous avez déjà signalé ce contenu.");
      }
      if (insertError) throw insertError;

      if (targetType === "product") {
        const { error: notificationError } = await supabase.rpc("notify_admins_product_report", { report_id: report.id });
        if (notificationError) {
          console.warn("[report] notification admin non envoyée", notificationError);
        }
      }
      setSuccess(true);
    } catch (submitError) {
      console.error("[report] envoi impossible", submitError);
      setError(submitError instanceof Error ? submitError.message : "Impossible d’envoyer le signalement. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flag size={20} className="shrink-0 text-rose-600" />
            <h2 id="report-dialog-title" className="font-display text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost btn-circle btn-sm -mr-2 -mt-2" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        {success ? (
          <>
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
              Votre signalement a bien été transmis à la modération.
            </p>
            <button type="button" onClick={onClose} className="btn mt-4 w-full bg-[#143ca8] text-white hover:bg-[#102f85]">Terminé</button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-500">Choisissez le motif du signalement.</p>
            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {reasons.map((reason) => (
                <button
                  key={reason.label}
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitReport(reason)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
                >
                  <span>{reason.label}</span>
                  {submitting ? <LoaderCircle size={16} className="shrink-0 animate-spin text-[#143ca8]" /> : <span aria-hidden="true" className="text-slate-400">›</span>}
                </button>
              ))}
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost mt-3 w-full">Annuler</button>
          </>
        )}
      </section>
    </div>
  );
}
