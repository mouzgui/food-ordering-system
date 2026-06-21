"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { KITCHEN_VISIBLE_STATUSES } from "@/types";
import type { OrderStatus, StaffRole } from "@/types/database";
import {
  fetchUserRestaurantId,
  transitionOrderStatus,
} from "../orders/actions";

interface KitchenOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  customer_info: { name?: string } | null;
  tables?: { label: string; number: number };
  order_items?: { item_name: string; quantity: number; item_price: number }[];
}

const STATUS_META: Record<
  OrderStatus,
  { title: string; next?: OrderStatus; action?: string; icon: string }
> = {
  pending: { title: "New Orders", next: "accepted", action: "Accept", icon: "🛎️" },
  confirmed: { title: "Confirmed", icon: "📋" },
  accepted: { title: "Accepted", next: "preparing", action: "Start Preparing", icon: "📥" },
  preparing: { title: "Preparing", next: "ready", action: "Mark Ready", icon: "👨‍🍳" },
  ready: { title: "Ready", icon: "✅" },
  served: { title: "Served", icon: "🍽️" },
  delivered: { title: "Delivered", icon: "🏁" },
  cancelled: { title: "Cancelled", icon: "✕" },
};

function timeAgo(dateStr: string) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadOrders() {
      const membership = await fetchUserRestaurantId();
      if (membership.error || !membership.restaurantId) {
        toast.error(membership.error || "Unable to load kitchen queue");
        setLoading(false);
        return;
      }

      setRestaurantId(membership.restaurantId);
      setRole((membership.role as StaffRole | undefined) || null);

      const { data, error } = (await (supabase.from("orders") as any)
        .select("*, tables(label, number), order_items(item_name, quantity, item_price)")
        .eq("restaurant_id", membership.restaurantId)
        .in("status", KITCHEN_VISIBLE_STATUSES)
        .order("created_at", { ascending: true })) as any;

      if (error) {
        toast.error(error.message);
      } else {
        setOrders(data || []);
      }

      setLoading(false);
    }

    loadOrders();
  }, [supabase]);

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
            return;
          }

          const { data } = (await (supabase.from("orders") as any)
            .select("*, tables(label, number), order_items(item_name, quantity, item_price)")
            .eq("id", payload.eventType === "INSERT" ? payload.new.id : payload.new.id)
            .single()) as any;

          if (!data) return;

          const shouldShow = KITCHEN_VISIBLE_STATUSES.includes(data.status);
          setOrders((prev) => {
            const withoutCurrent = prev.filter((order) => order.id !== data.id);
            if (!shouldShow) {
              return withoutCurrent;
            }
            return [...withoutCurrent, data].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });

          if (payload.eventType === "INSERT") {
            toast.success(`New kitchen order ${data.order_number}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase]);

  const visibleColumns = useMemo(
    () => KITCHEN_VISIBLE_STATUSES.map((status) => ({ status, ...STATUS_META[status] })),
    []
  );

  async function handleTransition(orderId: string, nextStatus: OrderStatus) {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );

    const { error } = await transitionOrderStatus(orderId, nextStatus);
    if (error) {
      toast.error(error);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: currentOrder.status } : order
        )
      );
      return;
    }

    toast.success(`${currentOrder.order_number} moved to ${STATUS_META[nextStatus].title}`);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading kitchen queue...</div>;
  }

  if (role === "waiter") {
    return <div className="flex h-64 items-center justify-center">Kitchen access is not available for waiter accounts.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Queue</h1>
          <p className="mt-1 text-muted-foreground">
            Manage incoming orders from acceptance through ready state.
          </p>
        </div>
        <div className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-400">
          {orders.length} active kitchen orders
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {visibleColumns.map(({ status, title, action, next, icon }) => {
          const columnOrders = orders.filter((order) => order.status === status);

          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5">
                <span>{icon}</span>
                <h2 className="text-sm font-semibold">{title}</h2>
                <Badge variant="secondary" className="ms-auto text-xs font-bold">
                  {columnOrders.length}
                </Badge>
              </div>

              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="space-y-2 pe-2">
                  {columnOrders.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                      No orders
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <Card key={order.id}>
                        <CardHeader className="p-3 pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm">{order.order_number}</CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(order.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {order.tables?.label || "Unknown Table"}
                            </Badge>
                            {order.customer_info?.name && (
                              <span className="text-xs text-muted-foreground">
                                {order.customer_info.name}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 px-3 pb-3">
                          <div className="space-y-1">
                            {order.order_items?.map((item, index) => (
                              <div
                                key={`${order.id}-${index}`}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-muted-foreground">
                                  {item.quantity}x {item.item_name}
                                </span>
                                <span className="font-medium">
                                  ${(item.item_price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between border-t pt-2">
                            <span className="text-xs font-medium">Total</span>
                            <span className="text-sm font-bold text-primary">
                              ${order.total_amount.toFixed(2)}
                            </span>
                          </div>

                          {next && action && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleTransition(order.id, next)}
                            >
                              {action}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
