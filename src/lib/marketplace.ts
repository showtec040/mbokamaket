import { CarFront, Gamepad2, Headphones, Home, Laptop, Smartphone, Trophy, Tv } from "lucide-react";
import type { Category, Notice, Product, ProductRow } from "../types/marketplace";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const DEFAULT_APK_URL = "https://www.dropbox.com/scl/fi/5zdwh2zrttr476fkc50it/MbokaMarket-v1.0.0.apk.apk?rlkey=6t6ead4jxe465hfcy87plwx9s&st=hds9drrx&dl=1";

export const categories: Category[] = [
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
export const categoryRouteIds: Record<string, string> = { "/immobilier": "3", "/vehicules": "4" };

export const isSentMessageNotification = (notice: Pick<Notice, "title" | "message">) => {
  const text = `${notice.title ?? ""} ${notice.message ?? ""}`.toLowerCase();
  return ["message envoyé", "message envoye", "message sent", "message envoyé à", "message envoye a", "votre message", "envoyer un message", "sent you a message", "you sent", "sent to"].some((pattern) => text.includes(pattern));
};

export const normalizeDisplayName = (value?: string | null) => {
  const cleaned = String(value || "").trim();
  return !cleaned || /^anonyme$/i.test(cleaned) ? "" : cleaned;
};

export const normalizeWhatsAppNumber = (value?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  return !digits ? "" : digits.startsWith("243") ? digits : `243${digits.replace(/^0/, "")}`;
};

export const getProfileDisplayName = (profile?: { name?: string | null; full_name?: string | null; username?: string | null; business_name?: string | null } | null) => normalizeDisplayName(profile?.name) || normalizeDisplayName(profile?.full_name) || normalizeDisplayName(profile?.business_name) || normalizeDisplayName(profile?.username);

const imageFrom = (images: unknown) => {
  if (Array.isArray(images)) return String(images[0] || "");
  if (typeof images !== "string") return "";
  try { const parsed = JSON.parse(images); return Array.isArray(parsed) ? String(parsed[0] || "") : images; } catch { return images; }
};

export const mapProduct = (row: ProductRow): Product => ({
  id: String(row.id), title: row.title || "Annonce sans titre", location: row.location || "RDC", price: Number(row.price || 0), originalPrice: row.original_price == null ? null : Number(row.original_price), currency: row.currency === "USD" ? "$" : row.currency === "FRC" ? "FC" : row.currency || "FC", categoryId: String(row.category_id || ""), category: row.category_name || row.category || categoryName.get(String(row.category_id)) || "Autre", image: imageFrom(row.images), seller: normalizeDisplayName(row.seller_name) || "Vendeur Mbokamaket", sellerId: String(row.seller_profile_id || row.seller_id || row.profile_id || row.user_id || ""), sellerAvatar: row.seller_avatar_url || "", sellerUsername: "", sellerBio: "", sellerAddress: "", verified: Boolean(row.is_verified), status: row.status || "active", featured: Boolean(row.is_featured), promoted: Boolean(row.is_promoted), description: row.description || "", phone: "",
});
