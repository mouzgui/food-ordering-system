import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem } from "@/types/database";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  tableId: string | null;

  // Actions
  addItem: (menuItem: MenuItem, restaurantId: string, tableId: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      tableId: null,

      addItem: (menuItem, restaurantId, tableId) => {
        const state = get();

        // If switching restaurants/tables, clear the cart
        if (
          state.restaurantId &&
          (state.restaurantId !== restaurantId || state.tableId !== tableId)
        ) {
          set({ items: [], restaurantId, tableId });
        }

        const existingItem = state.items.find(
          (item) => item.menuItem.id === menuItem.id
        );

        if (existingItem) {
          set({
            items: state.items.map((item) =>
              item.menuItem.id === menuItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            restaurantId,
            tableId,
          });
        } else {
          set({
            items: [...state.items, { menuItem, quantity: 1 }],
            restaurantId,
            tableId,
          });
        }
      },

      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => item.menuItem.id !== menuItemId
          ),
        }));
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          ),
        }));
      },

      updateNotes: (menuItemId, notes) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, notes } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], restaurantId: null, tableId: null });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.menuItem.price * item.quantity,
          0
        );
      },
    }),
    {
      name: "tableflow-cart",
    }
  )
);
