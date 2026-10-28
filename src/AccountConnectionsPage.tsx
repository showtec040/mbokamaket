import { useEffect, useState } from "react";
import { ChevronLeft, LoaderCircle, ShieldCheck, UserRound, UserRoundCheck, UserRoundPlus, Users } from "lucide-react";
import { supabase } from "./lib/supabase";

type Connection = {
  id: string;
  name: string;
  avatar: string | null;
  accountType: string;
  verified: boolean;
  isFollowing: boolean;
};
type Mode = "followers" | "following";
const PAGE_SIZE = 20;

const fetchConnectionsPage = async (userId: string, mode: Mode, page: number) => {
  if (!supabase) throw new Error("La configuration Supabase est absente.");
  const start = page * PAGE_SIZE;
  const targetColumn = mode === "followers" ? "following_id" : "follower_id";
  const { data: relations, error: relationError } = await supabase
    .from("follows")
    .select("follower_id,following_id,created_at")
    .eq(targetColumn, userId)
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  if (relationError) throw relationError;
  const ids = (relations ?? [])
    .map((row) => String(mode === "followers" ? row.follower_id : row.following_id))
    .filter(Boolean);
  if (ids.length === 0) return { connections: [] as Connection[], hasMore: false };

  const [{ data: profiles, error: profilesError }, { data: followed, error: followedError }] = await Promise.all([
    supabase.from("public_profiles").select("*").in("id", ids),
    mode === "following"
      ? Promise.resolve({ data: ids.map((id) => ({ following_id: id })), error: null })
      : supabase.from("follows").select("following_id").eq("follower_id", userId).in("following_id", ids),
  ]);
  if (profilesError || followedError) throw profilesError || followedError;
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
  const followedIds = new Set((followed ?? []).map((item) => String(item.following_id)));
  const connections = ids.flatMap((id) => {
    const profile = profileMap.get(id);
    if (!profile) return [];
    const name = [profile.business_name, profile.name, profile.full_name, profile.username]
      .find((value) => typeof value === "string" && value.trim())?.trim() || "Compte Mbokamarket";
    return [{
      id,
      name,
      avatar: profile.avatar || null,
      accountType: profile.account_type || "personal",
      verified: Boolean(profile.is_verified),
      isFollowing: followedIds.has(id),
    }];
  });
  return { connections, hasMore: (relations ?? []).length === PAGE_SIZE };
};

export default function AccountConnectionsPage({
  userId,
  onClose,
  onViewListings,
}: {
  userId: string;
  onClose: () => void;
  onViewListings: (id: string, name: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("followers");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchConnectionsPage(userId, mode, 0);
        if (!active) return;
        setConnections(result.connections);
        setHasMore(result.hasMore);
      } catch (loadError) {
        if (!active) return;
        console.error("[follow-list] chargement impossible", loadError);
        setError(loadError instanceof Error && loadError.message.includes("configuration")
          ? loadError.message
          : "Impossible de charger cette liste pour le moment.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [mode, userId]);

  const changeFollow = async (connection: Connection) => {
    if (!supabase || busyIds.includes(connection.id)) return;
    setBusyIds((current) => [...current, connection.id]);
    setError("");
    try {
      const result = connection.isFollowing
        ? await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", connection.id)
        : await supabase.from("follows").insert({ follower_id: userId, following_id: connection.id });
      if (result.error) throw result.error;
      setConnections((current) => current.map((item) => item.id === connection.id
        ? { ...item, isFollowing: !item.isFollowing }
        : item));
    } catch (followError) {
      console.error("[follow-list] mise à jour impossible", followError);
      setError(followError instanceof Error && followError.message
        ? followError.message
        : "Impossible de modifier cet abonnement.");
    } finally {
      setBusyIds((current) => current.filter((id) => id !== connection.id));
    }
  };

  const title = mode === "followers" ? "Mes abonnés" : "Mes abonnements";
  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await fetchConnectionsPage(userId, mode, nextPage);
      setConnections((current) => [...current, ...result.connections]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (loadError) {
      console.error("[follow-list] chargement supplémentaire impossible", loadError);
      setError("Impossible de charger davantage de comptes.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="fixed inset-0 z-[85] flex flex-col overflow-y-auto bg-[#f6f8fc] text-slate-900" aria-label={title}>
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:px-6">
        <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Retour">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#143ca8]">Mon compte</p>
          <h1 className="truncate font-display text-lg font-bold">{title}</h1>
        </div>
        <Users className="mr-1 text-[#143ca8]" size={20} />
      </header>
      <main className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
          {(["followers", "following"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setConnections([]);
                setLoading(true);
                setLoadingMore(false);
                setError("");
                setPage(0);
              }}
              aria-pressed={mode === item}
              className={`btn btn-sm ${mode === item ? "bg-[#143ca8] text-white hover:bg-[#123493]" : "btn-ghost text-slate-600"}`}
            >
              {item === "followers" ? "Abonnés" : "Abonnements"}
            </button>
          ))}
        </div>
        {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-[#143ca8]" /></div>
        ) : connections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <Users className="mx-auto text-slate-300" size={40} />
            <h2 className="mt-3 font-semibold">Aucun résultat</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === "followers" ? "Vous n’avez pas encore d’abonnés." : "Vous ne suivez encore aucun compte."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {connections.map((connection) => (
              <li key={connection.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-50 text-[#143ca8]">
                  {connection.avatar
                    ? <img src={connection.avatar} alt="" className="size-full object-cover" />
                    : <UserRound size={21} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    <span className="truncate">{connection.name}</span>
                    {connection.verified && <ShieldCheck size={14} className="shrink-0 text-emerald-600" aria-label="Compte vérifié" />}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{accountTypeLabel(connection.accountType)}</p>
                  <button
                    type="button"
                    onClick={() => onViewListings(connection.id, connection.name)}
                    className="mt-1 text-xs font-semibold text-[#143ca8] hover:underline"
                  >
                    Voir ses annonces
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void changeFollow(connection)}
                  disabled={busyIds.includes(connection.id) || connection.id === userId}
                  className={`btn btn-sm shrink-0 ${connection.isFollowing ? "btn-outline" : "bg-[#143ca8] text-white hover:bg-[#123493]"}`}
                  aria-label={connection.isFollowing ? `Ne plus suivre ${connection.name}` : `Suivre ${connection.name}`}
                >
                  {busyIds.includes(connection.id)
                    ? <LoaderCircle size={15} className="animate-spin" />
                    : connection.isFollowing
                      ? <><UserRoundCheck size={15} /> Suivi</>
                      : <><UserRoundPlus size={15} /> Suivre</>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!loading && hasMore && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="btn btn-outline mt-4 w-full border-slate-300 bg-white"
          >
            {loadingMore ? <LoaderCircle size={16} className="animate-spin" /> : "Charger plus"}
          </button>
        )}
      </main>
    </section>
  );
}

function accountTypeLabel(accountType: string) {
  const labels: Record<string, string> = {
    personal: "Compte personnel",
    boutique: "Boutique",
    magasin: "Magasin",
    boutique_pro: "Boutique Pro",
    magasin_pro: "Magasin Pro",
    agence_immo: "Agence immobilière",
  };
  return labels[accountType] || "Compte Mbokamarket";
}
