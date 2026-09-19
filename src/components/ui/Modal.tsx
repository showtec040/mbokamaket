import type { ReactNode } from "react";

export function Modal({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">{children}</div>;
}
