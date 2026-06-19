"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchSettings, updateSettings } from "./actions";

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
  const [settings, setSettings] = useState({
    autoConfirm: false,
    requireName: false,
    showPrices: true,
    enableNotifications: true,
  });

  useEffect(() => {
    async function loadData() {
      const res = await fetchSettings();
      if (res.error || !res.restaurant) {
        toast.error(res.error || "Failed to load settings");
        setIsLoading(false);
        return;
      }
      const r = res.restaurant;
      setRestaurantId(r.id);
      setRestaurant({
        name: r.name || "",
        slug: r.slug || "",
        description: r.description || "",
        address: r.address || "",
        currency: r.currency || "USD",
        timezone: r.timezone || "UTC",
      });
      setSettings({
        autoConfirm: r.settings?.autoConfirm || false,
        requireName: r.settings?.requireName || false,
        showPrices: r.settings?.showPrices ?? true,
        enableNotifications: r.settings?.enableNotifications ?? true,
      });
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function handleSave() {
    if (!restaurantId) return;
    const res = await updateSettings(restaurantId, { ...restaurant, settings });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Settings saved successfully");
    }
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("nav.settings")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your restaurant profile and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Restaurant Details */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Details</CardTitle>
              <CardDescription>
                Public information shown to your customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Restaurant Name</Label>
                  <Input
                    id="settings-name"
                    value={restaurant.name}
                    onChange={(e) =>
                      setRestaurant({ ...restaurant, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-slug">
                    URL Slug
                    <span className="text-xs text-muted-foreground ms-1">
                      (used in QR links)
                    </span>
                  </Label>
                  <Input
                    id="settings-slug"
                    value={restaurant.slug}
                    onChange={(e) =>
                      setRestaurant({ ...restaurant, slug: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-desc">Description</Label>
                <Textarea
                  id="settings-desc"
                  value={restaurant.description}
                  onChange={(e) =>
                    setRestaurant({ ...restaurant, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-address">Address</Label>
                <Input
                  id="settings-address"
                  value={restaurant.address}
                  onChange={(e) =>
                    setRestaurant({ ...restaurant, address: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-currency">Currency</Label>
                  <Input
                    id="settings-currency"
                    value={restaurant.currency}
                    onChange={(e) =>
                      setRestaurant({ ...restaurant, currency: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-timezone">Timezone</Label>
                  <Input
                    id="settings-timezone"
                    value={restaurant.timezone}
                    onChange={(e) =>
                      setRestaurant({ ...restaurant, timezone: e.target.value })
                    }
                  />
                </div>
              </div>
              <Separator />
              <Button onClick={handleSave}>{t("common.save")}</Button>
            </CardContent>
          </Card>

          {/* Order Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Order Preferences</CardTitle>
              <CardDescription>
                Configure how orders are handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-confirm orders</Label>
                  <p className="text-xs text-muted-foreground">
                    Skip the &quot;pending&quot; step and move orders directly to
                    &quot;preparing&quot;
                  </p>
                </div>
                <Switch
                  checked={settings.autoConfirm}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, autoConfirm: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require customer name</Label>
                  <p className="text-xs text-muted-foreground">
                    Ask customers for their name when ordering
                  </p>
                </div>
                <Switch
                  checked={settings.requireName}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, requireName: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show prices on menu</Label>
                  <p className="text-xs text-muted-foreground">
                    Display prices next to each menu item
                  </p>
                </div>
                <Switch
                  checked={settings.showPrices}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, showPrices: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Play a sound when new orders arrive
                  </p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, enableNotifications: v })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Supabase Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Database Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Supabase</span>
                <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-400">
                  Connected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Your restaurant data is securely stored and syncing in real-time.
              </p>
            </CardContent>
          </Card>

          {/* Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Free Plan</span>
                <Badge className="bg-primary/15 text-primary">Active</Badge>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Tables</span>
                  <span>6 / 10</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-primary" />
                </div>
                <div className="flex justify-between">
                  <span>Menu Items</span>
                  <span>17 / 50</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[34%] rounded-full bg-primary" />
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Permanently delete your restaurant and all associated data.
                This action cannot be undone.
              </p>
              <Button variant="destructive" size="sm" className="w-full">
                Delete Restaurant
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
