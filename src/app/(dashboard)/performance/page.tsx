"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex h-64 items-center justify-center">
        Loading performance analytics...
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
    },
    {
      title: "Average Prep Time",
      value: formatMinutes(performance.summary.avgPrepMinutes),
      hint: `${performance.summary.preparingOrders} still in kitchen`,
    },
    {
      title: "Average Delivery Time",
      value: formatMinutes(performance.summary.avgDeliveryMinutes),
      hint: `${performance.summary.readyOrders} waiting or en route`,
    },
    {
      title: "Delayed Orders",
      value: performance.summary.delayedOrders,
      hint: "Includes prep and delivery delays",
    },
    {
      title: "Peak Hour",
      value: performance.summary.peakHour,
      hint: `${performance.summary.peakHourOrders} orders in the busiest hour`,
    },
    {
      title: "Active Staff",
      value: performance.summary.activeStaff,
      hint: `${performance.summary.activeWithActivity} with tracked activity`,
    },
  ];

  const leaderboard = [
    {
      title: "Fastest Kitchen",
      entry: performance.leaderboard.fastestKitchen,
      color: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    },
    {
      title: "Fastest Waiter",
      entry: performance.leaderboard.fastestWaiter,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      title: "Top Closer",
      entry: performance.leaderboard.topCloser,
      color: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="mt-1 text-muted-foreground">
            Staff productivity, handoff timing, and peak-hour analytics for the
            last 30 days.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          {performance.restaurantName}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <div className="divide-y">
                {performance.staff.map((member) => (
                  <div
                    key={member.id}
                    className="grid gap-3 px-6 py-4 md:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {member.name}
                        </p>
                        {!member.active && (
                          <Badge variant="outline" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email || member.roleLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.roleLabel}
                      </p>
                    </div>
                    <MetricBlock
                      label="Accepted"
                      value={member.acceptedOrders}
                    />
                    <MetricBlock
                      label="Prepared"
                      value={member.preparedOrders}
                    />
                    <MetricBlock
                      label="Delivered"
                      value={member.completedOrders}
                    />
                    <MetricBlock
                      label="Prep Avg"
                      value={formatMinutes(member.avgPrepMinutes)}
                    />
                    <MetricBlock
                      label="Delivery Avg"
                      value={formatMinutes(member.avgDeliveryMinutes)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboard.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.title}
                  </p>
                  {item.entry ? (
                    <>
                      <p className="mt-2 text-base font-semibold">
                        {item.entry.name}
                      </p>
                      <Badge className={`mt-2 ${item.color}`}>
                        {typeof item.entry.value === "number"
                          ? item.title === "Top Closer"
                            ? `${item.entry.value} ${item.entry.label}`
                            : `${item.entry.value.toFixed(1)} min ${item.entry.label}`
                          : item.entry.label}
                      </Badge>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Not enough tracked data yet.
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Peak Operating Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {performance.hourlyVolume
                .filter((entry) => entry.orders > 0)
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 6)
                .map((entry) => (
                  <div key={entry.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{entry.label}</span>
                      <span className="font-medium">{entry.orders} orders</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            8,
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
                <p className="text-sm text-muted-foreground">
                  No order volume recorded in the selected period.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${performance.summary.todayRevenue.toFixed(2)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Revenue from non-cancelled orders created today.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
