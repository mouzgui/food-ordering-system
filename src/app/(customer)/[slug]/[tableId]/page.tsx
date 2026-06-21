"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { fetchCustomerMenu, submitOrder } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { useCustomerStore } from "@/stores/customer-store";

/* ───── Types ───── */
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  category_id: string;
  image_url?: string | null;
  extras?: any;
}

interface Category {
  id: string;
  name: string;
}

interface MenuData {
  restaurant: {
    id: string;
    name: string;
    settings?: {
      orderWorkflow?: {
        requireCustomerName?: boolean;
      };
    };
  };
  table: { id: string; label: string };
  categories: Category[];
  items: MenuItem[];
}

/* ───── Category emoji mapping ───── */
const CATEGORY_EMOJIS: Record<string, string> = {
  starters: "🥗",
  appetizers: "🥟",
  "main courses": "🥩",
  mains: "🍽️",
  desserts: "🍰",
  beverages: "☕",
  drinks: "🍹",
  cocktails: "🍸",
  salads: "🥗",
  soups: "🍲",
  pasta: "🍝",
  pizza: "🍕",
  sushi: "🍣",
  seafood: "🦐",
  breakfast: "🥞",
  "hors d'oeuvres": "🥂",
  "les plats principaux": "🍽️",
  "desserts & fromage": "🧀",
  "wood-fired pizzas": "🪵",
  "artisan starters": "🥖",
  "craft beverages": "🍾",
  "signature brews": "☕",
  "cold refreshments": "🧊",
  "gourmet pastries": "🥐",
};

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🍴";
}

/* ───── Component ───── */
export default function CustomerMenuPage() {
  const t = useTranslations();
  const params = useParams();
  const [data, setData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Global Customer State
  const store = useCustomerStore();
  const cart = store.cart;
  const itemCount = store.getItemCount();
  const subtotal = store.getSubtotal();
  const {
    customerName,
    setCustomerName,
    orderPlaced,
    activeOrderId: orderId,
    activeOrderNumber: orderNumber,
    activeOrderStatus: orderStatus,
    setActiveOrder,
    updateOrderStatus,
    clearActiveOrder,
  } = store;

  // Local UI State
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  
  // Custom Bottom Sheet State for Selected Item
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);

  // Hydration fix for Zustand persist
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Sync item selection with sheet open state
  useEffect(() => {
    if (selectedItem) setIsItemDetailsOpen(true);
  }, [selectedItem]);

  /* ───── Play notification sound via Web Audio API ───── */
  const playNotificationSound = () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880; // A5 note
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  /* ───── Data Loading ───── */
  useEffect(() => {
    async function loadData() {
      let slug = params?.slug as string;
      let tableId = params?.tableId as string;

      if (!slug || !tableId) {
        if (typeof window !== "undefined") {
          const parts = window.location.pathname.split("/").filter(Boolean);
          if (parts.length >= 2) {
            slug = parts[0];
            tableId = parts[1];
          }
        }
      }

      if (!slug || !tableId) {
        setError("Invalid URL parameters");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetchCustomerMenu(slug, tableId);
        if (res.error) {
          setError(res.error);
        } else {
          setData(res as MenuData);
          const menuData = res as MenuData;
          if (menuData.categories.length > 0) {
            setActiveCategory(menuData.categories[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load menu");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [params.slug, params.tableId]);

  /* ───── Realtime Order Tracking ───── */
  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          if (payload.new?.status && payload.new.status !== orderStatus) {
            updateOrderStatus(payload.new.status);
            playNotificationSound();

            const statusMessages: Record<string, string> = {
              preparing: "Your order is being prepared! 👨‍🍳",
              ready: "Your order is ready! 🎉",
              delivered: "Enjoy your meal! 🍽️",
            };
            const msg = statusMessages[payload.new.status];

            if (payload.new.status === "delivered") {
              // Trigger confetti
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"],
              });
              toast.success(msg || "Order Delivered!", {
                duration: 8000,
                position: "top-center",
              });
            } else if (msg) {
              toast.success(`Update: ${msg}`, {
                duration: 5000,
                position: "top-center",
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  /* ───── Cart Helpers ───── */
  function addToCart(item: any) {
    if (!data) return;
    store.addToCart(item, data.restaurant.id, data.table.id);

    // Visual feedback
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 600);
  }

  function updateQuantity(itemId: string, delta: number) {
    store.updateQuantity(itemId, delta);
  }

  async function placeOrder() {
    if (!data || cart.length === 0) return;
    if (
      data.restaurant.settings?.orderWorkflow?.requireCustomerName &&
      !customerName.trim()
    ) {
      toast.error("Customer name is required for this restaurant.");
      return;
    }

    setIsSubmitting(true);

    const cartPayload = cart.map((ci) => ({
      itemId: ci.item.id,
      name: ci.item.name,
      price: ci.item.price,
      quantity: ci.quantity,
    }));

    const res = await submitOrder(
      data.restaurant.id,
      data.table.id,
      customerName || "Guest",
      cartPayload,
      subtotal,
    );

    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    setCartOpen(false);
    setActiveOrder(
      res.orderId,
      res.orderNumber || "",
      res.initialStatus || "pending",
    );
    toast.success(t("customer.orderPlaced"));
  }

  /* ───── Loading State ───── */
  if (!hydrated || isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-[#0a0a0a] text-white">
        <div className="relative">
          <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center animate-pulse backdrop-blur-xl border border-white/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/80"
            >
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white/60 tracking-wider uppercase">
            Loading Menu
          </p>
        </div>
      </div>
    );
  }

  /* ───── Error State ───── */
  if (error || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 px-6 text-center bg-[#0a0a0a] text-white">
        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 backdrop-blur-xl">
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-white/60 max-w-xs">
            {error || "Menu not found"}
          </p>
        </div>
        <Button variant="outline" className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-lg mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  /* ───── Order Confirmation with Realtime Tracker ───── */
  const STATUS_STEPS = [
    "pending",
    "accepted",
    "preparing",
    "ready",
    "served",
    "delivered",
  ] as const;
  const statusIndex = STATUS_STEPS.indexOf(orderStatus as any);

  if (orderPlaced && orderStatus === "delivered") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6 text-center animate-fade-in pb-20 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative mb-8 z-10">
          <div className="h-32 w-32 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(34,197,94,0.3)]">
            <span className="text-6xl">🍽️</span>
          </div>
        </div>

        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 z-10">
          Enjoy your meal!
        </h1>
        <p className="mt-4 text-white/60 max-w-sm text-sm z-10 leading-relaxed">
          Thank you for dining with <strong className="text-white">{data?.restaurant.name}</strong>.
          We hope you have a wonderful experience!
        </p>

        {!feedbackGiven ? (
          <div className="mt-12 w-full max-w-sm overflow-hidden animate-slide-up rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl z-10">
            <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02]">
              <h3 className="font-semibold text-lg">How was your order?</h3>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">Tap a star to rate</p>
            </div>
            <div className="p-8">
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      setFeedbackRating(star);
                      toast.success("Thank you for your feedback! 💖");
                      setFeedbackGiven(true);
                    }}
                    onMouseEnter={() => setFeedbackRating(star)}
                    className="text-4xl hover:scale-125 transition-transform duration-300 active:scale-90 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]"
                  >
                    {star <= feedbackRating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-12 w-full max-w-sm p-6 rounded-3xl bg-pink-500/10 border border-pink-500/20 backdrop-blur-xl text-pink-400 font-medium animate-fade-in z-10 shadow-[0_0_30px_rgba(236,72,153,0.15)]">
            💖 Thank you for your feedback!
          </div>
        )}

        <Button
          variant="outline"
          className="mt-12 rounded-full h-14 px-10 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-xl z-10 text-base"
          onClick={() => {
            clearActiveOrder();
            setFeedbackGiven(false);
            setFeedbackRating(0);
          }}
        >
          View Menu Again
        </Button>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center animate-fade-in relative z-10">
          <div className="relative mb-10">
            <div className="h-32 w-32 rounded-full bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-2xl">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{t("customer.orderPlaced")}</h1>
          {orderNumber && (
            <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl px-5 py-2 shadow-lg">
              <span className="text-xs uppercase tracking-widest text-white/50">Order No</span>
              <span className="text-xl font-bold text-blue-400">#{orderNumber}</span>
            </div>
          )}

          {/* Liquid Glass Order Tracker */}
          <div className="mt-12 w-full max-w-sm rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="bg-white/[0.02] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide">ORDER STATUS</span>
              <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live
              </div>
            </div>
            <div className="p-6 space-y-0 text-left">
              {STATUS_STEPS.map((status, i) => {
                const isCompleted = i < statusIndex;
                const isCurrent = i === statusIndex;
                const isPending = i > statusIndex;

                const statusIcons: Record<string, string> = {
                  pending: "📋",
                  accepted: "📥",
                  preparing: "👨‍🍳",
                  ready: "✅",
                  served: "🍽️",
                  delivered: "🍽️",
                };

                return (
                  <div key={status}>
                    <div className="flex items-center gap-5 py-3">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-700 ${
                          isCompleted
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : isCurrent
                              ? "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110 z-10"
                              : "bg-white/5 text-white/30 border border-white/5"
                        }`}
                      >
                        {isCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        ) : (
                          statusIcons[status]
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-semibold tracking-wide uppercase ${isPending ? "text-white/30" : "text-white"}`}>
                          {t(`orders.status.${status}`)}
                        </span>
                        {isCurrent && (
                          <p className="text-xs text-blue-400 mt-1 font-medium tracking-wide">
                            In progress...
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Connector line */}
                    {i < STATUS_STEPS.length - 1 && (
                      <div className="ml-6 flex">
                        <div
                          className={`w-0.5 h-6 rounded-full transition-colors duration-700 ${
                            i < statusIndex ? "bg-green-500/50" : "bg-white/5"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-10 rounded-full h-14 px-10 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-xl"
            onClick={() => {
              clearActiveOrder();
            }}
          >
            Order More Items
          </Button>
        </div>
      </div>
    );
  }

  /* ───── Main Menu UI - Liquid Glass Aesthetic ───── */
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 pb-32 selection:bg-blue-500/30 relative">
      
      {/* Liquid Background Meshes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] -left-[20%] w-[80vw] h-[80vw] rounded-full bg-purple-600/10 blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute -bottom-[20%] right-[10%] w-[60vw] h-[60vw] rounded-full bg-emerald-600/10 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="relative z-10">
        {/* Header with glassmorphism */}
        <div className="pt-12 pb-6 px-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
                {data.restaurant.name}
              </h1>
              <p className="text-sm font-medium text-zinc-400/80 tracking-wide">
                Experience the exceptional.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 flex items-center gap-2 shadow-2xl">
              <span className="text-lg">📍</span>
              <span className="text-sm font-bold tracking-wider">{data.table.label}</span>
            </div>
          </div>
          
          {/* Liquid Search Bar */}
          <div className="mt-8 relative group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-blue-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search our culinary offerings..."
              className="w-full pl-12 h-14 rounded-full bg-white/5 border-white/10 backdrop-blur-2xl text-base placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:bg-white/10 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            />
          </div>
        </div>

        {/* Category Navigation — Floating Glass Pills */}
        {!searchQuery && (
          <div className="sticky top-0 z-40 py-4 -mt-2 backdrop-blur-3xl bg-black/20 border-b border-white/5">
            <div className="flex gap-3 overflow-x-auto px-6 no-scrollbar snap-x">
              {data.categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      document
                        .getElementById(`cat-${cat.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`shrink-0 snap-start rounded-full px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-300 active:scale-95 border ${
                      isActive
                        ? "bg-white text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="mr-2 text-base">{getCategoryEmoji(cat.name)}</span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Menu Items - Liquid Glass Cards */}
        <div className="space-y-12 px-6 pt-8">
          {data.categories.map((category) => {
            let categoryItems = data.items.filter(
              (i) => i.category_id === category.id && i.is_available,
            );
            let unavailableItems = data.items.filter(
              (i) => i.category_id === category.id && !i.is_available,
            );

            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              const filterItem = (i: MenuItem) =>
                i.name.toLowerCase().includes(query) ||
                (i.description && i.description.toLowerCase().includes(query)) ||
                (i.extras?.ingredients && i.extras.ingredients.toLowerCase().includes(query));

              categoryItems = categoryItems.filter(filterItem);
              unavailableItems = unavailableItems.filter(filterItem);
            }

            if (categoryItems.length === 0 && unavailableItems.length === 0)
              return null;

            return (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                className="scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl drop-shadow-lg">
                    {getCategoryEmoji(category.name)}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-100">{category.name}</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {categoryItems.map((item) => {
                    const cartItem = cart.find((ci) => ci.item.id === item.id);
                    const justAdded = addedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`relative group rounded-[2rem] border transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-xl ${
                          justAdded
                            ? "border-blue-500/50 bg-blue-500/10 scale-[0.98] shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                            : cartItem
                            ? "border-white/20 bg-white/10 shadow-lg"
                            : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10"
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        {/* Inner subtle gradient top-light */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="p-4 flex gap-5 relative z-10">
                          {item.image_url ? (
                            <div className="h-[100px] w-[100px] shrink-0 rounded-[1.25rem] overflow-hidden shadow-2xl relative">
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                sizes="100px"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            </div>
                          ) : (
                            <div className="h-[100px] w-[100px] shrink-0 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                              {getCategoryEmoji(category.name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="font-bold text-lg leading-tight text-zinc-100 tracking-tight">
                              {item.name}
                            </h3>
                            <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed font-medium">
                              {item.description}
                            </p>
                            
                            <div className="mt-3 flex items-center justify-between">
                              <span className="font-bold text-base text-zinc-200">
                                ${item.price.toFixed(2)}
                              </span>
                              
                              {cartItem ? (
                                <div
                                  className="inline-flex items-center rounded-full bg-white text-black font-bold h-8 overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-zinc-200 transition-colors active:bg-zinc-300"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-sm">{cartItem.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-zinc-200 transition-colors active:bg-zinc-300"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="h-8 px-4 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10 hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(item);
                                  }}
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unavailable items */}
                  {unavailableItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-4 opacity-40 backdrop-blur-md"
                    >
                      <div className="flex gap-5">
                        <div className="h-[100px] w-[100px] shrink-0 rounded-[1.25rem] bg-white/5 flex items-center justify-center text-3xl grayscale">
                          {getCategoryEmoji(category.name)}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-bold text-lg leading-tight text-zinc-100">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                            {item.description}
                          </p>
                          <div className="mt-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 border border-zinc-700 rounded-full px-3 py-1">
                              Sold Out
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Floating Liquid Glass Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-6 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pointer-events-none">
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger render={
              <button className="pointer-events-auto w-full h-16 rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-white flex items-center justify-between px-6 hover:bg-white/20 transition-all active:scale-[0.98] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center text-base font-black shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    {itemCount}
                  </div>
                  <span className="font-bold text-lg tracking-wide uppercase">View Order</span>
                </div>
                <span className="font-black text-xl tracking-tight relative z-10">${subtotal.toFixed(2)}</span>
              </button>
            } />
            <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-[#121214]/95 backdrop-blur-3xl border-t border-white/10 max-h-[90vh] text-white p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <SheetHeader className="pb-4 border-b border-white/5">
                <SheetTitle className="text-2xl font-bold text-white text-left tracking-tight">
                  Your Order
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-2 mt-6 overflow-y-auto max-h-[45vh] pr-2 custom-scrollbar">
                {cart.map((ci) => (
                  <div
                    key={ci.item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-zinc-100 truncate">
                        {ci.item.name}
                      </p>
                      <p className="text-sm font-medium text-zinc-400 mt-0.5">
                        ${ci.item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="inline-flex items-center rounded-full bg-white/10 border border-white/10 h-9">
                        <button
                          onClick={() => updateQuantity(ci.item.id, -1)}
                          className="w-9 h-full flex items-center justify-center font-medium hover:bg-white/20 transition-colors rounded-l-full"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(ci.item.id, 1)}
                          className="w-9 h-full flex items-center justify-center font-medium hover:bg-white/20 transition-colors rounded-r-full"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-base font-bold w-16 text-right">
                        ${(ci.item.price * ci.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                <Input
                  placeholder={
                    data.restaurant.settings?.orderWorkflow?.requireCustomerName
                      ? `Your Name (Required)`
                      : "Your Name (Optional)"
                  }
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-2xl h-14 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-base focus-visible:ring-1 focus-visible:ring-white/30"
                />
                
                <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-zinc-400">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100 uppercase tracking-wider text-sm">Total</span>
                    <span className="text-2xl font-black text-white">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6">
                <Button
                  className="w-full h-16 text-lg font-bold rounded-[2rem] bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  onClick={placeOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Sending to Kitchen...
                    </div>
                  ) : (
                    "Place Order"
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Item Details Bottom Sheet Modal - Next Level UI */}
      <Sheet open={isItemDetailsOpen} onOpenChange={(open) => {
        setIsItemDetailsOpen(open);
        if (!open) setTimeout(() => setSelectedItem(null), 300); // Wait for close animation
      }}>
        <SheetContent side="bottom" className="p-0 border-t border-white/10 rounded-t-[2.5rem] bg-[#0a0a0a] text-white max-h-[92vh] flex flex-col shadow-[0_-30px_60px_rgba(0,0,0,0.8)] overflow-hidden">
          {selectedItem && (
            <>
              <div className="relative h-[45vh] w-full shrink-0 bg-black">
                {selectedItem.image_url ? (
                  <>
                    <Image
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center">
                    <span className="text-8xl drop-shadow-2xl">
                      {getCategoryEmoji(
                        data.categories.find((c) => c.id === selectedItem.category_id)?.name || "",
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                  </div>
                )}
                
                {/* Close Handle */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-white/30 backdrop-blur-md" />
              </div>

              <div className="px-6 py-2 flex-1 overflow-y-auto relative -mt-12 z-10 pb-32">
                <div className="flex justify-between items-end gap-4 mb-2">
                  <h2 className="text-3xl font-extrabold tracking-tight leading-none text-white drop-shadow-lg">
                    {selectedItem.name}
                  </h2>
                  <span className="text-2xl font-black text-white drop-shadow-lg shrink-0">
                    ${selectedItem.price.toFixed(2)}
                  </span>
                </div>

                <p className="mt-4 text-base text-zinc-300 leading-relaxed font-medium">
                  {selectedItem.description}
                </p>

                {selectedItem.extras?.ingredients && (
                  <div className="mt-8 rounded-3xl bg-white/[0.03] border border-white/5 p-5 backdrop-blur-xl">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                      Prepared With
                    </h4>
                    <p className="text-sm font-medium text-zinc-300 leading-relaxed">
                      {selectedItem.extras.ingredients}
                    </p>
                  </div>
                )}
              </div>

              {/* Fixed Bottom Action Area */}
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent pt-12 pb-8">
                {cart.find((ci) => ci.item.id === selectedItem.id) ? (
                  <div className="flex items-center justify-between rounded-[2rem] bg-white/[0.05] border border-white/10 p-2 backdrop-blur-2xl">
                    <button
                      onClick={() => updateQuantity(selectedItem.id, -1)}
                      className="h-14 w-20 flex items-center justify-center text-3xl font-light text-white hover:bg-white/10 transition-colors rounded-[1.5rem] active:scale-95"
                    >
                      −
                    </button>
                    <span className="flex-1 text-2xl font-black text-white text-center">
                      {cart.find((ci) => ci.item.id === selectedItem.id)?.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(selectedItem.id, 1)}
                      className="h-14 w-20 flex items-center justify-center text-3xl font-light text-white hover:bg-white/10 transition-colors rounded-[1.5rem] active:scale-95"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <Button
                    className="w-full h-16 rounded-[2rem] text-lg font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                    onClick={() => {
                      addToCart(selectedItem);
                      setIsItemDetailsOpen(false);
                    }}
                  >
                    Add to Order — ${selectedItem.price.toFixed(2)}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      
    </div>
  );
}
