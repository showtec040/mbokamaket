import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, LoaderCircle, MapPin, PackageCheck, Phone, RefreshCw, Truck, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { usePopShow } from "./PopShow";

type BusinessOrdersUser = {
  id: string;
  role?: string;
  accountType?: string;
  businessOwnerId?: string;
  businessRole?: "seller" | "delivery" | "manager";
};

type BusinessOrderItem = {
  quantity?: number;
  product?: {
    id?: string;
    title?: string;
    price?: number | string;
    currency?: string;
  };
};

type BusinessOrder = {
  id: string;
  buyer_id: string | null;
  buyer_name?: string | null;
  items: BusinessOrderItem[];
  total: number | string;
  payment_currency?: string | null;
  status: "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled";
  created_at: string;
  tracking_code: string;
  payment_status?: "pending" | "confirmed" | null;
  payment_method?: string | null;
  payment_due_at_delivery?: boolean;
  buyer_payment_accepted_at?: string | null;
  buyer_payment_accepted_by?: string | null;
  delivery_zone?: string | null;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  business_stage?: string | null;
  assigned_delivery_id?: string | null;
  seller_id?: string;
};

type BusinessMember = {
  id: string;
  member_id: string;
  role: "seller" | "delivery" | "manager";
  status?: string;
  profile?: {
    name?: string | null;
  } | null;
};

type Props = {
  user: BusinessOrdersUser;
  onClose: () => void;
};

const STAGE_LABELS: Record<string, string> = {
  awaiting_seller: "À confirmer par le vendeur",
  awaiting_owner: "À valider par le propriétaire",
  awaiting_delivery: "À livrer",
  delivered: "Livrée, attente du client",
  completed: "Terminée",
  issue: "Problème signalé",
};

const isMultiUserBusinessAccount = (accountType?: string | null) =>
  accountType === "boutique_pro" || accountType === "magasin_pro";

const getBusinessId = (user: BusinessOrdersUser) =>
  user.businessOwnerId ?? (isMultiUserBusinessAccount(user.accountType) ? user.id : undefined);

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
};

export default function BusinessOrdersPage({ user, onClose }: Props) {
  const { confirm } = usePopShow();
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [deliveryMembers, setDeliveryMembers] = useState<BusinessMember[]>([]);
  const [selectedDeliveryByOrder, setSelectedDeliveryByOrder] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const businessId = useMemo(() => getBusinessId(user), [user]);
  const isOwner = Boolean(user.businessOwnerId === user.id || isMultiUserBusinessAccount(user.accountType));
  const isManager = user.businessRole === "manager";
  const role = user.businessRole ?? (isOwner ? "seller" : undefined) ?? "seller";

  const loadDeliveryMembers = useCallback(async (currentBusinessId: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("business_memberships")
      .select("id,member_id,role,status")
      .eq("business_id", currentBusinessId)
      .eq("status", "active")
      .in("role", ["seller", "delivery", "manager"]);

    if (error) throw error;
    const memberIds = (data ?? []).map((member) => member.member_id).filter(Boolean);
    if (!memberIds.length) {
      setDeliveryMembers([]);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id,name")
      .in("id", memberIds);

    if (profilesError) throw profilesError;
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    setDeliveryMembers((data ?? []).map((member) => ({
      id: member.id,
      member_id: member.member_id,
      role: member.role,
      status: member.status,
      profile: profileMap.get(member.member_id) ?? null,
    })).filter((member) => member.role === "delivery"));
  }, []);

  const loadOrders = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("La configuration Supabase est absente.");
      setLoading(false);
      return;
    }
    if (!businessId) {
      setErrorMessage("Aucun compte d’entreprise autorisé n’est associé à ce profil.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as BusinessOrder[]);
      await loadDeliveryMembers(businessId);
    } catch (loadError) {
      setErrorMessage(loadError instanceof Error ? loadError.message : "Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, [businessId, loadDeliveryMembers]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOrders(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (!supabase || !businessId) return;
    const client = supabase;
    const channel = client
      .channel(`web-business-orders-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `seller_id=eq.${businessId}` },
        () => { void loadOrders(); },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[business-orders] synchronisation temps réel indisponible", status);
        }
      });
    return () => { void client.removeChannel(channel); };
  }, [businessId, loadOrders]);

  const relevantOrders = useMemo(() => orders.filter((order) => {
    if (!businessId || order.seller_id !== businessId) return false;
    if (order.status === "Cancelled") return isOwner || isManager;
    if (isOwner) return ["awaiting_seller", "awaiting_owner", "issue"].includes(order.business_stage || "");
    if (role === "seller") return ["awaiting_seller", "awaiting_owner"].includes(order.business_stage || "");
    if (role === "delivery") return order.assigned_delivery_id === user.id && order.business_stage === "awaiting_delivery";
    if (role === "manager") {
      return ["awaiting_seller", "awaiting_owner", "issue"].includes(order.business_stage || "")
        || (order.assigned_delivery_id === user.id && order.business_stage === "awaiting_delivery");
    }
    return false;
  }), [businessId, isManager, isOwner, orders, role, user.id]);

  const confirmBuyerPaymentAcceptance = async (order: BusinessOrder) => {
    if (!await confirm("Confirmez-vous avoir contacté l’acheteur et obtenu son accord sur le paiement à la livraison ?", {
      confirmLabel: "Confirmer l’accord",
    })) return;
    setWorkingOrderId(order.id);
    setErrorMessage("");
    setNotice("");

    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { error } = await supabase.rpc("confirm_business_buyer_payment_acceptance", { p_order_id: order.id });
      if (error) throw error;
      setOrders((current) => current.map((item) => item.id === order.id
        ? {
            ...item,
            buyer_payment_accepted_at: item.buyer_payment_accepted_at ?? new Date().toISOString(),
            buyer_payment_accepted_by: item.buyer_payment_accepted_by ?? user.id,
          }
        : item));
      setNotice("L’accord de paiement a été enregistré. Vous pouvez maintenant attribuer la livraison.");
    } catch (error) {
      setErrorMessage(getActionErrorMessage(error, "Impossible d’enregistrer l’accord de paiement."));
    } finally {
      setWorkingOrderId(null);
    }
  };

  const confirmAvailability = async (order: BusinessOrder) => {
    setWorkingOrderId(order.id);
    setErrorMessage("");
    setNotice("");

    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { error } = await supabase.rpc("confirm_business_order_availability", { p_order_id: order.id });
      if (error) throw error;
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, business_stage: "awaiting_owner" } : item));
      setNotice("La disponibilité a été confirmée. L’équipe de validation peut maintenant poursuivre.");
    } catch (error) {
      const actionError = getActionErrorMessage(error, "Impossible de confirmer la disponibilité.");
      if (supabase && businessId) {
        const { data, error: refreshError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", order.id)
          .eq("seller_id", businessId)
          .maybeSingle();
        if (refreshError) {
          console.error("[business-orders] actualisation de la commande après confirmation impossible", refreshError);
        } else if (data && (data.business_stage !== "awaiting_seller" || data.status === "Cancelled")) {
          setOrders((current) => current.map((item) => item.id === order.id ? data as BusinessOrder : item));
          setNotice("Cette commande avait déjà été traitée. Son état a été actualisé.");
          return;
        }
      }
      setErrorMessage(actionError);
    } finally {
      setWorkingOrderId(null);
    }
  };

  const assignDelivery = async (order: BusinessOrder) => {
    const deliveryId = selectedDeliveryByOrder[order.id];
    if (!deliveryId) {
      setErrorMessage("Sélectionnez un livreur actif avant de valider la commande.");
      return;
    }
    setWorkingOrderId(order.id);
    setErrorMessage("");
    setNotice("");

    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { error } = await supabase.rpc("approve_business_order", { p_order_id: order.id, p_delivery_id: deliveryId });
      if (error) throw error;
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, business_stage: "awaiting_delivery", assigned_delivery_id: deliveryId } : item));
      setNotice("La commande a été attribuée au livreur sélectionné.");
    } catch (error) {
      setErrorMessage(getActionErrorMessage(error, "Impossible d’attribuer le livreur."));
    } finally {
      setWorkingOrderId(null);
    }
  };

  const completeDelivery = async (order: BusinessOrder) => {
    setWorkingOrderId(order.id);
    setErrorMessage("");
    setNotice("");

    try {
      if (!supabase) throw new Error("La configuration Supabase est absente.");
      const { error } = await supabase.rpc("complete_business_delivery", {
        p_order_id: order.id,
        p_proof_path: null,
        p_issue: null,
      });
      if (error) throw error;
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, business_stage: "delivered", status: "Delivered" } : item));
      setNotice("La livraison a été confirmée et la commande est en attente de validation par l’acheteur.");
    } catch (error) {
      setErrorMessage(getActionErrorMessage(error, "Impossible de confirmer la livraison."));
    } finally {
      setWorkingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f8fc] text-slate-900" role="dialog" aria-modal="true" aria-label="Commandes professionnelles">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer">
            <X size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold">Commandes professionnelles</h1>
            <p className="text-xs text-slate-500">{relevantOrders.length} commande(s) à traiter</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} disabled={loading} className="btn btn-ghost btn-circle btn-sm" aria-label="Actualiser">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        {errorMessage && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
        {notice && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{notice}</p>}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
            <LoaderCircle className="animate-spin" size={19} /> Chargement des commandes...
          </div>
        ) : !relevantOrders.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <ClipboardList className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 font-bold">Aucune commande à traiter</h2>
          </section>
        ) : (
          <div className="space-y-4">
            {relevantOrders.map((order) => {
              const hasCoordinates = typeof order.delivery_latitude === "number" && typeof order.delivery_longitude === "number";
              const items = Array.isArray(order.items) ? order.items : [];
              const currency = order.payment_currency || items[0]?.product?.currency || "FC";
              const total = Number(order.total) || 0;
              const paymentReadyForAssignment = order.payment_due_at_delivery
                ? order.payment_status === "confirmed" || Boolean(order.buyer_payment_accepted_at)
                : order.payment_status === "confirmed";

              return (
                <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#143ca8]">{order.tracking_code || order.id}</p>
                      <h2 className="mt-1 font-display text-lg font-bold">Commande de {order.buyer_name || "un acheteur"}</h2>
                      <p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className={`badge ${order.status === "Delivered" ? "badge-success" : order.status === "Cancelled" ? "badge-error" : "badge-primary"}`}>
                      {STAGE_LABELS[order.business_stage || "awaiting_seller"] || order.status}
                    </span>
                  </div>

                  <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                    {items.map((item, index) => {
                      const quantity = Number(item.quantity) || 0;
                      const price = Number(item.product?.price) || 0;
                      return (
                        <div key={`${item.product?.id || order.id}-${index}`} className="flex justify-between gap-4 py-3 text-sm">
                          <span>{quantity} × {item.product?.title || "Article"}</span>
                          <strong className="shrink-0">{(quantity * price).toLocaleString("fr-FR")} {item.product?.currency || currency}</strong>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="text-slate-500">Total : </span><strong>{total.toLocaleString("fr-FR")} {currency}</strong></p>
                    <p><span className="text-slate-500">Paiement : </span>{order.payment_status === "confirmed" ? "Confirmé" : order.payment_method || "À confirmer"}</p>
                    {order.delivery_zone && <p><span className="text-slate-500">Zone : </span>{order.delivery_zone}</p>}
                    {order.delivery_address && <p className="sm:col-span-2"><span className="text-slate-500">Adresse : </span>{order.delivery_address}</p>}
                    {order.delivery_phone && <p><span className="text-slate-500">Téléphone : </span>{order.delivery_phone}</p>}
                  </div>

                  {(isOwner || isManager) && order.business_stage === "awaiting_seller" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void confirmAvailability(order)} disabled={workingOrderId === order.id} className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700">
                        {workingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                        Confirmer la disponibilité
                      </button>
                    </div>
                  )}

                  {(isOwner || isManager) && ["awaiting_owner", "issue"].includes(order.business_stage || "") && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {order.payment_due_at_delivery && order.payment_status !== "confirmed" && !order.buyer_payment_accepted_at && (
                        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm leading-5 text-amber-900">
                            Contactez l’acheteur au numéro de livraison pour confirmer son accord avant d’attribuer le livreur.
                          </p>
                          {order.delivery_phone ? (
                            <a
                              href={`tel:${order.delivery_phone.replace(/[^\d+]/g, "")}`}
                              className="btn btn-sm border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                            >
                              <Phone size={15} /> Appeler {order.delivery_phone}
                            </a>
                          ) : (
                            <p role="status" className="text-sm font-medium text-amber-900">
                              Aucun numéro de livraison n’est renseigné pour cette commande.
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => void confirmBuyerPaymentAcceptance(order)}
                            disabled={workingOrderId === order.id}
                            className="btn btn-sm border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200"
                          >
                            {workingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                            Confirmer l’accord de l’acheteur
                          </button>
                        </div>
                      )}
                      {order.buyer_payment_accepted_at && (
                        <p role="status" className="text-sm text-emerald-800">
                          L’accord de l’acheteur a été confirmé. Vous pouvez attribuer la livraison.
                        </p>
                      )}
                      {!paymentReadyForAssignment ? (
                        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                          {order.payment_due_at_delivery
                            ? "Appelez l’acheteur et enregistrez son accord avant d’attribuer le livreur."
                            : "Confirmez le paiement anticipé avant d’attribuer le livreur."}
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 font-medium text-slate-700">
                            <Truck size={17} className="text-[#143ca8]" />
                            Livreur à affecter
                          </div>
                          <select
                            value={selectedDeliveryByOrder[order.id] ?? ""}
                            onChange={(event) => setSelectedDeliveryByOrder((current) => ({ ...current, [order.id]: event.target.value }))}
                            className="select select-bordered w-full"
                          >
                            <option value="">Choisir un livreur</option>
                            {deliveryMembers.map((member) => (
                              <option key={member.id} value={member.member_id}>
                                {member.profile?.name || member.member_id}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => void assignDelivery(order)} disabled={workingOrderId === order.id} className="btn btn-sm bg-[#143ca8] text-white">
                            {workingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                            Valider la commande & attribuer le livreur
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {role === "delivery" && order.business_stage === "awaiting_delivery" && order.assigned_delivery_id === user.id && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void completeDelivery(order)} disabled={workingOrderId === order.id} className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700">
                        {workingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                        Confirmer la livraison
                      </button>
                      {hasCoordinates && (
                        <a
                          className="btn btn-outline btn-sm gap-2"
                          href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_latitude},${order.delivery_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin size={15} /> Voir le trajet
                        </a>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
