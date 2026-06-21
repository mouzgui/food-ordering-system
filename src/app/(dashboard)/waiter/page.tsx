"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { WAITER_VISIBLE_STATUSES } from "@/types";
import type { OrderStatus, StaffRole } from "@/types/database";
import {
  fetchUserRestaurantId,
  transitionOrderStatus,
} from "../orders/actions";

interface WaiterOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  ready_at?: string | null;
  customer_info: { name?: string } | null;
  tables?: { label: string; number: number };
  order_items?: { item_name: string; quantity: number; item_price: number }[];
}

function ElapsedTimer({ startTime, status }: { startTime: string; status: OrderStatus }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === "delivered") return; // Stop timer when delivered

    const start = new Date(startTime).getTime();
    const updateTimer = () => {
      setElapsed(Math.floor((Date.now() - start) / 60000));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startTime, status]);

  if (status === "delivered") {
    return <span className="text-muted-foreground font-bold font-mono">--</span>;
  }

  const isWarning = elapsed >= 5 && elapsed < 10;
  const isCritical = elapsed >= 10;

  return (
    <span
      className={`font-mono text-sm font-bold ${
        isCritical ? "text-red-500 animate-pulse" : isWarning ? "text-orange-500" : "text-muted-foreground"
      }`}
    >
      {elapsed}m
    </span>
  );
}

export default function WaiterPage() {
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadOrders() {
      const membership = await fetchUserRestaurantId();
      if (membership.error || !membership.restaurantId) {
        toast.error(membership.error || "Unable to load waiter queue");
        setLoading(false);
        return;
      }

      setRestaurantId(membership.restaurantId);
      setRole((membership.role as StaffRole | undefined) || null);

      const { data, error } = (await (supabase.from("orders") as any)
        .select(
          "*, tables(label, number), order_items(item_name, quantity, item_price)",
        )
        .eq("restaurant_id", membership.restaurantId)
        .in("status", WAITER_VISIBLE_STATUSES)
        .order("ready_at", { ascending: true, nullsFirst: false })
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
      .channel("waiter-orders")
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
            setOrders((prev) =>
              prev.filter((order) => order.id !== payload.old.id),
            );
            return;
          }

          const { data } = (await (supabase.from("orders") as any)
            .select(
              "*, tables(label, number), order_items(item_name, quantity, item_price)",
            )
            .eq("id", payload.new.id)
            .single()) as any;

          if (!data) return;

          const shouldShow = WAITER_VISIBLE_STATUSES.includes(data.status);
          setOrders((prev) => {
            const withoutCurrent = prev.filter((order) => order.id !== data.id);
            if (!shouldShow) {
              return withoutCurrent;
            }
            return [...withoutCurrent, data].sort((a, b) => {
              const aTime = a.ready_at
                ? new Date(a.ready_at).getTime()
                : new Date(a.created_at).getTime();
              const bTime = b.ready_at
                ? new Date(b.ready_at).getTime()
                : new Date(b.created_at).getTime();
              return aTime - bTime;
            });
          });

          if (payload.eventType === "UPDATE" && data.status === "ready") {
            toast.success(`Order ${data.order_number} is ready for delivery`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase]);

  async function handleTransition(orderId: string, nextStatus: OrderStatus) {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;

    // Optimistic update
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order,
      ),
    );

    const { error } = await transitionOrderStatus(orderId, nextStatus);
    if (error) {
      toast.error(error);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: currentOrder.status }
            : order,
        ),
      );
      return;
    }

    if (nextStatus === "served") {
      toast.success(`${currentOrder.order_number} served to table!`);
    } else if (nextStatus === "delivered") {
      toast.success(`${currentOrder.order_number} delivery completed!`);
    }
  }

  // Column filtering
  const readyOrders = orders.filter((o) => o.status === "ready");
  const servedOrders = orders.filter((o) => o.status === "served");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        Loading Waiter Display System...
      </div>
    );
  }

  if (role === "kitchen_staff") {
    return (
      <div className="flex h-64 items-center justify-center">
        Waiter access is restricted for kitchen staff.
      </div>
    );
  }

  const renderTicket = (order: WaiterOrder, actionName: string, nextStatus: OrderStatus | null, colorClass: string) => (
    <Card key={order.id} className={`glass-panel overflow-hidden border-t-4 ${colorClass}`}>
      <CardHeader className="p-4 pb-2 bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold font-mono">
              {order.order_number}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-sm px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">
                📍 Table {order.tables?.number || order.tables?.label || "?"}
              </Badge>
              {order.customer_info?.name && (
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
                  👤 {order.customer_info.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
             <ElapsedTimer startTime={order.ready_at || order.created_at} status={order.status} />
          </div>
        </div>
      </CardHeader>
      
      <div className="border-t border-dashed border-white/20 my-0" />
      
      <CardContent className="p-0 flex flex-col">
        <div className="p-4 space-y-3 flex-1">
          {order.order_items?.map((item, index) => (
            <div
              key={`${order.id}-${index}`}
              className="flex items-start gap-3"
            >
              <span className="font-mono font-bold text-lg leading-none mt-0.5 text-primary min-w-[28px]">
                {item.quantity}x
              </span>
              <span className="font-medium text-base leading-tight">
                {item.item_name}
              </span>
            </div>
          ))}
        </div>

        {nextStatus && (
          <div className="p-4 pt-2 mt-auto">
            <Button
              size="lg"
              className={`w-full font-bold text-sm h-14 uppercase tracking-wide hover-lift transition-all shadow-lg ${
                nextStatus === 'served' 
                  ? 'bg-green-600 hover:bg-green-500 text-white' 
                  : nextStatus === 'delivered' 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : ''
              }`}
              onClick={() => handleTransition(order.id, nextStatus)}
            >
              <span className="flex items-center gap-2">
                {nextStatus === 'served' ? '🍽️' : '🏁'} {actionName}
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waiter Dispatch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track ready orders, serve tables, and manage deliveries.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 border border-green-500/20">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            {readyOrders.length} Actions Required
          </span>
        </div>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-3 min-h-0">
        {/* READY TO SERVE */}
        <div className="flex flex-col bg-muted/10 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)] lg:col-span-1">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/20 to-transparent border-b border-green-500/20">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-green-500">🛎️</span> Ready to Serve
            </h2>
            <Badge variant="secondary" className="font-mono text-sm bg-green-500 text-white border-none">
              {readyOrders.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {readyOrders.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-white/10">No orders waiting</div>
              ) : (
                readyOrders.map((order) => renderTicket(order, "Serve to Table", "served", "border-t-green-500"))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* SERVED / EN ROUTE */}
        <div className="flex flex-col bg-muted/10 rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-white/5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-blue-500">🚶</span> En Route / Served
            </h2>
            <Badge variant="secondary" className="font-mono text-sm bg-background/50">
              {servedOrders.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {servedOrders.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-white/10">No active deliveries</div>
              ) : (
                servedOrders.map((order) => renderTicket(order, "Mark Completed", "delivered", "border-t-blue-500 opacity-90"))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* DELIVERED (RECENT) */}
        <div className="flex flex-col bg-muted/10 rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted-foreground/10 to-transparent border-b border-white/5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-muted-foreground">🏁</span> Recently Completed
            </h2>
            <Badge variant="secondary" className="font-mono text-sm bg-background/50">
              {deliveredOrders.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {deliveredOrders.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-white/10">No completed orders today</div>
              ) : (
                deliveredOrders.slice(0, 20).map((order) => renderTicket(order, "", null, "border-t-muted-foreground opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
