"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PerformanceStats } from "./actions";
import { fetchPerformanceStats } from "./actions";

function formatMinutes(value: number) {
  if (!value) return "--";
  return `${value.toFixed(1)} min`;
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceStats | { error: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      const response = await fetchPerformanceStats();
      setData(response);
      setLoading(false);
    }

    loadPerformance();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Gathering Analytics...</p>
        </div>
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        {data?.error || "Unable to load performance analytics."}
      </div>
    );
  }

  const performance = data;

  const summaryCards = [
    {
      title: "Completed Orders",
      value: performance.summary.completedOrders,
      hint: `${performance.summary.activeOrders} currently in progress`,
      icon: "📈",
      color: "from-blue-500/20 to-blue-500/5",
      border: "border-blue-500/20"
    },
    {
      title: "Average Prep Time",
      value: formatMinutes(performance.summary.avgPrepMinutes),
      hint: `${performance.summary.preparingOrders} still in kitchen`,
      icon: "👨‍🍳",
      color: "from-orange-500/20 to-orange-500/5",
      border: "border-orange-500/20"
    },
    {
      title: "Average Delivery",
      value: formatMinutes(performance.summary.avgDeliveryMinutes),
      hint: `${performance.summary.readyOrders} waiting or en route`,
      icon: "🏃‍♂️",
      color: "from-green-500/20 to-green-500/5",
      border: "border-green-500/20"
    },
    {
      title: "Delayed Orders",
      value: performance.summary.delayedOrders,
      hint: "Includes prep and delivery delays",
      icon: "⏳",
      color: "from-red-500/20 to-red-500/5",
      border: "border-red-500/20"
    },
  ];

  const leaderboard = [
    {
      title: "Fastest Kitchen",
      entry: performance.leaderboard.fastestKitchen,
      color: "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-600 dark:text-orange-400",
      badge: "🥇",
    },
    {
      title: "Fastest Waiter",
      entry: performance.leaderboard.fastestWaiter,
      color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      badge: "🥇",
    },
    {
      title: "Top Closer",
      entry: performance.leaderboard.topCloser,
      color: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-600 dark:text-sky-400",
      badge: "🏆",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Performance</h1>
            <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-primary/20 text-primary">Live</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Staff productivity, handoff timing, and peak-hour analytics for the last 30 days.
          </p>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-sm font-medium text-muted-foreground mb-1">Today's Revenue</p>
          <div className="text-4xl font-black text-primary drop-shadow-sm">
            ${performance.summary.todayRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`glass-panel border ${card.border} hover-lift overflow-hidden relative group`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-50 transition-opacity group-hover:opacity-100`} />
            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center h-full">
              <span className="text-4xl mb-3">{card.icon}</span>
              <div className="text-3xl font-black tracking-tight mb-1">{card.value}</div>
              <p className="text-sm font-semibold text-foreground/80">{card.title}</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground/80">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Staff Matrix */}
        <Card className="glass-panel border-white/10 shadow-xl flex flex-col">
          <CardHeader className="bg-muted/10 border-b border-white/5 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <span>👥</span> Staff Matrix
            </CardTitle>
            <CardDescription>Detailed individual performance metrics and speed analysis</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-white/5">
                {performance.staff.map((member) => {
                  // Calculate percentage for visual bars (max 30 mins)
                  const prepPct = Math.min(100, (member.avgPrepMinutes / 30) * 100);
                  const deliveryPct = Math.min(100, (member.avgDeliveryMinutes / 15) * 100);
                  
                  return (
                    <div
                      key={member.id}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[200px_repeat(3,minmax(0,1fr))] items-center hover:bg-muted/5 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 border border-primary/20">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold">
                              {member.name}
                            </p>
                            {!member.active && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">
                            {member.roleLabel}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Orders</span>
                          <span>{member.completedOrders}</span>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, Math.ceil(member.completedOrders / 10)) }).map((_, i) => (
                            <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Avg Prep</span>
                          <span>{formatMinutes(member.avgPrepMinutes)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${prepPct > 50 ? 'bg-orange-500' : 'bg-green-500'}`} 
                            style={{ width: `${prepPct}%` }} 
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Avg Delivery</span>
                          <span>{formatMinutes(member.avgDeliveryMinutes)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${deliveryPct > 50 ? 'bg-orange-500' : 'bg-blue-500'}`} 
                            style={{ width: `${deliveryPct}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {performance.staff.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">No staff data available.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6 flex flex-col">
          {/* Leaderboard */}
          <Card className="glass-panel border-white/10 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <span>🌟</span> Hall of Fame
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaderboard.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border bg-gradient-to-br ${item.color} p-4 relative overflow-hidden group hover-lift`}
                >
                  <div className="absolute -right-4 -top-4 text-6xl opacity-20 group-hover:scale-110 transition-transform">
                    {item.badge}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {item.title}
                  </p>
                  {item.entry ? (
                    <div className="mt-3 relative z-10">
                      <p className="text-xl font-black tracking-tight">
                        {item.entry.name}
                      </p>
                      <Badge variant="outline" className="mt-2 bg-background/50 font-semibold border-current/20 backdrop-blur-sm">
                        {typeof item.entry.value === "number"
                          ? item.title === "Top Closer"
                            ? `${item.entry.value} ${item.entry.label}`
                            : `${item.entry.value.toFixed(1)} min ${item.entry.label}`
                          : item.entry.label}
                      </Badge>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm font-medium opacity-60">
                      No data yet
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card className="glass-panel border-white/10 shadow-lg flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <span>🔥</span> Heatmap
              </CardTitle>
              <CardDescription>Busiest hours today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {performance.hourlyVolume
                .filter((entry) => entry.orders > 0)
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 5)
                .map((entry, index) => (
                  <div key={entry.label} className="space-y-1.5 relative">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-muted-foreground">{entry.label}</span>
                      <span className="font-black">{entry.orders} <span className="text-xs font-medium text-muted-foreground">orders</span></span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-primary' : 'bg-primary/50'}`}
                        style={{
                          width: `${Math.max(
                            5,
                            (entry.orders /
                              Math.max(performance.summary.peakHourOrders, 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              {performance.hourlyVolume.every(
                (entry) => entry.orders === 0,
              ) && (
                <div className="flex h-32 items-center justify-center border border-dashed rounded-xl border-white/10 text-muted-foreground">
                  No order volume recorded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
