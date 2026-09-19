import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PasswordResetPageProps = { onClose: () => void; onLogin: () => void };

export function PasswordResetPage({ onClose, onLogin }: PasswordResetPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!supabase) return setError("La configuration Supabase est absente.");
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");
    setBusy(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (authError) return setError(authError.message);
    setSuccess(true);
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#143ca8]">Mbokamaket</p><h1 className="mt-1 font-display text-2xl font-bold text-slate-900">Nouveau mot de passe</h1></div><button type="button" onClick={onClose} className="btn btn-ghost btn-circle" aria-label="Fermer"><X size={18} /></button></div>{success ? <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-800">Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</div> : <><p className="mt-4 text-sm leading-6 text-slate-500">Choisissez un nouveau mot de passe pour sécuriser votre compte.</p><PasswordField label="Nouveau mot de passe" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} /><PasswordField label="Confirmer le mot de passe" value={confirmPassword} visible={showConfirmPassword} onChange={setConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button disabled={busy} className="btn btn-primary mt-5 w-full">{busy ? <LoaderCircle className="animate-spin" size={17} /> : "Enregistrer le nouveau mot de passe"}</button></>}<button type="button" onClick={onLogin} className="mt-4 w-full text-sm font-semibold text-[#143ca8]">Retour à la connexion</button></form></div>;
}

function PasswordField({ label, value, visible, onChange, onToggle }: { label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  return <div className="relative mt-3"><input required minLength={8} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} className="input input-bordered w-full pr-12" /><button type="button" onClick={onToggle} className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square" aria-label={visible ? `Masquer ${label.toLowerCase()}` : `Afficher ${label.toLowerCase()}`}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>;
}
