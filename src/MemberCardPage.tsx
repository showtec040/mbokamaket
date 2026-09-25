import { useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "./lib/supabase";

type MemberCard = {
  member_number: string;
  full_name: string | null;
  birth_date: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  city_commune: string | null;
  profession_activity: string | null;
  join_preference: string | null;
  involvement_level: string | null;
  investment_interest: string | null;
  investment_amount: string | null;
  contribution_types: string[] | null;
  contribution_other: string | null;
  motivation: string | null;
  member_photo_path: string | null;
  created_at: string;
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export default function MemberCardPage({ memberNumber, token }: { memberNumber: string; token: string }) {
  const [member, setMember] = useState<MemberCard | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadMember = async () => {
      if (!supabase) {
        if (active) { setError("La page membre est temporairement indisponible."); setLoading(false); }
        return;
      }
      const { data, error: lookupError } = await supabase.rpc("lookup_member_card", {
        p_member_number: memberNumber,
        p_qr_token: token,
      });
      if (!active) return;
      if (lookupError || !data?.[0]) setError("Ce lien membre est invalide ou expiré.");
      else {
        const nextMember = data[0] as MemberCard;
        setMember(nextMember);
        if (nextMember.member_photo_path) {
          const photoPath = nextMember.member_photo_path.trim();
          if (/^https?:\/\//i.test(photoPath)) {
            if (active) setPhotoUrl(photoPath);
          } else {
            const { data: photoData, error: photoError } = await supabase.storage
              .from("manifestation-files")
              .createSignedUrl(photoPath.replace(/^\/+/, ""), 3600);
            if (photoError) console.error("Impossible de charger la photo passeport", photoError);
            if (active && photoData?.signedUrl) setPhotoUrl(photoData.signedUrl);
          }
        }
      }
      setLoading(false);
    };
    void loadMember();
    return () => { active = false; };
  }, [memberNumber, token]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f4f7ff_0%,#ffffff_50%,#eef8f5_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <a href="/" className="font-display text-xl font-bold tracking-tight text-[#143ca8]">MbokaMarket</a>
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500"><LockKeyhole size={15} /> Accès privé</span>
        </header>
        {loading ? (
          <section className="grid min-h-[55vh] place-items-center rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"><LoaderCircle className="animate-spin text-[#143ca8]" size={30} /></section>
        ) : error ? (
          <section className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-12">
            <LockKeyhole className="mx-auto text-red-500" size={42} />
            <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">Accès non autorisé</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Ce lien ne correspond à aucun membre enregistré. Utilisez uniquement le QR code officiel de la carte.</p>
          </section>
        ) : member ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
            <div className="bg-[#143ca8] px-6 py-8 text-white sm:px-10">
              <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-4"><div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white/10" aria-label="Photo passeport du membre">{photoUrl ? <img src={photoUrl} alt={`Photo passeport de ${member.full_name || "du membre"}`} onError={() => setPhotoUrl("")} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-2 text-center text-[10px] text-blue-100">Photo passeport</div>}</div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Carte membre MbokaMarket</p><h1 className="mt-2 font-display text-3xl font-bold">{member.full_name || "Membre MbokaMarket"}</h1></div></div><ShieldCheck size={40} className="shrink-0 text-emerald-300" /></div>
              <p className="mt-5 inline-flex rounded-full bg-white/15 px-3 py-1.5 font-mono text-sm font-bold tracking-wider">N° {member.member_number}</p>
            </div>
            <div className="p-6 sm:p-10">
              <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2"><dl><Detail label="Date de naissance" value={member.birth_date} /><Detail label="Téléphone / WhatsApp" value={member.phone_whatsapp} /><Detail label="E-mail" value={member.email} /></dl><dl><Detail label="Ville / Commune" value={member.city_commune} /><Detail label="Profession / Activité" value={member.profession_activity} /><Detail label="Niveau d’implication" value={member.involvement_level} /></dl></div>
              <div className="mt-7 border-t border-slate-100 pt-6"><h2 className="font-display text-lg font-bold text-slate-900">Participation MbokaMarket</h2><dl className="mt-2"><Detail label="Mode de participation" value={member.join_preference} /><Detail label="Intérêt pour l’investissement" value={member.investment_interest} /><Detail label="Montant indicatif" value={member.investment_amount} /><Detail label="Types de contribution" value={[...(member.contribution_types || []), member.contribution_other].filter(Boolean).join(", ")} /><Detail label="Motivation" value={member.motivation} /></dl></div>
              <p className="mt-8 text-center text-xs leading-5 text-slate-400">Informations consultables uniquement depuis le lien sécurisé associé à la carte de membre.</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
