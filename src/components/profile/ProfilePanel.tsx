import { LogOut, Package, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import type { User } from "../../types/marketplace";

type ProfilePanelProps = { user: User; onClose: () => void; onManageProducts: () => void; onManageProfile: () => void; onPublish: () => void; onSignOut: () => void };

export function ProfilePanel({ user, onClose, onManageProducts, onManageProfile, onPublish, onSignOut }: ProfilePanelProps) {
  const displayName = user.fullName || user.email?.split("@")[0] || "Utilisateur";

  return <aside className="fixed right-4 top-20 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-bold">Mon compte</h2><button onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer"><X size={16} /></button></div><div className="mt-5 space-y-2"><div className="flex items-center gap-2"><p className="font-semibold text-slate-900">{displayName}</p>{user.isVerified && <span className="badge gap-1 border-0 bg-emerald-500 text-white"><ShieldCheck size={12} /> Vérifié</span>}</div>{user.username && <p className="text-sm text-slate-500">@{user.username.replace(/^@/, "")}</p>}<p className="truncate text-sm text-slate-400">{user.email}</p></div><button onClick={onManageProducts} className="btn btn-outline mt-5 w-full justify-start"><Package size={16} /> Gérer mes produits</button><button onClick={onManageProfile} className="btn btn-outline mt-3 w-full justify-start"><UserRound size={16} /> Gérer mon profil</button>{user.isVerified && <button onClick={onPublish} className="btn btn-primary mt-3 w-full justify-start bg-[#143ca8]"><Plus size={16} /> Publier une annonce</button>}<button onClick={onSignOut} className="btn btn-outline mt-5 w-full"><LogOut size={16} /> Se déconnecter</button></aside>;
}
