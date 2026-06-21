import type { RestaurantSettings } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function getDefaultRestaurantSettings(): Required<RestaurantSettings> {
  return {
    orderWorkflow: {
      autoAccept: false,
      requireCustomerName: false,
      requireCustomerPhone: false,
      prepTargetMinutes: 20,
      deliveryTargetMinutes: 10,
      autoCompleteDelivered: false,
    },
    notifications: {
      dashboardSound: true,
      kitchenSound: true,
      waiterSound: true,
    },
    analytics: {
      delayedOrderGraceMinutes: 5,
    },
    operatingHours: {},
    theme: {
      primaryColor: "#16a34a",
      accentColor: "#0f172a",
    },
    currencyFormat: {
      symbol: "$",
      position: "before",
      decimals: 2,
    },
    orderSettings: {
      autoConfirm: false,
      requireCustomerName: false,
      requireCustomerPhone: false,
    },
  };
}

export function normalizeRestaurantSettings(
  value: unknown
): Required<RestaurantSettings> {
  const defaults = getDefaultRestaurantSettings();
  const settings = isRecord(value) ? value : {};
  const workflow = isRecord(settings.orderWorkflow) ? settings.orderWorkflow : {};
  const notifications = isRecord(settings.notifications)
    ? settings.notifications
    : {};
  const analytics = isRecord(settings.analytics) ? settings.analytics : {};
  const operatingHours = isRecord(settings.operatingHours)
    ? (settings.operatingHours as Required<RestaurantSettings>["operatingHours"])
    : {};
  const theme = isRecord(settings.theme) ? settings.theme : {};
  const currencyFormat = isRecord(settings.currencyFormat)
    ? settings.currencyFormat
    : {};
  const legacyOrderSettings = isRecord(settings.orderSettings)
    ? settings.orderSettings
    : {};

  const autoAccept = asBoolean(
    workflow.autoAccept ?? legacyOrderSettings.autoConfirm,
    defaults.orderWorkflow.autoAccept
  );
  const requireCustomerName = asBoolean(
    workflow.requireCustomerName ??
      legacyOrderSettings.requireCustomerName ??
      settings.requireCustomerName ??
      settings.requireName,
    defaults.orderWorkflow.requireCustomerName
  );
  const requireCustomerPhone = asBoolean(
    workflow.requireCustomerPhone ?? legacyOrderSettings.requireCustomerPhone,
    defaults.orderWorkflow.requireCustomerPhone
  );

  return {
    orderWorkflow: {
      autoAccept,
      requireCustomerName,
      requireCustomerPhone,
      prepTargetMinutes: asNumber(
        workflow.prepTargetMinutes,
        defaults.orderWorkflow.prepTargetMinutes
      ),
      deliveryTargetMinutes: asNumber(
        workflow.deliveryTargetMinutes,
        defaults.orderWorkflow.deliveryTargetMinutes
      ),
      autoCompleteDelivered: asBoolean(
        workflow.autoCompleteDelivered,
        defaults.orderWorkflow.autoCompleteDelivered
      ),
    },
    notifications: {
      dashboardSound: asBoolean(
        notifications.dashboardSound ?? settings.enableNotifications,
        defaults.notifications.dashboardSound
      ),
      kitchenSound: asBoolean(
        notifications.kitchenSound ?? settings.enableNotifications,
        defaults.notifications.kitchenSound
      ),
      waiterSound: asBoolean(
        notifications.waiterSound ?? settings.enableNotifications,
        defaults.notifications.waiterSound
      ),
    },
    analytics: {
      delayedOrderGraceMinutes: asNumber(
        analytics.delayedOrderGraceMinutes,
        defaults.analytics.delayedOrderGraceMinutes
      ),
    },
    operatingHours,
    theme: {
      primaryColor: asString(
        theme.primaryColor,
        defaults.theme.primaryColor
      ),
      accentColor: asString(theme.accentColor, defaults.theme.accentColor),
    },
    currencyFormat: {
      symbol: asString(currencyFormat.symbol, defaults.currencyFormat.symbol),
      position:
        currencyFormat.position === "after"
          ? "after"
          : defaults.currencyFormat.position,
      decimals: asNumber(
        currencyFormat.decimals,
        defaults.currencyFormat.decimals
      ),
    },
    // Preserve the legacy shape for any existing code paths that still read it.
    orderSettings: {
      autoConfirm: autoAccept,
      requireCustomerName,
      requireCustomerPhone,
    },
  };
}

export function calculateDueAt(baseDate: Date, minutesFromNow: number) {
  return new Date(baseDate.getTime() + minutesFromNow * 60 * 1000).toISOString();
}
