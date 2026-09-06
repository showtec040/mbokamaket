/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-unused-expressions */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ComponentType, FormEvent, ReactNode } from "react";
import {
  Bell,
  CarFront,
  ChevronLeft,
  ChevronRight,
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
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Trophy,
  Tv,
  UserRound,
  X,
} from "lucide-react";
import { FaFacebookF, FaGoogle, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { supabase, supabaseConfigured } from "./lib/supabase";
import appIcon from "./assets/icon.png";
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
  phone: string;
};
type User = { id: string; email?: string; fullName?: string; username?: string; role?: string; accountType?: string; isVerified: boolean };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Notice = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
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
};

const PRODUCT_IMAGES_BUCKET = "product-images";
const DEFAULT_APK_URL = "https://www.dropbox.com/scl/fi/5zdwh2zrttr476fkc50it/MbokaMarket-v1.0.0.apk.apk?rlkey=6t6ead4jxe465hfcy87plwx9s&st=hds9drrx&dl=1";

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
const getProfileDisplayName = (profile?: { name?: string | null; full_name?: string | null; username?: string | null; business_name?: string | null } | null) => {
  return normalizeDisplayName(profile?.name)
    || normalizeDisplayName(profile?.full_name)
    || normalizeDisplayName(profile?.business_name)
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
  seller: normalizeDisplayName(row.seller_name) || "Vendeur MbokaMarket",
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
  phone: "",
});

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [showProducts, setShowProducts] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [heroProductIndex, setHeroProductIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("mbokamarket-favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [legalPage, setLegalPage] = useState<"conditions" | "confidentialite" | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLLabelElement>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");
  const playStore = import.meta.env.VITE_PLAY_STORE_URL as string | undefined;
  const appStore = import.meta.env.VITE_APP_STORE_URL as string | undefined;
  const apk = (import.meta.env.VITE_APK_URL as string | undefined) || DEFAULT_APK_URL;
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL as string | undefined;
  const tiktokUrl = import.meta.env.VITE_TIKTOK_URL as string | undefined;
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL as string | undefined;
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_URL as string | undefined;
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
  }, []);
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isStandalone || !isMobile) return;
    const showInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallOpen(true);
    };
    window.addEventListener("beforeinstallprompt", showInstallPrompt);
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) setInstallOpen(true);
    return () => window.removeEventListener("beforeinstallprompt", showInstallPrompt);
  }, []);
  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallOpen(false);
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
          };
        }),
      );
      setError("");
    }
    setLoading(false);
  };
  const loadNotices = async (currentUser: User) => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id,title,message,read,created_at")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (loadError) setError(loadError.message);
    else
      setNotices(
        (data || []).map((item) => ({
          id: String(item.id),
          title: item.title || "Notification",
          message: item.message || "",
          read: Boolean(item.read),
          createdAt: item.created_at,
        })),
      );
  };
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser) {
        supabase!.from("public_profiles").select("*").eq("id", sessionUser.id).maybeSingle().then(({ data: profile }) => {
          const fullName = getProfileDisplayName({
            ...profile,
            name: profile?.name || sessionUser.user_metadata?.name,
            full_name: profile?.full_name || sessionUser.user_metadata?.full_name,
            business_name: profile?.business_name || sessionUser.user_metadata?.business_name,
            username: sessionUser.user_metadata?.username || sessionUser.user_metadata?.user_name,
          }) || (sessionUser.email ? sessionUser.email.split("@")[0] : "");
          const current = { id: sessionUser.id, email: sessionUser.email, fullName, username: sessionUser.user_metadata?.username || sessionUser.user_metadata?.user_name, role: sessionUser.user_metadata?.role, accountType: sessionUser.user_metadata?.account_type, isVerified: Boolean(profile?.is_verified) };
          setUser(current);
          void loadNotices(current);
        });
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user;
        if (!sessionUser) {
          setUser(null);
          return;
        }
        supabase!.from("public_profiles").select("*").eq("id", sessionUser.id).maybeSingle().then(({ data: profile }) => {
          const fullName = getProfileDisplayName({
            ...profile,
            name: profile?.name || sessionUser.user_metadata?.name,
            full_name: profile?.full_name || sessionUser.user_metadata?.full_name,
            business_name: profile?.business_name || sessionUser.user_metadata?.business_name,
            username: sessionUser.user_metadata?.username || sessionUser.user_metadata?.user_name,
          }) || (sessionUser.email ? sessionUser.email.split("@")[0] : "");
          const current = { id: sessionUser.id, email: sessionUser.email, fullName, username: sessionUser.user_metadata?.username || sessionUser.user_metadata?.user_name, role: sessionUser.user_metadata?.role, accountType: sessionUser.user_metadata?.account_type, isVerified: Boolean(profile?.is_verified) };
          setUser(current);
          void loadNotices(current);
        });
      },
    );
    void loadProducts();
    return () => listener.subscription.unsubscribe();
  }, []);
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
  const visibleProducts = useMemo(
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
  const unreadNoticeCount = notices.filter((item) => !item.read).length;
  const openNotice = async (notice: Notice) => {
    setSelectedNotice({ ...notice, read: true });
    setNotices((current) => current.map((item) => item.id === notice.id ? { ...item, read: true } : item));
    if (supabase && !notice.read && user) {
      await supabase.from("notifications").update({ read: true }).eq("id", notice.id).eq("user_id", user.id);
    }
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
    if (advertisedProducts.length < 2 || heroPaused) return;
    const timer = window.setInterval(() => {
      setHeroProductIndex((current) => (current + 1) % advertisedProducts.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [advertisedProducts.length, heroPaused]);
  const openProducts = () => {
    setSellerFilter(null);
    setPublishOpen(false);
    setNoticeOpen(false);
    setSelectedNotice(null);
    setShowProducts(true);
    window.location.hash = "produits";
  };
  const goHome = () => {
    setSellerFilter(null);
    setSelectedProduct(null);
    setPublishOpen(false);
    setNoticeOpen(false);
    setSelectedNotice(null);
    setShowProducts(false);
    window.location.hash = "accueil";
  };
  const openNotifications = () => {
    setPublishOpen(false);
    setShowProducts(false);
    setNoticeOpen(true);
    window.location.hash = "notifications";
  };
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
  const authRoute = window.location.hash === "#connexion" || window.location.hash === "#inscription";
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      {installOpen && (
        <aside className="fixed inset-x-3 bottom-3 z-[90] rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl shadow-[#143ca8]/20 sm:inset-x-auto sm:right-6 sm:w-96" aria-label="Installation de MbokaMarket">
          <div className="flex items-start gap-3">
            <img src={appIcon} alt="" className="size-12 rounded-xl object-contain" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900">Installer MbokaMarket</h2>
              {installPrompt ? (
                <p className="mt-1 text-sm text-slate-500">Ajoutez l’application à votre écran d’accueil.</p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">Dans Safari, appuyez sur Partager puis « Sur l’écran d’accueil ».</p>
              )}
            </div>
            <button type="button" onClick={() => setInstallOpen(false)} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer">×</button>
          </div>
          {installPrompt && <button type="button" onClick={() => void installApp()} className="btn mt-3 w-full rounded-xl bg-[#143ca8] text-white">Installer l’application</button>}
        </aside>
      )}
      {loading && (
        <main className="fixed inset-0 z-[100] grid place-items-center bg-[#143ca8] px-6 text-white md:hidden" aria-busy="true" aria-label="Chargement de MbokaMarket">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-24 place-items-center rounded-[1.75rem] bg-white p-4 shadow-2xl shadow-black/20">
              <img src={appIcon} alt="MbokaMarket" className="size-full object-contain" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold">MbokaMarket</h1>
            <p className="mt-2 text-sm text-blue-100">Chargement de votre marché...</p>
            <span className="mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-blue-300/30">
              <span className="block h-full w-1/2 animate-pulse rounded-full bg-white" />
            </span>
          </div>
        </main>
      )}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
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
                MbokaMarket
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
            <button
              onClick={() =>
                user ? setProfileOpen(!profileOpen) : openAuth()
              }
              className="btn btn-ghost btn-square"
              aria-label="Compte"
            >
              <UserRound size={20} />
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
          <a href="#telechargement" className="btn btn-primary hidden rounded-xl bg-[#143ca8] sm:flex">
            Télécharger l’application
          </a>
          <nav className="ml-auto hidden items-center gap-2 md:flex">
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
          </nav>
        </div>
        {mobileOpen && (
          <div ref={mobileMenuRef} className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openProducts();
              }}
              className="btn btn-ghost w-full justify-start"
            >
              Afficher les produits
            </button>
            <a
              href="#telechargement"
              onClick={() => setMobileOpen(false)}
              className="btn btn-ghost w-full justify-start"
            >
              Télécharger l’application
            </a>
            <button
              onClick={() => {
                setMobileOpen(false);
                user ? setProfileOpen(true) : openAuth();
              }}
              className="btn btn-ghost w-full justify-start"
            >
              {user ? "Mon compte" : "Se connecter"}
            </button>
          </div>
        )}
      </header>
      <main id="accueil" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        {publishOpen && user?.isVerified && (
          <PublishModal
            user={user}
            onClose={() => { setPublishOpen(false); window.location.hash = "accueil"; }}
            onCreated={() => { setPublishOpen(false); void loadProducts(); window.location.hash = "accueil"; }}
          />
        )}
        {!publishOpen && selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            isFavorite={favoriteIds.includes(selectedProduct.id)}
            onToggleFavorite={() => toggleFavorite(selectedProduct.id)}
            onClose={goHome}
            onSellerProducts={() => {
              setSelectedProduct(null);
              setQuery("");
              setCategory("Toutes");
              setSellerFilter({ id: selectedProduct.sellerId, name: selectedProduct.seller });
              setShowProducts(true);
              window.location.hash = "produits";
            }}
            onDownload={() => {
              setSelectedProduct(null);
              setShowProducts(false);
              window.location.hash = "telechargement";
            }}
          />
        )}
        {!publishOpen && noticeOpen && (
          <section className="notification-page mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:mt-10 sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">Centre de notifications</p>
                <h1 className="mt-2 font-display text-3xl font-bold">Vos notifications</h1>
                <p className="mt-2 text-sm text-slate-500">Consultez les informations importantes de votre compte.</p>
              </div>
              <button onClick={goHome} className="btn btn-ghost btn-sm shrink-0">Retour à l’accueil</button>
            </div>
            {notices.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Bell className="mx-auto mb-3 text-slate-300" size={36} />
                <p>Aucune notification pour le moment.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.7fr)]">
                <div className="space-y-3">
                  {notices.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => void openNotice(item)}
                      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedNotice?.id === item.id ? "border-[#143ca8] ring-2 ring-[#dbe5ff]" : "border-slate-200"} ${item.read ? "bg-white" : "border-blue-200 bg-blue-50/60"}`}
                    >
                      <span className="flex items-center justify-between gap-3"><strong>{item.title}</strong>{!item.read && <span className="badge badge-primary badge-sm">Nouveau</span>}</span>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.message || "Aucun message"}</p>
                      <p className="mt-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("fr-FR")}</p>
                    </button>
                  ))}
                </div>
                <div className="h-fit rounded-2xl bg-[#f5f7ff] p-5 lg:sticky lg:top-24">
                  {selectedNotice ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#143ca8]">Notification sélectionnée</p>
                      <h2 className="mt-3 text-xl font-bold">{selectedNotice.title}</h2>
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{selectedNotice.message || "Aucun détail supplémentaire."}</p>
                      <p className="mt-4 text-xs text-slate-400">{new Date(selectedNotice.createdAt).toLocaleString("fr-FR")}</p>
                    </>
                  ) : <p className="text-sm text-slate-500">Sélectionnez une notification pour afficher son contenu.</p>}
                </div>
              </div>
            )}
          </section>
        )}
        <section className={`${showProducts || noticeOpen || selectedProduct || publishOpen ? "hidden" : ""} hero-panel relative isolate mt-4 overflow-hidden rounded-[2rem] bg-[#143ca8] text-white shadow-2xl shadow-[#143ca8]/15 sm:mt-6`}>
          <div
            className="hero-ad-panel relative flex min-h-[27rem] flex-col justify-between overflow-hidden bg-[#f5f8ff] p-5 text-slate-900 sm:min-h-[30rem] sm:p-8 lg:min-h-[25rem] lg:p-7"
              onMouseEnter={() => setHeroPaused(true)}
              onMouseLeave={() => setHeroPaused(false)}
          >
              {heroProduct ? (
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
                    onClick={() => setSelectedProduct(heroProduct)}
                    className="group mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                    aria-label={`Voir le produit ${heroProduct.title}`}
                  >
                    <div className="relative aspect-[16/7] flex-none bg-slate-100">
                      {heroProduct.image ? <img src={heroProduct.image} alt={heroProduct.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-slate-400">Pas d’image</div>}
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
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-1.5" aria-label="Position dans les annonces">
                      {advertisedProducts.map((item, index) => <button key={item.id} type="button" onClick={() => setHeroProductIndex(index)} aria-label={`Afficher ${item.title}`} className={`h-2 rounded-full transition-all ${index === heroProductIndex % advertisedProducts.length ? "w-7 bg-[#143ca8]" : "w-2 bg-slate-300"}`} />)}
                    </div>
                    {advertisedProducts.length > 1 && <div className="flex gap-2"><button type="button" onClick={() => setHeroProductIndex((heroProductIndex - 1 + advertisedProducts.length) % advertisedProducts.length)} className="btn btn-circle btn-sm bg-white" aria-label="Annonce précédente"><ChevronLeft size={16} /></button><button type="button" onClick={() => setHeroProductIndex((heroProductIndex + 1) % advertisedProducts.length)} className="btn btn-circle btn-sm bg-white" aria-label="Annonce suivante"><ChevronRight size={16} /></button></div>}
                  </div>
                </>
              ) : <div className="grid flex-1 place-items-center text-center text-slate-500"><div><Search className="mx-auto mb-3 text-slate-300" size={32} /><p>Les annonces publicitaires apparaîtront ici.</p></div></div>}
          </div>
        </section>
        <section
          className={`${showProducts || noticeOpen || selectedProduct || publishOpen ? "hidden" : ""} mt-12 overflow-hidden rounded-[2rem] bg-[#eaf0ff] sm:mt-16`}
        >
          <div className="grid items-center gap-8 px-6 py-8 sm:px-12 sm:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <img src={appIcon} alt="" className="size-12 rounded-xl shadow-md" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">
                  L’expérience MbokaMarket
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
        {!showProducts && !noticeOpen && !selectedProduct && !publishOpen && (
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
                    onClick={() => setSelectedProduct(item)}
                    onKeyDown={(event) => event.key === "Enter" && setSelectedProduct(item)}
                    role="button"
                    tabIndex={0}
                    className="product-card cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
        <section className={showProducts && !noticeOpen && !selectedProduct && !publishOpen ? "mt-10" : "hidden"}>
          <button onClick={goHome} className="btn btn-ghost mb-5 px-0 text-[#143ca8]">
            Retour à l’accueil
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">
                {sellerFilter ? "Produits du vendeur" : "Catalogue public"}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {sellerFilter ? sellerFilter.name : "Les annonces disponibles"}
              </h2>
              {sellerFilter && (
                <button
                  onClick={() => setSellerFilter(null)}
                  className="btn btn-ghost mt-2 px-0 text-sm text-[#143ca8]"
                >
                  Voir toutes les annonces
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
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
          {!showProducts ? null : loading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="animate-spin text-[#143ca8]" />
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Aucune annonce trouvée.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((item) => (
                <article
                  key={item.id}
                  onClick={() => setSelectedProduct(item)}
                  onKeyDown={(event) => event.key === "Enter" && setSelectedProduct(item)}
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
                      <span className="badge absolute left-3 top-3 border-0 bg-orange-400 text-white">
                        À la une
                      </span>
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
                    <div className="flex items-start gap-2">
                      <h3 className="line-clamp-2 font-bold">{item.title}</h3>
                      {item.verified && (
                        <span className="badge shrink-0 gap-1 border-0 bg-emerald-500 text-white">
                          <ShieldCheck size={13} /> Vérifié
                        </span>
                      )}
                    </div>
                    <PriceDisplay product={item} compact />
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={13} />
                      {item.location}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
                      {item.sellerAvatar ? (
                        <img src={item.sellerAvatar} alt={`Profil de ${item.seller}`} loading="lazy" decoding="async" className="size-7 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-7 place-items-center rounded-full bg-[#edf3ff] text-[#143ca8]"><UserRound size={14} /></span>
                      )}
                      <span>{item.seller} · {item.category}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section
          id="telechargement"
          className={`${showProducts || noticeOpen || selectedProduct || publishOpen ? "hidden" : ""} download-section mt-12 border-t border-slate-200 pt-8 sm:mt-16 sm:pt-10`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">
            Toujours avec vous
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold">
            Téléchargez MbokaMarket
          </h2>
          <p className="mt-3 text-slate-500">
            Retrouvez toutes les fonctionnalités de l’application sur votre
            téléphone.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
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
              href={apk?.replace(/[?&]dl=0(?:&|$)/, (match) => match.startsWith("?") ? "?dl=1" : "&dl=1")}
              download
            />
          </div>
        </section>
      </main>
      <Footer
        contactEmail={contactEmail}
        facebookUrl={facebookUrl}
        tiktokUrl={tiktokUrl}
        instagramUrl={instagramUrl}
        youtubeUrl={youtubeUrl}
        visitorCount={visitorCount}
        onOpenProducts={openProducts}
      />
      {legalPage && <LegalPage page={legalPage} onClose={goHome} />}
      {profileOpen && user && (
        <ProfilePanel
          user={user}
          onClose={() => setProfileOpen(false)}
          onSignOut={async () => {
            await supabase?.auth.signOut();
            setProfileOpen(false);
          }}
        />
      )}
      {(authOpen || authRoute) && <AuthModal key={window.location.hash} initialMode={window.location.hash === "#inscription" ? "signup" : "login"} onClose={() => { setAuthOpen(false); window.location.hash = "accueil"; }} />}
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
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  href?: string;
  download?: boolean;
}) {
  return (
    <div className="download-card flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-[#143ca8]">
        <Icon size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {href ? (
        <a
          href={href}
          target={download ? "_self" : "_blank"}
          rel={download ? undefined : "noopener noreferrer"}
          download={download ? "MbokaMarket-v1.0.0.apk" : undefined}
          type={download ? "application/vnd.android.package-archive" : undefined}
          className="btn btn-sm rounded-lg bg-[#143ca8] text-white"
        >
          {download ? "Télécharger" : "Ouvrir"}
        </a>
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
      <img src={image} alt={`Écran MbokaMarket : ${label}`} loading="lazy" decoding="async" className="aspect-[9/16] w-full object-cover object-top" />
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
  return (
    <footer className="border-t border-[#0b1e55] bg-[#102a68] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1fr_1.15fr_1fr] md:gap-12 md:py-12">
        <div>
          <div className="flex items-center gap-3"><img src={appIcon} alt="Logo MbokaMarket" loading="lazy" decoding="async" className="size-11 rounded-xl" /><strong className="font-display text-xl">MbokaMarket</strong></div>
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
        <div><h2 className="font-bold">Nous contacter</h2><form className="mt-4 grid gap-3" action={contactEmail ? `mailto:${contactEmail}` : undefined} method="post" encType="text/plain"><input required name="name" placeholder="Votre nom" className="input w-full border-white/20 bg-white/10 text-white placeholder:text-blue-200" /><input required type="email" name="email" placeholder="Votre email" className="input w-full border-white/20 bg-white/10 text-white placeholder:text-blue-200" /><textarea required name="message" placeholder="Votre message" className="textarea min-h-24 w-full border-white/20 bg-white/10 text-white placeholder:text-blue-200" /><button type="submit" disabled={!contactEmail} className="btn w-full border-0 bg-white text-[#102a68] hover:bg-blue-50 disabled:opacity-50">Envoyer le message</button></form></div>
      </div>
      <div className="border-t border-white/15 px-4 py-5 text-center text-xs text-blue-200">© {new Date().getFullYear()} MbokaMarket. Tous droits réservés.</div>
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
            <strong className="font-display text-lg">MbokaMarket</strong>
          </a>
          <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Retour à l’accueil</button>
        </div>
        <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#143ca8]">MbokaMarket</p>
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
      <section><h2 className="text-xl font-bold text-slate-900">1. Objet du service</h2><p>MbokaMarket est une plateforme qui permet aux utilisateurs de publier, découvrir et contacter des vendeurs pour des produits et services proposés localement.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">2. Utilisation de la plateforme</h2><p>L’utilisateur s’engage à fournir des informations exactes, à respecter les lois applicables et à ne pas publier de contenu frauduleux, illégal, trompeur ou portant atteinte aux droits d’autrui.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">3. Annonces et transactions</h2><p>Les vendeurs sont responsables de leurs annonces, de leurs produits et de leurs échanges avec les acheteurs. MbokaMarket n’est pas partie aux transactions et recommande de vérifier le produit et le vendeur avant tout paiement.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">4. Compte utilisateur</h2><p>L’utilisateur doit protéger ses identifiants et signaler toute utilisation non autorisée de son compte. MbokaMarket peut suspendre une annonce ou un compte en cas de non-respect des présentes conditions.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">5. Contact</h2><p>Pour toute question, écrivez à <a className="font-semibold text-[#143ca8]" href="mailto:contact@mbokamaket.com">contact@mbokamaket.com</a>.</p></section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="mt-8 space-y-6 leading-7 text-slate-600">
      <section><h2 className="text-xl font-bold text-slate-900">1. Données collectées</h2><p>Nous pouvons collecter les informations nécessaires à la création du compte, aux annonces, aux favoris, aux notifications et aux échanges avec les utilisateurs.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">2. Utilisation des données</h2><p>Ces données servent à fournir les fonctionnalités de MbokaMarket, sécuriser les comptes, afficher les annonces et améliorer le service. Nous ne vendons pas les données personnelles des utilisateurs.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">3. Supabase et stockage</h2><p>Les données applicatives sont hébergées via Supabase. Les utilisateurs doivent éviter de partager des informations sensibles dans une annonce ou un message public.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">4. Conservation et droits</h2><p>Nous conservons les données pendant la durée nécessaire au fonctionnement du service. Vous pouvez demander l’accès, la correction ou la suppression de vos données en écrivant à notre adresse de contact.</p></section>
      <section><h2 className="text-xl font-bold text-slate-900">5. Contact</h2><p>Pour toute demande concernant vos données personnelles, écrivez à <a className="font-semibold text-[#143ca8]" href="mailto:contact@mbokamaket.com">contact@mbokamaket.com</a>.</p></section>
    </div>
  );
}

function AuthModal({ initialMode, onClose }: { initialMode: "login" | "signup"; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
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
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const syncMode = () => {
      setMode(window.location.hash === "#inscription" ? "signup" : "login");
      setError("");
    };
    window.addEventListener("hashchange", syncMode);
    return () => window.removeEventListener("hashchange", syncMode);
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
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
    else onClose();
  };
  const signInWithProvider = async (provider: "google" | "facebook") => {
    if (!supabase) {
      setError("La configuration Supabase est absente.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (authError) {
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
          <h2 className="font-display text-2xl font-bold">{mode === "login" ? "Se connecter" : "Créer un compte"}</h2>
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
        <div className="relative mt-3">
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
        </div>
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
        <button disabled={busy} className="btn btn-primary mt-5 w-full">
          {busy ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            mode === "login" ? "Se connecter" : "Créer mon compte"
          )}
        </button>
        <button type="button" onClick={() => { const nextMode = mode === "login" ? "signup" : "login"; setMode(nextMode); setError(""); window.location.hash = nextMode === "login" ? "connexion" : "inscription"; }} className="mt-4 w-full text-sm font-semibold text-[#143ca8]">
          {mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
        </button>
      </form>
    </Modal>
  );
}
function PublishModal({ user, onClose, onCreated }: { user: User; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", price: "", originalPrice: "", stock: "1", currency: "FC", city: "", exactLocation: "", description: "", realEstateType: "", guaranteeMonths: "", category_id: categories[0].id, condition: "", images: "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRealEstate = user.accountType === "agence_immo";
  const requiresStockManagement = user.accountType === "boutique" || user.accountType === "magasin";
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    setSelectedFiles(files.slice(0, 4));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const price = Number(form.price);
    const originalPrice = form.originalPrice ? Number(form.originalPrice) : null;
    const stock = Number(form.stock);
    const legacyImages = form.images.split(",").map((item) => item.trim()).filter(Boolean);
    let uploadedImages: string[] = [];
    if (!form.title.trim() || !form.description.trim()) { setError("Le titre et la description sont obligatoires."); return; }
    if (!Number.isFinite(price) || price <= 0) { setError("Le prix doit être supérieur à zéro."); return; }
    if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice <= price)) { setError("Le prix normal doit être supérieur au prix proposé."); return; }
    if (requiresStockManagement && (!Number.isInteger(stock) || stock < 0)) { setError("Le stock doit être un nombre entier positif."); return; }
    if (!form.city.trim() || (isRealEstate && !form.exactLocation.trim())) { setError("La ville et la localisation sont obligatoires."); return; }
    if (!isRealEstate && !form.condition) { setError("Sélectionnez l’état du produit."); return; }
    if (isRealEstate && !form.realEstateType) { setError("Sélectionnez le type de bien immobilier."); return; }
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
    const images = [...uploadedImages, ...legacyImages].slice(0, 4);
    if (images.length === 0 || images.length > 4 || images.some((image) => !/^https?:\/\//i.test(image))) { setError("Ajoutez entre 1 et 4 images valides (fichiers ou URLs HTTPS)."); return; }
    if (!client) { setError("La configuration Supabase est absente."); return; }
    setBusy(true);
    const { error: insertError } = await client.from("produits").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      price,
      original_price: isRealEstate ? null : originalPrice,
      currency: form.currency,
      images,
      category_id: isRealEstate ? "3" : form.category_id,
      condition: isRealEstate ? "Non applicable" : form.condition,
      stock: requiresStockManagement ? stock : 1,
      location: isRealEstate ? `${form.city.trim()}, ${form.exactLocation.trim()}` : form.city.trim(),
      real_estate_type: isRealEstate ? form.realEstateType : null,
      guarantee_months: isRealEstate && form.guaranteeMonths ? Number(form.guaranteeMonths) : null,
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
        <div className="grid gap-3 sm:grid-cols-3">
          <input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder={isRealEstate ? "Prix de vente" : "Prix réduit"} className="input input-bordered mt-3 w-full" />
          <input type="number" min="0.01" step="0.01" value={form.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} placeholder="Prix normal" className="input input-bordered mt-3 w-full" />
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
            <select value={form.category_id} onChange={(event) => update("category_id", event.target.value)} className="select select-bordered mt-3 w-full">
              <option value={categories[0].id}>Catégorie</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <select value={form.condition} onChange={(event) => update("condition", event.target.value)} className="select select-bordered mt-3 w-full">
              <option value="">État</option>
              <option value="Neuf">Neuf</option>
              <option value="Très bon état">Très bon état</option>
              <option value="Bon état">Bon état</option>
              <option value="Moyen">Moyen</option>
              <option value="À réparer">À réparer</option>
            </select>
          </div>
        )}
        {isRealEstate && (
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.realEstateType} onChange={(event) => update("realEstateType", event.target.value)} className="select select-bordered mt-3 w-full">
              <option value="">Type de bien</option>
              <option value="Appartement">Appartement</option>
              <option value="Maison">Maison</option>
              <option value="Terrain">Terrain</option>
              <option value="Commerce">Commerce</option>
              <option value="Bureau">Bureau</option>
            </select>
            <input value={form.guaranteeMonths} onChange={(event) => update("guaranteeMonths", event.target.value)} type="number" min="0" placeholder="Garantie en mois" className="input input-bordered mt-3 w-full" />
          </div>
        )}
        {isRealEstate && <input required value={form.stock} onChange={(event) => update("stock", event.target.value)} type="number" min="1" placeholder="Nombre de biens" className="input input-bordered mt-3 w-full" />}
        <label className="mt-3 block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Images du produit</span>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} className="file-input file-input-bordered w-full" />
        </label>
        {selectedFiles.length > 0 && <p className="mt-2 text-xs text-slate-500">{selectedFiles.length} fichier(s) sélectionné(s) pour le bucket product-images.</p>}
        <input value={form.images} onChange={(event) => update("images", event.target.value)} placeholder="URLs images séparées par des virgules" className="input input-bordered mt-3 w-full" />
        <p className="mt-2 text-xs text-slate-500">Ajoutez 1 à 4 images. Les fichiers uploadés dans le bucket product-images ou les URLs HTTPS sont acceptés.</p>
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
  onSignOut,
}: {
  user: User;
  onClose: () => void;
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
      <button onClick={onSignOut} className="btn btn-outline mt-5 w-full">
        <LogOut size={16} /> Se déconnecter
      </button>
    </aside>
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

function ProductDetails({ product, isFavorite, onToggleFavorite, onClose, onSellerProducts, onDownload }: { product: Product; isFavorite: boolean; onToggleFavorite: () => void; onClose: () => void; onSellerProducts: () => void; onDownload: () => void }) {
  const whatsappNumber = normalizeWhatsAppNumber(product.phone);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour, je suis intéressé par votre annonce « ${product.title} » sur MbokaMarket.`)}`
    : "";
  return (
      <section className="product-details-page mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm sm:mt-10">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-bold">Détails du produit</h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-0 md:grid-cols-2">
          <div className="aspect-square bg-slate-100">
            {product.image ? <img src={product.image} alt={product.title} decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-400">Pas d’image</div>}
          </div>
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#143ca8]">{product.category}</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="font-display text-2xl font-bold">{product.title}</h3>
              <button
                type="button"
                onClick={onToggleFavorite}
                className="btn btn-circle btn-sm shrink-0 border-slate-200 text-[#143ca8]"
                aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            <PriceDisplay product={product} />
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><MapPin size={16} /> {product.location}</p>
            <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-600">{product.description || "Aucune description fournie par le vendeur."}</p>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0">{product.sellerAvatar ? <img src={product.sellerAvatar} alt={`Profil de ${product.seller}`} loading="lazy" decoding="async" className="size-11 rounded-full object-cover" /> : <span className="grid size-11 place-items-center rounded-full bg-[#edf3ff] text-[#143ca8]"><UserRound size={20} /></span>}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{product.seller}</p>
                    {product.verified && <span className="badge shrink-0 gap-1 border-0 bg-emerald-500 text-white"><ShieldCheck size={13} /> Vérifié</span>}
                  </div>
                  {product.sellerBio && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.sellerBio}</p>}
                  {product.sellerAddress && <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={13} /> {product.sellerAddress}</p>}
                </div>
              </div>
              <button onClick={onSellerProducts} className="btn btn-outline mt-4 w-full">Voir ses produits</button>
              {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn mt-3 w-full bg-[#25D366] text-white">Contacter sur WhatsApp</a> : null}
              <a href="#telechargement" onClick={onDownload} className="btn btn-primary mt-3 w-full bg-[#143ca8]">Télécharger l’application</a>
            </div>
          </div>
        </div>
      </section>
  );
}

export default App;

