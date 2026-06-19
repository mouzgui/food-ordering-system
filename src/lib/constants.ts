// ============================================
// TableFlow — Application Constants
// ============================================

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
  MENU: "/menu",
  TABLES: "/tables",
  STAFF: "/staff",
  SETTINGS: "/settings",

  // Customer (dynamic)
  customerMenu: (slug: string, tableToken: string) =>
    `/${slug}/${tableToken}`,
  customerCart: (slug: string, tableToken: string) =>
    `/${slug}/${tableToken}/cart`,
  customerOrder: (slug: string, tableToken: string, orderId: string) =>
    `/${slug}/${tableToken}/order/${orderId}`,
} as const;

// Dashboard navigation items
export const DASHBOARD_NAV = [
  { title: "nav.overview", href: ROUTES.DASHBOARD, icon: "LayoutDashboard" },
  { title: "nav.orders", href: ROUTES.ORDERS, icon: "ClipboardList" },
  { title: "nav.menu", href: ROUTES.MENU, icon: "UtensilsCrossed" },
  { title: "nav.tables", href: ROUTES.TABLES, icon: "QrCode" },
  { title: "nav.staff", href: ROUTES.STAFF, icon: "Users" },
  { title: "nav.settings", href: ROUTES.SETTINGS, icon: "Settings" },
] as const;

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
