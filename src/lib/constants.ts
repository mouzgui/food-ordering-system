// ============================================
// TableFlow — Application Constants
// ============================================

import type { NavItem } from "@/types";
import type { StaffRole } from "@/types/database";

export const APP_NAME = "TableFlow";
export const APP_DESCRIPTION =
  "The operating system for modern restaurants. QR code ordering, real-time order management, and more.";

// Routes
export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",

  // Dashboard
  DASHBOARD: "/overview",
  ORDERS: "/orders",
  KITCHEN: "/kitchen",
  WAITER: "/waiter",
  MENU: "/menu",
  TABLES: "/tables",
  STAFF: "/staff",
  PERFORMANCE: "/performance",
  SETTINGS: "/settings",

  // Customer (dynamic)
  customerMenu: (slug: string, tableToken: string) => `/${slug}/${tableToken}`,
  customerCart: (slug: string, tableToken: string) =>
    `/${slug}/${tableToken}/cart`,
  customerOrder: (slug: string, tableToken: string, orderId: string) =>
    `/${slug}/${tableToken}/order/${orderId}`,
} as const;

const DASHBOARD_NAV_BY_ROLE: Record<StaffRole, NavItem[]> = {
  owner: [
    { title: "nav.overview", href: ROUTES.DASHBOARD, icon: "LayoutDashboard" },
    { title: "nav.orders", href: ROUTES.ORDERS, icon: "ClipboardList" },
    { title: "Kitchen", href: ROUTES.KITCHEN, icon: "ChefHat" },
    { title: "Waiter", href: ROUTES.WAITER, icon: "Serving" },
    { title: "nav.menu", href: ROUTES.MENU, icon: "UtensilsCrossed" },
    { title: "nav.tables", href: ROUTES.TABLES, icon: "QrCode" },
    { title: "nav.staff", href: ROUTES.STAFF, icon: "Users" },
    { title: "Performance", href: ROUTES.PERFORMANCE, icon: "ChartBar" },
    { title: "nav.settings", href: ROUTES.SETTINGS, icon: "Settings" },
  ],
  manager: [
    { title: "nav.overview", href: ROUTES.DASHBOARD, icon: "LayoutDashboard" },
    { title: "nav.orders", href: ROUTES.ORDERS, icon: "ClipboardList" },
    { title: "Kitchen", href: ROUTES.KITCHEN, icon: "ChefHat" },
    { title: "Waiter", href: ROUTES.WAITER, icon: "Serving" },
    { title: "nav.menu", href: ROUTES.MENU, icon: "UtensilsCrossed" },
    { title: "nav.tables", href: ROUTES.TABLES, icon: "QrCode" },
    { title: "nav.staff", href: ROUTES.STAFF, icon: "Users" },
    { title: "Performance", href: ROUTES.PERFORMANCE, icon: "ChartBar" },
    { title: "nav.settings", href: ROUTES.SETTINGS, icon: "Settings" },
  ],
  kitchen_staff: [{ title: "Kitchen", href: ROUTES.KITCHEN, icon: "ChefHat" }],
  waiter: [{ title: "Waiter", href: ROUTES.WAITER, icon: "Serving" }],
};

export function getDashboardNav(role: StaffRole): NavItem[] {
  return DASHBOARD_NAV_BY_ROLE[role];
}

// Supported currencies
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham" },
  { code: "TND", symbol: "TND", name: "Tunisian Dinar" },
  { code: "DZD", symbol: "DZD", name: "Algerian Dinar" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
] as const;

// Default settings
export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_TIMEZONE = "UTC";
