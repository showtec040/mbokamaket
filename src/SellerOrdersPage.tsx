import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type User = {
  id: string;
  role?: string;
  accountType?: string;
};

type SellerOrderItem = {
  quantity?: number;
  product?: {
    id?: string;
    title?: string;
    price?: number | string;
    currency?: string;
  };
};

type SellerOrder = {
  id: string;
  buyer_id: string;
  buyer_name?: string | null;
  items: SellerOrderItem[];
  total: number | string;
  payment_currency?: string | null;
  status: "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled";
  created_at: string;
  tracking_code: string;
  payment_status: "pending" | "confirmed";
  payment_method?: string | null;
  payment_due_at_delivery?: boolean;
  delivery_zone?: string | null;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  business_stage?: string | null;
};

type BuyerProfile = {
  id: string;
  name?: string | null;
  phone?: string | null;
};

type Props = {
  user: User;
  onClose: () => void;
};

const STATUS_LABELS: Record<SellerOrder["status"], string> = {
  Pending: "En attente",
  Confirmed: "Confirmée",
  Shipped: "Expédiée",
  Delivered: "Livrée",
  Cancelled: "Annulée",
};

export default function SellerOrdersPage({ user, onClose }: Props) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [buyers, setBuyers] = useState<Map<string, BuyerProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const isSimpleRetail = user.accountType === "boutique" || user.accountType === "magasin";
  const pendingCount = useMemo(() => orders.filter((order) => order.status === "Pending").length, [orders]);

  const loadOrders = useCallback(async () => {
    if (!supabase) {
      setErrorMessage("La configuration Supabase est absente.");
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
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as SellerOrder[];
      setOrders(rows);
      const buyerIds = Array.from(new Set(rows.map((order) => order.buyer_id).filter(Boolean)));
      if (buyerIds.length > 0) {
        try {
          const { data: profileRows, error: profilesError } = await supabase
            .from("public_profiles")
            .select("id,name,phone")
            .in("id", buyerIds);
          if (profilesError) throw profilesError;
          setBuyers(new Map(((profileRows ?? []) as BuyerProfile[]).map((profile) => [profile.id, profile])));
        } catch (profilesError) {
          console.error("[seller-orders] profils acheteur indisponibles", profilesError);
          setBuyers(new Map());
          setNotice("Les coordonnées publiques des acheteurs n’ont pas pu être chargées.");
        }
      } else {
        setBuyers(new Map());
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les commandes reçues.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateOrder = async (
    order: SellerOrder,
    operation: "confirm" | "reject" | "deliver",
  ) => {
    if (workingOrderId) return;
    if (!supabase) {
      setErrorMessage("La configuration Supabase est absente.");
      return;
    }
    const actionText = operation === "confirm"
      ? isSimpleRetail ? "confirmer la disponibilité" : "confirmer le paiement"
      : operation === "reject" ? "refuser cette commande" : "marquer cette commande comme livrée";
    if (!window.confirm(`Voulez-vous ${actionText} ${order.tracking_code || order.id} ?`)) return;

    const values = operation === "confirm"
      ? isSimpleRetail
        ? { status: "Confirmed" }
        : { status: "Confirmed", payment_status: "confirmed" }
      : operation === "reject"
        ? { status: "Cancelled" }
        : { status: "Delivered", payment_status: "confirmed" };
    setWorkingOrderId(order.id);
    setErrorMessage("");
    setNotice("");
    try {
      let query = supabase
        .from("orders")
        .update(values)
        .eq("id", order.id)
        .eq("seller_id", user.id);
      query = operation === "deliver"
        ? query.eq("status", "Confirmed")
        : query.eq("status", "Pending").eq("payment_status", "pending");
      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("Cette commande a déjà été traitée ou ne vous appartient pas.");
      }

      const nextStatus = operation === "reject" ? "Cancelled" : operation === "deliver" ? "Delivered" : "Confirmed";
      setOrders((current) => current.map((item) => item.id === order.id
        ? {
            ...item,
            status: nextStatus,
            payment_status: (operation === "confirm" && !isSimpleRetail) || operation === "deliver"
              ? "confirmed"
              : item.payment_status,
          }
        : item));

      const paid = operation === "confirm" && !isSimpleRetail;
      const notificationType = paid
        ? "ORDER_PAYMENT_CONFIRMED"
        : operation === "reject"
          ? "ORDER_PAYMENT_REJECTED"
          : operation === "confirm"
            ? "ORDER_AVAILABILITY_CONFIRMED"
            : "ORDER_DELIVERY_COMPLETED";
      const notificationTitle = paid
        ? "Paiement confirmé"
        : operation === "reject"
          ? "Commande refusée"
          : operation === "confirm"
            ? "Disponibilité confirmée"
            : "Commande livrée";
      const notificationMessage = paid
        ? `Le vendeur a confirmé le paiement de votre commande ${order.tracking_code || order.id}.`
        : operation === "reject"
          ? `Le vendeur n’a pas pu confirmer votre commande ${order.tracking_code || order.id}. Contactez-le pour convenir de la suite.`
          : operation === "confirm"
            ? `La disponibilité de votre commande ${order.tracking_code || order.id} a été confirmée.`
            : `La commande ${order.tracking_code || order.id} a été marquée comme livrée.`;
      let persistNotification = true;
      if (paid || operation === "reject") {
        try {
          const { error: notificationError } = await supabase.from("notifications").insert({
            user_id: order.buyer_id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            data: { route: "OrderHistory", orderId: order.id },
            event_id: `${notificationType.toLowerCase()}:${order.id}`,
          });
          if (notificationError) throw notificationError;
          persistNotification = false;
        } catch (notificationError) {
          console.error("[seller-orders] enregistrement de la notification acheteur échoué", notificationError);
        }
      }

      try {
        const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: order.buyer_id,
            title: notificationTitle,
            body: notificationMessage,
            tag: notificationType.toLowerCase(),
            persist_notification: persistNotification,
            notification_type: notificationType,
            event_id: `${notificationType.toLowerCase()}:${order.id}`,
            data: { route: "OrderHistory", orderId: order.id },
          },
        });
        if (pushError) throw pushError;
      } catch (notificationError) {
        console.error("[seller-orders] mise à jour faite, notification acheteur échouée", notificationError);
        setNotice("La commande a été mise à jour, mais l’acheteur n’a pas pu être notifié.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de mettre à jour cette commande.");
    } finally {
      setWorkingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f8fc] text-slate-900" role="dialog" aria-modal="true" aria-label="Commandes reçues">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer">
            <X size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold">Commandes reçues</h1>
            <p className="text-xs text-slate-500">{pendingCount} commande(s) en attente</p>
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
        ) : orders.length === 0 && !errorMessage ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <ClipboardList className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 font-bold">Aucune commande reçue</h2>
          </section>
        ) : orders.map((order) => {
          const buyer = buyers.get(order.buyer_id);
          const items = Array.isArray(order.items) ? order.items : [];
          const total = Number(order.total) || 0;
          const currency = order.payment_currency || items[0]?.product?.currency || "FC";
          const isBusinessOrder = Boolean(order.business_stage);
          const pending = order.status === "Pending";
          const canReject = pending && order.payment_status === "pending" && !isBusinessOrder;
          const canConfirm = canReject;
          const canDeliver = order.status === "Confirmed" && !isBusinessOrder;
          const coordinatesAvailable = order.delivery_latitude != null && order.delivery_longitude != null;

          return (
            <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#143ca8]">{order.tracking_code || order.id}</p>
                  <h2 className="mt-1 font-display text-lg font-bold">Commande de {order.buyer_name || buyer?.name || "un acheteur"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <span className={`badge ${order.status === "Delivered" ? "badge-success" : order.status === "Cancelled" ? "badge-error" : "badge-primary"}`}>
                  {STATUS_LABELS[order.status]}
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
                <p><span className="text-slate-500">Paiement : </span>{order.payment_status === "confirmed" ? "Confirmé" : order.payment_method || "À convenir"}</p>
                {buyer?.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" />{buyer.phone}</p>}
                {order.delivery_zone && <p>Zone : {order.delivery_zone}</p>}
                {order.delivery_address && <p className="sm:col-span-2">Adresse : {order.delivery_address}</p>}
                {order.delivery_phone && <p>Téléphone de livraison : {order.delivery_phone}</p>}
              </div>

              {isBusinessOrder && (
                <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm text-blue-800">
                  Cette commande suit le circuit professionnel de l’application et ne peut pas être traitée depuis ce panneau.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {coordinatesAvailable && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_latitude},${order.delivery_longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <MapPin size={15} /> Position GPS
                  </a>
                )}
                {buyer?.phone && (
                  <a href={`tel:${buyer.phone.replace(/[^\d+]/g, "")}`} className="btn btn-outline btn-sm gap-2">
                    <Phone size={15} /> Appeler l’acheteur
                  </a>
                )}
                {canConfirm && (
                  <button
                    type="button"
                    onClick={() => void updateOrder(order, "confirm")}
                    disabled={workingOrderId === order.id}
                    className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {workingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                    {isSimpleRetail ? "Confirmer la disponibilité" : "Confirmer le paiement"}
                  </button>
                )}
                {canReject && (
                  <button
                    type="button"
                    onClick={() => void updateOrder(order, "reject")}
                    disabled={workingOrderId === order.id}
                    className="btn btn-outline btn-sm border-red-200 text-red-700"
                  >
                    <X size={15} /> Refuser la commande
                  </button>
                )}
                {canDeliver && (
                  <button
                    type="button"
                    onClick={() => void updateOrder(order, "deliver")}
                    disabled={workingOrderId === order.id}
                    className="btn btn-sm bg-[#143ca8] text-white"
                  >
                    {workingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                    Marquer comme livrée
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
