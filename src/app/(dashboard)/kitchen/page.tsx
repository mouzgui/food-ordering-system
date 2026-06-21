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

function ElapsedTimer({ startTime, status }: { startTime: string; status: OrderStatus }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === "ready") return; // Stop timer when ready

    const start = new Date(startTime).getTime();
    const updateTimer = () => {
      setElapsed(Math.floor((Date.now() - start) / 60000));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startTime, status]);

  if (status === "ready") {
    return <span className="text-green-500 font-bold">Done</span>;
  }

  const isWarning = elapsed >= 10 && elapsed < 15;
  const isCritical = elapsed >= 15;

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
            // Optional: Play a sound
            // new Audio('/kitchen-bell.mp3').play().catch(() => {});
          }
        }
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

    if (nextStatus === "ready") {
        toast.success(`Order ${currentOrder.order_number} is Ready!`);
    } else {
        toast.success(`Order ${currentOrder.order_number} is now ${nextStatus}`);
    }
  }

  // Column filtering
  const incomingOrders = orders.filter((o) => o.status === "pending" || o.status === "accepted");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading Kitchen Display System...</div>;
  }

  if (role === "waiter") {
    return <div className="flex h-64 items-center justify-center">Kitchen access is restricted.</div>;
  }

  const renderTicket = (order: KitchenOrder, actionName: string, nextStatus: OrderStatus | null, colorClass: string) => (
    <Card key={order.id} className={`glass-panel overflow-hidden border-t-4 ${colorClass}`}>
      <CardHeader className="p-4 pb-2 bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold font-mono">
              {order.order_number}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-sm">
                Table {order.tables?.number || order.tables?.label || "?"}
              </Badge>
              {order.customer_info?.name && (
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
                  {order.customer_info.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
             <ElapsedTimer startTime={order.created_at} status={order.status} />
             {order.status === "pending" && <Badge className="text-[10px] h-4 bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 px-1.5">NEW</Badge>}
             {order.status === "accepted" && <Badge className="text-[10px] h-4 bg-sky-500/20 text-sky-500 hover:bg-sky-500/20 px-1.5">ACCEPTED</Badge>}
          </div>
        </div>
      </CardHeader>
      
      <div className="border-t border-dashed border-white/20 my-0" />
      
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
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
          <div className="p-4 pt-0">
            <Button
              size="lg"
              className={`w-full font-bold text-sm h-12 uppercase tracking-wide hover-lift transition-all shadow-md ${
                nextStatus === 'ready' 
                  ? 'bg-green-600 hover:bg-green-500 text-white' 
                  : nextStatus === 'preparing' 
                  ? 'bg-orange-500 hover:bg-orange-400 text-white'
                  : ''
              }`}
              onClick={() => handleTransition(order.id, nextStatus)}
            >
              {actionName}
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
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Display</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} active tickets
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 border border-orange-500/20">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            Live Queue
          </span>
        </div>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-3 min-h-0">
        {/* INCOMING */}
        <div className="flex flex-col bg-muted/10 rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-sky-500/10 to-transparent border-b border-white/5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-sky-500">📥</span> Incoming
            </h2>
            <Badge variant="secondary" className="font-mono text-sm bg-background/50">
              {incomingOrders.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {incomingOrders.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-white/10">No incoming orders</div>
              ) : (
                incomingOrders.map((order) => renderTicket(order, "Start Preparing", "preparing", "border-t-sky-500"))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PREPARING */}
        <div className="flex flex-col bg-muted/10 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/20 to-transparent border-b border-orange-500/20">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-orange-500">👨‍🍳</span> Now Preparing
            </h2>
            <Badge variant="secondary" className="font-mono text-sm bg-orange-500 text-white border-none">
              {preparingOrders.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {preparingOrders.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-white/10">No active prep</div>
              ) : (
                preparingOrders.map((order) => renderTicket(order, "Mark Ready", "ready", "border-t-orange-500"))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* READY */}
        <div className="flex flex-col bg-muted/10 rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-transparent border-b border-white/5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-green-500">✅</span> Ready for Pickup
            </h2>
            <Badge variant="secondary" className="font-mono text-sm bg-background/50">
              {readyOrders.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {readyOrders.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl border-white/10">No ready orders</div>
              ) : (
                readyOrders.map((order) => renderTicket(order, "", null, "border-t-green-500 opacity-80 transition-opacity hover:opacity-100"))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
