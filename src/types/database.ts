export interface SKU {
  id: number;
  amazon: string | null;
  flipkart: string | null;
  meesho: string | null;
  myntra: string | null;
  stock: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  sku: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export type MarketplaceField = "amazon" | "flipkart" | "meesho" | "myntra";

export const MARKETPLACES: MarketplaceField[] = [
  "amazon",
  "flipkart",
  "meesho",
  "myntra",
];

export const MARKETPLACE_COLORS: Record<MarketplaceField, string> = {
  amazon: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  flipkart: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  meesho: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  myntra: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

export const MARKETPLACE_ICONS: Record<MarketplaceField, string> = {
  amazon: "A",
  flipkart: "F",
  meesho: "M",
  myntra: "My",
};
