"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { fetchCustomerMenu, submitOrder } from "./actions";
import { createClient } from "@/lib/supabase/client";

/* ───── Types ───── */
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  category_id: string;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface MenuData {
  restaurant: { id: string; name: string };
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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>("pending");
  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  /* ───── Play notification sound via Web Audio API ───── */
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
            setOrderStatus(payload.new.status);
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
                colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899"]
              });
              toast.success(msg || "Order Delivered!", { duration: 8000, position: "top-center" });
            } else if (msg) {
              toast.success(`Update: ${msg}`, { duration: 5000, position: "top-center" });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  /* ───── Cart Helpers ───── */
  const itemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotal = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });

    // Visual feedback
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 600);
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((ci) =>
          ci.item.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  }

  async function placeOrder() {
    if (!data || cart.length === 0) return;

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
      subtotal
    );

    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    setOrderPlaced(true);
    setCartOpen(false);
    setOrderNumber(res.orderNumber || null);
    if (res.orderId) setOrderId(res.orderId);
    toast.success(t("customer.orderPlaced"));
  }

  /* ───── Loading State ───── */
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary-foreground animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Loading your menu</p>
          <div className="mt-2 flex gap-1 justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  /* ───── Error State ───── */
  if (error || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 px-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-destructive"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">{error || "Menu not found"}</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  /* ───── Order Confirmation with Realtime Tracker ───── */
  const STATUS_STEPS = ["pending", "preparing", "ready", "delivered"] as const;
  const statusIndex = STATUS_STEPS.indexOf(orderStatus as any);

  if (orderPlaced && orderStatus === "delivered") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500/10 via-background to-background flex flex-col items-center justify-center px-6 text-center animate-fade-in pb-20">
        <div className="relative mb-6">
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <span className="text-5xl">🍽️</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gradient">Enjoy your meal!</h1>
        <p className="mt-3 text-muted-foreground max-w-sm text-sm">
          Thank you for dining with <strong className="text-foreground">{data?.restaurant.name}</strong>. We hope you have a wonderful experience!
        </p>

        {!feedbackGiven ? (
          <Card className="mt-10 w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4 border-b">
              <h3 className="font-semibold text-lg">How was your order?</h3>
              <p className="text-xs text-muted-foreground mt-1">Tap a star to rate</p>
            </div>
            <CardContent className="p-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      setFeedbackRating(star);
                      toast.success("Thank you for your feedback! 💖");
                      setFeedbackGiven(true);
                    }}
                    onMouseEnter={() => setFeedbackRating(star)}
                    className="text-4xl hover:scale-125 transition-transform duration-200 active:scale-90"
                  >
                    {star <= feedbackRating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-10 w-full max-w-sm p-6 rounded-2xl bg-primary/10 text-primary font-medium animate-fade-in">
            💖 Thank you for your feedback!
          </div>
        )}

        <Button
          variant="outline"
          className="mt-12 rounded-xl h-12 px-8"
          onClick={() => {
            setOrderPlaced(false);
            setCart([]);
            setOrderId(null);
            setOrderNumber(null);
            setOrderStatus("pending");
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
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center animate-fade-in">

          {/* Success animation */}
          <div className="relative mb-8">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-green-400/20 to-green-600/20 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold">{t("customer.orderPlaced")}</h1>
          {orderNumber && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
              <span className="text-sm text-muted-foreground">Order</span>
              <span className="text-lg font-bold text-primary">#{orderNumber}</span>
            </div>
          )}
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            {t("customer.orderPlacedDesc")}
          </p>

          {/* Live Order Tracker */}
          <div className="mt-10 w-full max-w-sm">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("customer.orderStatus")}</span>
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                  </div>
                </div>
              </div>
              <CardContent className="p-5 space-y-0">
                {STATUS_STEPS.map((status, i) => {
                  const isCompleted = i < statusIndex;
                  const isCurrent = i === statusIndex;
                  const isPending = i > statusIndex;

                  const statusIcons: Record<string, string> = {
                    pending: "📋",
                    preparing: "👨‍🍳",
                    ready: "✅",
                    delivered: "🍽️",
                  };

                  return (
                    <div key={status}>
                      <div className="flex items-center gap-4 py-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-base transition-all duration-500 ${
                            isCompleted
                              ? "bg-green-500 text-white shadow-md shadow-green-500/25"
                              : isCurrent
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-4 ring-primary/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          ) : (
                            statusIcons[status]
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${isPending ? "text-muted-foreground" : ""}`}>
                            {t(`orders.status.${status}`)}
                          </span>
                          {isCurrent && (
                            <p className="text-xs text-primary mt-0.5 font-medium">In progress...</p>
                          )}
                        </div>
                        {isCurrent && (
                          <div className="flex items-center gap-1 text-xs text-primary font-medium animate-pulse">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Now
                          </div>
                        )}
                        {isCompleted && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
                        )}
                      </div>
                      {/* Connector line */}
                      {i < STATUS_STEPS.length - 1 && (
                        <div className="ml-5 flex">
                          <div className={`w-0.5 h-4 rounded-full transition-colors duration-500 ${
                            i < statusIndex ? "bg-green-500" : "bg-muted"
                          }`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Button
            variant="outline"
            className="mt-8 rounded-xl"
            onClick={() => {
              setOrderPlaced(false);
              setCart([]);
              setOrderId(null);
              setOrderNumber(null);
              setOrderStatus("pending");
            }}
          >
            Order More
          </Button>
        </div>
      </div>
    );
  }

  /* ───── Main Menu UI ───── */
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header with glassmorphism */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-primary/8 blur-2xl" />

        <div className="relative px-5 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{data.restaurant.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome! Order directly from your phone.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium bg-background/80 backdrop-blur-sm border">
              📍 {data.table.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Category Navigation — horizontal scroll pills */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="flex gap-2 overflow-x-auto px-5 py-3 no-scrollbar">
          {data.categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {getCategoryEmoji(cat.name)} {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-8 px-5 pt-6">
        {data.categories.map((category) => {
          const categoryItems = data.items.filter(
            (i) => i.category_id === category.id && i.is_available
          );
          const unavailableItems = data.items.filter(
            (i) => i.category_id === category.id && !i.is_available
          );
          if (categoryItems.length === 0 && unavailableItems.length === 0) return null;

          return (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-16">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{getCategoryEmoji(category.name)}</span>
                <h2 className="text-lg font-semibold">{category.name}</h2>
                <Badge variant="secondary" className="text-xs ml-auto">{categoryItems.length}</Badge>
              </div>
              <div className="space-y-3">
                {categoryItems.map((item) => {
                  const cartItem = cart.find((ci) => ci.item.id === item.id);
                  const justAdded = addedItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border bg-card p-4 transition-all duration-300 ${
                        justAdded ? "ring-2 ring-primary/50 scale-[0.98]" : "hover:shadow-md"
                      } ${cartItem ? "border-primary/30 bg-primary/[0.02]" : ""}`}
                    >
                      <div className="flex gap-4">
                        {/* Food emoji placeholder */}
                        <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-2xl">
                          {getCategoryEmoji(category.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-[15px] leading-tight">
                              {item.name}
                            </h3>
                            <span className="shrink-0 font-bold text-primary text-[15px]">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                          <div className="mt-3">
                            {cartItem ? (
                              <div className="inline-flex items-center rounded-xl bg-primary/10 border border-primary/20">
                                <button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors rounded-l-xl active:scale-90"
                                >
                                  −
                                </button>
                                <span className="px-3 py-1.5 text-sm font-bold text-primary min-w-[2rem] text-center">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors rounded-r-xl active:scale-90"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition-all active:scale-95"
                                onClick={() => addToCart(item)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
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
                  <div key={item.id} className="rounded-2xl border bg-card p-4 opacity-40">
                    <div className="flex gap-4">
                      <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-muted flex items-center justify-center text-2xl grayscale">
                        {getCategoryEmoji(category.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] leading-tight">{item.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        <Badge variant="secondary" className="mt-2 text-xs">Sold Out</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Floating Action Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8">
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger className="w-full h-14 rounded-2xl shadow-2xl shadow-primary/30 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center text-sm font-bold">
                  {itemCount}
                </div>
                <span>{t("customer.viewCart", { count: itemCount })}</span>
              </div>
              <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
              <SheetHeader>
                <SheetTitle className="text-lg">
                  {t("customer.cart")}
                  <Badge variant="secondary" className="ml-2 text-xs">{itemCount} items</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-1 mt-4 overflow-y-auto max-h-[40vh] -mx-2 px-2">
                {cart.map((ci) => (
                  <div key={ci.item.id} className="flex items-center justify-between gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ci.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${ci.item.price.toFixed(2)} × {ci.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center rounded-lg border bg-muted/50">
                        <button
                          onClick={() => updateQuantity(ci.item.id, -1)}
                          className="px-2.5 py-1 text-sm font-medium hover:bg-background transition-colors rounded-l-lg"
                        >
                          −
                        </button>
                        <span className="px-2 py-1 text-sm font-bold min-w-[1.5rem] text-center">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(ci.item.id, 1)}
                          className="px-2.5 py-1 text-sm font-medium hover:bg-background transition-colors rounded-r-lg"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold w-16 text-end">
                        ${(ci.item.price * ci.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Input
                  placeholder={t("customer.yourName")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-xl h-11"
                />
                <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("customer.subtotal")}</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t("customer.total")}</span>
                    <span className="text-xl font-bold text-primary">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-4">
                <Button
                  className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg shadow-primary/25"
                  onClick={placeOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Placing Order...
                    </div>
                  ) : (
                    `${t("customer.placeOrder")} — $${subtotal.toFixed(2)}`
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
