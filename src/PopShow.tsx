/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import NoticeDialog from "./NoticeDialog";
import type { NoticeDialogVariant } from "./NoticeDialog";

type PopShowOptions = {
  title?: string;
  variant?: NoticeDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type DialogRequest = {
  kind: "alert" | "confirm";
  message: string;
  options: PopShowOptions;
  resolve: (confirmed: boolean) => void;
};

type PopShowContextValue = {
  alert: (message: string, options?: PopShowOptions) => Promise<void>;
  confirm: (message: string, options?: PopShowOptions) => Promise<boolean>;
};

const PopShowContext = createContext<PopShowContextValue | null>(null);

export function PopShowProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const activeDialog = useRef<DialogRequest | null>(null);
  const queue = useRef<DialogRequest[]>([]);

  const open = useCallback((kind: DialogRequest["kind"], message: string, options: PopShowOptions) =>
    new Promise<boolean>((resolve) => {
      const request = { kind, message, options, resolve };
      if (activeDialog.current) {
        queue.current.push(request);
      } else {
        activeDialog.current = request;
        setDialog(request);
      }
    }), []);

  const finish = useCallback((confirmed: boolean) => {
    const current = activeDialog.current;
    if (!current) return;
    current.resolve(confirmed);
    const next = queue.current.shift() ?? null;
    activeDialog.current = next;
    setDialog(next);
  }, []);

  const alert = useCallback(async (message: string, options: PopShowOptions = {}) => {
    await open("alert", message, options);
  }, [open]);
  const confirm = useCallback((message: string, options: PopShowOptions = {}) =>
    open("confirm", message, options), [open]);

  return (
    <PopShowContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog && (
        <NoticeDialog
          title={dialog.options.title ?? (dialog.kind === "confirm" ? "Confirmation" : "Information")}
          message={dialog.message}
          variant={dialog.options.variant ?? (dialog.kind === "confirm" ? "warning" : "info")}
          onClose={() => finish(false)}
          onConfirm={dialog.kind === "confirm" ? () => finish(true) : undefined}
          confirmLabel={dialog.options.confirmLabel ?? (dialog.kind === "confirm" ? "Confirmer" : "Compris")}
          cancelLabel={dialog.options.cancelLabel ?? "Annuler"}
          destructive={dialog.options.destructive}
        />
      )}
    </PopShowContext.Provider>
  );
}

export function usePopShow() {
  const context = useContext(PopShowContext);
  if (!context) throw new Error("usePopShow doit être utilisé dans PopShowProvider.");
  return context;
}
