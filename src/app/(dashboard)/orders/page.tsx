"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { OrderStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { fetchUserRestaurantId, updateOrderStatus } from "./actions";
import { useEffect } from "react";



interface RealOrder {
  id: string;
  order_number: string;
  table_id: string;
  status: OrderStatus;
  total_amount: number;
  customer_info: any;
  created_at: string;
  tables?: { label: string; number: number };
  order_items?: { item_name: string; quantity: number; item_price: number }[];
}

const COLUMNS: { status: OrderStatus; color: string; bgGradient: string; icon: string }[] = [
  { status: "pending", color: "bg-amber-500", bgGradient: "from-amber-500/10 to-amber-500/5", icon: "📋" },
  { status: "preparing", color: "bg-orange-500", bgGradient: "from-orange-500/10 to-orange-500/5", icon: "👨‍🍳" },
  { status: "ready", color: "bg-green-500", bgGradient: "from-green-500/10 to-green-500/5", icon: "✅" },
  { status: "delivered", color: "bg-muted-foreground", bgGradient: "from-muted/50 to-muted/25", icon: "🍽️" },
];

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: "preparing",
  preparing: "ready",
  ready: "delivered",
};

function timeAgo(dateStr: string) {
  const minutes = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 60000
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function OrdersPage() {
  const t = useTranslations();
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { restaurantId, error } = await fetchUserRestaurantId();
      if (error || !restaurantId) return;
      setRestaurantId(restaurantId);

      // Fetch initial orders with joined tables and order_items
      const query = supabase.from("orders") as any;
      const { data } = await query
        .select(`
          *,
          tables(label, number),
          order_items(item_name, quantity, item_price)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (data) setOrders(data);
    }
    init();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the joined data for the new order
            const query = supabase.from("orders") as any;
            const { data } = await query
              .select("*, tables(label, number), order_items(item_name, quantity, item_price)")
              .eq("id", payload.new.id)
              .single();
            if (data) {
              setOrders((prev) => [data, ...prev]);
              toast.success(`New order received: ${data.order_number}!`);
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const [groupBy, setGroupBy] = useState<"status" | "table">("status");

  async function advanceOrder(orderId: string) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    
    const { error } = await updateOrderStatus(orderId, nextStatus);
    if (error) {
      toast.error("Failed to update status");
      // Revert optimistic update
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: order.status } : o)));
    } else {
      toast.success(`${order.order_number} → ${t(`orders.status.${nextStatus}`)}`);
    }
  }

  async function cancelOrder(orderId: string) {
    // Optimistic update
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
    
    const { error } = await updateOrderStatus(orderId, "cancelled");
    if (error) {
      toast.error("Failed to cancel order");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: order.status } : o)));
    } else {
      toast.success("Order cancelled");
    }
  }

  // Active orders only
  const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  
  // Unique tables with active orders
  const activeTables = Array.from(new Set(activeOrders.map(o => o.tables?.label || "Unknown Table")))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("orders.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {activeOrders.length} active orders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border bg-muted/50 p-1">
            <button
              onClick={() => setGroupBy("status")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${groupBy === "status" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              By Status
            </button>
            <button
              onClick={() => setGroupBy("table")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${groupBy === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              By Table
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-4">
        {groupBy === "status" ? (
          COLUMNS.map(({ status, color, bgGradient, icon }) => {
            const columnOrders = orders.filter((o) => o.status === status);

            return (
              <div key={status} className="space-y-3">
                {/* Column Header */}
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r ${bgGradient}`}>
                  <span className="text-base">{icon}</span>
                  <h2 className="text-sm font-semibold">
                    {t(`orders.status.${status}`)}
                  </h2>
                  <Badge variant="secondary" className="text-xs ms-auto font-bold">
                    {columnOrders.length}
                  </Badge>
                </div>

                {/* Order Cards */}
                <ScrollArea className="h-[calc(100vh-260px)]">
                  <div className="space-y-2 pe-2">
                    {columnOrders.length === 0 ? (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                        {t("orders.noOrders")}
                      </div>
                    ) : (
                      columnOrders.map((order) => (
                        <OrderCard 
                          key={order.id} 
                          order={order} 
                          advanceOrder={advanceOrder} 
                          cancelOrder={cancelOrder} 
                          t={t} 
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })
        ) : (
          activeTables.map((tableLabel) => {
            const tableOrders = activeOrders.filter((o) => (o.tables?.label || "Unknown Table") === tableLabel);

            return (
              <div key={tableLabel} className="space-y-3">
                {/* Column Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                  <span className="text-base">📍</span>
                  <h2 className="text-sm font-semibold truncate">
                    {tableLabel}
                  </h2>
                  <Badge variant="secondary" className="text-xs ms-auto font-bold bg-background">
                    {tableOrders.length}
                  </Badge>
                </div>

                {/* Order Cards */}
                <ScrollArea className="h-[calc(100vh-260px)]">
                  <div className="space-y-2 pe-2">
                    {tableOrders.map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        advanceOrder={advanceOrder} 
                        cancelOrder={cancelOrder} 
                        t={t} 
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Extracted OrderCard component to reuse in both views
function OrderCard({ order, advanceOrder, cancelOrder, t }: any) {
  const statusConfig = COLUMNS.find(c => c.status === order.status);
  
  return (
    <Card className="animate-slide-up hover-lift">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold flex items-center gap-2">
            {order.order_number}
            {order.status !== 'pending' && statusConfig && (
              <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-5 border-${statusConfig.color.replace('bg-', '')}`}>
                {t(`orders.status.${order.status}`)}
              </Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(order.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            📍 {order.tables?.label || "Unknown Table"}
          </Badge>
          {order.customer_info?.name && (
            <span className="text-xs text-muted-foreground">
              {order.customer_info.name}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2">
        <div className="space-y-1">
          {order.order_items?.map((item: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground">
                {item.quantity}× {item.item_name}
              </span>
              <span className="font-medium">
                ${(item.item_price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t flex items-center justify-between">
          <span className="text-xs font-medium">
            {t("orders.total")}
          </span>
          <span className="text-sm font-bold text-primary">
            ${order.total_amount.toFixed(2)}
          </span>
        </div>
      </CardContent>
      {/* Action buttons */}
      {order.status !== "delivered" && order.status !== "cancelled" && (
        <div className="px-3 pb-3 flex gap-2">
          {NEXT_STATUS[order.status] && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => advanceOrder(order.id)}
            >
              → {t(`orders.status.${NEXT_STATUS[order.status]}`)}
            </Button>
          )}
          {order.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => cancelOrder(order.id)}
            >
              ✕
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
