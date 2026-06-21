import type { MenuItem, OrderStatus, StaffRole } from "./database";

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
  "accepted",
  "preparing",
  "ready",
  "served",
  "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  accepted: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  preparing: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  ready: "bg-green-500/15 text-green-700 dark:text-green-400",
  served: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

export const KITCHEN_VISIBLE_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
];

export const WAITER_VISIBLE_STATUSES: OrderStatus[] = [
  "ready",
  "served",
  "delivered",
];

export const MANAGER_VISIBLE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "accepted",
  "preparing",
  "ready",
  "served",
  "delivered",
  "cancelled",
];

export const ROLE_HOME_ROUTE: Record<StaffRole, string> = {
  owner: "/overview",
  manager: "/overview",
  kitchen_staff: "/kitchen",
  waiter: "/waiter",
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
  orderWorkflow?: {
    autoAccept: boolean;
    requireCustomerName: boolean;
    requireCustomerPhone: boolean;
    prepTargetMinutes: number;
    deliveryTargetMinutes: number;
    autoCompleteDelivered: boolean;
  };
  notifications?: {
    dashboardSound: boolean;
    kitchenSound: boolean;
    waiterSound: boolean;
  };
  analytics?: {
    delayedOrderGraceMinutes: number;
  };
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
