"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { RestaurantSettings } from "@/types";
import { getDefaultRestaurantSettings } from "@/lib/restaurant-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchSettings, updateSettings } from "./actions";

const defaultSettings = getDefaultRestaurantSettings();

export default function SettingsPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState({
    name: "",
    slug: "",
    description: "",
    address: "",
    currency: "USD",
    timezone: "UTC",
  });
  const [settings, setSettings] = useState<Required<RestaurantSettings>>(
    defaultSettings
  );

  useEffect(() => {
    async function loadData() {
      const res = await fetchSettings();
      if (res.error || !res.restaurant) {
        toast.error(res.error || "Failed to load settings");
        setIsLoading(false);
        return;
      }

      const restaurantRecord = res.restaurant;
      setRestaurantId(restaurantRecord.id);
      setRestaurant({
        name: restaurantRecord.name || "",
        slug: restaurantRecord.slug || "",
        description: restaurantRecord.description || "",
        address: restaurantRecord.address || "",
        currency: restaurantRecord.currency || "USD",
        timezone: restaurantRecord.timezone || "UTC",
      });
      setSettings(
        (restaurantRecord.settings as Required<RestaurantSettings>) ||
          defaultSettings
      );
      setIsLoading(false);
    }

    loadData();
  }, []);

  function updateWorkflow<K extends keyof Required<RestaurantSettings>["orderWorkflow"]>(
    key: K,
    value: Required<RestaurantSettings>["orderWorkflow"][K]
  ) {
    setSettings((current) => ({
      ...current,
      orderWorkflow: {
        ...current.orderWorkflow,
        [key]: value,
      },
    }));
  }

  function updateNotifications<
    K extends keyof Required<RestaurantSettings>["notifications"],
  >(key: K, value: Required<RestaurantSettings>["notifications"][K]) {
    setSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));
  }

  async function handleSave() {
    if (!restaurantId) return;
    const res = await updateSettings(restaurantId, { ...restaurant, settings });
    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success("Settings saved successfully");
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.settings")}</h1>
        <p className="mt-1 text-muted-foreground">
          Configure restaurant workflow, staffing alerts, and performance targets.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Details</CardTitle>
              <CardDescription>
                Public information shown to guests and used in QR links.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Restaurant Name</Label>
                  <Input
                    id="settings-name"
                    value={restaurant.name}
                    onChange={(event) =>
                      setRestaurant((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-slug">URL Slug</Label>
                  <Input
                    id="settings-slug"
                    value={restaurant.slug}
                    onChange={(event) =>
                      setRestaurant((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-desc">Description</Label>
                <Textarea
                  id="settings-desc"
                  value={restaurant.description}
                  onChange={(event) =>
                    setRestaurant((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-address">Address</Label>
                <Input
                  id="settings-address"
                  value={restaurant.address}
                  onChange={(event) =>
                    setRestaurant((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-currency">Currency</Label>
                  <Input
                    id="settings-currency"
                    value={restaurant.currency}
                    onChange={(event) =>
                      setRestaurant((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-timezone">Timezone</Label>
                  <Input
                    id="settings-timezone"
                    value={restaurant.timezone}
                    onChange={(event) =>
                      setRestaurant((current) => ({
                        ...current,
                        timezone: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Rules</CardTitle>
              <CardDescription>
                Control how orders move from customer placement through delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>Auto-accept customer orders</Label>
                  <p className="text-xs text-muted-foreground">
                    New orders enter the kitchen queue without requiring a manual accept step.
                  </p>
                </div>
                <Switch
                  checked={settings.orderWorkflow.autoAccept}
                  onCheckedChange={(value) =>
                    updateWorkflow("autoAccept", value)
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>Require customer name</Label>
                  <p className="text-xs text-muted-foreground">
                    Enforce guest identification before an order can be submitted.
                  </p>
                </div>
                <Switch
                  checked={settings.orderWorkflow.requireCustomerName}
                  onCheckedChange={(value) =>
                    updateWorkflow("requireCustomerName", value)
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>Require customer phone</Label>
                  <p className="text-xs text-muted-foreground">
                    Capture a phone number for follow-up or delivery coordination.
                  </p>
                </div>
                <Switch
                  checked={settings.orderWorkflow.requireCustomerPhone}
                  onCheckedChange={(value) =>
                    updateWorkflow("requireCustomerPhone", value)
                  }
                />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prep-target">Preparation Target (minutes)</Label>
                  <Input
                    id="prep-target"
                    type="number"
                    min={1}
                    value={settings.orderWorkflow.prepTargetMinutes}
                    onChange={(event) =>
                      updateWorkflow(
                        "prepTargetMinutes",
                        Number(event.target.value) || 1
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-target">Delivery Target (minutes)</Label>
                  <Input
                    id="delivery-target"
                    type="number"
                    min={1}
                    value={settings.orderWorkflow.deliveryTargetMinutes}
                    onChange={(event) =>
                      updateWorkflow(
                        "deliveryTargetMinutes",
                        Number(event.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
                <div className="space-y-0.5">
                  <Label>Auto-complete delivered orders</Label>
                  <p className="text-xs text-muted-foreground">
                    Reserved for follow-up automations after waiter handoff is complete.
                  </p>
                </div>
                <Switch
                  checked={settings.orderWorkflow.autoCompleteDelivered}
                  onCheckedChange={(value) =>
                    updateWorkflow("autoCompleteDelivered", value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alerts and Analytics</CardTitle>
              <CardDescription>
                Tune realtime notifications and delay tolerance for performance reporting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label>Dashboard sound</Label>
                    <Switch
                      checked={settings.notifications.dashboardSound}
                      onCheckedChange={(value) =>
                        updateNotifications("dashboardSound", value)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Play an alert for owner and manager dashboards.
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label>Kitchen sound</Label>
                    <Switch
                      checked={settings.notifications.kitchenSound}
                      onCheckedChange={(value) =>
                        updateNotifications("kitchenSound", value)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Notify kitchen staff as soon as new orders arrive.
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label>Waiter sound</Label>
                    <Switch
                      checked={settings.notifications.waiterSound}
                      onCheckedChange={(value) =>
                        updateNotifications("waiterSound", value)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alert waiters when orders are ready for delivery.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delay-grace">Delay Grace Window (minutes)</Label>
                <Input
                  id="delay-grace"
                  type="number"
                  min={0}
                  value={settings.analytics.delayedOrderGraceMinutes}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      analytics: {
                        ...current.analytics,
                        delayedOrderGraceMinutes:
                          Number(event.target.value) || 0,
                      },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Orders exceeding this grace window count as delayed in staff analytics.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave}>{t("common.save")}</Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operational Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kitchen target</span>
                <Badge variant="secondary">
                  {settings.orderWorkflow.prepTargetMinutes} min
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delivery target</span>
                <Badge variant="secondary">
                  {settings.orderWorkflow.deliveryTargetMinutes} min
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delayed grace</span>
                <Badge variant="secondary">
                  {settings.analytics.delayedOrderGraceMinutes} min
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Realtime Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dashboard</span>
                <Badge
                  variant="secondary"
                  className="bg-green-500/15 text-green-700 dark:text-green-400"
                >
                  {settings.notifications.dashboardSound ? "Alerting" : "Muted"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kitchen</span>
                <Badge
                  variant="secondary"
                  className="bg-orange-500/15 text-orange-700 dark:text-orange-400"
                >
                  {settings.notifications.kitchenSound ? "Alerting" : "Muted"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Waiter</span>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                >
                  {settings.notifications.waiterSound ? "Alerting" : "Muted"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
