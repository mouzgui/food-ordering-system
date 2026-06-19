"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeOrdersOptions {
  /** Filter orders by restaurant ID (for dashboard) */
  restaurantId?: string;
  /** Filter to a specific order ID (for customer tracking) */
  orderId?: string;
  /** Whether to play a sound on new orders */
  enableSound?: boolean;
}

interface UseRealtimeOrdersReturn {
  orders: Order[];
  isConnected: boolean;
  error: string | null;
}

/**
 * Real-time order subscription hook.
 *
 * - Dashboard use: subscribe to all orders for a restaurant
 * - Customer use: subscribe to a single order for status tracking
 *
 * Uses Supabase Postgres Changes (WAL-based) for reliable delivery.
 */
export function useRealtimeOrders({
  restaurantId,
  orderId,
  enableSound = false,
}: UseRealtimeOrdersOptions): UseRealtimeOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playNotificationSound = useCallback(() => {
    if (!enableSound) return;
    try {
      // Use Web Audio API for a simple notification beep
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      gain.gain.value = 0.3;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available — silently skip
    }
  }, [enableSound]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    // Build the subscription filter
    const channelName = orderId
      ? `order-${orderId}`
      : `restaurant-orders-${restaurantId}`;

    const filterConfig: Record<string, string> = {};
    if (restaurantId) {
      filterConfig.filter = `restaurant_id=eq.${restaurantId}`;
    }
    if (orderId) {
      filterConfig.filter = `id=eq.${orderId}`;
    }

    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          ...filterConfig,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);
          playNotificationSound();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          ...filterConfig,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((order) =>
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setError(null);
        } else if (status === "CHANNEL_ERROR") {
          setError("Failed to connect to real-time updates");
          setIsConnected(false);
        }
      });

    // Cleanup on unmount — critical to prevent connection leaks
    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [restaurantId, orderId, playNotificationSound]);

  return { orders, isConnected, error };
}
