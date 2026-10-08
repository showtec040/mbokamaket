import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type NoticeDialogVariant = "info" | "success" | "warning" | "error";

export default function NoticeDialog({
  title,
  message,
  variant = "info",
  onClose,
  onConfirm,
  onLogin,
  confirmLabel = "Compris",
  cancelLabel = "Annuler",
  destructive = false,
}: {
  title: string;
  message: string;
  variant?: NoticeDialogVariant;
  onClose: () => void;
  onConfirm?: () => void;
  onLogin?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const Icon = variant === "success"
    ? CheckCircle2
    : variant === "warning"
      ? AlertTriangle
      : variant === "error"
        ? CircleAlert
        : Info;
  const iconClass = variant === "success"
    ? "bg-emerald-100 text-emerald-600"
    : variant === "warning"
      ? "bg-amber-100 text-amber-600"
      : variant === "error"
        ? "bg-rose-100 text-rose-600"
        : "bg-blue-100 text-[#143ca8]";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-dialog-title"
        aria-describedby="notice-dialog-message"
        className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-2xl sm:max-w-sm sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-11 sm:rounded-2xl ${iconClass}`}>
            <Icon size={19} className="sm:hidden" />
            <Icon size={22} className="hidden sm:block" />
          </span>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm -mr-2 -mt-2" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <h2 id="notice-dialog-title" className="mt-3 text-base font-bold text-slate-900 sm:mt-4 sm:text-lg">{title}</h2>
        <p id="notice-dialog-message" className="mt-1.5 whitespace-pre-line text-[13px] leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">{message}</p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-5 sm:flex-row sm:justify-end">
          {onLogin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogin();
              }}
              className="btn w-full border-[#143ca8] text-[#143ca8] hover:bg-blue-50 sm:w-auto"
            >
              Se connecter
            </button>
          )}
          {onConfirm && (
            <button type="button" onClick={onClose} className="btn btn-ghost w-full sm:w-auto">
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm ?? onClose}
            className={`btn w-full sm:w-auto ${destructive ? "border-0 bg-rose-600 text-white hover:bg-rose-700" : "border-0 bg-[#143ca8] text-white hover:bg-[#102f85]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
