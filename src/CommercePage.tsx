import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Package,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { getCommerceCartItemKey } from "./commerceCartUtils";
import {
  getCartItemUnitPrice,
  getCartProductQuantity,
  getCartSubtotal,
  hasWholesaleOffer,
  WHOLESALE_MIN_QUANTITY,
} from "./wholesalePricing";

const FC_PER_USD = 2300;
const DELIVERY_OR_PICKUP_LABEL = "À la livraison ou au retrait";
type DeliverySettings = {
  enabled: boolean;
  baseFee: number;
  zoneFees?: Record<string, number>;
};
type PaymentCondition = "delivery_or_pickup" | "prepaid";
type SellerPaymentSettings = {
  enabled?: boolean;
  operator?: string;
  phoneNumber?: string;
  instructions?: string;
  paymentConditions?: PaymentCondition[];
};
type PrepaidPaymentDetails = {
  operator?: string | null;
  phoneNumber?: string | null;
  instructions?: string | null;
} | null;
export type CommerceProduct = {
  id: string;
  title: string;
  price: number;
  wholesalePrice?: number | null;
  currency: string;
  image: string;
  sellerId: string;
  seller: string;
  categoryId: string;
  stock?: number;
  specifications?: Record<string, string>;
  sellerAccountType?: string;
  deliverySettings?: DeliverySettings | null;
};

export type CommerceCartItem = {
  product: CommerceProduct;
  quantity: number;
  selectedSpecifications?: Record<string, string>;
};

type CommerceUser = {
  id: string;
  fullName?: string;
  phone?: string;
  address?: string;
  isAnonymous?: boolean;
};

type CommerceOrder = {
  id: string;
  buyer_id: string;
  seller_id: string;
  items: CommerceCartItem[];
  total: number;
  status: string;
  created_at: string;
  tracking_code: string;
  delivery_zone?: string | null;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_due_at_delivery?: boolean;
};

type Props = {
  view: "cart" | "orders";
  user: CommerceUser | null;
  items: CommerceCartItem[];
  onItemsChange: (items: CommerceCartItem[]) => void;
  onClose: () => void;
  onRequestLogin: () => void;
  onOrderCreated: (items: CommerceCartItem[]) => void;
};

const getCurrency = (currency?: string) =>
  String(currency || "FC").trim().toUpperCase() === "USD" ? "USD" : "FC";

const getDeliveryFee = (
  settings: DeliverySettings | null | undefined,
  currency: string,
  zone: string,
) => {
  if (!settings?.enabled) return 0;
  const normalizedZone = zone.trim().toLocaleLowerCase("fr-FR");
  const matchingZoneFee = normalizedZone
    ? Object.entries(settings.zoneFees ?? {}).find(([configuredZone]) =>
        configuredZone.trim().toLocaleLowerCase("fr-FR") === normalizedZone,
      )?.[1]
    : undefined;
  const feeInFc = Math.max(0, Number(matchingZoneFee ?? settings.baseFee) || 0);
  return getCurrency(currency) === "USD"
    ? Math.round((feeInFc / FC_PER_USD) * 100) / 100
    : feeInFc;
};

const formatAmount = (amount: number, currency: string) =>
  `${amount.toLocaleString("fr-FR")} ${currency}`;

const groupCartItems = (items: CommerceCartItem[]) => {
  const groups = new Map<string, CommerceCartItem[]>();
  for (const item of items) {
    const currency = getCurrency(item.product.currency);
    const key = `${item.product.sellerId || `product:${item.product.id}`}:${currency}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups, ([key, sellerItems]) => ({
    key,
    sellerId: sellerItems[0].product.sellerId,
    seller: sellerItems[0].product.seller || "Vendeur Mbokamaket",
    currency: getCurrency(sellerItems[0].product.currency),
    items: sellerItems,
    subtotal: getCartSubtotal(sellerItems),
    deliverySettings: sellerItems[0].product.deliverySettings,
    accountType: sellerItems[0].product.sellerAccountType,
  }));
};

const selectedSpecificationsLabel = (selection?: Record<string, string>) =>
  Object.entries(selection ?? {}).map(([label, value]) => `${label.replace(" disponibles", "")} : ${value}`).join(" · ");

const getCommerceErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
};

export default function CommercePage({
  view,
  user,
  items,
  onItemsChange,
  onClose,
  onRequestLogin,
  onOrderCreated,
}: Props) {
  const [screenState, setScreenState] = useState<{ view: Props["view"]; screen: "cart" | "checkout" | "orders" }>(() => ({ view, screen: view }));
  const screen = screenState.view === view ? screenState.screen : view;
  const setScreen = (nextScreen: "cart" | "checkout" | "orders") => setScreenState({ view, screen: nextScreen });
  const [checkoutKey, setCheckoutKey] = useState<string | null>(null);
  const [guestBuyer, setGuestBuyer] = useState<CommerceUser | null>(null);
  const [guestName, setGuestName] = useState(user?.isAnonymous ? user.fullName ?? "" : "");
  const [guestPhone, setGuestPhone] = useState(user?.isAnonymous ? user.phone ?? "" : "");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const captchaRef = useRef<TurnstileInstance | null>(null);
  const [deliveryZone, setDeliveryZone] = useState(user?.address ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address ?? "");
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone ?? "");
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [sellerPaymentSettings, setSellerPaymentSettings] = useState<SellerPaymentSettings | null>(null);
  const [businessPrepaidAvailable, setBusinessPrepaidAvailable] = useState(false);
  const [prepaidPaymentDetails, setPrepaidPaymentDetails] = useState<PrepaidPaymentDetails>(null);
  const [paymentChoice, setPaymentChoice] = useState<"seller_condition" | "mobile_money" | null>(null);
  const [selectedPaymentCondition, setSelectedPaymentCondition] = useState<PaymentCondition | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [paymentSettingsSellerId, setPaymentSettingsSellerId] = useState<string | null>(null);
  const [paymentSettingsError, setPaymentSettingsError] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const errorMessageRef = useRef<HTMLParagraphElement | null>(null);
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const activeBuyer = user ?? guestBuyer;
  const activeBuyerId = activeBuyer?.id;
  const guestCheckout = !user || Boolean(user.isAnonymous);
  const captchaSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";
  const groups = useMemo(() => groupCartItems(items), [items]);
  const checkoutGroup = groups.find((group) => group.key === checkoutKey) ?? null;
  const simpleRetailSeller = checkoutGroup?.accountType === "boutique" || checkoutGroup?.accountType === "magasin";
  const deliveryFee = checkoutGroup
    ? getDeliveryFee(checkoutGroup.deliverySettings, checkoutGroup.currency, deliveryZone)
    : 0;
  const checkoutTotal = (checkoutGroup?.subtotal ?? 0) + deliveryFee;
  const requiresBusinessVerification = ["boutique", "magasin", "boutique_pro", "magasin_pro"].includes(checkoutGroup?.accountType || "");
  const checkoutPaymentSettingsLoading = paymentSettingsLoading
    || Boolean(checkoutGroup && paymentSettingsSellerId !== checkoutGroup.sellerId);
  const configuredPaymentConditions = sellerPaymentSettings?.paymentConditions ?? [];
  const paymentConditions: PaymentCondition[] = simpleRetailSeller
    ? ["delivery_or_pickup", ...(businessPrepaidAvailable ? ["prepaid" as const] : [])]
    : configuredPaymentConditions.filter((condition) => condition !== "prepaid" || !requiresBusinessVerification || businessPrepaidAvailable);
  if (businessPrepaidAvailable && !paymentConditions.includes("prepaid")) paymentConditions.push("prepaid");
  if (requiresBusinessVerification && paymentConditions.length === 0) paymentConditions.push("delivery_or_pickup");
  const mobileMoneyEnabled = Boolean(
    sellerPaymentSettings?.enabled
      && !simpleRetailSeller
      && (!requiresBusinessVerification || businessPrepaidAvailable),
  );
  const effectivePaymentChoice = simpleRetailSeller ? "seller_condition" : paymentChoice;
  const effectivePaymentCondition = simpleRetailSeller
    ? selectedPaymentCondition === "prepaid" && businessPrepaidAvailable ? "prepaid" : "delivery_or_pickup"
    : selectedPaymentCondition;
  const requiresPaymentProof = effectivePaymentChoice === "mobile_money"
    || (effectivePaymentChoice === "seller_condition" && effectivePaymentCondition === "prepaid");

  useEffect(() => {
    if (errorMessage && screen === "checkout") {
      errorMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errorMessage, screen]);

  useEffect(() => {
    if (screen !== "checkout" || !checkoutGroup || !supabase) return;
    const client = supabase;
    let active = true;
    const loadPaymentSettings = async () => {
      setPaymentSettingsLoading(true);
      setPaymentSettingsSellerId(null);
      setPaymentSettingsError("");
      setSellerPaymentSettings(null);
      setBusinessPrepaidAvailable(false);
      setPrepaidPaymentDetails(null);
      setSelectedPaymentCondition(null);
      setPaymentChoice(null);
      setPaymentProofFile(null);
      try {
        const { data: profile, error: profileError } = await client
          .from("public_profiles")
          .select("account_type,mobile_money_settings")
          .eq("id", checkoutGroup.sellerId)
          .maybeSingle();
        if (profileError) throw profileError;

        const accountType = profile?.account_type || checkoutGroup.accountType || "";
        const settings = (profile?.mobile_money_settings ?? null) as SellerPaymentSettings | null;
        const isBusiness = ["boutique", "magasin", "boutique_pro", "magasin_pro"].includes(accountType);
        let prepaidAvailable = false;
        let prepaidDetails: PrepaidPaymentDetails = null;
        if (isBusiness) {
          const { data: availability, error: availabilityError } = await client.rpc("business_prepaid_available", {
            p_seller_id: checkoutGroup.sellerId,
          });
          if (availabilityError) throw availabilityError;
          prepaidAvailable = availability === true;
          if (prepaidAvailable) {
            const { data: details, error: detailsError } = await client.rpc("business_prepaid_payment_details", {
              p_seller_id: checkoutGroup.sellerId,
            });
            if (detailsError) throw detailsError;
            prepaidDetails = (Array.isArray(details) ? details[0] : details) as PrepaidPaymentDetails;
            prepaidAvailable = Boolean(prepaidDetails?.phoneNumber);
          }
        }
        if (!active) return;
        setSellerPaymentSettings(settings);
        setBusinessPrepaidAvailable(prepaidAvailable);
        setPrepaidPaymentDetails(prepaidDetails);
        const availableConditions: PaymentCondition[] = accountType === "boutique" || accountType === "magasin"
          ? ["delivery_or_pickup", ...(prepaidAvailable ? ["prepaid" as const] : [])]
          : (settings?.paymentConditions ?? []).filter((condition) =>
            condition !== "prepaid" || !isBusiness || prepaidAvailable,
          );
        if (prepaidAvailable && !availableConditions.includes("prepaid")) availableConditions.push("prepaid");
        if (isBusiness && availableConditions.length === 0) availableConditions.push("delivery_or_pickup");
        setSelectedPaymentCondition(availableConditions[0] ?? null);
        setPaymentChoice(availableConditions.length
          ? "seller_condition"
          : settings?.enabled && accountType !== "boutique" && accountType !== "magasin"
            ? "mobile_money"
            : null);
      } catch (settingsError) {
        if (!active) return;
        console.error("[checkout] impossible de charger les conditions de paiement", settingsError);
        setPaymentSettingsError(getCommerceErrorMessage(settingsError, "Impossible de charger les conditions de paiement du vendeur."));
      } finally {
        if (active) {
          setPaymentSettingsSellerId(checkoutGroup.sellerId);
          setPaymentSettingsLoading(false);
        }
      }
    };
    const timer = window.setTimeout(() => { void loadPaymentSettings(); }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkoutGroup, screen]);

  useEffect(() => {
    if (screen !== "orders" || !activeBuyerId) return;
    const client = supabase;
    if (!client) {
      const timer = window.setTimeout(() => setErrorMessage("La configuration de la boutique n’est pas disponible."), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    const loadOrders = async () => {
      setOrdersLoading(true);
      setErrorMessage("");
      try {
        const { data, error } = await client
          .from("orders")
          .select("*")
          .eq("buyer_id", activeBuyerId)
          .order("created_at", { ascending: false });
        if (!active) return;
        if (error) {
          setErrorMessage(error.message);
          setOrders([]);
        } else {
          setOrders((data ?? []) as CommerceOrder[]);
        }
      } catch (loadError) {
        if (!active) return;
        setErrorMessage(loadError instanceof Error ? loadError.message : "Impossible de charger les commandes.");
        setOrders([]);
      } finally {
        if (active) setOrdersLoading(false);
      }
    };
    const timer = window.setTimeout(() => { void loadOrders(); }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [screen, activeBuyerId]);

  const removeItem = (itemToRemove: CommerceCartItem) => {
    const itemKey = getCommerceCartItemKey(itemToRemove);
    onItemsChange(items.filter((item) => getCommerceCartItemKey(item) !== itemKey));
  };

  const updateQuantity = (itemToUpdate: CommerceCartItem, quantity: number) => {
    const itemKey = getCommerceCartItemKey(itemToUpdate);
    const quantityForOtherVariants = items
      .filter((item) => item.product.id === itemToUpdate.product.id && getCommerceCartItemKey(item) !== itemKey)
      .reduce((total, item) => total + item.quantity, 0);
    const remainingStock = Math.max(0, Number(itemToUpdate.product.stock || 1000) - quantityForOtherVariants);
    const maximum = Math.max(1, remainingStock);
    const nextQuantity = Math.max(1, Math.min(maximum, Math.floor(quantity) || 1));
    onItemsChange(items.map((item) => getCommerceCartItemKey(item) === itemKey
      ? { ...item, quantity: nextQuantity }
      : item));
  };

  const beginCheckout = (groupKey: string) => {
    const group = groups.find((item) => item.key === groupKey);
    if (!group?.sellerId) {
      setErrorMessage("Le vendeur de cet article est introuvable. Vous ne pouvez pas passer commande.");
      return;
    }
    setCheckoutKey(groupKey);
    setDeliveryZone(user?.address ?? "");
    setDeliveryAddress(user?.address ?? "");
    setDeliveryPhone(user?.phone ?? guestPhone);
    if (user?.isAnonymous) {
      setGuestName(user.fullName ?? guestName);
      setGuestPhone(user.phone ?? guestPhone);
    }
    setDeliveryCoordinates(null);
    setLocationError("");
    setErrorMessage("");
    setScreen("checkout");
  };

  const captureDeliveryLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n’est pas disponible dans ce navigateur.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDeliveryCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Autorisez la géolocalisation pour joindre votre position à la commande."
          : "Impossible de récupérer votre position actuelle. Vous pouvez poursuivre sans GPS.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!supabase) {
      setErrorMessage("La configuration de la boutique n’est pas disponible.");
      return;
    }
    if (!checkoutGroup) {
      setErrorMessage("Impossible de retrouver les articles à commander. Revenez au panier et réessayez.");
      return;
    }
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      setErrorMessage("Certains champs obligatoires sont incomplets ou invalides. Vérifiez les champs signalés.");
      return;
    }
    setErrorMessage("");
    setNotificationNotice("");
    const buyerName = guestName.trim();
    const buyerPhone = guestCheckout ? guestPhone.trim() : deliveryPhone.trim();
    const phoneDigits = buyerPhone.replace(/\D/g, "");
    if (guestCheckout && !buyerName) {
      setErrorMessage("Indiquez votre nom pour que le vendeur puisse identifier la commande.");
      return;
    }
    if (guestCheckout && (phoneDigits.length < 8 || phoneDigits.length > 15)) {
      setErrorMessage("Indiquez un numéro de téléphone valide pour être contacté par le vendeur.");
      return;
    }
    if (guestCheckout && !captchaSiteKey) {
      setErrorMessage("La commande sans compte n’est pas encore activée. Connectez-vous pour continuer.");
      return;
    }
    if (guestCheckout && !captchaToken) {
      setErrorMessage("Confirmez la vérification de sécurité avant de commander.");
      return;
    }
    if (checkoutPaymentSettingsLoading) {
      setErrorMessage("Chargement des conditions de paiement du vendeur. Réessayez dans un instant.");
      return;
    }
    if (paymentSettingsError) {
      setErrorMessage(`Les conditions de paiement n’ont pas pu être vérifiées : ${paymentSettingsError}`);
      return;
    }
    if (requiresBusinessVerification && !effectivePaymentChoice) {
      setErrorMessage("Ce vendeur n’a pas configuré de condition de paiement utilisable pour cette commande. Contactez-le avant de commander.");
      return;
    }
    if ((paymentConditions.length > 0 || mobileMoneyEnabled) && !effectivePaymentChoice) {
      setErrorMessage("Choisissez une condition ou un moyen de paiement.");
      return;
    }
    if (effectivePaymentChoice === "seller_condition" && !effectivePaymentCondition) {
      setErrorMessage("Choisissez une condition de paiement proposée par le vendeur.");
      return;
    }
    if (requiresPaymentProof && !paymentProofFile) {
      setErrorMessage("Joignez la capture du paiement anticipé pour envoyer la commande.");
      return;
    }
    if (requiresPaymentProof && guestCheckout) {
      setErrorMessage("Connectez-vous pour joindre une preuve de paiement et commander.");
      return;
    }
    if (checkoutGroup.deliverySettings?.enabled) {
      if (!deliveryZone.trim() || !deliveryAddress.trim()) {
        setErrorMessage("Indiquez votre commune et votre adresse précise de livraison.");
        return;
      }
      const digits = (guestCheckout ? guestPhone : deliveryPhone).replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) {
        setErrorMessage("Indiquez un numéro de téléphone valide pour la livraison.");
        return;
      }
    }
    setBusy(true);
    try {
      let buyerId = user?.id;
      let guestCaptchaToken: string | null = null;
      if (guestCheckout) {
        guestCaptchaToken = captchaToken;
        setCaptchaToken("");
        setCaptchaError("");
        captchaRef.current?.reset();
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
          options: {
            data: { name: "Acheteur invité", role: "buyer", account_type: "personal" },
          },
        });
        if (authError) {
          throw new Error(`Supabase n’a pas pu créer le compte invité (${authError.message}). Vérifiez le déclencheur de profil en base de données.`);
        }
        if (!authData.user) {
          throw new Error("Impossible de préparer la commande invitée. Connectez-vous pour continuer.");
        }
        buyerId = authData.user.id;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ name: "Acheteur invité", phone: "", role: "buyer", account_type: "personal", is_private: true })
          .eq("id", buyerId);
        if (profileError) throw profileError;
        const anonymousBuyer = { id: buyerId, fullName: buyerName, phone: buyerPhone, isAnonymous: true };
        setGuestBuyer(anonymousBuyer);
      }
      if (!buyerId) {
        throw new Error("Impossible d’identifier l’acheteur.");
      }
      if (!globalThis.crypto?.randomUUID) {
        throw new Error("Ce navigateur ne permet pas de sécuriser la création de commande.");
      }
      if (guestCheckout) {
        if (!guestCaptchaToken) {
          throw new Error("La vérification CAPTCHA a expiré. Recommencez avant de commander.");
        }
        const { error: captchaVerificationError } = await supabase.functions.invoke("verify-guest-order-captcha", {
          body: { captchaToken: guestCaptchaToken },
        });
        if (captchaVerificationError) {
          throw new Error(`Vérification CAPTCHA refusée : ${captchaVerificationError.message}`);
        }
      }
      const submittedItems = checkoutGroup.items.map((item) => ({
        product: {
          id: item.product.id,
          title: item.product.title,
          price: getCartItemUnitPrice(item, checkoutGroup.items),
          wholesalePrice: null,
          currency: getCurrency(item.product.currency),
          sellerId: item.product.sellerId,
          categoryId: item.product.categoryId,
          images: item.product.image ? [item.product.image] : [],
          stock: item.product.stock,
          specifications: item.product.specifications ?? {},
          ...(item.selectedSpecifications ? { selectedSpecifications: item.selectedSpecifications } : {}),
          status: "active",
        },
        quantity: item.quantity,
      }));
      const orderId = globalThis.crypto.randomUUID();
      let paymentProofPath: string | null = null;
      if (requiresPaymentProof && paymentProofFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(paymentProofFile.type)) {
          throw new Error("La preuve de paiement doit être une image JPEG, PNG ou WebP.");
        }
        if (paymentProofFile.size > 10 * 1024 * 1024) {
          throw new Error("La preuve de paiement ne peut pas dépasser 10 Mo.");
        }
        const extension = paymentProofFile.type === "image/jpeg" ? "jpg" : paymentProofFile.type.split("/")[1];
        paymentProofPath = `${buyerId}/${globalThis.crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("order-payment-proofs")
          .upload(paymentProofPath, paymentProofFile, { contentType: paymentProofFile.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const paymentDueAtDelivery = effectivePaymentChoice === "seller_condition"
        && effectivePaymentCondition === "delivery_or_pickup";
      const paymentLabel = effectivePaymentChoice === "mobile_money"
        ? `Payer par ${sellerPaymentSettings?.operator || "Mobile Money"} · ${sellerPaymentSettings?.phoneNumber || ""}`
        : effectivePaymentCondition === "prepaid"
          ? `Paiement intégral à l’avance · ${prepaidPaymentDetails?.operator || sellerPaymentSettings?.operator || "Mobile Money"} · ${prepaidPaymentDetails?.phoneNumber || sellerPaymentSettings?.phoneNumber || ""}`
          : effectivePaymentCondition === "delivery_or_pickup"
            ? DELIVERY_OR_PICKUP_LABEL
            : "Paiement à confirmer avec le vendeur";
      const { error } = await supabase.from("orders").insert({
        id: orderId,
        buyer_id: buyerId,
        buyer_name: guestCheckout ? buyerName : user?.fullName?.trim() || null,
        seller_id: checkoutGroup.sellerId,
        items: submittedItems,
        total: checkoutTotal,
        status: "Pending",
        tracking_code: "",
        delivery_fee: deliveryFee,
        delivery_zone: deliveryZone.trim() || null,
        delivery_address: deliveryAddress.trim() || null,
        delivery_phone: buyerPhone || null,
        delivery_latitude: deliveryCoordinates?.latitude ?? null,
        delivery_longitude: deliveryCoordinates?.longitude ?? null,
        payment_method: paymentLabel,
        payment_due_at_delivery: paymentDueAtDelivery,
        payment_proof_path: paymentProofPath,
      });
      if (error) throw error;
      try {
        const { data: pushResult, error: pushError } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: checkoutGroup.sellerId,
            notification_type: "ORDER_RECEIVED",
            event_id: `order_received:${orderId}`,
            persist_notification: true,
            tag: "order_received",
            data: { route: "SellerDashboard", orderId },
          },
        });
        if (pushError) throw pushError;
        if (pushResult?.ok !== true) {
          console.warn("[checkout] commande enregistrée, notification push non confirmée", pushResult);
          setNotificationNotice("Votre commande est enregistrée, mais le vendeur n’a pas pu recevoir la notification push. Il la retrouvera dans ses notifications s’il est connecté.");
        }
      } catch (notificationError) {
        console.error("[checkout] commande enregistrée, échec de la notification vendeur", notificationError);
        setNotificationNotice("Votre commande est enregistrée, mais la notification du vendeur n’a pas pu être envoyée. Il pourra la retrouver dans ses commandes.");
      }
      onOrderCreated(checkoutGroup.items);
      setCheckoutKey(null);
      setScreen("orders");
    } catch (error) {
      console.error("[checkout] impossible d’enregistrer la commande", error);
      setErrorMessage(getCommerceErrorMessage(error, "Impossible d’enregistrer la commande."));
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (order: CommerceOrder) => {
    if (!activeBuyer || cancellingOrderId) return;
    if (!supabase) {
      setErrorMessage("La configuration de la boutique n’est pas disponible.");
      return;
    }
    if (!window.confirm(`Annuler la commande ${order.tracking_code || order.id} ?`)) return;
    setCancellingOrderId(order.id);
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc("cancel_pending_order_by_buyer", {
        p_order_id: order.id,
      });
      if (error) throw error;
      setOrders((current) => current.map((item) =>
        item.id === order.id ? { ...item, status: "Cancelled" } : item,
      ));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d’annuler cette commande.");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const refreshOrders = async () => {
    if (!activeBuyer) return;
    if (!supabase) {
      setErrorMessage("La configuration de la boutique n’est pas disponible.");
      return;
    }
    setOrdersLoading(true);
    setErrorMessage("");
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", activeBuyer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data ?? []) as CommerceOrder[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les commandes.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const title = screen === "orders" ? "Mes commandes" : screen === "checkout" ? "Confirmer la commande" : "Mon panier";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f8fc] text-slate-900" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={screen === "checkout" ? () => setScreen("cart") : onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label={screen === "checkout" ? "Retour au panier" : "Fermer"}
          >
            {screen === "checkout" ? <ArrowLeft size={19} /> : <X size={19} />}
          </button>
          <h1 className="min-w-0 flex-1 font-display text-xl font-bold">{title}</h1>
          {screen !== "orders" && (
            <button type="button" onClick={() => setScreen("orders")} className="btn btn-ghost btn-sm gap-2">
              <ClipboardList size={17} />
              <span className="hidden sm:inline">Historique</span>
            </button>
          )}
          {screen === "orders" && (
            <button type="button" onClick={() => void refreshOrders()} disabled={ordersLoading} className="btn btn-ghost btn-circle btn-sm" aria-label="Actualiser les commandes">
              <RefreshCw size={17} className={ordersLoading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {errorMessage && <p ref={errorMessageRef} role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
        {notificationNotice && <p role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{notificationNotice}</p>}

        {screen === "cart" && (
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <ShoppingCart className="mx-auto size-12 text-slate-300" />
                <h2 className="mt-4 text-lg font-bold">Votre panier est vide</h2>
                <p className="mt-2 text-sm text-slate-500">Ajoutez des produits depuis leur fiche pour préparer une commande.</p>
                <button type="button" onClick={onClose} className="btn btn-primary mt-5 bg-[#143ca8]">Continuer les achats</button>
              </div>
            ) : groups.map((group) => (
              <section key={group.key} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">{group.seller}</h2>
                    <p className="text-sm text-slate-500">{group.items.reduce((count, item) => count + item.quantity, 0)} article(s) · {group.currency}</p>
                  </div>
                  <Package className="shrink-0 text-[#143ca8]" size={22} />
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <div key={getCommerceCartItemKey(item)} className="flex gap-3 py-4">
                      {item.product.image
                        ? <img src={item.product.image} alt="" className="size-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
                        : <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400"><Package size={23} /></div>}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{item.product.title}</h3>
                        <p className="mt-1 text-sm font-bold text-[#143ca8]">{formatAmount(getCartItemUnitPrice(item, items), group.currency)}</p>
                        {hasWholesaleOffer(item) && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {getCartItemUnitPrice(item, items) < item.product.price
                              ? `Prix de gros appliqué (${getCartProductQuantity(items, item.product.id)} unités)`
                              : `Prix de gros dès ${WHOLESALE_MIN_QUANTITY} unités : ${formatAmount(Number(item.product.wholesalePrice), group.currency)}`}
                          </p>
                        )}
                        {selectedSpecificationsLabel(item.selectedSpecifications) && (
                          <p className="mt-1 text-xs leading-5 text-slate-500">{selectedSpecificationsLabel(item.selectedSpecifications)}</p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <label className="text-xs text-slate-500" htmlFor={`quantity-${getCommerceCartItemKey(item)}`}>Quantité</label>
                          <input
                            id={`quantity-${getCommerceCartItemKey(item)}`}
                            type="number"
                            min={1}
                            max={Math.max(1, Number(item.product.stock || 1000) - items
                              .filter((other) => other.product.id === item.product.id && getCommerceCartItemKey(other) !== getCommerceCartItemKey(item))
                              .reduce((total, other) => total + other.quantity, 0))}
                            value={item.quantity}
                            onChange={(event) => {
                              if (event.target.value !== "") updateQuantity(item, Number(event.target.value));
                            }}
                            className="input input-bordered input-sm w-20"
                          />
                          <button type="button" onClick={() => removeItem(item)} className="btn btn-ghost btn-sm text-red-600" aria-label={`Retirer ${item.product.title} du panier`}>
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Retirer</span>
                          </button>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatAmount(getCartItemUnitPrice(item, items) * item.quantity, group.currency)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Sous-total des articles</p>
                    <p className="font-bold">{formatAmount(group.subtotal, group.currency)}</p>
                    {group.deliverySettings?.enabled
                      ? <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Truck size={13} /> Livraison calculée à l’étape suivante</p>
                      : null}
                  </div>
                  <button type="button" onClick={() => beginCheckout(group.key)} className="btn btn-primary bg-[#143ca8]">
                    {guestCheckout ? "Commander sans compte" : "Commander directement"}
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        {screen === "checkout" && checkoutGroup && (
          <form noValidate onSubmit={(event) => void submitOrder(event)} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-display text-lg font-bold">Résumé · {checkoutGroup.seller}</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {checkoutGroup.items.map((item) => (
                    <div key={getCommerceCartItemKey(item)} className="flex justify-between gap-4 py-3 text-sm">
                      <span>
                        {item.quantity} × {item.product.title}
                        {selectedSpecificationsLabel(item.selectedSpecifications) ? <span className="block text-xs text-slate-500">{selectedSpecificationsLabel(item.selectedSpecifications)}</span> : null}
                        {hasWholesaleOffer(item) && (
                          <span className="block text-xs font-medium text-emerald-700">
                            {getCartItemUnitPrice(item, checkoutGroup.items) < item.product.price
                              ? `Prix de gros appliqué (${getCartProductQuantity(checkoutGroup.items, item.product.id)} unités)`
                              : `Prix de gros dès ${WHOLESALE_MIN_QUANTITY} unités`}
                          </span>
                        )}
                      </span>
                      <strong>{formatAmount(getCartItemUnitPrice(item, checkoutGroup.items) * item.quantity, checkoutGroup.currency)}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><strong>{formatAmount(checkoutGroup.subtotal, checkoutGroup.currency)}</strong></div>
                  {checkoutGroup.deliverySettings?.enabled && (
                    <div className="mt-2 flex justify-between"><span className="text-slate-500">Livraison estimée</span><strong>{formatAmount(deliveryFee, checkoutGroup.currency)}</strong></div>
                  )}
                  <div className="mt-3 flex justify-between text-base"><span className="font-bold">Total estimé</span><strong className="text-[#143ca8]">{formatAmount(checkoutTotal, checkoutGroup.currency)}</strong></div>
                </div>
              </section>

              {guestCheckout && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-display text-lg font-bold">Vos coordonnées</h2>
                  <p className="mt-1 text-sm text-slate-500">Pas besoin de créer un compte. Votre nom et votre téléphone seront transmis au vendeur avec la commande.</p>
                  <label className="form-control mt-4 gap-1">
                    <span className="label-text font-medium">Votre nom</span>
                    <input required autoComplete="name" maxLength={120} value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Nom complet" className="input input-bordered w-full" />
                  </label>
                  <label className="form-control mt-3 gap-1">
                    <span className="label-text font-medium">Téléphone de contact</span>
                    <input required type="tel" autoComplete="tel" maxLength={24} value={guestPhone} onChange={(event) => { setGuestPhone(event.target.value); setDeliveryPhone(event.target.value); }} placeholder="Ex. +243..." className="input input-bordered w-full" />
                  </label>
                  {captchaSiteKey ? (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-slate-700">Vérification de sécurité</p>
                      <Turnstile
                        ref={captchaRef}
                        siteKey={captchaSiteKey}
                        onSuccess={(token) => { setCaptchaToken(token); setCaptchaError(""); setErrorMessage(""); }}
                        onExpire={() => { setCaptchaToken(""); setCaptchaError("La vérification a expiré. Recommencez."); }}
                        onError={(errorCode) => {
                          setCaptchaToken("");
                          const detail = errorCode === "110200"
                            ? "Ce domaine n’est pas autorisé dans Hostname Management du widget Cloudflare."
                            : errorCode === "110100" || errorCode === "110110" || errorCode === "400020" || errorCode === "400070"
                              ? "Vérifiez la Sitekey et l’état du widget dans Cloudflare."
                              : errorCode === "200500"
                                ? "Le défi Cloudflare ne se charge pas. Autorisez challenges.cloudflare.com et désactivez temporairement VPN ou bloqueur de publicités."
                                : "Vérifiez le domaine autorisé, la connexion réseau et les extensions du navigateur.";
                          setCaptchaError(`Erreur Turnstile ${errorCode} : ${detail}`);
                        }}
                        onUnsupported={() => { setCaptchaToken(""); setCaptchaError("Ce navigateur ne prend pas en charge la vérification de sécurité."); }}
                        options={{ action: "guest_checkout", theme: "light" }}
                      />
                      {captchaError && <p role="alert" className="mt-2 text-xs text-red-600">{captchaError}</p>}
                    </div>
                  ) : (
                    <p role="status" className="mt-3 text-sm text-amber-700">La commande sans compte est momentanément indisponible. Connectez-vous pour continuer.</p>
                  )}
                </section>
              )}

              {checkoutGroup.deliverySettings?.enabled && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MapPin size={19} className="text-[#143ca8]" /> Informations de livraison</h2>
                  <label className="form-control mt-4 gap-1">
                    <span className="label-text font-medium">Commune ou zone</span>
                    <input required value={deliveryZone} onChange={(event) => setDeliveryZone(event.target.value)} placeholder="Ex. Gombe, Limete" className="input input-bordered w-full" />
                  </label>
                  <label className="form-control mt-3 gap-1">
                    <span className="label-text font-medium">Adresse précise</span>
                    <textarea required value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Avenue, numéro, quartier et point de repère" className="textarea textarea-bordered min-h-24 w-full" />
                  </label>
                  {!guestCheckout && <label className="form-control mt-3 gap-1">
                    <span className="label-text font-medium">Téléphone à appeler</span>
                    <input required type="tel" value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} className="input input-bordered w-full" />
                  </label>}
                  <button type="button" onClick={captureDeliveryLocation} disabled={locationLoading} className="btn btn-outline btn-sm mt-4 gap-2">
                    {locationLoading ? <LoaderCircle size={15} className="animate-spin" /> : <MapPin size={15} />}
                    {locationLoading ? "Récupération..." : deliveryCoordinates ? "Position GPS ajoutée" : "Joindre ma position GPS"}
                  </button>
                  {locationError && <p role="status" className="mt-2 text-xs text-amber-700">{locationError}</p>}
                  <p className="mt-3 text-xs leading-5 text-slate-500">Le vendeur peut définir un tarif spécifique pour votre zone. Le montant final est recalculé par le serveur à la création de la commande.</p>
                </section>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-display text-lg font-bold">Conditions de paiement</h2>
                {checkoutPaymentSettingsLoading ? (
                  <p role="status" className="mt-4 text-sm text-slate-500">Chargement des moyens de paiement…</p>
                ) : paymentSettingsError ? (
                  <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{paymentSettingsError}</p>
                ) : (
                  <>
                    {paymentConditions.map((condition) => (
                      <button
                        key={condition}
                        type="button"
                        role="radio"
                        aria-checked={effectivePaymentCondition === condition && effectivePaymentChoice === "seller_condition"}
                        onClick={() => {
                          setSelectedPaymentCondition(condition);
                          setPaymentChoice("seller_condition");
                          setPaymentProofFile(null);
                        }}
                        className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${effectivePaymentCondition === condition && effectivePaymentChoice === "seller_condition" ? "border-[#143ca8] bg-blue-50 text-[#143ca8]" : "border-slate-200 text-slate-700"}`}
                      >
                        <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${effectivePaymentCondition === condition && effectivePaymentChoice === "seller_condition" ? "border-[#143ca8]" : "border-slate-400"}`}>
                          {effectivePaymentCondition === condition && effectivePaymentChoice === "seller_condition" && <span className="size-2 rounded-full bg-[#143ca8]" />}
                        </span>
                        {condition === "prepaid" ? "Paiement intégral à l’avance" : DELIVERY_OR_PICKUP_LABEL}
                      </button>
                    ))}
                    {mobileMoneyEnabled && !simpleRetailSeller && (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={effectivePaymentChoice === "mobile_money"}
                        onClick={() => {
                          setPaymentChoice("mobile_money");
                          setPaymentProofFile(null);
                        }}
                        className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${effectivePaymentChoice === "mobile_money" ? "border-[#143ca8] bg-blue-50 text-[#143ca8]" : "border-slate-200 text-slate-700"}`}
                      >
                        <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${effectivePaymentChoice === "mobile_money" ? "border-[#143ca8]" : "border-slate-400"}`}>
                          {effectivePaymentChoice === "mobile_money" && <span className="size-2 rounded-full bg-[#143ca8]" />}
                        </span>
                        Payer maintenant par {sellerPaymentSettings?.operator || "Mobile Money"}
                      </button>
                    )}
                    {effectivePaymentChoice === "seller_condition" && effectivePaymentCondition === "prepaid" && (
                      <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-900">
                        <p className="font-semibold">{prepaidPaymentDetails?.operator || sellerPaymentSettings?.operator || "Mobile Money"}</p>
                        <p>{prepaidPaymentDetails?.phoneNumber || sellerPaymentSettings?.phoneNumber}</p>
                        {(prepaidPaymentDetails?.instructions || sellerPaymentSettings?.instructions) && (
                          <p className="mt-1">{prepaidPaymentDetails?.instructions || sellerPaymentSettings?.instructions}</p>
                        )}
                      </div>
                    )}
                    {effectivePaymentChoice === "mobile_money" && (
                      <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-900">
                        <p className="font-semibold">{sellerPaymentSettings?.operator || "Mobile Money"}</p>
                        <p>{sellerPaymentSettings?.phoneNumber}</p>
                        {sellerPaymentSettings?.instructions && <p className="mt-1">{sellerPaymentSettings.instructions}</p>}
                      </div>
                    )}
                    {requiresPaymentProof && (
                      <label className="form-control mt-4 gap-2">
                        <span className="text-sm font-medium text-slate-700">Capture du paiement *</span>
                        <input
                          required
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => setPaymentProofFile(event.target.files?.[0] ?? null)}
                          className="file-input file-input-bordered w-full"
                        />
                        <span className="text-xs text-slate-500">Image JPEG, PNG ou WebP, 10 Mo maximum.</span>
                      </label>
                    )}
                    {requiresBusinessVerification && paymentConditions.length === 0 && !mobileMoneyEnabled && (
                      <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-800">
                        Ce vendeur n’a pas configuré de moyen de paiement disponible. Contactez-le avant de passer commande.
                      </p>
                    )}
                  </>
                )}
              </section>
            </div>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <CheckCircle2 className="text-emerald-600" size={24} />
              <h2 className="mt-3 font-display text-lg font-bold">Prêt à commander</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Le vendeur recevra votre commande et devra la confirmer. Les totaux et la disponibilité sont vérifiés par le serveur.</p>
              <button type="submit" disabled={busy || checkoutPaymentSettingsLoading} className="btn btn-primary mt-5 w-full bg-[#143ca8]">
                {busy ? "Envoi en cours..." : guestCheckout ? "Commander sans compte" : "Confirmer la commande"}
              </button>
              {guestCheckout && <button type="button" onClick={onRequestLogin} disabled={busy} className="btn btn-ghost mt-2 w-full">Se connecter plutôt</button>}
              <button type="button" onClick={() => setScreen("cart")} disabled={busy} className="btn btn-ghost mt-2 w-full">Retour au panier</button>
            </aside>
          </form>
        )}

        {screen === "orders" && (
          !activeBuyer ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
              <ClipboardList className="mx-auto size-10 text-slate-300" />
              <h2 className="mt-4 font-bold">Connectez-vous pour voir vos commandes</h2>
              <button type="button" onClick={onRequestLogin} className="btn btn-primary mt-4 bg-[#143ca8]">Se connecter</button>
            </section>
          ) : ordersLoading ? (
            <p className="py-14 text-center text-sm text-slate-500">Chargement des commandes...</p>
          ) : orders.length === 0 && !errorMessage ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <Package className="mx-auto size-10 text-slate-300" />
              <h2 className="mt-4 font-bold">Aucune commande pour le moment</h2>
              <button type="button" onClick={() => setScreen("cart")} className="btn btn-primary mt-4 bg-[#143ca8]">Voir mon panier</button>
            </section>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const orderItems = Array.isArray(order.items) ? order.items : [];
                const itemSummary = orderItems.map((item) => {
                  const choices = selectedSpecificationsLabel(item.selectedSpecifications);
                  return `${item.quantity} × ${item.product?.title || "Article"}${choices ? ` (${choices})` : ""}`;
                }).join(", ");
                const orderCurrency = getCurrency(orderItems[0]?.product?.currency);
                const hasCoordinates = Number.isFinite(Number(order.delivery_latitude))
                  && Number.isFinite(Number(order.delivery_longitude))
                  && order.delivery_latitude != null
                  && order.delivery_longitude != null;
                const canCancel = order.status === "Pending" && order.payment_status !== "confirmed";
                return (
                  <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#143ca8]">{order.tracking_code || order.id}</p>
                        <h2 className="mt-1 font-display text-lg font-bold">{itemSummary || "Commande"}</h2>
                        <p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString("fr-FR")}</p>
                      </div>
                      <span className={`badge ${order.status === "Delivered" ? "badge-success" : order.status === "Cancelled" ? "badge-error" : "badge-primary"}`}>{order.status}</span>
                    </div>
                    <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                      <p><span className="text-slate-500">Total : </span><strong>{formatAmount(Number(order.total) || 0, orderCurrency)}</strong></p>
                      <p><span className="text-slate-500">Paiement : </span>{order.payment_status === "confirmed" ? "Confirmé" : order.payment_method || "À confirmer"}</p>
                      {order.delivery_zone && <p><span className="text-slate-500">Zone : </span>{order.delivery_zone}</p>}
                      {order.delivery_address && <p><span className="text-slate-500">Adresse : </span>{order.delivery_address}</p>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {hasCoordinates && (
                        <a
                          className="btn btn-outline btn-sm gap-2"
                          href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_latitude},${order.delivery_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin size={15} /> Voir la position
                        </a>
                      )}
                      {canCancel && (
                        <button type="button" onClick={() => void cancelOrder(order)} disabled={cancellingOrderId === order.id} className="btn btn-outline btn-sm border-red-200 text-red-700">
                          {cancellingOrderId === order.id ? "Annulation..." : "Annuler la commande"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null
        )}

        {screen === "cart" && groups.length > 0 && activeBuyer && (
          <button type="button" onClick={() => setScreen("orders")} className="btn btn-ghost mt-4 gap-2 sm:hidden">
            <ClipboardList size={17} /> Voir l’historique des commandes
          </button>
        )}
      </main>
    </div>
  );
}
