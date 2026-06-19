"use client";

import { useCartStore } from "@/stores/cart-store";
import type { MenuItem } from "@/types/database";

/**
 * Convenience hook wrapping the Zustand cart store.
 * Provides a clean API for components to interact with the cart.
 */
export function useCart(restaurantId: string, tableId: string) {
  const store = useCartStore();

  return {
    items: store.items,
    itemCount: store.getItemCount(),
    subtotal: store.getSubtotal(),

    addItem: (menuItem: MenuItem) =>
      store.addItem(menuItem, restaurantId, tableId),

    removeItem: (menuItemId: string) => store.removeItem(menuItemId),

    updateQuantity: (menuItemId: string, quantity: number) =>
      store.updateQuantity(menuItemId, quantity),

    updateNotes: (menuItemId: string, notes: string) =>
      store.updateNotes(menuItemId, notes),

    clearCart: () => store.clearCart(),
  };
}
