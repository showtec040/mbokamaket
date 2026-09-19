import type { ComponentType } from "react";

export type Icon = ComponentType<{ size?: number; className?: string }>;

export type Category = {
  id: string;
  label: string;
  icon: Icon;
};

export type Product = {
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

export type User = {
  id: string;
  email?: string;
  fullName?: string;
  username?: string;
  role?: string;
  accountType?: string;
  isVerified: boolean;
};

export type Notice = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type ProductRow = {
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
