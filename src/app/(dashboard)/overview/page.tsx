"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { generateDemoData, fetchOverviewStats } from "./actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  preparing: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  ready: "bg-green-500/15 text-green-700 dark:text-green-400",
  delivered: "bg-muted text-muted-foreground",
};

function timeAgo(dateStr: string) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function OverviewPage() {
  const t = useTranslations();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const res = await fetchOverviewStats();
      if (!res.error) setStatsData(res);
      setIsLoading(false);
    }
    loadStats();
  }, []);

  async function handleGenerateDemoData() {
    setIsGenerating(true);
    const result = await generateDemoData();
    setIsGenerating(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Demo data generated successfully!");
      window.location.reload();
    }
  }

  const stats = [
    {
      title: t("dashboard.activeOrders"),
      value: statsData?.metrics.activeOrders.toString() || "0",
      change: "Live",
      changeType: "up" as const,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
      ),
    },
    {
      title: t("dashboard.todayOrders"),
      value: statsData?.metrics.todayOrders.toString() || "0",
      change: "Total today",
      changeType: "neutral" as const,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V10"/><path d="M12 20V4"/><path d="M18 20v-6"/></svg>
      ),
    },
    {
      title: t("dashboard.revenue"),
      value: `$${(statsData?.metrics.todayRevenue || 0).toFixed(2)}`,
      change: "Today's total",
      changeType: "up" as const,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      ),
    },
    {
      title: t("dashboard.menuItems"),
      value: statsData?.metrics.totalItems.toString() || "0",
      change: `${statsData?.metrics.unavailableItems || 0} unavailable`,
      changeType: "neutral" as const,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
      ),
    },
  ];

  if (isLoading) return <div className="h-64 flex items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("dashboard.welcome")} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s what&apos;s happening at La Belle Cuisine today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              Live
            </span>
          </div>
          <Button 
            size="sm" 
            variant="default" 
            onClick={handleGenerateDemoData} 
            disabled={isGenerating}
            className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {isGenerating ? "Generating..." : "Generate Demo Data"}
          </Button>
          <Link href="/orders">
            <Button size="sm" variant="outline" className="gap-1.5">
              View All Orders
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="text-muted-foreground">{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p
                className={`text-xs mt-1 ${
                  stat.changeType === "up"
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {stat.changeType === "up" && "↑ "}
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Recent Orders */}
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>{t("dashboard.recentOrders")}</CardTitle>
              <p className="text-sm text-muted-foreground">Today's active tables</p>
            </div>
            <Link href="/orders" className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("dashboard.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4 pt-2">
                {statsData?.recentOrdersList.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No orders today yet
                  </div>
                ) : (
                  statsData?.recentOrdersList.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                          {order.orderNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{order.table}</span>
                            <Badge variant="secondary" className={`text-[10px] uppercase ${statusColors[order.status]}`}>
                              {t(`orders.status.${order.status}`)}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {order.items} items • {timeAgo(order.time)}
                          </span>
                        </div>
                      </div>
                      <div className="font-bold text-base">
                        ${order.total.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Popular Items */}
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>{t("dashboard.popularItems")}</CardTitle>
            <p className="text-sm text-muted-foreground">Today's best sellers</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4 pt-2">
                {statsData?.popularItems.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No data
                  </div>
                ) : (
                  statsData?.popularItems.map((item: any, i: number) => (
                    <div key={item.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-none mb-1.5">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-sm font-bold">
                        ${item.revenue.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/menu">
          <Card className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Edit Menu</p>
                <p className="text-xs text-muted-foreground">
                  Add items, update prices
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tables">
          <Card className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2 transition-colors group-hover:bg-chart-2 group-hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Manage Tables</p>
                <p className="text-xs text-muted-foreground">
                  QR codes & seating
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/staff">
          <Card className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-chart-3/10 text-chart-3 transition-colors group-hover:bg-chart-3 group-hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Team Members</p>
                <p className="text-xs text-muted-foreground">
                  Invite & manage staff
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
