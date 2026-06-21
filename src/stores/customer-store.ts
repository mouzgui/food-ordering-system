import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  category_id: string;
  image_url?: string | null;
  extras?: any;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CustomerState {
  // Cart State
  cart: CartItem[];
  restaurantId: string | null;
  tableId: string | null;

  // Order State
  activeOrderId: string | null;
  activeOrderNumber: string | null;
  activeOrderStatus: string;
  orderPlaced: boolean;

  // Customer Preferences
  customerName: string;

  // Actions
  addToCart: (menuItem: MenuItem, restaurantId: string, tableId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  
  setCustomerName: (name: string) => void;
  
  setActiveOrder: (
    orderId: string,
    orderNumber: string,
    initialStatus?: string
  ) => void;
  updateOrderStatus: (status: string) => void;
  clearActiveOrder: () => void;
  
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      cart: [],
      restaurantId: null,
      tableId: null,
      
      activeOrderId: null,
      activeOrderNumber: null,
      activeOrderStatus: "pending",
      orderPlaced: false,

      customerName: "",

      addToCart: (menuItem, restaurantId, tableId) => {
        const state = get();

        // Clear cart if switching restaurants or tables
        if (state.restaurantId && (state.restaurantId !== restaurantId || state.tableId !== tableId)) {
          set({ cart: [], restaurantId, tableId });
        }

        const existingItem = state.cart.find((ci) => ci.item.id === menuItem.id);

        if (existingItem) {
          set({
            cart: state.cart.map((ci) =>
              ci.item.id === menuItem.id ? { ...ci, quantity: ci.quantity + 1 } : ci
            ),
            restaurantId,
            tableId,
          });
        } else {
          set({
            cart: [...state.cart, { item: menuItem, quantity: 1 }],
            restaurantId,
            tableId,
          });
        }
      },

      updateQuantity: (menuItemId, delta) => {
        set((state) => ({
          cart: state.cart
            .map((ci) => (ci.item.id === menuItemId ? { ...ci, quantity: ci.quantity + delta } : ci))
            .filter((ci) => ci.quantity > 0),
        }));
      },

      clearCart: () => {
        set({ cart: [] });
      },

      setCustomerName: (name) => {
        set({ customerName: name });
      },

      setActiveOrder: (orderId, orderNumber, initialStatus = "pending") => {
        set({
          activeOrderId: orderId,
          activeOrderNumber: orderNumber,
          activeOrderStatus: initialStatus,
          orderPlaced: true,
          cart: [], // Clear cart when order is placed
        });
      },

      updateOrderStatus: (status) => {
        set({ activeOrderStatus: status });
      },

      clearActiveOrder: () => {
        set({
          activeOrderId: null,
          activeOrderNumber: null,
          activeOrderStatus: "pending",
          orderPlaced: false,
        });
      },

      getItemCount: () => {
        return get().cart.reduce((total, ci) => total + ci.quantity, 0);
      },

      getSubtotal: () => {
        return get().cart.reduce((total, ci) => total + ci.item.price * ci.quantity, 0);
      },
    }),
    {
      name: "tableflow-customer-storage", // unique name for localStorage key
    }
  )
);
