/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ComponentType, FormEvent, ReactNode } from "react";
import {
  Bell,
  CarFront,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  Gamepad2,
  Headphones,
  Home,
  Heart,
  Laptop,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  ShieldCheck,
  Share2,
  Smartphone,
  Trophy,
  Tv,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FaFacebookF, FaGoogle, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "./lib/supabase";
import CommercePage from "./CommercePage";
import type { CommerceCartItem, CommerceProduct } from "./CommercePage";
import { getCommerceCartItemKey, isCommerceCartItem } from "./commerceCartUtils";
import SellerOrdersPage from "./SellerOrdersPage";
import StockManagementPage from "./StockManagementPage";
import ProductFeedbackSection from "./ProductFeedbackSection";
import appIcon from "./assets/icon.png";
import kambexaLogo from "./assets/kambexa.png";
import { pageSeo, productPath, productSlug, Seo, siteStructuredData } from "./seo";

function PasswordResetPage({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
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
    if (!supabase) {
      setError("La configuration Supabase est absente.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#143ca8]">Mbokamaket</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-circle" aria-label="Fermer"><X size={18} /></button>
        </div>
        {success ? (
          <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-800">
            Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-slate-500">Choisissez un nouveau mot de passe pour sécuriser votre compte.</p>
            <PasswordField label="Nouveau mot de passe" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PasswordField label="Confirmer le mot de passe" value={confirmPassword} visible={showConfirmPassword} onChange={setConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="btn btn-primary mt-5 w-full">
              {busy ? <LoaderCircle className="animate-spin" size={17} /> : "Enregistrer le nouveau mot de passe"}
            </button>
          </>
        )}
        <button type="button" onClick={onLogin} className="mt-4 w-full text-sm font-semibold text-[#143ca8]">Retour à la connexion</button>
      </form>
    </div>
  );
}

function PasswordField({ label, value, visible, onChange, onToggle }: { label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  return (
    <div className="relative mt-3">
      <input required minLength={8} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} className="input input-bordered w-full pr-12" />
      <button type="button" onClick={onToggle} className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square" aria-label={visible ? `Masquer ${label.toLowerCase()}` : `Afficher ${label.toLowerCase()}`}>
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

import appProducts from "./assets/picture (2).jpg";
import appProductDetails from "./assets/picture (3).jpg";
import appSellerProfile from "./assets/picture (5).jpg";

type Icon = ComponentType<{ size?: number; className?: string }>;
type Category = { id: string; label: string; icon: Icon };
type Product = {
  id: string;
  title: string;
  location: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  categoryId: string;
  category: string;
  image: string;
  images: string[];
  seller: string;
  sellerId: string;
  sellerAvatar: string;
  sellerUsername: string;
  sellerBio: string;
  sellerAddress: string;
  verified: boolean;
  status: string;
  featured: boolean;
  promoted: boolean;
  description: string;
  condition?: string;
  specifications?: Record<string, string>;
  realEstateType?: string | null;
  guaranteeMonths?: string | number | null;
  createdAt?: string | null;
  phone: string;
  stock: number;
  sellerAccountType?: string;
  deliverySettings?: {
    enabled: boolean;
    baseFee: number;
    zoneFees?: Record<string, number>;
  } | null;
};
type User = { id: string; email?: string; fullName?: string; businessName?: string; username?: string; role?: string; accountType?: string; avatar?: string; isVerified: boolean; isAnonymous?: boolean; phone?: string; address?: string };
type ProductSort = "recent" | "price_asc" | "price_desc" | "popular" | "relevance";
type ProductVariant = { selectedSpecifications: Record<string, string>; quantity: number };
const multiChoiceSpecificationLabels = new Set(["Tailles disponibles", "Pointures disponibles", "Couleurs disponibles"]);
const getSpecificationChoices = (value: string) => value.split(",").map((choice) => choice.trim()).filter(Boolean);
const getSelectableSpecifications = (specifications: Record<string, string> = {}) =>
  Object.entries(specifications)
    .filter(([label, value]) => label !== "Autres caractéristiques" && getSpecificationChoices(value).length > 1)
    .sort(([left], [right]) => {
      const priority = (label: string) => label === "Tailles disponibles" ? 0 : label === "Pointures disponibles" ? 1 : label === "Couleurs disponibles" ? 2 : 3;
      return priority(left) - priority(right);
    });
const getSpecificationConfigurations = (selection: Record<string, string>) =>
  Object.entries(selection).reduce<Record<string, string>[]>(
    (configurations, [label, value]) => configurations.flatMap((configuration) =>
      (multiChoiceSpecificationLabels.has(label) ? getSpecificationChoices(value) : [value])
        .map((choice) => ({ ...configuration, [label]: choice })),
    ),
    [{}],
  );
const specificationConfigurationKey = (configuration: Record<string, string>) =>
  JSON.stringify(Object.entries(configuration).sort(([left], [right]) => left.localeCompare(right)));
const productColorHex = (color: string) => ({
  noir: "#171717", blanc: "#ffffff", rouge: "#dc2626", bleu: "#2563eb", vert: "#16a34a",
  jaune: "#facc15", gris: "#6b7280", argent: "#c0c0c0", or: "#d4af37", rose: "#ec4899",
  marron: "#854d0e", orange: "#ea580c", violet: "#7c3aed", beige: "#d6c4a1",
}[color.trim().toLowerCase()] ?? "#94a3b8");
const productSpecificationFields: Record<string, string[]> = {
  "1": ["Marque", "Modèle", "Couleurs disponibles", "Garantie", "Autres caractéristiques"],
  "2": ["Tailles disponibles", "Couleurs disponibles", "Pointures disponibles", "Matière", "Autres caractéristiques"],
  "3": ["Nombre de pièces", "Chambres", "Salles de bain", "Superficie", "Étage", "Parking", "Autres caractéristiques"],
  "4": ["Marque", "Modèle", "Année", "Kilométrage", "Couleurs disponibles", "Autres caractéristiques"],
  "5": ["Tailles disponibles", "Pointures disponibles", "Couleurs disponibles", "Matière", "Autres caractéristiques"],
  "6": ["Marque", "Modèle", "Mémoire RAM", "Stockage interne", "Couleurs disponibles", "Réseau / compatibilité", "Autres caractéristiques"],
  "7": ["Marque", "Modèle", "Processeur", "Mémoire RAM", "Stockage", "Carte graphique", "Taille de l’écran", "Couleurs disponibles", "Autres caractéristiques"],
  "8": ["Marque", "Compatibilité", "Couleurs disponibles", "Autres caractéristiques"],
  "9": ["Plateforme", "Stockage", "Accessoires inclus", "Autres caractéristiques"],
  "10": ["Dimensions", "Matière", "Couleurs disponibles", "Autres caractéristiques"],
  "11": ["Marque", "Type de produit", "Contenance", "Date d’expiration", "Autres caractéristiques"],
  "12": ["Marque", "Modèle", "Capacité", "Puissance", "Garantie", "Autres caractéristiques"],
  "13": ["Type de produit", "Matière", "Dimensions", "Autres caractéristiques"],
  "14": ["Tranche d’âge", "Tailles disponibles", "Couleurs disponibles", "Matière", "Autres caractéristiques"],
  "15": ["Poids / volume", "Ingrédients", "Date d’expiration", "Conditions de conservation", "Autres caractéristiques"],
  "16": ["Espèce", "Race", "Âge", "Taille / poids", "Autres caractéristiques"],
};
const standardProductSpecificationChoices: Record<string, string[]> = {
  "Tailles disponibles": ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  "Pointures disponibles": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "Couleurs disponibles": ["Noir", "Blanc", "Rouge", "Bleu", "Vert", "Jaune", "Gris", "Rose", "Marron", "Orange", "Violet", "Beige"],
};
const productColorsByCategory: Record<string, string[]> = {
  "6": ["Noir", "Blanc", "Gris", "Argent", "Or", "Bleu", "Vert", "Violet", "Rose", "Rouge"],
  "7": ["Noir", "Gris", "Argent", "Blanc", "Bleu", "Rose"],
  "14": ["Blanc", "Beige", "Gris", "Rose", "Bleu", "Vert", "Jaune", "Violet", "Rouge", "Noir", "Marron", "Orange"],
};
const fashionSubcategories = [
  "Vêtements femme", "Vêtements homme", "Vêtements enfant", "Chaussures femme", "Chaussures homme",
  "Chaussures enfant", "Sacs et maroquinerie", "Accessoires de mode", "Lingerie et vêtements de nuit",
  "Tenues traditionnelles", "Vêtements de sport", "Bijoux", "Autres",
];
type Notice = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const isSentMessageNotification = (notice: Pick<Notice, "title" | "message">) => {
  const text = `${notice.title ?? ""} ${notice.message ?? ""}`.toLowerCase();
  const blockedPatterns = [
    "message envoyé",
    "message envoye",
    "message sent",
    "message envoyé à",
    "message envoye a",
    "votre message",
    "envoyer un message",
    "sent you a message",
    "you sent",
    "sent to",
  ];
  return blockedPatterns.some((pattern) => text.includes(pattern));
};
type Row = {
  id?: string | number;
  title?: string;
  location?: string;
  price?: number | string;
  original_price?: number | string | null;
  currency?: string;
  category?: string;
  category_name?: string;
  category_id?: string | number;
  images?: unknown;
  seller_name?: string;
  seller_avatar_url?: string;
  seller_profile_id?: string;
  seller_id?: string;
  user_id?: string;
  profile_id?: string;
  is_verified?: boolean;
  status?: string;
  is_featured?: boolean;
  is_promoted?: boolean;
  description?: string;
  stock?: number | string | null;
  condition?: string | null;
  specifications?: unknown;
  real_estate_type?: string | null;
  guarantee_months?: string | number | null;
  created_at?: string | null;
};

const PRODUCT_IMAGES_BUCKET = "product-images";
const DEFAULT_APK_URL = "https://www.dropbox.com/scl/fi/lvzealitvask4b3u4tvtp/MbokaMaket-v1.0.0.apk?rlkey=kp3w06kbnkkjbd5jlpw6f9p9r&st=h61yo0k8&dl=0";
const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
const isAndroidBrowser = () => /Android/i.test(navigator.userAgent || "");
const getAppDeepLinkUrl = (path: string, params?: Record<string, string | undefined>) => {
  const url = new URL("mbokamaket://" + path.replace(/^\/+/, ""));
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value && value.trim()) url.searchParams.set(key, value);
  });
  return url.toString();
};
const openAppIfInstalled = (path: string, params?: Record<string, string | undefined>) => {
  if (!isMobileBrowser() || typeof window === "undefined") return false;
  const webFallback = window.location.href;
  const appUrl = getAppDeepLinkUrl(path, params);
  const attemptKey = `mbokamaket-app-link-attempt:${appUrl}`;

  try {
    if (sessionStorage.getItem(attemptKey) === "1") return false;
    sessionStorage.setItem(attemptKey, "1");
  } catch {
    // Continue without a retry guard when browser storage is unavailable.
  }

  try {
    const fallbackFrame = document.createElement("iframe");
    fallbackFrame.style.display = "none";
    fallbackFrame.src = appUrl;
    document.body.appendChild(fallbackFrame);
    window.setTimeout(() => {
      if (fallbackFrame.parentNode) fallbackFrame.parentNode.removeChild(fallbackFrame);
    }, 1200);
  } catch {
    // Ignore iframe issues and keep the native app redirect as the primary action.
  }

  const fallbackTimer = window.setTimeout(() => {
    if (document.visibilityState === "visible") {
      window.location.href = webFallback;
    } else {
      try {
        sessionStorage.removeItem(attemptKey);
      } catch {
        // Ignore storage cleanup failures after the app takes focus.
      }
    }
  }, 1200);

  window.location.replace(appUrl);
  window.setTimeout(() => window.clearTimeout(fallbackTimer), 1600);
  return true;
};
const getAuthRedirectUrl = () => {
  const configuredUrl = (import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined)?.trim();
  if (configuredUrl) return configuredUrl;
  if (typeof window === "undefined") return "http://localhost:5173/";
  // Web Mobile doit revenir sur la meme URL HTTPS que le navigateur.
  // Le scheme Expo est fourni par VITE_AUTH_REDIRECT_URL dans l'application native.
  return `${window.location.origin}${window.location.pathname}`;
};

const getPasswordResetRedirectUrl = () => {
  const baseUrl = getAuthRedirectUrl();
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("reset", "1");
    return url.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}reset=1`;
  }
};
const categories: Category[] = [
  { id: "3", label: "Immobilier", icon: Home },
  { id: "6", label: "Smartphone", icon: Smartphone },
  { id: "7", label: "Ordinateur", icon: Laptop },
  { id: "8", label: "Accessoire", icon: Headphones },
  { id: "9", label: "Consoles et jeux vidéo", icon: Gamepad2 },
  { id: "1", label: "Électronique", icon: Tv },
  { id: "2", label: "Mode", icon: Smartphone },
  { id: "4", label: "Auto & Moto", icon: CarFront },
  { id: "5", label: "Sports", icon: Trophy },
];
const categoryName = new Map(categories.map((item) => [item.id, item.label]));
const categoryRouteIds: Record<string, string> = {
  "/immobilier": "3",
  "/vehicules": "4",
};
const normalizeDisplayName = (value?: string | null): string => {
  if (!value) return "";
  const cleaned = String(value).trim();
  if (!cleaned || /^anonyme$/i.test(cleaned)) return "";
  return cleaned;
};
const normalizeWhatsAppNumber = (value?: string | null): string => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("243")) return digits;
  return `243${digits.replace(/^0/, "")}`;
};
const isBusinessDisplayAccount = (accountType?: string | null) =>
  accountType === "boutique"
  || accountType === "magasin"
  || accountType === "boutique_pro"
  || accountType === "magasin_pro"
  || accountType === "agence_immo";
const getProfileDisplayName = (profile?: { name?: string | null; full_name?: string | null; username?: string | null; business_name?: string | null; account_type?: string | null } | null) => {
  const businessName = normalizeDisplayName(profile?.business_name);
  if (isBusinessDisplayAccount(profile?.account_type) && businessName) return businessName;
  return normalizeDisplayName(profile?.name)
    || normalizeDisplayName(profile?.full_name)
    || businessName
    || normalizeDisplayName(profile?.username)
    || "";
};
const imageFrom = (images: unknown) => {
  if (Array.isArray(images)) return String(images[0] || "");
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? String(parsed[0] || "") : images;
    } catch {
      return images;
    }
  }
  return "";
};
const imagesFrom = (images: unknown) => {
  if (Array.isArray(images)) return images.map(String).filter(Boolean);
  if (typeof images === "string") {
    try {
      const parsed: unknown = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [images].filter(Boolean);
    } catch {
      return [images].filter(Boolean);
    }
  }
  return [];
};
const specificationsFrom = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
};
const mapProduct = (row: Row): Product => ({
  id: String(row.id),
  title: row.title || "Annonce sans titre",
  location: row.location || "RDC",
  price: Number(row.price || 0),
  originalPrice: row.original_price == null ? null : Number(row.original_price),
  currency:
    row.currency === "USD"
      ? "$"
      : row.currency === "FRC"
        ? "FC"
        : row.currency || "FC",
  categoryId: String(row.category_id || ""),
  category:
    row.category_name ||
    row.category ||
    categoryName.get(String(row.category_id)) ||
    "Autre",
  image: imageFrom(row.images),
  images: imagesFrom(row.images),
  seller: normalizeDisplayName(row.seller_name) || "Vendeur Mbokamaket",
  sellerId: String(row.seller_profile_id || row.seller_id || row.profile_id || row.user_id || ""),
  sellerAvatar: row.seller_avatar_url || "",
  sellerUsername: "",
  sellerBio: "",
  sellerAddress: "",
  verified: Boolean(row.is_verified),
  status: row.status || "active",
  featured: Boolean(row.is_featured),
  promoted: Boolean(row.is_promoted),
  description: row.description || "",
  condition: row.condition || "",
  specifications: specificationsFrom(row.specifications),
  realEstateType: row.real_estate_type || null,
  guaranteeMonths: row.guarantee_months ?? null,
  createdAt: row.created_at || null,
  phone: "",
  stock: Math.max(0, Number(row.stock) || 0),
});

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [commerceMode, setCommerceMode] = useState<"cart" | "orders" | null>(null);
  const [sellerOrdersOpen, setSellerOrdersOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [cartItems, setCartItems] = useState<CommerceCartItem[]>(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem("mbokamaket-web-cart") || "[]");
      return Array.isArray(parsed) ? parsed.filter(isCommerceCartItem) : [];
    } catch (error) {
      console.warn("[cart] impossible de restaurer le panier local", error);
      return [];
    }
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [productSort, setProductSort] = useState<ProductSort>("recent");
  const [productPage, setProductPage] = useState(1);
  const [showProducts, setShowProducts] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [manageProductsOpen, setManageProductsOpen] = useState(false);
  const [profileManagementOpen, setProfileManagementOpen] = useState(false);
  const [stockManagementOpen, setStockManagementOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [heroProductIndex, setHeroProductIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const [desktopHeroProducts, setDesktopHeroProducts] = useState<Product[]>([]);
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("mbokamarket-favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [nativeAppAvailable, setNativeAppAvailable] = useState(false);
  const [nativeAppCheckComplete, setNativeAppCheckComplete] = useState(false);
  const [nativeAppOpening, setNativeAppOpening] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [apkDownloadCount, setApkDownloadCount] = useState<number | null>(null);
  const [legalPage, setLegalPage] = useState<"conditions" | "confidentialite" | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLLabelElement>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem("mbokamaket-web-cart", JSON.stringify(cartItems));
    } catch (storageError) {
      console.warn("[cart] impossible de sauvegarder le panier local", storageError);
      setError("Le panier ne peut pas être enregistré sur cet appareil. Vérifiez l’espace de stockage du navigateur.");
    }
  }, [cartItems]);
  const currentPageSeo = pageSeo(location.pathname);
  const playStore = import.meta.env.VITE_PLAY_STORE_URL as string | undefined;
  const appStore = import.meta.env.VITE_APP_STORE_URL as string | undefined;
  const apk = (import.meta.env.VITE_APK_URL as string | undefined) || DEFAULT_APK_URL;
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL as string | undefined;
  const tiktokUrl = import.meta.env.VITE_TIKTOK_URL as string | undefined;
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL as string | undefined;
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_URL as string | undefined;
  const apkDownloadUrl = apk?.replace(/[?&]dl=0(?:&|$)/, (match) => match.startsWith("?") ? "?dl=1" : "&dl=1");
  const registerApkDownload = async () => {
    setApkDownloadCount((current) => typeof current === "number" ? current + 1 : current);
    if (!supabase) return;
    const { error: insertError } = await supabase.from("apk_downloads").insert({});
    if (insertError) return;
    const { count } = await supabase
      .from("apk_downloads")
      .select("id", { count: "exact", head: true });
    if (typeof count === "number") setApkDownloadCount(count);
  };
  const toggleFavorite = (productId: string) => {
    setFavoriteIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  };
  useEffect(() => {
    localStorage.setItem("mbokamarket-favorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const registerVisit = async () => {
      try {
        if (!sessionStorage.getItem("mbokamarket-visited")) {
          await client.from("site_visits").insert({});
          sessionStorage.setItem("mbokamarket-visited", "1");
        }
        const { count } = await client
          .from("site_visits")
          .select("id", { count: "exact", head: true });
        if (typeof count === "number") setVisitorCount(count);
      } catch {
        setVisitorCount(null);
      }
    };
    void registerVisit();
    const loadApkDownloads = async () => {
      const { count } = await client
        .from("apk_downloads")
        .select("id", { count: "exact", head: true });
      if (typeof count === "number") setApkDownloadCount(count);
    };
    void loadApkDownloads();
  }, []);
  useEffect(() => {
    const routeCategory = categoryRouteIds[location.pathname];
    if (routeCategory) {
      setCategory(routeCategory);
      setShowProducts(true);
      setSellerFilter(null);
      return;
    }
    if (["/annonces", "/services", "/emploi", "/boutiques"].includes(location.pathname)) {
      setCategory("Toutes");
      setShowProducts(true);
      setSellerFilter(null);
    }
  }, [location.pathname]);
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isAndroid = isAndroidBrowser();
    if (!isStandalone && isAndroid) setInstallOpen(true);
    if (!isAndroid) return;

    const relatedAppsNavigator = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<unknown>>;
    };
    if (!relatedAppsNavigator.getInstalledRelatedApps) return;
    void relatedAppsNavigator.getInstalledRelatedApps().then((apps) => {
      if (apps.length > 0) {
        setNativeAppAvailable(true);
      }
    }).catch(() => undefined);
  }, []);
  const openNativeApp = () => {
    if (nativeAppOpening) return;
    setNativeAppOpening(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setNativeAppAvailable(true);
      setNativeAppOpening(false);
    };
    const fallbackTimer = window.setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setNativeAppOpening(false);
      if (document.visibilityState === "visible") {
        setNativeAppAvailable(false);
        setNativeAppCheckComplete(true);
      }
    }, 2000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.location.href = getAppDeepLinkUrl("/");
  };
  const loadProducts = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("produits")
      .select("*")
      .order("is_featured", { ascending: false })
      .order("is_promoted", { ascending: false })
      .order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else {
      const mapped = (data || [])
        .map(mapProduct)
        .filter((item) => item.status !== "sold" && item.status !== "archived");
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("*");
      const profileMap = new Map(
        (profiles || []).map((profile) => [String(profile.id), profile]),
      );
      setProducts(
        mapped.map((item) => {
          const profile = profileMap.get(item.sellerId)
            || (profiles || []).find((candidate) => getProfileDisplayName(candidate) === item.seller);
          return {
            ...item,
            seller: getProfileDisplayName(profile) || item.seller,
            sellerAvatar: profile?.avatar || item.sellerAvatar,
            sellerUsername: profile?.username || item.sellerUsername,
            sellerBio: profile?.bio || item.sellerBio,
            sellerAddress: profile?.address || item.sellerAddress,
            phone: profile?.show_phone ? profile?.phone || "" : "",
            verified: Boolean(profile?.is_verified || item.verified),
            sellerAccountType: profile?.account_type || item.sellerAccountType,
            deliverySettings: profile?.delivery_settings ?? item.deliverySettings,
          };
        }),
      );
      setError("");
    }
    setLoading(false);
  };
  const loadNotices = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    try {
      const { data, error: loadError } = await supabase
        .from("notifications")
        .select("id,title,message,read,created_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (loadError) {
        console.error("[notifications] actualisation impossible", loadError);
        setError(loadError.message);
        return;
      }
      setNotices(
        (data || [])
          .map((item) => ({
            id: String(item.id),
            title: item.title || "Notification",
            message: item.message || "",
            read: item.read === true,
            createdAt: item.created_at,
          }))
          .filter((item) => !isSentMessageNotification(item)),
      );
    } catch (loadError) {
      console.error("[notifications] actualisation impossible", loadError);
      setError(loadError instanceof Error ? loadError.message : "Impossible d’actualiser les notifications.");
    }
  }, []);
  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    const refreshVisibleNotices = () => {
      if (document.visibilityState === "visible") void loadNotices(user);
    };
    window.addEventListener("focus", refreshVisibleNotices);
    document.addEventListener("visibilitychange", refreshVisibleNotices);
    const channel = client
      .channel(`web-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { void loadNotices(user); },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[notifications] synchronisation temps réel indisponible", status);
        }
      });

    return () => {
      window.removeEventListener("focus", refreshVisibleNotices);
      document.removeEventListener("visibilitychange", refreshVisibleNotices);
      void client.removeChannel(channel);
    };
  }, [loadNotices, user]);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const showPendingAuthSuccess = () => {
      const pendingType = localStorage.getItem("mbokamaket-auth-success-pending");
      if (!pendingType) return;
      localStorage.removeItem("mbokamaket-auth-success-pending");
      setAuthSuccessMessage(pendingType === "signup"
        ? "Votre compte a été créé avec succès. Vérifiez votre email pour activer le compte."
        : "Connexion réussie.");
      window.setTimeout(() => setAuthSuccessMessage(""), 5000);
    };
    const applySession = async (session: Awaited<ReturnType<typeof client.auth.getSession>>["data"]["session"]) => {
      const sessionUser = session?.user;
      setLoading(false);
      if (!sessionUser) {
        setUser(null);
        return;
      }
      console.info("[OAuth] Session Supabase disponible", { userId: sessionUser.id });
      showPendingAuthSuccess();
      const { data: profile, error: profileError } = await client.from("public_profiles").select("*").eq("id", sessionUser.id).maybeSingle();
      if (profileError) console.warn("[OAuth] Profil indisponible, session conservee", profileError);
      const fullName = getProfileDisplayName({
        ...profile,
        name: profile?.name || sessionUser.user_metadata?.name,
        full_name: profile?.full_name || sessionUser.user_metadata?.full_name,
        business_name: profile?.business_name || sessionUser.user_metadata?.business_name,
        account_type: profile?.account_type || sessionUser.user_metadata?.account_type,
        username: sessionUser.user_metadata?.username || sessionUser.user_metadata?.user_name,
      }) || (sessionUser.email ? sessionUser.email.split("@")[0] : "");
      const current = {
        id: sessionUser.id,
        email: sessionUser.email,
        isAnonymous: sessionUser.is_anonymous,
        fullName,
        businessName: profile?.business_name || sessionUser.user_metadata?.business_name || "",
        username: sessionUser.user_metadata?.username || sessionUser.user_metadata?.user_name,
        role: profile?.role || sessionUser.user_metadata?.role,
        accountType: profile?.account_type || sessionUser.user_metadata?.account_type,
        avatar: profile?.avatar || sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || "",
        isVerified: Boolean(profile?.is_verified),
        phone: profile?.phone || sessionUser.user_metadata?.phone || "",
        address: profile?.address || "",
      };
      setUser(current);
      setAuthOpen(false);
      if (window.location.hash === "#connexion" || window.location.hash === "#inscription") window.location.hash = "accueil";
      void loadNotices(current);
    };
    const finishOAuthCallback = async () => {
      const callbackUrl = new URL(window.location.href);
      const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
      const callbackError = callbackUrl.searchParams.get("error_description")
        || callbackUrl.searchParams.get("error")
        || hashParams.get("error_description")
        || hashParams.get("error");
      const code = callbackUrl.searchParams.get("code");
      const hasAuthResponse = Boolean(code || hashParams.get("access_token") || callbackError);
      if (!hasAuthResponse) return;
      console.info("[OAuth] Callback recu", { hasCode: Boolean(code), hasHashToken: Boolean(hashParams.get("access_token")), hasError: Boolean(callbackError) });
      setLoading(false);
      if (callbackError) {
        console.error("[OAuth] Echec du fournisseur", callbackError);
        setError(callbackError);
        setAuthOpen(false);
        return;
      }
      if (code) {
        console.info("[OAuth] Echange du code PKCE en cours");
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[OAuth] Echec de exchangeCodeForSession", exchangeError);
          setError(exchangeError.message);
          setLoading(false);
          return;
        }
        console.info("[OAuth] Code PKCE echange avec succes");
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
      }
    };
    void finishOAuthCallback()
      .then(() => client.auth.getSession())
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          console.error("[OAuth] Impossible de recuperer la session", sessionError);
          setError(sessionError.message);
          return;
        }
        return applySession(data.session);
      })
      .catch((callbackError: unknown) => {
        console.error("[OAuth] Erreur inattendue du callback", callbackError);
        setError(callbackError instanceof Error ? callbackError.message : "La connexion a echoue.");
      })
      .finally(() => setLoading(false));
    const { data: listener } = client.auth.onAuthStateChange(
      (event, session) => {
        console.info("[OAuth] Evenement Supabase", event, { hasSession: Boolean(session) });
        const sessionUser = session?.user;
        setLoading(false);
        if (!sessionUser) {
          setUser(null);
          return;
        }
        void applySession(session);
      },
    );
    void loadProducts().finally(() => setLoading(false));
    return () => listener.subscription.unsubscribe();
  }, [loadNotices]);
  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => {
      setLoading(false);
      setError("Le chargement prend trop de temps. Vous pouvez continuer et réessayer plus tard.");
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [loading]);
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!mobileSearchRef.current?.contains(event.target as Node)) {
        setMobileSearchOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSearchOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);
  const filteredProducts = useMemo(
    () => showProducts ? products.filter((item) => {
        const text = `${item.title} ${item.category} ${item.location} ${item.seller} ${item.sellerUsername}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (!sellerFilter || item.sellerId === sellerFilter.id) &&
          (category === "Toutes" || item.categoryId === category)
        );
      }) : [],
    [products, query, category, sellerFilter, showProducts],
  );
  const sortedProducts = useMemo(() => {
    const normalizedQuery = query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
    const relevanceScore = (product: Product) => {
      const title = product.title.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      const searchableText = `${title} ${product.category} ${product.location} ${product.seller} ${product.sellerUsername}`
        .normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      return searchTerms.reduce((score, term) => {
        if (title === term) return score + 8;
        if (title.startsWith(term)) return score + 5;
        if (title.includes(term)) return score + 3;
        if (searchableText.includes(term)) return score + 1;
        return score;
      }, 0);
    };
    const timestamp = (product: Product) => {
      const value = product.createdAt ? new Date(product.createdAt).getTime() : 0;
      return Number.isFinite(value) ? value : 0;
    };
    return [...filteredProducts].sort((first, second) => {
      if (productSort === "price_asc" || productSort === "price_desc") {
        const currencyOrder = first.currency.localeCompare(second.currency);
        if (currencyOrder) return currencyOrder;
        return (productSort === "price_asc" ? 1 : -1) * (first.price - second.price);
      }
      if (productSort === "popular") {
        const firstFeatured = Number(first.featured || first.promoted);
        const secondFeatured = Number(second.featured || second.promoted);
        if (firstFeatured !== secondFeatured) return secondFeatured - firstFeatured;
      }
      if (productSort === "relevance" && searchTerms.length) {
        const scoreDifference = relevanceScore(second) - relevanceScore(first);
        if (scoreDifference) return scoreDifference;
      }
      return timestamp(second) - timestamp(first);
    });
  }, [filteredProducts, productSort, query]);
  const productsPerPage = 12;
  const pageCount = Math.ceil(sortedProducts.length / productsPerPage);
  const currentProductPage = Math.min(productPage, Math.max(pageCount, 1));
  const visibleProducts = sortedProducts.slice(
    (currentProductPage - 1) * productsPerPage,
    currentProductPage * productsPerPage,
  );
  const paginationItems = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
    const start = Math.max(2, currentProductPage - 1);
    const end = Math.min(pageCount - 1, currentProductPage + 1);
    const pages: Array<number | "left-ellipsis" | "right-ellipsis"> = [1];
    if (start > 2) pages.push("left-ellipsis");
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < pageCount - 1) pages.push("right-ellipsis");
    pages.push(pageCount);
    return pages;
  }, [currentProductPage, pageCount]);
  useEffect(() => {
    setProductPage(1);
  }, [query, category, sellerFilter, productSort]);
  const visibleNotices = notices.filter((item) => !isSentMessageNotification(item));
  const unreadNoticeCount = visibleNotices.filter((item) => item.read === false).length;
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const openNotice = async (notice: Notice) => {
    if (!notice.read && user) {
      if (!supabase) {
        setError("La configuration Supabase est absente. La notification n’a pas pu être marquée comme lue.");
        return;
      }
      const { data, error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notice.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (updateError || !data) {
        const message = updateError?.message || "La notification n’a pas pu être mise à jour.";
        console.error("[notifications] marquage comme lue impossible", updateError || message);
        setError(message);
        return;
      }
      setNotices((current) => current.map((item) => item.id === notice.id ? { ...item, read: true } : item));
    }
    setSelectedNotice({ ...notice, read: true });
  };
  const availableCategories = useMemo(
    () => categories.filter((item) =>
      products.some((product) => product.categoryId === item.id),
    ),
    [products],
  );
  const homeProducts = useMemo(() => products.slice(0, 3), [products]);
  const advertisedProducts = useMemo(
    () => products.filter((item) => item.featured || item.promoted).length > 0
      ? products.filter((item) => item.featured || item.promoted).slice(0, 6)
      : products.slice(0, 6),
    [products],
  );
  const heroProduct = advertisedProducts[heroProductIndex % Math.max(advertisedProducts.length, 1)];
  useEffect(() => {
    setDesktopHeroProducts([...advertisedProducts].sort(() => Math.random() - 0.5).slice(0, 3));
  }, [advertisedProducts]);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);
  useEffect(() => {
    if (!isMobileViewport || advertisedProducts.length < 2 || heroPaused) return;
    const timer = window.setInterval(() => {
      setHeroProductIndex((current) => (current + 1) % advertisedProducts.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [advertisedProducts.length, heroPaused, isMobileViewport]);
  const openProducts = () => {
    setSellerFilter(null);
    setPublishOpen(false);
    setManageProductsOpen(false);
    setStockManagementOpen(false);
    setProfileManagementOpen(false);
    setNoticeOpen(false);
    setSelectedNotice(null);
    setShowProducts(true);
    navigate("/annonces");
    window.location.hash = "produits";
  };
  const returnToAllProducts = () => {
    setSelectedProduct(null);
    setSellerFilter(null);
    setQuery("");
    setCategory("Toutes");
    setProductPage(1);
    setPublishOpen(false);
    setManageProductsOpen(false);
    setStockManagementOpen(false);
    setProfileManagementOpen(false);
    setNoticeOpen(false);
    setSelectedNotice(null);
    setShowProducts(true);
    navigate("/annonces");
    window.location.hash = "produits";
  };
  const openCart = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    setCommerceMode("cart");
  };
  const openOrders = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    if (!user) {
      openAuth();
      return;
    }
    setCommerceMode("orders");
  };
  const openSellerOrders = () => {
    setProfileOpen(false);
    setSellerOrdersOpen(true);
  };
  const addToCart = (product: Product, variants: ProductVariant[] = [{ selectedSpecifications: {}, quantity: 1 }]) => {
    if (!product.sellerId || product.status !== "active") {
      setError("Cette annonce n’est pas disponible pour une commande.");
      return;
    }
    if (getSelectableSpecifications(product.specifications).length
      && variants.some((variant) => !Object.keys(variant.selectedSpecifications).length)) {
      setError("Choisissez les options disponibles depuis la fiche du produit.");
      return;
    }
    const requestedQuantity = variants.reduce((total, variant) => total + variant.quantity, 0);
    const quantityInCart = cartItems
      .filter((item) => item.product.id === product.id)
      .reduce((total, item) => total + item.quantity, 0);
    if (!product.realEstateType && requestedQuantity > Math.max(0, product.stock - quantityInCart)) {
      setError(`Stock insuffisant. Il reste ${Math.max(0, product.stock - quantityInCart)} unité(s) disponible(s).`);
      return;
    }
    const commerceProduct: CommerceProduct = {
      id: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency === "$" || product.currency.toUpperCase() === "USD" ? "USD" : "FC",
      image: product.image,
      sellerId: product.sellerId,
      seller: product.seller,
      categoryId: product.categoryId,
      stock: product.stock,
      specifications: product.specifications,
      sellerAccountType: product.sellerAccountType,
      deliverySettings: product.deliverySettings,
    };
    setCartItems((current) => {
      let updated = [...current];
      for (const variant of variants) {
        if (variant.quantity < 1) continue;
        const cartItem: CommerceCartItem = {
          product: commerceProduct,
          quantity: variant.quantity,
          ...(Object.keys(variant.selectedSpecifications).length
            ? { selectedSpecifications: variant.selectedSpecifications }
            : {}),
        };
        const itemKey = getCommerceCartItemKey(cartItem);
        const existingIndex = updated.findIndex((item) => getCommerceCartItemKey(item) === itemKey);
        if (existingIndex >= 0) {
          updated = updated.map((item, index) => index === existingIndex
            ? { ...item, quantity: item.quantity + variant.quantity }
            : item);
        } else {
          updated.push(cartItem);
        }
      }
      return updated;
    });
    setError("");
    setCartNotice(requestedQuantity > 1 ? "Variantes ajoutées au panier." : "Produit ajouté au panier.");
    window.setTimeout(() => setCartNotice(""), 2600);
  };
  const goHome = () => {
    setSellerFilter(null);
    setSelectedProduct(null);
    setPublishOpen(false);
    setManageProductsOpen(false);
    setStockManagementOpen(false);
    setProfileManagementOpen(false);
    setNoticeOpen(false);
    setSelectedNotice(null);
    setShowProducts(false);
    navigate("/");
    window.location.hash = "accueil";
  };
  const openNotifications = () => {
    setPublishOpen(false);
    setManageProductsOpen(false);
    setProfileManagementOpen(false);
    setShowProducts(false);
    setNoticeOpen(true);
    window.location.hash = "notifications";
    if (user) void loadNotices(user);
  };
  useEffect(() => {
    if (!noticeOpen) return;
    if (!selectedNotice && visibleNotices.length > 0) {
      setSelectedNotice(visibleNotices[0]);
    }
  }, [noticeOpen, selectedNotice, visibleNotices]);
  const openAuth = (authMode: "login" | "signup" = "login") => {
    setProfileOpen(false);
    setAuthOpen(true);
    window.location.hash = authMode === "login" ? "connexion" : "inscription";
  };
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setShowProducts(hash === "#produits");
      setNoticeOpen(hash === "#notifications");
      setPublishOpen(hash === "#publier");
      setManageProductsOpen(hash === "#mes-produits");
      setStockManagementOpen(hash === "#gestion-stock");
      setProfileManagementOpen(hash === "#mon-profil");
      setAuthOpen(hash === "#connexion" || hash === "#inscription");
      setLegalPage(hash === "#conditions" ? "conditions" : hash === "#confidentialite" ? "confidentialite" : null);
      if (["#accueil", "#produits", "#notifications", "#telechargement"].includes(hash)) {
        setSelectedProduct(null);
      }
      if (hash !== "#notifications") setSelectedNotice(null);
    };
    handleHashChange();
    window.addEventListener("popstate", handleHashChange);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("popstate", handleHashChange);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);
  useEffect(() => {
    const productId = new URLSearchParams(window.location.search).get("produit");
    const productPathMatch = window.location.pathname.match(/^\/produit\/([^/]+)\/?$/i)
      || window.location.pathname.match(/^\/product\/([^/]+)\/?$/i);
    const announcementMatch = window.location.pathname.match(/^\/annonce\/([^/]+)\/?$/i);
    const sharedProductSlug = announcementMatch ? decodeURIComponent(announcementMatch[1]) : (productPathMatch ? decodeURIComponent(productPathMatch[1]) : "");
    const sharedProductId = productId || (productPathMatch && productPathMatch[1]?.length === 36 ? decodeURIComponent(productPathMatch[1]) : "");
    if ((!sharedProductId && !sharedProductSlug) || products.length === 0) return;
    const sharedProduct = products.find((product) => product.id === sharedProductId)
      || products.find((product) => productSlug(product) === sharedProductSlug);
    if (!sharedProduct) return;
    setSelectedProduct(sharedProduct);
    setShowProducts(false);
  }, [location.pathname, products]);
  useEffect(() => {
    const profileId = new URLSearchParams(window.location.search).get("profil");
    const pathMatch = window.location.pathname.match(/^\/profile\/([^/]+)\/?$/i);
    const sharedProfileId = profileId || (pathMatch ? decodeURIComponent(pathMatch[1]) : "");
    if (!sharedProfileId || products.length === 0) return;
    const sellerProduct = products.find((product) => product.sellerId === sharedProfileId);
    if (!sellerProduct) return;
    setSelectedProduct(null);
    setQuery("");
    setCategory("Toutes");
    setSellerFilter({ id: sharedProfileId, name: sellerProduct.seller });
    setShowProducts(true);
  }, [products]);
  const authRoute = window.location.hash === "#connexion" || window.location.hash === "#inscription";
  const passwordResetRoute = new URLSearchParams(window.location.search).get("reset") === "1";

  useEffect(() => {
    if (!isMobileBrowser()) return;
    const href = new URL(window.location.href);
    const directProductId = href.searchParams.get("produit")
      || href.pathname.match(/^\/product\/([^/]+)\/?$/i)?.[1];
    const productSlugFromPath = href.pathname.match(/^\/(?:produit|annonce)\/([^/]+)\/?$/i)?.[1];
    const profileId = href.searchParams.get("profil") || href.pathname.match(/^\/profile\/([^/]+)\/?>$/i)?.[1];
    const productId = directProductId || (productSlugFromPath
      ? products.find((product) => productSlug(product) === decodeURIComponent(productSlugFromPath))?.id
      : undefined);

    if (productId) {
      openAppIfInstalled(`/product/${encodeURIComponent(productId)}`);
      return;
    }

    if (profileId) {
      openAppIfInstalled(`/profile/${encodeURIComponent(profileId)}`);
      return;
    }

  }, [products]);

  const openManageProducts = () => {
    setProfileOpen(false);
    setStockManagementOpen(false);
    setProfileManagementOpen(false);
    setSelectedProduct(null);
    setShowProducts(false);
    setNoticeOpen(false);
    setPublishOpen(false);
    setManageProductsOpen(true);
    window.location.hash = "mes-produits";
  };
  const openStockManagement = () => {
    setProfileOpen(false);
    setProfileManagementOpen(false);
    setManageProductsOpen(false);
    setSelectedProduct(null);
    setShowProducts(false);
    setNoticeOpen(false);
    setPublishOpen(false);
    setStockManagementOpen(true);
    window.location.hash = "gestion-stock";
  };
  const openProfileManagement = () => {
    setProfileOpen(false);
    setStockManagementOpen(false);
    setSelectedProduct(null);
    setShowProducts(false);
    setNoticeOpen(false);
    setPublishOpen(false);
    setManageProductsOpen(false);
    setProfileManagementOpen(true);
    window.location.hash = "mon-profil";
  };
  const deleteProduct = async (product: Product) => {
    if (!supabase || !user || !window.confirm(`Supprimer l’annonce « ${product.title} » ?`)) return;
    const { error: deleteError } = await supabase.from("produits").delete().eq("id", product.id).eq("seller_profile_id", user.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== product.id));
  };
  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProducts(false);
    navigate(productPath(product));
  };
  const seo = selectedProduct
    ? {
        title: `${selectedProduct.title} à vendre en RDC - Mbokamaket`,
        description: `${selectedProduct.description || `${selectedProduct.category} disponible à ${selectedProduct.location}`}. Achetez et contactez le vendeur sur Mbokamaket.`.replace(/\s+/g, " ").slice(0, 160),
        path: productPath(selectedProduct),
        image: selectedProduct.image,
        type: "product" as const,
        jsonLd: ["Immobilier", "Auto & Moto", "Services", "Emploi"].includes(selectedProduct.category) ? undefined : {
          "@context": "https://schema.org",
          "@type": "Product",
          name: selectedProduct.title,
          description: selectedProduct.description || undefined,
          image: selectedProduct.image ? [selectedProduct.image] : undefined,
          url: `${window.location.origin}${productPath(selectedProduct)}`,
          category: selectedProduct.category,
          offers: { "@type": "Offer", price: selectedProduct.price, priceCurrency: selectedProduct.currency === "$" || selectedProduct.currency === "USD" ? "USD" : "CDF", availability: selectedProduct.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${window.location.origin}${productPath(selectedProduct)}` },
        },
      }
    : null;
  if (profileManagementOpen && user) {
    return (
      <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
        <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-8">
          <ProfileManagementPage
            user={user}
            onClose={goHome}
            onSaved={(updatedUser) => setUser(updatedUser)}
          />
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <Seo {...(seo || { ...currentPageSeo, jsonLd: siteStructuredData })} />
      {installOpen && (
        <aside className="fixed inset-x-3 bottom-3 z-[90] rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl shadow-[#143ca8]/20 sm:inset-x-auto sm:right-6 sm:w-96" aria-label="Installation de Mbokamaket">
          <div className="flex items-start gap-3">
            <img src={appIcon} alt="" className="size-12 rounded-xl object-contain" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900">{nativeAppAvailable ? "Ouvrir dans l’application" : nativeAppCheckComplete ? "Télécharger Mbokamaket" : "Mbokamaket sur Android"}</h2>
              <p className="mt-1 text-sm text-slate-500">{nativeAppAvailable ? "L’application semble déjà installée sur ce téléphone." : nativeAppOpening ? "Tentative d’ouverture de l’application..." : nativeAppCheckComplete ? "L’application ne s’est pas ouverte. Téléchargez l’APK ; Android vous demandera de confirmer l’installation et, selon vos réglages, d’autoriser cette source." : "Essayez d’ouvrir l’application. Si elle n’est pas installée, son téléchargement vous sera proposé."}</p>
            </div>
            <button type="button" onClick={() => setInstallOpen(false)} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer">×</button>
          </div>
          {nativeAppAvailable || !nativeAppCheckComplete ? (
            <button type="button" onClick={openNativeApp} disabled={nativeAppOpening} className="btn mt-3 w-full rounded-xl bg-[#143ca8] text-white">
              {nativeAppOpening ? "Ouverture..." : nativeAppAvailable ? "Ouvrir l’application" : "Essayer d’ouvrir l’application"}
            </button>
          ) : (
            <a
              href={apkDownloadUrl}
              download="Mbokamaket-v1.0.0.apk"
              type="application/vnd.android.package-archive"
              onClick={registerApkDownload}
              className="btn mt-3 w-full rounded-xl bg-[#143ca8] text-white"
            >
              Télécharger l’APK Android
            </a>
          )}
          <button type="button" onClick={() => setInstallOpen(false)} className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600">
            Rester sur le site
          </button>
        </aside>
      )}
      {loading && (
        <main className="fixed inset-0 z-[100] grid place-items-center bg-[#143ca8] px-6 text-white md:hidden" aria-busy="true" aria-label="Chargement de Mbokamaket">
          <div className="flex flex-col items-center text-center">
            <LoaderCircle className="size-16 animate-spin text-white" strokeWidth={1.5} aria-hidden="true" />
            <h1 className="mt-6 font-display text-2xl font-bold">Mbokamaket</h1>
            <p className="mt-2 text-sm text-blue-100">Chargement de votre marché...</p>
          </div>
        </main>
      )}
      <header className={profileManagementOpen ? "hidden" : "sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button
            className="btn btn-ghost btn-square md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <a href="#accueil" onClick={goHome} className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-[#143ca8] text-lg font-black text-white">
              M
            </span>
            <span className="hidden sm:block">
              <strong className="block font-display text-lg leading-none text-[#143ca8]">
                Mbokamaket
              </strong>
              <small className="text-[10px] uppercase tracking-widest text-slate-400">
                Le marché près de vous
              </small>
            </span>
          </a>
          <div className="ml-auto flex items-center gap-1 md:hidden">
            {user?.isVerified && (
              <button
                onClick={() => { setMobileOpen(false); setPublishOpen(true); window.location.hash = "publier"; }}
                className="btn btn-ghost btn-square"
                aria-label="Publier une annonce"
              >
                <Plus size={22} />
              </button>
            )}
            <button
              onClick={() => { setMobileSearchOpen(true); openProducts(); }}
              className="btn btn-ghost btn-square"
              aria-label="Rechercher"
            >
              <Search size={20} />
            </button>
            <button
              onClick={openNotifications}
              className="btn btn-ghost btn-square relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadNoticeCount > 0 && (
                <span className="badge badge-error badge-xs absolute right-0 top-0 min-w-4 px-1 text-[10px] text-white">
                  {unreadNoticeCount > 99 ? "99+" : unreadNoticeCount}
                </span>
              )}
            </button>
          </div>
          {mobileSearchOpen && (
            <label ref={mobileSearchRef} className="absolute left-4 right-4 top-full z-50 flex h-14 items-center gap-2 rounded-2xl border-2 border-[#8ea9ff] bg-white px-3 shadow-xl shadow-[#143ca8]/15 md:hidden">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.trim()) {
                    setShowProducts(true);
                    window.location.hash = "produits";
                  }
                }}
                className="min-w-0 grow bg-transparent text-sm outline-none"
                placeholder="Rechercher un produit, un compte ou un nom utilisateur..."
              />
              <button type="button" onClick={() => setMobileSearchOpen(false)} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer la recherche">
                <X size={17} />
              </button>
            </label>
          )}
          <label className="input input-bordered mx-auto hidden h-11 max-w-xl flex-1 items-center gap-2 rounded-xl bg-slate-50 md:flex">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.trim()) {
                  setShowProducts(true);
                  window.location.hash = "produits";
                }
              }}
              className="grow bg-transparent"
              placeholder="Rechercher un produit, un compte ou un nom utilisateur..."
            />
          </label>
          <nav className="ml-auto hidden items-center gap-2 md:flex">
            <button
              onClick={openCart}
              className="btn btn-ghost btn-square relative"
              aria-label={`Panier${cartItemCount ? `, ${cartItemCount} article(s)` : ""}`}
            >
              <ShoppingCart size={20} />
              {cartItemCount > 0 && (
                <span className="badge badge-primary badge-xs absolute right-0 top-0 min-w-4 px-1 text-[10px] text-white">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </button>
            <button onClick={openOrders} className="btn btn-ghost btn-square" aria-label="Mes commandes">
              <ClipboardList size={20} />
            </button>
            <button
              onClick={openNotifications}
              className="btn btn-ghost btn-square relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadNoticeCount > 0 && (
                <span className="badge badge-error badge-xs absolute right-0 top-0 min-w-4 px-1 text-[10px] text-white">
                  {unreadNoticeCount > 99 ? "99+" : unreadNoticeCount}
                </span>
              )}
            </button>
            <button
              onClick={() =>
                user ? setProfileOpen(!profileOpen) : openAuth()
              }
              className="btn btn-ghost btn-square"
              aria-label="Compte"
            >
              <UserRound size={20} />
            </button>
            <a href="#telechargement" className="btn btn-primary ml-1 whitespace-nowrap rounded-xl bg-[#143ca8]">
              Télécharger l’application
            </a>
          </nav>
        </div>
        {mobileOpen && (
          <div ref={mobileMenuRef} className="absolute left-0 right-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-100 bg-white px-3 py-2 shadow-xl md:hidden">
            {user ? (
              <div className="mb-1.5 flex items-center gap-2 border-b border-slate-100 px-1 pb-2">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="size-9 shrink-0 rounded-full bg-slate-100 object-cover" />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf3ff] text-[#143ca8]">
                    <UserRound size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-5 text-slate-900">
                    {(isBusinessDisplayAccount(user.accountType) && user.businessName?.trim())
                      || user.fullName
                      || user.email?.split("@")[0]
                      || "Utilisateur"}
                  </p>
                  <div className="flex min-w-0 items-center gap-2 text-[11px] leading-4 text-slate-500">
                    {user.username && <span className="truncate">@{user.username.replace(/^@/, "")}</span>}
                    {user.email && <span className="truncate">{user.email}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {user.role && <span className="badge badge-xs border-0 bg-slate-100 text-slate-600">{user.role === "seller" ? "Vendeur" : "Acheteur"}</span>}
                    {user.isVerified && <span className="badge badge-xs border-0 bg-emerald-100 text-emerald-700">Vérifié</span>}
                    {user.accountType && user.accountType !== "personal" && <span className="badge badge-xs border-0 bg-blue-50 text-blue-700">{user.accountType}</span>}
                  </div>
                </div>
                {!user.isAnonymous && (
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); openProfileManagement(); }}
                    className="btn btn-ghost btn-xs min-h-7 h-7 shrink-0 px-2"
                  >
                    Modifier
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setMobileOpen(false); openAuth(); }}
                className="btn btn-sm mb-1.5 min-h-9 h-9 w-full bg-[#143ca8] text-white"
              >
                <UserRound size={17} /> Se connecter
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen((open) => !open)}
              aria-expanded={mobileCategoriesOpen}
              className="btn btn-ghost btn-sm min-h-9 h-9 w-full justify-between px-2"
            >
              <span className="font-semibold">Catégories</span>
              <ChevronRight size={16} className={`transition-transform ${mobileCategoriesOpen ? "rotate-90" : ""}`} />
            </button>
            {mobileCategoriesOpen && (
              <div className="flex flex-col border-l-2 border-slate-100 ml-3 pl-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("Toutes");
                    setSellerFilter(null);
                    setShowProducts(true);
                    setMobileOpen(false);
                    setMobileCategoriesOpen(false);
                    window.location.hash = "produits";
                  }}
                  className={`btn btn-ghost btn-sm min-h-9 h-auto w-full justify-start rounded-none border-b border-slate-100 px-3 text-left ${category === "Toutes" ? "font-bold text-[#143ca8]" : "text-slate-700"}`}
                >
                  Toutes
                </button>
                {availableCategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategory(item.id);
                      setSellerFilter(null);
                      setShowProducts(true);
                      setMobileOpen(false);
                      setMobileCategoriesOpen(false);
                      window.location.hash = "produits";
                    }}
                    className={`btn btn-ghost btn-sm min-h-9 h-auto w-full justify-start gap-2 rounded-none border-b border-slate-100 px-3 text-left ${category === item.id ? "font-bold text-[#143ca8]" : "text-slate-700"}`}
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span className="line-clamp-1">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            {(!user || !user.isAnonymous) && <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                if (user) openManageProducts();
                else openAuth();
              }}
              className="btn btn-ghost btn-sm min-h-9 h-9 w-full justify-start"
            >
              Voir mes produits
            </button>}
            <button type="button" onClick={openCart} className="btn btn-ghost btn-sm min-h-9 h-9 w-full justify-start">
              <ShoppingCart size={17} /> Mon panier {cartItemCount > 0 ? `(${cartItemCount})` : ""}
            </button>
            <button type="button" onClick={openOrders} className="btn btn-ghost btn-sm min-h-9 h-9 w-full justify-start">
              <ClipboardList size={17} /> Mes commandes
            </button>
            <a
              href="#telechargement"
              onClick={() => setMobileOpen(false)}
              className="btn btn-ghost btn-sm min-h-9 h-9 w-full justify-start"
            >
              Télécharger l’application
            </a>
            {user && (
              <button
                type="button"
                onClick={async () => {
                  setMobileOpen(false);
                  await supabase?.auth.signOut();
                }}
                className="btn btn-ghost btn-sm mt-1 min-h-9 h-9 w-full justify-start text-red-600"
              >
                <LogOut size={17} /> Se déconnecter
              </button>
            )}
          </div>
        )}
      </header>
      {!commerceMode && (
        <div
          className="fixed right-4 z-[80] flex items-center gap-1.5 md:hidden"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {cartItemCount > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-white py-1.5 pl-3 pr-1.5 text-xs font-semibold text-[#143ca8] shadow-lg ring-1 ring-blue-100" role="status">
              <span>Terminer la commande</span>
              <ChevronRight size={18} className="animate-pulse" aria-hidden="true" />
            </div>
          )}
        <button
          type="button"
          onClick={openCart}
          className="btn btn-circle size-12 min-h-12 border-0 bg-[#143ca8] p-0 text-white shadow-xl shadow-[#143ca8]/30"
          aria-label={`Ouvrir le panier${cartItemCount ? `, ${cartItemCount} article(s)` : ""}`}
        >
          <ShoppingCart size={20} />
          {cartItemCount > 0 && (
            <span className="badge badge-sm absolute -right-1 -top-1 border-0 bg-white text-[#143ca8]">
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </span>
          )}
        </button>
        </div>
      )}
      <main id="accueil" className={profileManagementOpen ? "min-h-screen bg-[#f6f8fc] px-4 py-6 sm:px-6 sm:py-10" : "mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16"}>
        {publishOpen && user?.isVerified && (
          <PublishModal
            user={user}
            onClose={() => { setPublishOpen(false); window.location.hash = "accueil"; }}
            onCreated={() => { setPublishOpen(false); void loadProducts(); window.location.hash = "accueil"; }}
          />
        )}
        {!publishOpen && manageProductsOpen && user && (
          <ManageProductsPage
            products={products.filter((product) => product.sellerId === user.id)}
            onClose={goHome}
            onPublish={() => { setManageProductsOpen(false); setPublishOpen(true); window.location.hash = "publier"; }}
            onViewProduct={(product) => { setManageProductsOpen(false); openProduct(product); }}
            onDelete={(product) => void deleteProduct(product)}
          />
        )}
        {!publishOpen && !manageProductsOpen && profileManagementOpen && user && (
          <ProfileManagementPage
            user={user}
            onClose={goHome}
            onSaved={(updatedUser) => setUser(updatedUser)}
          />
        )}
        {!publishOpen && selectedProduct && (
          <ProductDetails
            key={selectedProduct.id}
            product={selectedProduct}
            isFavorite={favoriteIds.includes(selectedProduct.id)}
            onToggleFavorite={() => toggleFavorite(selectedProduct.id)}
            onAddToCart={(variants) => addToCart(selectedProduct, variants)}
            onClose={returnToAllProducts}
            sellerProducts={products.filter((item) => item.sellerId === selectedProduct.sellerId && item.id !== selectedProduct.id)}
            similarProducts={products.filter((item) =>
              item.id !== selectedProduct.id
              && item.sellerId !== selectedProduct.sellerId
              && item.status === "active"
              && (selectedProduct.categoryId
                ? item.categoryId === selectedProduct.categoryId
                : item.category === selectedProduct.category)
            )}
            onSelectSellerProduct={openProduct}
            onDownload={() => {
              setSelectedProduct(null);
              setShowProducts(false);
              window.location.hash = "telechargement";
            }}
          />
        )}
        {!publishOpen && noticeOpen && (
          <div
            className="fixed inset-0 z-50 flex items-stretch justify-center bg-white sm:items-center sm:bg-slate-950/30 sm:p-4 sm:backdrop-blur-[2px]"
            onClick={goHome}
          >
            <section
              className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[min(80vh,44rem)] sm:max-w-[26rem] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-xl sm:ring-1 sm:ring-slate-200"
              role="dialog"
              aria-modal="true"
              aria-label="Vos notifications"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#143ca8]">Notifications</p>
                  <h2 className="mt-1 truncate text-lg font-bold text-slate-900">Vos notifications</h2>
                </div>
                <button
                  type="button"
                  onClick={goHome}
                  className="btn btn-ghost btn-circle btn-sm"
                  aria-label="Retour"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                {visibleNotices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <Bell className="mb-3 text-slate-300" size={32} />
                    <p className="text-sm">Aucune notification pour le moment.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {visibleNotices.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => void openNotice(item)}
                        className={`flex w-full items-start gap-3 px-2 py-4 text-left transition hover:bg-slate-50 sm:rounded-xl sm:px-3 ${selectedNotice?.id === item.id ? "sm:bg-[#f3f6ff]" : ""} ${item.read ? "" : "bg-blue-50/60"}`}
                      >
                        <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${item.read ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-[#143ca8]"}`}>
                          <Bell size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <strong className="min-w-0 flex-1 text-sm leading-5 text-slate-900">{item.title}</strong>
                            {!item.read && <span className="mt-0.5 size-2 shrink-0 rounded-full bg-[#143ca8]" aria-label="Non lue" />}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-slate-600">{item.message || "Aucun message"}</span>
                          <span className="mt-2 block text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("fr-FR")}</span>
                        </span>
                        {selectedNotice?.id === item.id && (
                          <span className="hidden shrink-0 text-xs font-semibold text-[#143ca8] sm:inline">Lue</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedNotice && (
                <div className="hidden shrink-0 border-t border-slate-100 bg-slate-50 p-4 sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#143ca8]">Sélectionnée</p>
                  <h3 className="mt-2 text-base font-bold text-slate-900">{selectedNotice.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{selectedNotice.message || "Aucun détail supplémentaire."}</p>
                  <p className="mt-3 text-[11px] text-slate-400">{new Date(selectedNotice.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              )}
            </section>
          </div>
        )}
        <section className={`${showProducts || noticeOpen || selectedProduct || publishOpen ? "hidden" : ""} hero-panel relative isolate mt-4 overflow-hidden rounded-[2rem] bg-[#143ca8] text-white shadow-2xl shadow-[#143ca8]/15 sm:mt-6`}>
          <div
            className="hero-ad-panel relative flex min-h-[27rem] cursor-pointer flex-col justify-between overflow-hidden bg-[#f5f8ff] p-5 text-slate-900 sm:min-h-[30rem] sm:p-8 lg:min-h-[19rem] lg:p-5"
            onClick={openProducts}
            aria-label="Afficher tous les produits"
              onMouseEnter={() => setHeroPaused(true)}
              onMouseLeave={() => setHeroPaused(false)}
          >
              <div className="flex justify-end">
                <button type="button" onClick={openProducts} className="btn btn-sm rounded-xl bg-[#143ca8] text-white shadow-sm hover:bg-[#102f85]">
                  Découvrez nos produits <Search size={15} />
                </button>
              </div>
              {!isMobileViewport && desktopHeroProducts.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">À la une</p>
                      <p className="mt-1 text-sm text-slate-500">Découvrez nos annonces sélectionnées</p>
                    </div>
                    <span className="rounded-full bg-[#dbe5ff] px-3 py-1 text-xs font-bold text-[#143ca8]">Sélection aléatoire</span>
                  </div>
                  <div className="mt-4 grid flex-1 grid-cols-3 gap-3">
                    {desktopHeroProducts.map((product) => (
                      <button key={product.id} type="button" onClick={(event) => { event.stopPropagation(); openProduct(product); }} className="group flex min-w-0 flex-col overflow-hidden rounded-xl bg-white text-left shadow-md transition hover:-translate-y-1 hover:shadow-lg" aria-label={`Voir le produit ${product.title}`}>
                        <div className="relative aspect-[16/9] bg-slate-100">
                          {product.image ? <img src={product.image} alt={product.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-xs text-slate-400">Pas d’image</div>}
                          {(product.featured || product.promoted) && <span className="badge absolute left-2 top-2 border-0 bg-orange-400 text-[10px] text-white">Sponsorisé</span>}
                        </div>
                        <div className="min-w-0 p-3">
                          <h2 className="truncate text-sm font-bold">{product.title}</h2>
                          <PriceDisplay product={product} compact />
                          <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500"><MapPin size={12} />{product.location}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : isMobileViewport && heroProduct ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">À la une</p>
                      <p className="mt-1 text-sm text-slate-500">Découvrez une annonce près de chez vous</p>
                    </div>
                    <span className="rounded-full bg-[#dbe5ff] px-3 py-1 text-xs font-bold text-[#143ca8]">{heroProduct.category}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); openProduct(heroProduct); }}
                    className="group mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                    aria-label={`Voir le produit ${heroProduct.title}`}
                  >
                    <div className="relative aspect-[16/7] flex-none bg-slate-100">
                      {heroProduct.image ? <img src={heroProduct.image} alt={heroProduct.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-slate-400">Pas d’image</div>}
                      {(heroProduct.featured || heroProduct.promoted) && <span className="badge absolute left-3 top-3 border-0 bg-orange-400 text-white">Annonce sponsorisée</span>}
                    </div>
                    <div className="p-4">
                      <h2 className="line-clamp-1 text-lg font-bold">{heroProduct.title}</h2>
                      <PriceDisplay product={heroProduct} compact />
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin size={13} />{heroProduct.location}</span>
                        <span className="font-bold text-[#143ca8]">Voir le détail</span>
                      </div>
                    </div>
                  </button>
                  {isMobileViewport && <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-1.5" aria-label="Position dans les annonces">
                      {advertisedProducts.map((item, index) => <button key={item.id} type="button" onClick={(event) => { event.stopPropagation(); setHeroProductIndex(index); }} aria-label={`Afficher ${item.title}`} className={`h-2 rounded-full transition-all ${index === heroProductIndex % advertisedProducts.length ? "w-7 bg-[#143ca8]" : "w-2 bg-slate-300"}`} />)}
                    </div>
                      {advertisedProducts.length > 1 && <div className="flex gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); setHeroProductIndex((heroProductIndex - 1 + advertisedProducts.length) % advertisedProducts.length); }} className="btn btn-circle btn-sm bg-white" aria-label="Annonce précédente"><ChevronLeft size={16} /></button><button type="button" onClick={(event) => { event.stopPropagation(); setHeroProductIndex((heroProductIndex + 1) % advertisedProducts.length); }} className="btn btn-circle btn-sm bg-white" aria-label="Annonce suivante"><ChevronRight size={16} /></button></div>}
                  </div>}
                </>
              ) : <div className="grid flex-1 place-items-center text-center text-slate-500"><div><Search className="mx-auto mb-3 text-slate-300" size={32} /><p>Les annonces publicitaires apparaîtront ici.</p></div></div>}
          </div>
        </section>
        <section
          className={`${showProducts || noticeOpen || selectedProduct || publishOpen || manageProductsOpen || profileManagementOpen ? "hidden" : ""} mt-12 overflow-hidden rounded-[2rem] bg-[#eaf0ff] sm:mt-16`}
        >
          <div className="grid items-center gap-8 px-6 py-8 sm:px-12 sm:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <img src={appIcon} alt="" className="size-12 rounded-xl shadow-md" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">
                  L’expérience Mbokamaket
                </p>
              </div>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                <span className="animated-slogan" aria-label="Achetez, vendez et découvrez près de chez vous.">
                  <span className="slogan-line slogan-line-one">Achetez, vendez</span>
                  <span className="slogan-line slogan-line-two">et découvrez près</span>
                  <span className="slogan-line slogan-line-three">de chez vous.</span>
                </span>
              </h2>
              <p className="mt-4 max-w-lg leading-7 text-slate-600">
                Parcourez les annonces, consultez les profils des vendeurs et
                contactez-les directement depuis une application pensée pour
                votre quotidien.
              </p>
              <a href="#telechargement" className="btn btn-primary mt-7 rounded-xl bg-[#143ca8]">
                Découvrir l’application <Download size={17} />
              </a>
            </div>
            <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
              <AppPreview image={appProducts} label="Trouvez" className="-rotate-2" />
              <AppPreview image={appProductDetails} label="Détaillez" className="-translate-y-5" />
              <AppPreview image={appSellerProfile} label="Faites confiance" className="rotate-2" />
            </div>
          </div>
        </section>
        {!showProducts && !noticeOpen && !selectedProduct && !publishOpen && !manageProductsOpen && !profileManagementOpen && (
          <section className="mt-5 sm:mt-8">
            <div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">
                  À découvrir
                </p>
                <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">
                  Les dernières annonces
                </h2>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <LoaderCircle className="animate-spin text-[#143ca8]" />
              </div>
            ) : homeProducts.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {homeProducts.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => openProduct(item)}
                    onKeyDown={(event) => event.key === "Enter" && openProduct(item)}
                    role="button"
                    tabIndex={0}
                    className="product-card cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl"
                  >
                    <div className="relative aspect-[16/9] bg-slate-100 sm:aspect-[4/3]">
                      {item.image ? (
                        <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-400">Pas d’image</div>
                      )}
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }}
                        className="btn btn-circle btn-sm absolute right-3 top-3 border-0 bg-white/90 text-[#143ca8] shadow-md"
                        aria-label={favoriteIds.includes(item.id) ? `Retirer ${item.title} des favoris` : `Ajouter ${item.title} aux favoris`}
                      >
                        <Heart size={17} fill={favoriteIds.includes(item.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 font-bold">{item.title}</h3>
                      <PriceDisplay product={item} compact />
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={13} /> {item.location}
                      </p>
                      {item.status === "active" && item.sellerId !== user?.id && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (getSelectableSpecifications(item.specifications).length) openProduct(item);
                            else addToCart(item);
                          }}
                          className="btn mt-3 w-full border-[#143ca8] bg-[#143ca8] text-white hover:bg-[#102f85]"
                        >
                          <ShoppingCart size={16} /> Ajouter au panier
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Aucune annonce disponible pour le moment.
              </p>
            )}
            {homeProducts.length > 0 && !loading && (
              <div className="mt-6 flex justify-center">
                <button onClick={openProducts} className="btn btn-ghost font-display text-lg font-extrabold text-[#143ca8] underline decoration-2 underline-offset-4 sm:text-2xl">
                  Voir plus de produits disponibles <Search size={17} />
                </button>
              </div>
            )}
          </section>
        )}
        {!supabaseConfigured && (
          <div className="alert alert-warning mt-5 text-sm">
            Configuration Supabase absente.
          </div>
        )}
        {error && (
          <button
            onClick={() => setError("")}
            className="alert alert-error mt-5 w-full text-left text-sm"
          >
            {error} <X size={16} />
          </button>
        )}
        <section id="catalogue" className={showProducts && !noticeOpen && !selectedProduct && !publishOpen && !manageProductsOpen && !profileManagementOpen ? "mt-2 sm:mt-10" : "hidden"}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8] ${sellerFilter ? "" : "hidden sm:block"}`}>
                {sellerFilter ? "Produits du vendeur" : "Catalogue public"}
              </p>
              <h2 className="font-display text-xl font-bold leading-tight sm:mt-1 sm:text-2xl">
                {sellerFilter ? sellerFilter.name : "Les annonces disponibles"}
              </h2>
              {sellerFilter && (
                <button
                  onClick={() => setSellerFilter(null)}
                  className="btn btn-ghost mt-1 min-h-8 h-8 px-0 text-sm text-[#143ca8] sm:mt-2 sm:min-h-12 sm:h-12"
                >
                  Voir toutes les annonces
                </button>
              )}
            </div>
            <div className="-mx-1 hidden gap-1 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex sm:gap-2 sm:pb-1">
              <button
                onClick={() => { setCategory("Toutes"); setShowProducts(true) }}
                className={`btn btn-sm ${category === "Toutes" ? "btn-primary bg-[#143ca8]" : "btn-ghost"}`}
              >
                Toutes
              </button>
              {availableCategories.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setCategory(item.id); setShowProducts(true) }}
                  className={`btn btn-sm whitespace-nowrap ${category === item.id ? "btn-primary bg-[#143ca8]" : "btn-ghost"}`}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {showProducts && (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-2.5 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3">
              <p className="text-xs text-slate-500 sm:text-sm">
                {filteredProducts.length} annonce{filteredProducts.length === 1 ? "" : "s"}
                {pageCount > 1 ? ` · page ${currentProductPage} sur ${pageCount}` : ""}
              </p>
              <label className="flex w-full flex-col items-stretch gap-1 text-xs font-semibold text-slate-600 sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
                <span className="sm:whitespace-nowrap">Trier les produits</span>
                <select
                  value={productSort}
                  onChange={(event) => setProductSort(event.target.value as ProductSort)}
                  className="select select-bordered select-sm min-h-10 w-full bg-white text-sm sm:min-h-9 sm:min-w-56 sm:w-auto"
                  aria-label="Trier les annonces"
                >
                  <option value="recent">Plus récentes</option>
                  <option value="price_asc">Prix croissant (par devise)</option>
                  <option value="price_desc">Prix décroissant (par devise)</option>
                  <option value="popular">Populaires (à la une)</option>
                  <option value="relevance">Pertinence de la recherche</option>
                </select>
              </label>
            </div>
          )}
          {!showProducts ? null : loading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="animate-spin text-[#143ca8]" />
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Aucune annonce trouvée.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((item) => (
                <article
                  key={item.id}
                  onClick={() => openProduct(item)}
                  onKeyDown={(event) => event.key === "Enter" && openProduct(item)}
                  role="button"
                  tabIndex={0}
                  className="product-card cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] bg-slate-100 sm:aspect-[4/3]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                          loading="lazy"
                          decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400">
                        Pas d’image
                      </div>
                    )}
                    {(item.featured || item.promoted) && (
                      <span className="badge badge-xs absolute left-1.5 top-1.5 border-0 bg-orange-400 text-white sm:badge-sm sm:left-3 sm:top-3">
                        À la une
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }}
                      className="btn btn-circle btn-xs absolute right-1.5 top-1.5 border-0 bg-white/90 text-[#143ca8] shadow-md sm:btn-sm sm:right-3 sm:top-3"
                      aria-label={favoriteIds.includes(item.id) ? `Retirer ${item.title} des favoris` : `Ajouter ${item.title} aux favoris`}
                    >
                      <Heart size={14} className="sm:hidden" fill={favoriteIds.includes(item.id) ? "currentColor" : "none"} />
                      <Heart size={17} className="hidden sm:block" fill={favoriteIds.includes(item.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="p-2 sm:p-4">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <h3 className="line-clamp-2 min-h-9 min-w-0 flex-1 text-sm font-bold leading-4 sm:min-h-0 sm:text-base sm:leading-normal">{item.title}</h3>
                      {item.verified && (
                        <span className="badge badge-xs shrink-0 gap-0.5 border-0 bg-emerald-500 px-1 text-white sm:badge-sm sm:gap-1 sm:px-2">
                          <ShieldCheck size={11} className="sm:hidden" /><ShieldCheck size={13} className="hidden sm:block" />
                          <span className="hidden sm:inline">Vérifié</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 [&>div]:mt-0 [&_span:first-child]:text-base sm:mt-0 sm:[&>div]:mt-2 sm:[&_span:first-child]:text-lg">
                      <PriceDisplay product={item} compact />
                    </div>
                    <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[11px] leading-4 text-slate-500 sm:text-xs">
                      <MapPin size={12} className="shrink-0 sm:size-[13px]" />
                      <span className="truncate">{item.location}</span>
                    </p>
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold leading-4 text-slate-400 sm:mt-3 sm:gap-2 sm:text-xs">
                      {item.sellerAvatar ? (
                        <img src={item.sellerAvatar} alt={`Profil de ${item.seller}`} loading="lazy" decoding="async" className="size-5 shrink-0 rounded-full object-cover sm:size-7" />
                      ) : (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#edf3ff] text-[#143ca8] sm:size-7"><UserRound size={12} className="sm:hidden" /><UserRound size={14} className="hidden sm:block" /></span>
                      )}
                      <span className="line-clamp-1 min-w-0">{item.seller} · {item.category}</span>
                    </div>
                    {item.status === "active" && item.sellerId !== user?.id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (getSelectableSpecifications(item.specifications).length) openProduct(item);
                          else addToCart(item);
                        }}
                        className="btn btn-sm mt-2 min-h-8 h-8 w-full gap-1 border-[#143ca8] bg-[#143ca8] px-1 text-xs text-white hover:bg-[#102f85] sm:btn-md sm:mt-4 sm:min-h-12 sm:h-auto sm:gap-2 sm:px-4 sm:text-sm"
                      >
                        <ShoppingCart size={14} className="shrink-0 sm:size-4" />
                        <span className="sm:hidden">Panier</span>
                        <span className="hidden sm:inline">Ajouter au panier</span>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {showProducts && !loading && sortedProducts.length > 0 && (
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination des annonces">
              <button
                type="button"
                onClick={() => {
                  setProductPage((page) => Math.max(1, page - 1));
                  document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                disabled={currentProductPage <= 1}
                className="btn btn-sm btn-ghost"
              >
                Précédent
              </button>
              {paginationItems.map((page) => typeof page === "number" ? (
                <button
                  key={page}
                  type="button"
                  onClick={() => {
                    setProductPage(page);
                    document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-current={currentProductPage === page ? "page" : undefined}
                  className={`btn btn-sm ${currentProductPage === page ? "border-[#143ca8] bg-[#143ca8] text-white" : "btn-ghost"}`}
                >
                  {page}
                </button>
              ) : (
                <span key={page} className="px-1 text-slate-400" aria-hidden="true">…</span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setProductPage((page) => Math.min(pageCount, page + 1));
                  document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                disabled={currentProductPage >= pageCount}
                className="btn btn-sm btn-ghost"
              >
                Suivant
              </button>
            </nav>
          )}
        </section>
        <section
          id="telechargement"
          className={`${showProducts || noticeOpen || selectedProduct || publishOpen || manageProductsOpen || profileManagementOpen ? "hidden" : ""} download-section mt-8 border-t border-slate-200 pt-5 sm:mt-16 sm:pt-10`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#143ca8] sm:text-xs sm:tracking-[0.18em]">
            Toujours avec vous
          </p>
          <h2 className="mt-1.5 font-display text-xl font-bold sm:mt-2 sm:text-3xl">
            Téléchargez Mbokamaket
          </h2>
          <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-500 sm:mt-3 sm:text-base sm:leading-normal">
            Retrouvez toutes les fonctionnalités de l’application sur votre
            téléphone.
          </p>
          <div className="mt-4 grid gap-2.5 sm:mt-7 sm:gap-4 md:grid-cols-3">
            <DownloadCard
              icon={AppStoreLogo}
              title="App Store"
              subtitle="Pour iPhone et iPad"
              href={appStore}
            />
            <DownloadCard
              icon={GooglePlayLogo}
              title="Google Play"
              subtitle="Pour Android"
              href={playStore}
            />
            <DownloadCard
              icon={ApkLogo}
              title="APK Android"
              subtitle="Installation directe"
              href={apkDownloadUrl}
              download
              onDownload={registerApkDownload}
              downloadCount={apkDownloadCount}
            />
          </div>
        </section>
      </main>
      {!profileManagementOpen && <Footer
        contactEmail={contactEmail}
        facebookUrl={facebookUrl}
        tiktokUrl={tiktokUrl}
        instagramUrl={instagramUrl}
        youtubeUrl={youtubeUrl}
        visitorCount={visitorCount}
        onOpenProducts={openProducts}
      />}
      {commerceMode && (
        <CommercePage
          view={commerceMode}
          user={user ? { id: user.id, fullName: user.fullName, phone: user.phone, address: user.address, isAnonymous: user.isAnonymous } : null}
          items={cartItems}
          onItemsChange={setCartItems}
          onClose={() => setCommerceMode(null)}
          onRequestLogin={() => {
            setCommerceMode(null);
            openAuth();
          }}
          onOrderCreated={(orderedItems) => {
            const orderedKeys = new Set(orderedItems.map(getCommerceCartItemKey));
            setCartItems((current) => current.filter((item) => !orderedKeys.has(getCommerceCartItemKey(item))));
            setCommerceMode("orders");
          }}
        />
      )}
      {cartNotice && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {cartNotice}
        </div>
      )}
      {legalPage && <LegalPage page={legalPage} onClose={goHome} />}
      {profileOpen && user && (
        <ProfilePanel
          user={user}
          onClose={() => setProfileOpen(false)}
          onManageProducts={openManageProducts}
          onStockManagement={openStockManagement}
          onManageProfile={openProfileManagement}
          onSellerOrders={openSellerOrders}
          onPublish={() => { setProfileOpen(false); setPublishOpen(true); window.location.hash = "publier"; }}
          onSignOut={async () => {
            await supabase?.auth.signOut();
            setProfileOpen(false);
          }}
        />
      )}
      {stockManagementOpen && user && (
        <StockManagementPage
          userId={user.id}
          onClose={goHome}
        />
      )}
      {sellerOrdersOpen && user && (
        <SellerOrdersPage
          user={{ id: user.id, role: user.role, accountType: user.accountType }}
          onClose={() => setSellerOrdersOpen(false)}
        />
      )}
      {(authOpen || authRoute) && <AuthModal key={window.location.hash} initialMode={window.location.hash === "#inscription" ? "signup" : "login"} onClose={() => { setAuthOpen(false); window.location.hash = "accueil"; }} />}
      {authSuccessMessage && <div className="fixed right-4 top-4 z-[120] max-w-sm rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white shadow-2xl" role="status">{authSuccessMessage}</div>}
      {passwordResetRoute && <PasswordResetPage onClose={() => { window.history.replaceState(null, "", window.location.pathname); window.location.hash = "accueil"; }} onLogin={() => { window.history.replaceState(null, "", window.location.pathname); window.location.hash = "connexion"; }} />}
    </div>
  );
}

function AppStoreLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M16.62 12.77c.02 2.16 1.89 2.88 1.91 2.89-.02.05-.3 1.05-1 2.08-.6.9-1.22 1.8-2.2 1.82-.96.02-1.27-.58-2.37-.58-1.1 0-1.44.56-2.35.6-.95.04-1.67-.97-2.28-1.87-1.24-1.8-2.18-5.08-.91-7.3.63-1.1 1.77-1.8 3-1.82.94-.02 1.82.63 2.37.63.56 0 1.6-.78 2.7-.66.46.02 1.76.19 2.59 1.42-.07.04-1.55.9-1.46 2.79ZM14.85 7.38c.5-.61.84-1.46.74-2.3-.72.03-1.59.48-2.1 1.09-.46.53-.87 1.4-.76 2.22.8.06 1.62-.41 2.12-1.01Z" />
    </svg>
  );
}

function GooglePlayLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#34A853" d="m3.3 2.1 10.8 9.88-3.83 3.51L3.3 17.94V2.1Z" />
      <path fill="#4285F4" d="M3.3 2.1c.22-.16.5-.1.8.07l12.58 7.16-2.58 2.65L3.3 2.1Z" />
      <path fill="#FBBC04" d="m14.1 11.98 2.58-2.65 3.44 1.96c.88.5.88 1.27 0 1.77l-3.4 1.94-2.62-3.02Z" />
      <path fill="#EA4335" d="m3.3 17.94 10.8-5.96 2.62 3.02-12.62 7.18c-.4.23-.8.17-.8-.36v-3.88Z" />
    </svg>
  );
}

function ApkLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M7.25 9.2 5.8 6.7a.7.7 0 1 1 1.2-.7l1.48 2.56A8.2 8.2 0 0 1 12 7.6c1.25 0 2.44.35 3.52.96L17 6a.7.7 0 1 1 1.2.7l-1.45 2.5a6.1 6.1 0 0 1 2.8 5.1v.7H4.45v-.7a6.1 6.1 0 0 1 2.8-5.1ZM9 12.7a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Zm6 0a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6ZM4.55 16.4h14.9v1.15a1.5 1.5 0 0 1-1.5 1.5h-.6v1.65a.8.8 0 1 1-1.6 0v-1.65h-7.3v1.65a.8.8 0 1 1-1.6 0v-1.65h-.8a1.5 1.5 0 0 1-1.5-1.5V16.4Z" />
    </svg>
  );
}

function DownloadCard({
  icon: Icon,
  title,
  subtitle,
  href,
  download = false,
  onDownload,
  downloadCount,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  href?: string;
  download?: boolean;
  onDownload?: () => void;
  downloadCount?: number | null;
}) {
  return (
    <div className="download-card flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-1 hover:shadow-lg sm:gap-4 sm:rounded-2xl sm:p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3ff] text-[#143ca8] sm:size-12 sm:rounded-xl">
        <Icon size={20} className="sm:hidden" />
        <Icon size={24} className="hidden sm:block" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold leading-5 sm:text-base">{title}</h3>
        <p className="text-xs leading-4 text-slate-500 sm:text-sm sm:leading-normal">{subtitle}</p>
      </div>
      {href ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <a
            href={href}
            target={download ? "_self" : "_blank"}
            rel={download ? undefined : "noopener noreferrer"}
            download={download ? "Mbokamaket-v1.0.0.apk" : undefined}
            type={download ? "application/vnd.android.package-archive" : undefined}
            onClick={download ? onDownload : undefined}
            className="btn btn-xs min-h-8 rounded-lg bg-[#143ca8] px-2.5 text-xs text-white sm:btn-sm sm:px-4 sm:text-sm"
          >
            {download ? "Télécharger" : "Ouvrir"}
          </a>
          {download && typeof downloadCount === "number" && (
            <span className="text-[10px] text-slate-400">
              {downloadCount.toLocaleString("fr-FR")} téléchargements
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-slate-400">Bientôt</span>
      )}
    </div>
  );
}

function AppPreview({
  image,
  label,
  className,
}: {
  image: string;
  label: string;
  className: string;
}) {
  return (
    <figure className={`overflow-hidden rounded-[1.25rem] border-4 border-white bg-white shadow-xl ${className}`}>
      <img src={image} alt={`Écran Mbokamaket : ${label}`} loading="lazy" decoding="async" className="aspect-[9/16] w-full object-cover object-top" />
      <figcaption className="px-2 py-2 text-center text-xs font-bold text-[#143ca8] sm:px-3 sm:py-3 sm:text-sm">
        {label}
      </figcaption>
    </figure>
  );
}

function Footer({
  contactEmail,
  facebookUrl,
  tiktokUrl,
  instagramUrl,
  youtubeUrl,
  visitorCount,
  onOpenProducts,
}: {
  contactEmail?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  visitorCount: number | null;
  onOpenProducts: () => void;
}) {
  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contactEmail) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const subject = encodeURIComponent(`Contact Mbokamaket - ${name}`);
    const body = encodeURIComponent(`Nom : ${name}\nE-mail : ${email}\n\n${message}`);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <footer className="border-t border-[#0b1e55] bg-[#102a68] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1fr_1.15fr_1fr] md:gap-12 md:py-12">
        <div>
          <div className="flex items-center gap-3"><img src={appIcon} alt="Logo Mbokamaket" loading="lazy" decoding="async" className="size-11 rounded-xl" /><strong className="font-display text-xl">Mbokamaket</strong></div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">Achetez, vendez et découvrez près de chez vous.</p>
          {visitorCount !== null && <p className="mt-3 text-sm text-blue-100"><Eye size={15} className="mr-1 inline-block" />{visitorCount.toLocaleString("fr-FR")} visiteurs</p>}
          <div className="mt-6">
            <p className="text-sm font-bold text-white">Suivez-nous</p>
            <div className="mt-3 flex gap-3">
              <a href={facebookUrl || "#"} onClick={(event) => !facebookUrl && event.preventDefault()} target={facebookUrl ? "_blank" : undefined} rel={facebookUrl ? "noreferrer" : undefined} aria-label="Facebook" className={`grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:-translate-y-1 hover:bg-white/20 ${!facebookUrl ? "opacity-60" : ""}`}><FaFacebookF size={17} /></a>
              <a href={tiktokUrl || "#"} onClick={(event) => !tiktokUrl && event.preventDefault()} target={tiktokUrl ? "_blank" : undefined} rel={tiktokUrl ? "noreferrer" : undefined} aria-label="TikTok" className={`grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:-translate-y-1 hover:bg-white/20 ${!tiktokUrl ? "opacity-60" : ""}`}><FaTiktok size={17} /></a>
              <a href={instagramUrl || "#"} onClick={(event) => !instagramUrl && event.preventDefault()} target={instagramUrl ? "_blank" : undefined} rel={instagramUrl ? "noreferrer" : undefined} aria-label="Instagram" className={`grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:-translate-y-1 hover:bg-white/20 ${!instagramUrl ? "opacity-60" : ""}`}><FaInstagram size={18} /></a>
              <a href={youtubeUrl || "#"} onClick={(event) => !youtubeUrl && event.preventDefault()} target={youtubeUrl ? "_blank" : undefined} rel={youtubeUrl ? "noreferrer" : undefined} aria-label="YouTube" className={`grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:-translate-y-1 hover:bg-white/20 ${!youtubeUrl ? "opacity-60" : ""}`}><FaYoutube size={18} /></a>
            </div>
          </div>
        </div>
        <div><h2 className="font-bold">Navigation</h2><div className="mt-3 grid gap-1 text-sm text-blue-100"><a href="#accueil" className="flex min-h-10 items-center hover:text-white">Accueil</a><a href="#produits" onClick={(event) => { event.preventDefault(); onOpenProducts(); }} className="flex min-h-10 items-center hover:text-white">Produits</a><a href="#telechargement" className="flex min-h-10 items-center hover:text-white">Télécharger l’application</a><a href="/terms.html" className="flex min-h-10 items-center hover:text-white">Conditions d’utilisation</a><a href="/privacy-policy.html" className="flex min-h-10 items-center hover:text-white">Politique de confidentialité</a></div></div>
        <div><h2 className="font-bold">Nous contacter</h2><form className="mt-3 grid gap-3" onSubmit={handleContactSubmit}><input required name="name" autoComplete="name" placeholder="Votre nom" className="input w-full border-white/20 bg-white/10 text-white placeholder:text-blue-200" /><input required type="email" name="email" autoComplete="email" placeholder="Votre email" className="input w-full border-white/20 bg-white/10 text-white placeholder:text-blue-200" /><textarea required name="message" autoComplete="off" placeholder="Votre message" className="textarea min-h-24 w-full border-white/20 bg-white/10 text-white placeholder:text-blue-200" /><button type="submit" disabled={!contactEmail} className="btn w-full border-0 bg-white text-[#102a68] hover:bg-blue-50 disabled:opacity-50">Envoyer le message</button></form></div>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 border-t border-white/15 px-4 py-5 text-center text-xs text-blue-200 sm:flex-row">
        <span>© {new Date().getFullYear()} Mbokamaket. Tous droits réservés.</span>
        <span className="hidden text-blue-300 sm:inline" aria-hidden="true">|</span>
        <span className="inline-flex items-center gap-2">
          Propriété de Kambexa
          <img src={kambexaLogo} alt="Logo Kambexa" loading="lazy" decoding="async" className="size-7 object-contain" />
        </span>
      </div>
    </footer>
  );
}

function LegalPage({ page, onClose }: { page: "conditions" | "confidentialite"; onClose: () => void }) {
  const isTerms = page === "conditions";
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#f6f8fc]">
      <div className="mx-auto min-h-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <a href="#accueil" onClick={onClose} className="flex items-center gap-2 text-[#143ca8]">
            <span className="grid size-10 place-items-center rounded-xl bg-[#143ca8] text-lg font-black text-white">M</span>
            <strong className="font-display text-lg">Mbokamaket</strong>
          </a>
          <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Retour à l’accueil</button>
        </div>
        <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">Mbokamaket</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">{isTerms ? "Conditions d’utilisation" : "Politique de confidentialité"}</h1>
          <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : 6 septembre 2026</p>
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </article>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="mt-8 space-y-6 leading-7 text-slate-600">
      <section><h2 className="text-xl font-bold text-slate-900">1. Objet du service</h2><p>Mbokamaket est une plateforme qui permet aux utilisateurs de publier, découvrir et contacter des vendeurs pour des produits et services proposés localement.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">2. Utilisation de la plateforme</h2><p>L’utilisateur s’engage à fournir des informations exactes, à respecter les lois applicables et à ne pas publier de contenu frauduleux, illégal, trompeur ou portant atteinte aux droits d’autrui.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">3. Annonces et transactions</h2><p>Les vendeurs sont responsables de leurs annonces, de leurs produits et de leurs échanges avec les acheteurs. Mbokamaket n’est pas partie aux transactions et recommande de vérifier le produit et le vendeur avant tout paiement.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">4. Compte utilisateur</h2><p>L’utilisateur doit protéger ses identifiants et signaler toute utilisation non autorisée de son compte. Mbokamaket peut suspendre une annonce ou un compte en cas de non-respect des présentes conditions.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">5. Contact</h2><p>Pour toute question, écrivez à <a className="font-semibold text-[#143ca8]" href="mailto:contact@mbokamaket.com">contact@mbokamaket.com</a>.</p></section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="mt-8 space-y-6 leading-7 text-slate-600">
      <section><h2 className="text-xl font-bold text-slate-900">1. Données collectées</h2><p>Nous pouvons collecter les informations nécessaires à la création du compte, aux annonces, aux favoris, aux notifications et aux échanges avec les utilisateurs.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">2. Utilisation des données</h2><p>Ces données servent à fournir les fonctionnalités de Mbokamaket, sécuriser les comptes, afficher les annonces et améliorer le service. Nous ne vendons pas les données personnelles des utilisateurs.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">3. Supabase et stockage</h2><p>Les données applicatives sont hébergées via Supabase. Les utilisateurs doivent éviter de partager des informations sensibles dans une annonce ou un message public.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">4. Conservation et droits</h2><p>Nous conservons les données pendant la durée nécessaire au fonctionnement du service. Vous pouvez demander l’accès, la correction ou la suppression de vos données en écrivant à notre adresse de contact.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">5. Contact</h2><p>Pour toute demande concernant vos données personnelles, écrivez à <a className="font-semibold text-[#143ca8]" href="mailto:contact@mbokamaket.com">contact@mbokamaket.com</a>.</p></section>
    </div>
  );
}

function AuthModal({ initialMode, onClose }: { initialMode: "login" | "signup"; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [accountType, setAccountType] = useState("personal");
  const [businessName, setBusinessName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const syncMode = () => {
      setMode(window.location.hash === "#inscription" ? "signup" : "login");
      setError("");
      setSuccess("");
    };
    window.addEventListener("hashchange", syncMode);
    return () => window.removeEventListener("hashchange", syncMode);
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setError("La configuration Supabase est absente.");
      return;
    }
    setBusy(true);
    if (mode === "reset") {
      const redirectTo = getPasswordResetRedirectUrl();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      setBusy(false);
      if (authError) setError(authError.message);
      else setSuccess("Si cette adresse correspond à un compte, vous recevrez un e-mail pour réinitialiser votre mot de passe.");
      return;
    }
    if (mode === "signup" && !/^\d{8,15}$/.test(phone.replace(/\D/g, ""))) { setError("Le numéro de téléphone n’est pas valide."); setBusy(false); return; }
    if (mode === "signup" && password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); setBusy(false); return; }
    if (mode === "signup" && role === "seller" && (accountType === "boutique" || accountType === "magasin") && !businessName.trim()) { setError("Veuillez renseigner le nom de votre boutique ou magasin."); setBusy(false); return; }
    if (mode === "signup" && password !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); setBusy(false); return; }
    if (mode === "signup" && !acceptedPrivacy) { setError("Vous devez accepter la Politique de confidentialité."); setBusy(false); return; }
    const result = mode === "login"
      ? await supabase!.auth.signInWithPassword({ email, password })
      : await supabase!.auth.signUp({ email, password, options: { data: { name, phone, role, account_type: role === "buyer" ? "personal" : accountType, business_name: businessName || null, referral_code: referralCode || null, accepted_privacy: acceptedPrivacy, privacy_accepted: acceptedPrivacy } } });
    const authError = result.error;
    setBusy(false);
    if (authError) setError(authError.message);
    else setSuccess(mode === "signup"
      ? "Votre compte a été créé avec succès. Vérifiez votre email pour activer le compte."
      : "Connexion réussie.");
  };
  const signInWithProvider = async (provider: "google" | "facebook") => {
    if (!supabase) {
      setError("La configuration Supabase est absente.");
      return;
    }
    localStorage.setItem("mbokamaket-auth-success-pending", "login");
    setBusy(true);
    const redirectTo = getAuthRedirectUrl();
    console.info("[OAuth] Demarrage de la connexion", { provider, redirectTo });
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (authError) {
      console.error("[OAuth] Impossible de demarrer la connexion", authError);
      localStorage.removeItem("mbokamaket-auth-success-pending");
      setBusy(false);
      setError(authError.message);
    }
  };
  return (
    <Modal>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl bg-white p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{mode === "login" ? "Se connecter" : mode === "reset" ? "Réinitialiser le mot de passe" : "Créer un compte"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle"
          >
            <X size={18} />
          </button>
        </div>
        {mode === "login" && <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void signInWithProvider("google")} className="btn btn-outline w-full gap-2">
            <FaGoogle size={16} className="text-red-500" /> Google
          </button>
          <button type="button" disabled={busy} onClick={() => void signInWithProvider("facebook")} className="btn w-full gap-2 bg-[#1877f2] text-white hover:bg-[#166fe5]">
            <FaFacebookF size={16} /> Facebook
          </button>
        </div>}
        {mode === "login" && <div className="divider my-3 text-xs text-slate-400">ou avec votre e-mail</div>}
        {mode === "reset" && <p className="mt-4 text-sm leading-6 text-slate-500">Saisissez votre adresse e-mail et nous vous enverrons un lien sécurisé.</p>}
        {mode === "signup" && <>
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom complet" className="input input-bordered mt-2 w-full" />
          <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Numéro de téléphone" className="input input-bordered mt-3 w-full" />
          <div className="mt-3 grid grid-cols-2 gap-3"><select value={role} onChange={(event) => setRole(event.target.value as "buyer" | "seller")} className="select select-bordered w-full"><option value="buyer">Acheteur</option><option value="seller">Vendeur</option></select><select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="select select-bordered w-full"><option value="personal">Personnel</option><option value="boutique">Boutique</option><option value="magasin">Magasin</option><option value="agence_immo">Agence immobilière</option></select></div>
          {role === "seller" && (accountType === "boutique" || accountType === "magasin") && <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder={accountType === "boutique" ? "Nom de la boutique" : "Nom du magasin"} className="input input-bordered mt-3 w-full" />}
          <input value={referralCode} onChange={(event) => setReferralCode(event.target.value)} placeholder="Code du parrain (optionnel)" className="input input-bordered mt-3 w-full" />
        </>}
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="input input-bordered mt-2 w-full"
        />
        {mode !== "reset" && <div className="relative mt-3">
          <input
            required
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            className="input input-bordered w-full pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>}
        {mode === "signup" && <>
          <div className="relative mt-3">
            <input required minLength={8} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirmer le mot de passe" className="input input-bordered w-full pr-12" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square"
              aria-label={showConfirmPassword ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
            >
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <label className="mt-4 flex items-start gap-2 text-xs text-slate-600"><input required type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} className="checkbox checkbox-sm" /> J’accepte la Politique de confidentialité.</label>
        </>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
        <button disabled={busy} className="btn btn-primary mt-5 w-full">
          {busy ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            mode === "login" ? "Se connecter" : mode === "reset" ? "Envoyer le lien" : "Créer mon compte"
          )}
        </button>
        {mode === "login" && <>
          <button type="button" onClick={() => { setMode("reset"); setError(""); setSuccess(""); }} className="mt-4 w-full text-sm font-semibold text-[#143ca8]">Mot de passe oublié ?</button>
          <button type="button" onClick={() => { setMode("signup"); setError(""); setSuccess(""); window.location.hash = "inscription"; }} className="mt-3 w-full text-sm font-semibold text-[#143ca8]">Créer un compte</button>
        </>}
        {mode === "reset" && <button type="button" onClick={() => { setMode("login"); setError(""); setSuccess(""); }} className="mt-4 w-full text-sm font-semibold text-[#143ca8]">Retour à la connexion</button>}
        {mode === "signup" && <button type="button" onClick={() => { setMode("login"); setError(""); setSuccess(""); window.location.hash = "connexion"; }} className="mt-4 w-full text-sm font-semibold text-[#143ca8]">J’ai déjà un compte</button>}
      </form>
    </Modal>
  );
}
function PublishModal({ user, onClose, onCreated }: { user: User; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", price: "", originalPrice: "", stock: "1", currency: "FC", city: "", exactLocation: "", description: "", realEstateType: "", guaranteeMonths: "", category_id: categories.find((category) => category.id !== "3")?.id ?? categories[0].id, condition: "", images: "", noPrice: false, hasReduction: false, specifications: {} as Record<string, string> });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRealEstate = user.accountType === "agence_immo";
  const requiresStockManagement = user.accountType === "boutique" || user.accountType === "magasin" || user.accountType === "boutique_pro" || user.accountType === "magasin_pro";
  const isProfessionalBusiness = user.accountType === "boutique_pro" || user.accountType === "magasin_pro";
  const photoLimit = user.role === "seller" && user.accountType === "personal" && !user.isVerified ? 2 : 4;
  const availableCategories = isRealEstate ? categories : categories.filter((category) => category.id !== "3");
  const specificationCategoryId = isRealEstate ? "3" : form.category_id;
  const specificationFields = productSpecificationFields[specificationCategoryId] ?? [];
  const hasFashionSubcategory = isProfessionalBusiness && form.category_id === "2";
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const toggleSpecificationChoice = (field: string, choice: string) => {
    setForm((current) => {
      const selected = getSpecificationChoices(current.specifications[field] ?? "");
      const next = selected.includes(choice) ? selected.filter((item) => item !== choice) : [...selected, choice];
      const specifications = { ...current.specifications };
      if (next.length) specifications[field] = next.join(", ");
      else delete specifications[field];
      return { ...current, specifications };
    });
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    setSelectedFiles(files.slice(0, photoLimit));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const price = form.noPrice ? 0 : Number(form.price);
    const originalPrice = !form.noPrice && form.hasReduction ? Number(form.originalPrice) : null;
    const stock = Number(form.stock);
    const legacyImages = form.images.split(",").map((item) => item.trim()).filter(Boolean);
    let uploadedImages: string[] = [];
    if (!form.title.trim() || !form.description.trim()) { setError("Le titre et la description sont obligatoires."); return; }
    if (!Number.isFinite(price) || (!form.noPrice && price <= 0)) { setError("Le prix doit être supérieur à zéro."); return; }
    if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice <= price)) { setError("Le prix normal doit être supérieur au prix proposé."); return; }
    if (requiresStockManagement && (!Number.isInteger(stock) || stock < 0)) { setError("Le stock doit être un nombre entier positif."); return; }
    if (selectedFiles.length + legacyImages.length > photoLimit) { setError(`Vous pouvez ajouter ${photoLimit} images au maximum pour ce compte.`); return; }
    if (!form.city.trim() || (isRealEstate && !form.exactLocation.trim())) { setError("La ville et la localisation sont obligatoires."); return; }
    if (!isRealEstate && !requiresStockManagement && !form.condition) { setError("Sélectionnez l’état du produit."); return; }
    if (isRealEstate && !form.realEstateType) { setError("Sélectionnez le type de bien immobilier."); return; }
    if (hasFashionSubcategory && !form.specifications["Sous-catégorie"]) { setError("Choisissez une sous-catégorie pour ce produit de mode."); return; }
    if (form.noPrice && !form.currency) { setError("Choisissez une devise."); return; }
    const client = supabase;
    if (selectedFiles.length > 0) {
      if (!client) { setError("La configuration Supabase est absente."); return; }
      setBusy(true);
      try {
        uploadedImages = await Promise.all(
          selectedFiles.map(async (file, index) => {
            const fileExt = file.name.split(".").pop() || "jpg";
            const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
            const { data, error: uploadError } = await client.storage.from(PRODUCT_IMAGES_BUCKET).upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(data?.path || fileName);
            return publicUrlData.publicUrl;
          }),
        );
      } catch (uploadError) {
        setBusy(false);
        setError(uploadError instanceof Error ? uploadError.message : "Le téléchargement des images a échoué.");
        return;
      }
    }
    const images = [...uploadedImages, ...legacyImages].slice(0, photoLimit);
    if (images.length === 0 || images.length > photoLimit || images.some((image) => !/^https?:\/\//i.test(image))) { setError(`Ajoutez entre 1 et ${photoLimit} images valides (fichiers ou URLs HTTPS).`); return; }
    if (!client) { setError("La configuration Supabase est absente."); return; }
    setBusy(true);
    const { error: insertError } = await client.from("produits").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      original_price: isRealEstate || form.noPrice ? null : originalPrice,
      currency: form.currency,
      images,
      category_id: specificationCategoryId,
      condition: isRealEstate ? "Non applicable" : requiresStockManagement ? "Neuf" : form.condition,
      specifications: Object.fromEntries(Object.entries(form.specifications).filter(([, value]) => value.trim())),
      stock: isRealEstate && Number.isInteger(stock) && stock > 0 ? stock : requiresStockManagement ? stock : 1,
      location: isRealEstate ? `${form.city.trim()}, ${form.exactLocation.trim()}` : form.city.trim(),
      real_estate_type: isRealEstate ? form.realEstateType : null,
      guarantee_months: isRealEstate && form.realEstateType === "rent" ? `${form.guaranteeMonths.trim()}+1` : null,
      seller_profile_id: user.id,
      seller_id: user.id,
      status: "active",
    });
    setBusy(false);
    if (insertError) setError(insertError.message); else onCreated();
  };

  return (
    <section className="publish-page mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:mt-10 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">Espace vendeur certifié</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Publier une annonce</h1>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Retour</button>
      </div>
      <form onSubmit={submit} className="mx-auto max-w-2xl">
        <input required maxLength={120} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={isRealEstate ? "Titre du bien" : "Nom du produit"} className="input input-bordered mt-2 w-full" />
        <textarea required maxLength={2000} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder={isRealEstate ? "Description du bien" : "Description du produit"} className="textarea textarea-bordered mt-3 min-h-28 w-full" />
        {!isRealEstate && (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.noPrice} onChange={(event) => setForm((current) => ({ ...current, noPrice: event.target.checked, hasReduction: event.target.checked ? false : current.hasReduction }))} className="checkbox checkbox-primary checkbox-sm" />
              Publier sans prix
            </label>
            {!form.noPrice && (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.hasReduction} onChange={(event) => setForm((current) => ({ ...current, hasReduction: event.target.checked }))} className="checkbox checkbox-primary checkbox-sm" />
                Afficher un prix réduit et un prix normal
              </label>
            )}
          </div>
        )}
        <div className={`grid gap-3 ${isRealEstate || !form.hasReduction ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!form.noPrice && <input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder={isRealEstate ? "Prix de vente" : form.hasReduction ? "Prix réduit" : "Prix"} className="input input-bordered mt-3 w-full" />}
          {!isRealEstate && !form.noPrice && form.hasReduction && <input required type="number" min="0.01" step="0.01" value={form.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} placeholder="Prix normal" className="input input-bordered mt-3 w-full" />}
          <select value={form.currency} onChange={(event) => update("currency", event.target.value)} className="select select-bordered mt-3 w-full">
            <option value="FC">FC</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Ville" className="input input-bordered mt-3 w-full" />
          <input required={isRealEstate} value={form.exactLocation} onChange={(event) => update("exactLocation", event.target.value)} placeholder={isRealEstate ? "Localisation exacte" : "Localisation (optionnel)"} className="input input-bordered mt-3 w-full" />
        </div>
        {!isRealEstate && (
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value, specifications: {} }))} className="select select-bordered mt-3 w-full">
              {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            {requiresStockManagement ? (
              <div className="input input-bordered mt-3 flex items-center text-sm text-slate-600">État : Neuf</div>
            ) : (
              <select value={form.condition} onChange={(event) => update("condition", event.target.value)} className="select select-bordered mt-3 w-full">
                <option value="">État du produit</option>
                <option value="Neuf">Neuf</option>
                <option value="Comme neuf">Comme neuf</option>
                <option value="Bon état">Bon état</option>
                <option value="Usagé">Usagé</option>
              </select>
            )}
          </div>
        )}
        {isRealEstate && (
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.realEstateType} onChange={(event) => update("realEstateType", event.target.value)} className="select select-bordered mt-3 w-full">
              <option value="">Type d’annonce immobilière</option>
              <option value="sale">Vente</option>
              <option value="rent">Location</option>
            </select>
            {form.realEstateType === "rent" && <input value={form.guaranteeMonths} onChange={(event) => update("guaranteeMonths", event.target.value)} type="number" min="0" placeholder="Garantie en mois (optionnel)" className="input input-bordered mt-3 w-full" />}
          </div>
        )}
        {isRealEstate && <input required value={form.stock} onChange={(event) => update("stock", event.target.value)} type="number" min="1" placeholder="Nombre de biens" className="input input-bordered mt-3 w-full" />}
        {hasFashionSubcategory && (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Sous-catégorie de mode *</span>
            <select required value={form.specifications["Sous-catégorie"] ?? ""} onChange={(event) => setForm((current) => ({ ...current, specifications: { ...current.specifications, "Sous-catégorie": event.target.value } }))} className="select select-bordered w-full">
              <option value="">Choisir une sous-catégorie</option>
              {fashionSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
            </select>
          </label>
        )}
        {specificationFields.length > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Caractéristiques du produit</h2>
            <div className="mt-3 space-y-4">
              {specificationFields.map((field) => {
                if (field === "Autres caractéristiques") return null;
                const choices = field === "Couleurs disponibles"
                  ? productColorsByCategory[specificationCategoryId] ?? standardProductSpecificationChoices[field]
                  : standardProductSpecificationChoices[field];
                if (choices) {
                  const selected = getSpecificationChoices(form.specifications[field] ?? "");
                  return (
                    <fieldset key={field}>
                      <legend className="mb-2 text-sm font-medium text-slate-700">{field}</legend>
                      <div className="flex flex-wrap gap-2">
                        {choices.map((choice) => {
                          const checked = selected.includes(choice);
                          const isColor = field === "Couleurs disponibles";
                          return (
                            <button key={choice} type="button" aria-pressed={checked} onClick={() => toggleSpecificationChoice(field, choice)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${checked ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
                              {isColor && <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: productColorHex(choice) }} />}
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                }
                return (
                  <label key={field} className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">{field}</span>
                    <input value={form.specifications[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, specifications: { ...current.specifications, [field]: event.target.value } }))} className="input input-bordered w-full bg-white" placeholder={field} />
                  </label>
                );
              })}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Autres caractéristiques</span>
                <textarea value={form.specifications["Autres caractéristiques"] ?? ""} onChange={(event) => setForm((current) => ({ ...current, specifications: { ...current.specifications, "Autres caractéristiques": event.target.value } }))} className="textarea textarea-bordered min-h-20 w-full bg-white" placeholder="Détails complémentaires" />
              </label>
            </div>
          </section>
        )}
        <label className="mt-3 block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Images du produit</span>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} className="file-input file-input-bordered w-full" />
        </label>
        {selectedFiles.length > 0 && <p className="mt-2 text-xs text-slate-500">{selectedFiles.length} image(s) sélectionnée(s) (maximum {photoLimit}).</p>}
        <input value={form.images} onChange={(event) => update("images", event.target.value)} placeholder="URLs images séparées par des virgules" className="input input-bordered mt-3 w-full" />
        <p className="mt-2 text-xs text-slate-500">Ajoutez 1 à {photoLimit} images. Les fichiers uploadés dans le bucket product-images ou les URLs HTTPS sont acceptés.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="btn btn-primary mt-5 w-full">
          {busy ? <LoaderCircle className="animate-spin" size={17} /> : "Publier l’annonce"}
        </button>
      </form>
    </section>
  );
}
void PublishModal;

function ProfilePanel({
  user,
  onClose,
  onManageProducts,
  onStockManagement,
  onManageProfile,
  onSellerOrders,
  onPublish,
  onSignOut,
}: {
  user: User;
  onClose: () => void;
  onManageProducts: () => void;
  onStockManagement: () => void;
  onManageProfile: () => void;
  onSellerOrders: () => void;
  onPublish: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="fixed right-4 top-20 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Mon compte</h2>
        <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
          <X size={16} />
        </button>
      </div>
      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2">
          {user.fullName ? (
            <p className="font-semibold text-slate-900">{user.fullName}</p>
          ) : user.email ? (
            <p className="font-semibold text-slate-900">{user.email.split("@")[0]}</p>
          ) : (
            <p className="font-semibold text-slate-900">Utilisateur</p>
          )}
          {user.isVerified && (
            <span className="badge gap-1 border-0 bg-emerald-500 text-white">
              <ShieldCheck size={12} /> Vérifié
            </span>
          )}
        </div>
        {user.username && <p className="text-sm text-slate-500">@{user.username.replace(/^@/, "")}</p>}
        <p className="truncate text-sm text-slate-400">{user.email}</p>
      </div>
      {user.isAnonymous ? (
        <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-900">
          Vous utilisez une session invitée pour votre commande. Aucun compte classique n’a été créé.
        </p>
      ) : (
        <>
          <button onClick={onManageProducts} className="btn btn-outline mt-5 w-full justify-start">
            <Package size={16} /> Gérer mes produits
          </button>
          {user.role === "seller" && (user.accountType === "boutique" || user.accountType === "magasin") && (
            <button onClick={onStockManagement} className="btn btn-outline mt-3 w-full justify-start">
              <Package size={16} /> Gestion des stocks
            </button>
          )}
          <button onClick={onManageProfile} className="btn btn-outline mt-3 w-full justify-start">
            <UserRound size={16} /> Gérer mon profil
          </button>
          {user.role === "seller" && (
            <button onClick={onSellerOrders} className="btn btn-outline mt-3 w-full justify-start">
              <ClipboardList size={16} /> Commandes reçues
            </button>
          )}
          {user.isVerified && <button onClick={onPublish} className="btn btn-primary mt-3 w-full justify-start bg-[#143ca8]">
            <Plus size={16} /> Publier une annonce
          </button>}
        </>
      )}
      <button onClick={onSignOut} className="btn btn-outline mt-5 w-full">
        <LogOut size={16} /> Se déconnecter
      </button>
    </aside>
  );
}

function ProfileManagementPage({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const [activeSection, setActiveSection] = useState<"information" | "security">("information");
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    username: user.username || "",
    phone: "",
    role: user.role || "buyer",
    accountType: user.accountType || "personal",
    businessName: "",
    address: "",
    bio: "",
    avatar: "",
    showPhone: false,
  });
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [requiresCurrentPassword, setRequiresCurrentPassword] = useState(true);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      if (!supabase) {
        setError("La configuration Supabase est absente.");
        setBusy(false);
        return;
      }
      const { data, error: profileError } = await supabase.from("public_profiles").select("*").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (profileError) setError(profileError.message);
      if (data) {
        setForm((current) => ({
          ...current,
          fullName: data.name || current.fullName,
          username: data.username || current.username,
          phone: data.phone || "",
          role: data.role || current.role,
          accountType: data.account_type || current.accountType,
          businessName: data.business_name || "",
          address: data.address || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          showPhone: Boolean(data.show_phone),
        }));
      }
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const isSocialAccount = authData.user.identities?.some((identity) => identity.provider === "google" || identity.provider === "facebook") ?? false;
        setRequiresCurrentPassword(!isSocialAccount || authData.user.user_metadata?.password_configured === true);
      }
      setBusy(false);
    };
    void loadProfile();
    return () => { active = false; };
  }, [user.id, user.fullName, user.username, user.role, user.accountType]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!supabase) {
      setError("La configuration Supabase est absente.");
      return;
    }
    if (!form.fullName.trim()) {
      setError("Le nom complet est obligatoire.");
      return;
    }
    if (form.phone && !/^\d{8,15}$/.test(form.phone.replace(/\D/g, ""))) {
      setError("Le numéro de téléphone n’est pas valide.");
      return;
    }
    setSaving(true);
    const profile = {
      id: user.id,
      name: form.fullName.trim(),
      username: form.username.trim().replace(/^@/, "") || null,
      phone: form.phone.trim() || null,
      role: form.role,
      account_type: form.accountType,
      business_name: form.businessName.trim() || null,
      address: form.address.trim() || null,
      bio: form.bio.trim() || null,
      avatar: form.avatar.trim() || null,
      show_phone: form.showPhone,
    };
    const { error: profileError } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name: profile.name,
        username: profile.username,
        phone: profile.phone,
        role: profile.role,
        account_type: profile.account_type,
        business_name: profile.business_name,
      },
    });
    setSaving(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const updatedUser = { ...user, fullName: profile.name, businessName: profile.business_name || undefined, username: profile.username || undefined, role: profile.role, accountType: profile.account_type, avatar: profile.avatar || undefined };
    onSaved(updatedUser);
    setSuccess("Votre profil a été mis à jour.");
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!supabase) {
      setPasswordError("La configuration Supabase est absente.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (requiresCurrentPassword && !currentPassword) {
      setPasswordError("Saisissez votre ancien mot de passe.");
      return;
    }
    setPasswordBusy(true);
    if (requiresCurrentPassword) {
      if (!user.email) {
        setPasswordBusy(false);
        setPasswordError("Impossible de vérifier votre ancien mot de passe sans adresse email.");
        return;
      }
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) {
        setPasswordBusy(false);
        setPasswordError("L’ancien mot de passe est incorrect.");
        return;
      }
    }
    const { error: passwordUpdateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: { password_configured: true },
    });
    setPasswordBusy(false);
    if (passwordUpdateError) {
      setPasswordError(passwordUpdateError.message);
      return;
    }
    setNewPassword("");
    setConfirmNewPassword("");
    setCurrentPassword("");
    setRequiresCurrentPassword(true);
    setPasswordSuccess("Votre mot de passe a été modifié.");
  };

  return (
    <section className="mx-auto min-h-[calc(100dvh-2rem)] w-full max-w-5xl bg-white px-4 py-5 sm:min-h-[calc(100dvh-4rem)] sm:rounded-3xl sm:border sm:border-slate-200 sm:p-8 sm:shadow-sm lg:p-10">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 sm:gap-4 sm:pb-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">Mon compte</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Modifier le profil</h1>
          <p className="mt-2 text-sm text-slate-500">Mettez à jour les informations visibles sur votre compte et vos annonces.</p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm min-h-10 shrink-0 px-2 sm:px-4">
          <ChevronLeft size={18} className="sm:hidden" />
          <span className="hidden sm:inline">Retour</span>
          <span className="sr-only sm:hidden">Retour</span>
        </button>
      </div>
      <nav className="mx-auto mt-4 grid max-w-4xl grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:mt-6" aria-label="Sections du profil">
        <button
          type="button"
          onClick={() => setActiveSection("information")}
          aria-current={activeSection === "information" ? "page" : undefined}
          className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition ${activeSection === "information" ? "bg-white text-[#143ca8] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          Informations
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("security")}
          aria-current={activeSection === "security" ? "page" : undefined}
          className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition ${activeSection === "security" ? "bg-white text-[#143ca8] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          Sécurité
        </button>
      </nav>
      {busy ? (
        <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-[#143ca8]" size={30} /></div>
      ) : activeSection === "information" ? (
        <form onSubmit={submit} className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2">
          <label className="form-control"><span className="label-text font-semibold">Nom complet *</span><input required value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="input input-bordered mt-2 w-full" /></label>
          <label className="form-control"><span className="label-text font-semibold">Nom utilisateur</span><input value={form.username} onChange={(event) => update("username", event.target.value)} placeholder="mon_nom" className="input input-bordered mt-2 w-full" /></label>
          <label className="form-control"><span className="label-text font-semibold">Téléphone</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Numéro de téléphone" className="input input-bordered mt-2 w-full" /></label>
          <label className="form-control"><span className="label-text font-semibold">Email</span><input value={user.email || ""} readOnly className="input input-bordered mt-2 w-full bg-slate-50" /></label>
          <label className="form-control"><span className="label-text font-semibold">Type de compte</span><select value={form.accountType} onChange={(event) => update("accountType", event.target.value)} className="select select-bordered mt-2 w-full"><option value="personal">Personnel</option><option value="boutique">Boutique</option><option value="magasin">Magasin</option><option value="agence_immo">Agence immobilière</option></select></label>
          <label className="form-control"><span className="label-text font-semibold">Rôle</span><select value={form.role} onChange={(event) => update("role", event.target.value)} className="select select-bordered mt-2 w-full"><option value="buyer">Acheteur</option><option value="seller">Vendeur</option></select></label>
          {(form.accountType === "boutique" || form.accountType === "magasin") && <label className="form-control"><span className="label-text font-semibold">Nom de la boutique ou du magasin</span><input value={form.businessName} onChange={(event) => update("businessName", event.target.value)} className="input input-bordered mt-2 w-full" /></label>}
          <label className="form-control"><span className="label-text font-semibold">Adresse</span><input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Ville, quartier" className="input input-bordered mt-2 w-full" /></label>
          <label className="form-control lg:col-span-2"><span className="label-text font-semibold">Photo de profil (URL)</span><input type="url" value={form.avatar} onChange={(event) => update("avatar", event.target.value)} placeholder="https://..." className="input input-bordered mt-2 w-full" /></label>
          <label className="form-control lg:col-span-2"><span className="label-text font-semibold">Présentation</span><textarea maxLength={500} value={form.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Présentez-vous ou décrivez votre activité" className="textarea textarea-bordered mt-2 min-h-28 w-full" /></label>
          <label className="label cursor-pointer justify-start gap-3 px-0 lg:col-span-2"><input type="checkbox" checked={form.showPhone} onChange={(event) => update("showPhone", event.target.checked)} className="toggle toggle-primary shrink-0" /><span className="min-w-0"><strong className="block text-sm sm:text-base">Afficher mon numéro</strong><small className="text-xs text-slate-500 sm:text-sm">Visible sur mes annonces.</small></span></label>
          {error && <p className="text-sm text-red-600 lg:col-span-2">{error}</p>}
          {success && <p className="text-sm text-emerald-600 lg:col-span-2">{success}</p>}
          <div className="flex flex-wrap gap-3 lg:col-span-2"><button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button><button type="submit" disabled={saving} className="btn bg-[#143ca8] text-white">{saving ? <LoaderCircle className="animate-spin" size={17} /> : "Enregistrer les modifications"}</button></div>
        </form>
      ) : (
        <section className="mx-auto mt-5 max-w-4xl sm:mt-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-display text-xl font-bold">Mot de passe</h2>
            <p className="mt-1 text-sm text-slate-500">Modifiez le mot de passe associé à votre compte.</p>
          </div>
          <form onSubmit={changePassword} className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {requiresCurrentPassword && <input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Ancien mot de passe" className="input input-bordered w-full sm:col-span-2" />}
              <input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nouveau mot de passe" className="input input-bordered w-full" />
              <input required minLength={8} type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} placeholder="Confirmer le nouveau mot de passe" className="input input-bordered w-full" />
            </div>
            {passwordError && <p className="mt-3 text-sm text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="mt-3 text-sm text-emerald-600">{passwordSuccess}</p>}
            <button type="submit" disabled={passwordBusy} className="btn mt-4 w-full bg-[#143ca8] text-white sm:w-auto">{passwordBusy ? <LoaderCircle className="animate-spin" size={17} /> : "Modifier le mot de passe"}</button>
          </form>
        </section>
      )}
    </section>
  );
}

function ManageProductsPage({
  products,
  onClose,
  onPublish,
  onViewProduct,
  onDelete,
}: {
  products: Product[];
  onClose: () => void;
  onPublish: () => void;
  onViewProduct: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:mt-10 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">Espace vendeur</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Mes produits</h1>
          <p className="mt-2 text-sm text-slate-500">Consultez et gérez vos annonces publiées.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">Retour</button>
          <button type="button" onClick={onPublish} className="btn bg-[#143ca8] text-white"><Plus size={17} /> Publier</button>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="mx-auto text-slate-300" size={42} />
          <h2 className="mt-4 text-lg font-bold">Vous n’avez aucun produit</h2>
          <p className="mt-2 text-sm text-slate-500">Publiez votre première annonce pour la retrouver ici.</p>
          <button type="button" onClick={onPublish} className="btn mt-5 bg-[#143ca8] text-white"><Plus size={17} /> Publier une annonce</button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button type="button" onClick={() => onViewProduct(product)} className="block w-full text-left">
                <div className="aspect-[4/3] bg-slate-100">
                  {product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-400">Pas d’image</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 font-bold">{product.title}</h2>
                    <span className={`badge shrink-0 border-0 ${product.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {product.status === "active" ? "Active" : product.status}
                    </span>
                  </div>
                  <PriceDisplay product={product} compact />
                  <p className="mt-2 text-xs text-slate-500">{product.location} · {product.category}</p>
                </div>
              </button>
              <div className="flex gap-2 border-t border-slate-100 p-3">
                <button type="button" onClick={() => onViewProduct(product)} className="btn btn-ghost btn-sm flex-1">Voir</button>
                <button type="button" onClick={() => onDelete(product)} className="btn btn-ghost btn-sm text-red-600" aria-label={`Supprimer ${product.title}`} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      {children}
    </div>
  );
}

function PriceDisplay({ product, compact = false }: { product: Product; compact?: boolean }) {
  const hasDiscount = product.originalPrice !== null && product.originalPrice > product.price;
  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${compact ? "mt-2" : "mt-4"}`}>
      <span className={`${compact ? "text-lg" : "text-2xl"} font-black text-[#143ca8]`}>
        {product.price.toLocaleString("fr-FR")} {product.currency}
      </span>
      {hasDiscount && (
        <span className="text-sm font-semibold text-slate-400 line-through">
          {product.originalPrice!.toLocaleString("fr-FR")} {product.currency}
        </span>
      )}
      {hasDiscount && <span className="badge badge-sm border-0 bg-orange-100 text-orange-700">Prix réduit</span>}
    </div>
  );
}

function ProductDetails({ product, isFavorite, onToggleFavorite, onAddToCart, onClose, sellerProducts, similarProducts, onSelectSellerProduct, onDownload }: { product: Product; isFavorite: boolean; onToggleFavorite: () => void; onAddToCart: (variants: ProductVariant[]) => void; onClose: () => void; sellerProducts: Product[]; similarProducts: Product[]; onSelectSellerProduct: (product: Product) => void; onDownload: () => void }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSpecifications, setSelectedSpecifications] = useState<Record<string, string>>({});
  const [configurationQuantities, setConfigurationQuantities] = useState<Record<string, number>>({});
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showAllSellerProducts, setShowAllSellerProducts] = useState(false);
  const [showAllSimilarProducts, setShowAllSimilarProducts] = useState(false);
  const visibleSellerProducts = showAllSellerProducts ? sellerProducts : sellerProducts.slice(0, 6);
  const visibleSimilarProducts = showAllSimilarProducts ? similarProducts : similarProducts.slice(0, 6);
  const selectableSpecifications = getSelectableSpecifications(product.specifications);
  const selectedConfigurations = getSpecificationConfigurations(selectedSpecifications);
  const totalSelectedQuantity = selectedConfigurations.reduce(
    (total, configuration) => total + (configurationQuantities[specificationConfigurationKey(configuration)] ?? 1),
    0,
  );
  const allOptionsSelected = selectableSpecifications.every(([label]) => Boolean(selectedSpecifications[label]));
  const productImages = product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const whatsappNumber = normalizeWhatsAppNumber(product.phone);
  const productUrl = `${window.location.origin}/annonce/${productSlug(product)}`;
  const whatsappMessage = `Bonjour, je suis intéressé par votre annonce « ${product.title} » sur Mbokamaket.\n\nVoir le produit : ${productUrl}`;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "";
  const publishedDate = product.createdAt ? new Date(product.createdAt) : null;
  const publishedLabel = publishedDate && Number.isFinite(publishedDate.getTime())
    ? `Publié le ${publishedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
    : "";

  useEffect(() => {
    let mounted = true;
    const loadFollowState = async () => {
      if (!supabase || !product.sellerId) {
        setIsFollowing(false);
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (mounted) setCurrentUserId(currentUserId || null);
      if (!currentUserId || currentUserId === product.sellerId) {
        setIsFollowing(false);
        return;
      }
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", product.sellerId)
        .maybeSingle();
      if (mounted && !error) setIsFollowing(Boolean(data));
    };
    void loadFollowState();
    return () => { mounted = false; };
  }, [product.sellerId]);

  const toggleFollow = async () => {
    if (!supabase) return;
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      window.alert("Connectez-vous pour suivre ce compte.");
      return;
    }
    if (currentUserId === product.sellerId) return;
    setFollowBusy(true);
    const result = isFollowing
      ? await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", product.sellerId)
      : await supabase.from("follows").insert({ follower_id: currentUserId, following_id: product.sellerId });
    setFollowBusy(false);
    if (result.error) {
      window.alert(result.error.message || "Impossible de modifier le suivi.");
      return;
    }
    setIsFollowing(!isFollowing);
  };
  const showPreviousImage = () => setActiveImageIndex((index) => (index - 1 + productImages.length) % productImages.length);
  const showNextImage = () => setActiveImageIndex((index) => (index + 1) % productImages.length);
  return (
    <section className="product-details-page fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-[#f6f8fc] text-slate-900">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white/95 px-2.5 py-2 backdrop-blur sm:px-5">
        <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Retour aux annonces">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#143ca8]">Mbokamaket</p>
          <h1 className="truncate text-sm font-semibold text-slate-800">{product.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) void navigator.share({ title: product.title, text: product.description, url: productUrl }).catch((shareError) => {
              console.warn("[product] partage annulé ou indisponible", shareError);
            });
            else void navigator.clipboard.writeText(productUrl).then(() => window.alert("Lien du produit copié.")).catch((shareError) => {
              console.error("[product] impossible de copier le lien", shareError);
              window.alert("Impossible de partager ce produit.");
            });
          }}
          className="btn btn-ghost btn-circle btn-sm"
          aria-label="Partager ce produit"
        >
          <Share2 size={17} />
        </button>
        <button type="button" onClick={onToggleFavorite} className="btn btn-ghost btn-circle btn-sm text-rose-600" aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}>
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2.5 px-2.5 py-2.5 sm:gap-4 sm:px-5 sm:py-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-start lg:gap-5">
        <div className="contents lg:col-start-1 lg:row-start-1 lg:block">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200 sm:aspect-[16/11] lg:rounded-3xl">
            {productImages.length ? (
              <img src={productImages[activeImageIndex] || product.image} alt={product.title} decoding="async" className="h-full w-full object-contain sm:object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-slate-400"><Package size={48} /></div>
            )}
            {productImages.length > 1 && (
              <>
                <button type="button" onClick={showPreviousImage} className="btn btn-circle btn-sm absolute left-3 top-1/2 -translate-y-1/2 border-0 bg-white/90 shadow" aria-label="Image précédente"><ChevronLeft size={20} /></button>
                <button type="button" onClick={showNextImage} className="btn btn-circle btn-sm absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-white/90 shadow" aria-label="Image suivante"><ChevronRight size={20} /></button>
                <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white">{activeImageIndex + 1} / {productImages.length}</span>
              </>
            )}
            {product.condition && product.condition.toLowerCase() !== "non applicable" && (
              <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white">{product.condition}</span>
            )}
            {product.promoted && <span className="badge absolute left-3 top-3 border-0 bg-orange-500 text-white">À la une</span>}
          </div>
          {productImages.length > 1 && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {productImages.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setActiveImageIndex(index)} className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 ${index === activeImageIndex ? "border-[#143ca8]" : "border-transparent"}`} aria-label={`Afficher l’image ${index + 1}`}>
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {sellerProducts.length > 0 && (
            <section className="order-5 mt-1 min-w-0 lg:mt-4">
              <h3 className="mb-2 font-display text-base font-bold sm:text-lg">Autres produits de {product.seller}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {visibleSellerProducts.map((sellerProduct) => (
                  <button
                    key={sellerProduct.id}
                    type="button"
                    onClick={() => onSelectSellerProduct(sellerProduct)}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-[#143ca8] hover:shadow"
                  >
                    <div className="aspect-[4/3] bg-slate-100">
                      {sellerProduct.image
                        ? <img src={sellerProduct.image} alt={sellerProduct.title} loading="lazy" className="h-full w-full object-cover" />
                        : <span className="grid h-full place-items-center text-slate-400"><Package size={22} /></span>}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-semibold leading-4 text-slate-800">{sellerProduct.title}</p>
                      <p className="mt-1 text-sm font-black text-[#143ca8]">{sellerProduct.price.toLocaleString("fr-FR")} {sellerProduct.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              {sellerProducts.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllSellerProducts((visible) => !visible)}
                  aria-expanded={showAllSellerProducts}
                  className="btn btn-ghost btn-sm mt-2 w-full text-[#143ca8]"
                >
                  {showAllSellerProducts ? "Voir moins" : `Voir plus (${sellerProducts.length - 6})`}
                </button>
              )}
            </section>
          )}
          {similarProducts.length > 0 && (
            <section className="order-6 mt-1 min-w-0 lg:mt-4">
              <h3 className="mb-2 font-display text-base font-bold sm:text-lg">Produits similaires</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {visibleSimilarProducts.map((similarProduct) => (
                  <button
                    key={similarProduct.id}
                    type="button"
                    onClick={() => onSelectSellerProduct(similarProduct)}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-[#143ca8] hover:shadow"
                  >
                    <div className="aspect-[4/3] bg-slate-100">
                      {similarProduct.image
                        ? <img src={similarProduct.image} alt={similarProduct.title} loading="lazy" className="h-full w-full object-cover" />
                        : <span className="grid h-full place-items-center text-slate-400"><Package size={22} /></span>}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-semibold leading-4 text-slate-800">{similarProduct.title}</p>
                      <p className="mt-1 text-sm font-black text-[#143ca8]">{similarProduct.price.toLocaleString("fr-FR")} {similarProduct.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
              {similarProducts.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllSimilarProducts((visible) => !visible)}
                  aria-expanded={showAllSimilarProducts}
                  className="btn btn-ghost btn-sm mt-2 w-full text-[#143ca8]"
                >
                  {showAllSimilarProducts ? "Voir moins" : `Voir plus (${similarProducts.length - 6})`}
                </button>
              )}
            </section>
          )}
        </div>

        <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-3">
          <section className="order-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-0 bg-blue-50 text-[#143ca8]">{product.category}</span>
              {product.realEstateType && <span className="badge border-0 bg-violet-50 text-violet-700">{product.realEstateType === "rent" ? "À louer" : product.realEstateType === "sale" ? "À vendre" : product.realEstateType}</span>}
              {product.guaranteeMonths != null && String(product.guaranteeMonths).trim() && String(product.guaranteeMonths) !== "Non applicable" && <span className="badge border-0 bg-emerald-50 text-emerald-700">Garantie {product.guaranteeMonths} mois</span>}
              {product.status === "sold" && <span className="badge border-0 bg-red-100 text-red-700">Vendu</span>}
            </div>
            <h2 className="mt-2 font-display text-xl font-bold leading-tight sm:text-2xl">{product.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {product.location && <span className="flex items-center gap-1"><MapPin size={15} />{product.location}</span>}
              {publishedLabel && <span>{publishedLabel}</span>}
            </div>
            <PriceDisplay product={product} />
            {product.status !== "sold" && !product.realEstateType && (
              <p className={`mt-2 text-sm font-medium ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                {product.stock > 0 ? `En stock : ${product.stock} unité${product.stock === 1 ? "" : "s"}` : "Stock épuisé"}
              </p>
            )}
            {selectableSpecifications.length > 0 && (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-3">
                {selectableSpecifications.some(([label]) => label === "Tailles disponibles" || label === "Pointures disponibles")
                  && selectableSpecifications.some(([label]) => label === "Couleurs disponibles")
                  && <p className="text-sm font-semibold text-slate-700">Choisissez d’abord la taille ou la pointure, puis une ou plusieurs couleurs.</p>}
                {selectableSpecifications.map(([label, rawChoices]) => {
                  const choices = getSpecificationChoices(rawChoices);
                  const isMultiChoice = multiChoiceSpecificationLabels.has(label);
                  const selectedValues = getSpecificationChoices(selectedSpecifications[label] ?? "");
                  const sizeLabel = selectableSpecifications.find(([field]) => field === "Tailles disponibles" || field === "Pointures disponibles")?.[0];
                  const colorIsLocked = label === "Couleurs disponibles" && Boolean(sizeLabel && !selectedSpecifications[sizeLabel]);
                  return (
                    <fieldset key={label} disabled={colorIsLocked} className={colorIsLocked ? "opacity-50" : ""}>
                      <legend className="mb-2 text-sm font-semibold text-slate-700">{label}</legend>
                      {colorIsLocked && <p className="mb-2 text-xs text-slate-500">Sélectionnez d’abord une taille ou une pointure.</p>}
                      <div className="flex flex-wrap gap-2">
                        {choices.map((choice) => {
                          const isSelected = selectedValues.includes(choice);
                          const toggleChoice = () => {
                            setSelectedSpecifications((current) => {
                              const currentValues = getSpecificationChoices(current[label] ?? "");
                              const nextValues = isMultiChoice
                                ? currentValues.includes(choice)
                                  ? currentValues.filter((value) => value !== choice)
                                  : [...currentValues, choice]
                                : [choice];
                              const next = { ...current };
                              if (nextValues.length) next[label] = nextValues.join(", ");
                              else delete next[label];
                              return next;
                            });
                          };
                          return (
                            <button
                              key={choice}
                              type="button"
                              onClick={toggleChoice}
                              aria-pressed={isSelected}
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${isSelected ? "border-[#143ca8] bg-[#143ca8] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-[#143ca8]"}`}
                            >
                              {label === "Couleurs disponibles" && (
                                <span className="size-4 rounded-full border border-black/15" style={{ backgroundColor: productColorHex(choice) }} />
                              )}
                              {choice}
                              {isMultiChoice && <span aria-hidden="true" className="text-xs">{isSelected ? "✓" : "○"}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
                {allOptionsSelected ? (
                  <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">Quantités par variante</p>
                    {selectedConfigurations.map((configuration) => {
                      const key = specificationConfigurationKey(configuration);
                      const quantity = configurationQuantities[key] ?? 1;
                      const configurationLabel = Object.values(configuration).join(" · ");
                      return (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-sm text-slate-600">{configurationLabel || "Configuration"}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfigurationQuantities((current) => ({ ...current, [key]: Math.max(0, quantity - 1) }))}
                              disabled={quantity <= 0}
                              className="btn btn-ghost btn-circle btn-xs"
                              aria-label={`Diminuer ${configurationLabel}`}
                            ><Minus size={14} /></button>
                            <span className="min-w-4 text-center text-sm font-bold">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => setConfigurationQuantities((current) => ({ ...current, [key]: quantity + 1 }))}
                              disabled={quantity >= product.stock || totalSelectedQuantity >= product.stock}
                              className="btn btn-ghost btn-circle btn-xs"
                              aria-label={`Augmenter ${configurationLabel}`}
                            ><Plus size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                    <p className={`text-right text-xs ${totalSelectedQuantity > product.stock ? "text-red-600" : "text-slate-500"}`}>
                      {totalSelectedQuantity > product.stock
                        ? "Réduisez les quantités : le total dépasse le stock disponible."
                        : `${Math.max(0, product.stock - totalSelectedQuantity)} unité(s) restant à répartir`}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Sélectionnez les options requises pour ajouter le produit au panier.</p>
                )}
              </div>
            )}
            {selectableSpecifications.length === 0 && !product.realEstateType && product.stock > 0 && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="font-medium text-slate-600">Quantité</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedQuantity((quantity) => Math.max(1, quantity - 1))} disabled={selectedQuantity <= 1} className="btn btn-ghost btn-circle btn-xs" aria-label="Diminuer la quantité"><Minus size={14} /></button>
                  <span className="min-w-5 text-center font-bold">{selectedQuantity}</span>
                  <button type="button" onClick={() => setSelectedQuantity((quantity) => Math.min(product.stock, quantity + 1))} disabled={selectedQuantity >= product.stock} className="btn btn-ghost btn-circle btn-xs" aria-label="Augmenter la quantité"><Plus size={14} /></button>
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {product.status === "active" && currentUserId !== product.sellerId && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectableSpecifications.length > 0) {
                      const variants = selectedConfigurations
                        .map((configuration) => ({
                          selectedSpecifications: configuration,
                          quantity: configurationQuantities[specificationConfigurationKey(configuration)] ?? 1,
                        }))
                        .filter((variant) => variant.quantity > 0);
                      onAddToCart(variants);
                    } else {
                      onAddToCart([{ selectedSpecifications: {}, quantity: selectedQuantity }]);
                    }
                  }}
                  disabled={(!product.realEstateType && product.stock <= 0) || (selectableSpecifications.length > 0 && (!allOptionsSelected || totalSelectedQuantity <= 0 || totalSelectedQuantity > product.stock))}
                  className="btn min-h-11 flex-1 border-[#143ca8] bg-[#143ca8] text-white hover:bg-[#102f85] disabled:bg-slate-300"
                >
                  <ShoppingCart size={18} /> Ajouter au panier
                </button>
              )}
              {whatsappUrl && currentUserId !== product.sellerId && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn min-h-11 flex-1 bg-[#25D366] text-white"><Phone size={17} /> WhatsApp</a>
              )}
            </div>
          </section>

          <section className="order-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <h3 className="font-display text-lg font-bold">Description</h3>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-5 text-slate-600">{product.description?.trim() || "Aucune description fournie par le vendeur."}</p>
          </section>

          {Object.entries(product.specifications ?? {}).filter(([, value]) => value.trim()).length > 0 && (
            <section className="order-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <h3 className="font-display text-lg font-bold">Caractéristiques du produit</h3>
              <dl className="mt-2 divide-y divide-slate-100">
                {Object.entries(product.specifications ?? {}).filter(([, value]) => value.trim()).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 py-2 text-sm">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="break-words text-right font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="order-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <h3 className="font-display text-lg font-bold">À propos du vendeur</h3>
            <div className="mt-2 flex items-start gap-2.5">
              {product.sellerAvatar ? <img src={product.sellerAvatar} alt="" className="size-10 shrink-0 rounded-full object-cover" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf3ff] text-[#143ca8]"><UserRound size={18} /></span>}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <p className="max-w-full truncate font-bold">{product.seller}</p>
                    {product.verified && <span className="badge badge-xs shrink-0 border-0 bg-emerald-100 text-emerald-700"><ShieldCheck size={11} /> Vérifié</span>}
                    {product.sellerAccountType && product.sellerAccountType !== "personal" && <span className="badge badge-xs shrink-0 border-0 bg-blue-50 text-blue-700">{product.sellerAccountType}</span>}
                  </div>
                  {currentUserId !== product.sellerId && (
                    <button type="button" onClick={() => void toggleFollow()} disabled={followBusy} className="btn btn-outline btn-xs min-h-7 h-7 shrink-0 border-[#143ca8] px-2 text-[#143ca8]">
                      {followBusy ? <LoaderCircle className="animate-spin" size={13} /> : null}{isFollowing ? "Suivi" : "Suivre"}
                    </button>
                  )}
                </div>
                {product.sellerUsername && <p className="mt-0.5 text-xs text-slate-500">@{product.sellerUsername.replace(/^@/, "")}</p>}
                {product.sellerAddress && <p className="mt-1 flex items-start gap-1 text-sm text-slate-500"><MapPin className="mt-0.5 shrink-0" size={14} />{product.sellerAddress}</p>}
                {product.sellerBio && <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-600">{product.sellerBio}</p>}
              </div>
            </div>
          </section>
          <ProductFeedbackSection
            productId={product.id}
            sellerId={product.sellerId}
            sellerName={product.seller}
            sellerAccountType={product.sellerAccountType}
            currentUserId={currentUserId}
          />
          <button type="button" onClick={onDownload} className="order-7 btn btn-ghost w-full text-[#143ca8]">Plus de fonctionnalités dans l’application</button>
        </div>
      </div>
    </section>
  );
}

export default App;
