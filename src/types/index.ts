import type { MenuItem, OrderStatus } from "./database";

// ============================================
// Cart Types
// ============================================

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  restaurantId: string;
  tableId: string;
}

// ============================================
// Order Status Flow
// ============================================

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  preparing: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  ready: "bg-green-500/15 text-green-700 dark:text-green-400",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

// ============================================
// Navigation Types
// ============================================

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ============================================
// Restaurant Settings
// ============================================

export interface RestaurantSettings {
  operatingHours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
  currencyFormat?: {
    symbol: string;
    position: "before" | "after";
    decimals: number;
  };
  orderSettings?: {
    autoConfirm: boolean;
    requireCustomerName: boolean;
    requireCustomerPhone: boolean;
  };
}

// ============================================
// Locale Types
// ============================================

export type Locale = "en" | "fr" | "ar";

export const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "ar"];

export const RTL_LOCALES: Locale[] = ["ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};
