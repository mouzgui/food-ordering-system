"use server";

import { requireRole } from "@/lib/auth/permissions";
import { normalizeRestaurantSettings } from "@/lib/restaurant-settings";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types/database";

type PerformanceOrder = {
  id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  preparing_started_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  delivered_at: string | null;
  accepted_by_member_id: string | null;
  preparing_started_by_member_id: string | null;
  ready_by_member_id: string | null;
  served_by_member_id: string | null;
  delivered_by_member_id: string | null;
  total_amount: number;
};

type PerformanceMember = {
  id: string;
  role: StaffRole;
  user_id: string;
  is_active: boolean;
  created_at: string;
};

export interface PerformanceSummary {
  activeOrders: number;
  completedOrders: number;
  avgPrepMinutes: number;
  avgDeliveryMinutes: number;
  delayedOrders: number;
  activeStaff: number;
  activeWithActivity: number;
  todayRevenue: number;
  readyOrders: number;
  preparingOrders: number;
  peakHour: string;
  peakHourOrders: number;
}

export interface PerformanceLeaderboardEntry {
  name: string;
  value: number;
  label: string;
}

export interface PerformanceStaffRow {
  id: string;
  role: StaffRole;
  roleLabel: string;
  name: string;
  email: string;
  active: boolean;
  acceptedOrders: number;
  preparedOrders: number;
  servedOrders: number;
  completedOrders: number;
  avgPrepMinutes: number;
  avgDeliveryMinutes: number;
  delayedOrders: number;
  revenueHandled: number;
  lastActivityAt: string | null;
}

export interface PerformanceStats {
  restaurantName: string;
  summary: PerformanceSummary;
  leaderboard: {
    fastestKitchen: PerformanceLeaderboardEntry | null;
    fastestWaiter: PerformanceLeaderboardEntry | null;
    topCloser: PerformanceLeaderboardEntry | null;
  };
  hourlyVolume: Array<{
    hour: number;
    label: string;
    orders: number;
  }>;
  staff: PerformanceStaffRow[];
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return diff / 60000;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maxDate(current: string | null, candidate?: string | null) {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime()
    ? candidate
    : current;
}

function roleLabel(role: StaffRole) {
  switch (role) {
    case "kitchen_staff":
      return "Kitchen Staff";
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "waiter":
      return "Waiter";
    default:
      return role;
  }
}

export async function fetchPerformanceStats(): Promise<
  PerformanceStats | { error: string }
> {
  const membership = await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
  const adminClient = await createAdminClient();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    { data: orders, error: ordersError },
    { data: members, error: membersError },
    { data: restaurant, error: restaurantError },
    { data: authData, error: authError },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
          id,
          status,
          created_at,
          accepted_at,
          preparing_started_at,
          ready_at,
          served_at,
          delivered_at,
          accepted_by_member_id,
          preparing_started_by_member_id,
          ready_by_member_id,
          served_by_member_id,
          delivered_by_member_id,
          total_amount
        `,
      )
      .eq("restaurant_id", membership.restaurantId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("restaurant_members")
      .select("id, role, user_id, is_active, created_at")
      .eq("restaurant_id", membership.restaurantId),
    supabase
      .from("restaurants")
      .select("name, settings")
      .eq("id", membership.restaurantId)
      .single(),
    adminClient.auth.admin.listUsers(),
  ]);

  if (ordersError) return { error: ordersError.message };
  if (membersError) return { error: membersError.message };
  if (restaurantError) return { error: restaurantError.message };
  if (authError) return { error: authError.message };

  const restaurantSettings = normalizeRestaurantSettings(restaurant?.settings);
  const prepTarget =
    restaurantSettings.orderWorkflow.prepTargetMinutes +
    restaurantSettings.analytics.delayedOrderGraceMinutes;
  const deliveryTarget =
    restaurantSettings.orderWorkflow.deliveryTargetMinutes +
    restaurantSettings.analytics.delayedOrderGraceMinutes;

  const orderList = (orders || []) as PerformanceOrder[];
  const memberList = (members || []) as PerformanceMember[];
  const userMap = new Map(
    (authData?.users || []).map((user) => [
      user.id,
      {
        name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Unknown User",
        email: user.email || "",
      },
    ]),
  );

  const staffPerformance = new Map(
    memberList.map((member) => [
      member.id,
      {
        id: member.id,
        role: member.role,
        roleLabel: roleLabel(member.role),
        name: userMap.get(member.user_id)?.name || "Unknown User",
        email: userMap.get(member.user_id)?.email || "",
        active: member.is_active,
        acceptedOrders: 0,
        preparedOrders: 0,
        servedOrders: 0,
        completedOrders: 0,
        avgPrepMinutes: 0,
        avgDeliveryMinutes: 0,
        delayedOrders: 0,
        revenueHandled: 0,
        lastActivityAt: null as string | null,
        prepSamples: [] as number[],
        deliverySamples: [] as number[],
      },
    ]),
  );

  const prepSamples: number[] = [];
  const deliverySamples: number[] = [];
  let delayedOrders = 0;
  let activeOrders = 0;
  let todayRevenue = 0;
  const hourlyVolume = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, "0")}:00`,
    orders: 0,
  }));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const order of orderList) {
    const createdAt = new Date(order.created_at);
    hourlyVolume[createdAt.getHours()].orders += 1;

    if (createdAt >= startOfToday && order.status !== "cancelled") {
      todayRevenue += Number(order.total_amount);
    }

    if (!["delivered", "cancelled"].includes(order.status)) {
      activeOrders += 1;
    }

    const prepMinutes =
      minutesBetween(
        order.preparing_started_at || order.accepted_at || order.created_at,
        order.ready_at,
      ) ?? null;
    const deliveryMinutes =
      minutesBetween(order.ready_at || order.served_at, order.delivered_at) ??
      null;
    const prepDelayed = prepMinutes !== null && prepMinutes > prepTarget;
    const deliveryDelayed =
      deliveryMinutes !== null && deliveryMinutes > deliveryTarget;

    if (prepMinutes !== null) prepSamples.push(prepMinutes);
    if (deliveryMinutes !== null) deliverySamples.push(deliveryMinutes);
    if (prepDelayed || deliveryDelayed) delayedOrders += 1;

    const acceptedMember = order.accepted_by_member_id
      ? staffPerformance.get(order.accepted_by_member_id)
      : null;
    if (acceptedMember) {
      acceptedMember.acceptedOrders += 1;
      acceptedMember.lastActivityAt = maxDate(
        acceptedMember.lastActivityAt,
        order.accepted_at,
      );
    }

    const kitchenMemberId =
      order.ready_by_member_id ||
      order.preparing_started_by_member_id ||
      order.accepted_by_member_id;
    const kitchenMember = kitchenMemberId
      ? staffPerformance.get(kitchenMemberId)
      : null;
    if (kitchenMember && prepMinutes !== null) {
      kitchenMember.preparedOrders += 1;
      kitchenMember.prepSamples.push(prepMinutes);
      kitchenMember.revenueHandled += Number(order.total_amount);
      kitchenMember.lastActivityAt = maxDate(
        kitchenMember.lastActivityAt,
        order.ready_at,
      );
      if (prepDelayed) kitchenMember.delayedOrders += 1;
    }

    const waiterMemberId =
      order.delivered_by_member_id || order.served_by_member_id;
    const waiterMember = waiterMemberId
      ? staffPerformance.get(waiterMemberId)
      : null;
    if (waiterMember) {
      if (order.served_at) waiterMember.servedOrders += 1;
      if (order.delivered_at) waiterMember.completedOrders += 1;
      waiterMember.lastActivityAt = maxDate(
        waiterMember.lastActivityAt,
        order.delivered_at || order.served_at,
      );
      waiterMember.revenueHandled += Number(order.total_amount);
      if (deliveryMinutes !== null) {
        waiterMember.deliverySamples.push(deliveryMinutes);
      }
      if (deliveryDelayed) waiterMember.delayedOrders += 1;
    }
  }

  const staffRows = Array.from(staffPerformance.values())
    .map((member) => ({
      ...member,
      avgPrepMinutes: average(member.prepSamples),
      avgDeliveryMinutes: average(member.deliverySamples),
    }))
    .sort((a, b) => {
      if (b.completedOrders !== a.completedOrders) {
        return b.completedOrders - a.completedOrders;
      }
      return b.preparedOrders - a.preparedOrders;
    });

  const peakHour =
    hourlyVolume.reduce(
      (top, entry) => (entry.orders > top.orders ? entry : top),
      hourlyVolume[0],
    ) || hourlyVolume[0];

  const completedOrders = orderList.filter(
    (order) => !!order.delivered_at,
  ).length;
  const readyOrders = orderList.filter(
    (order) => order.status === "ready",
  ).length;
  const preparingOrders = orderList.filter((order) =>
    ["accepted", "preparing"].includes(order.status),
  ).length;
  const activeStaff = staffRows.filter((member) => member.active).length;
  const activeWithActivity = staffRows.filter(
    (member) =>
      member.acceptedOrders > 0 ||
      member.preparedOrders > 0 ||
      member.completedOrders > 0,
  ).length;

  const fastestKitchen = [...staffRows]
    .filter((member) => member.preparedOrders > 0 && member.avgPrepMinutes > 0)
    .sort((a, b) => a.avgPrepMinutes - b.avgPrepMinutes)[0];
  const fastestWaiter = [...staffRows]
    .filter(
      (member) => member.completedOrders > 0 && member.avgDeliveryMinutes > 0,
    )
    .sort((a, b) => a.avgDeliveryMinutes - b.avgDeliveryMinutes)[0];
  const topCloser = [...staffRows].sort(
    (a, b) => b.completedOrders - a.completedOrders,
  )[0];

  return {
    restaurantName: restaurant?.name || "Restaurant",
    summary: {
      activeOrders,
      completedOrders,
      avgPrepMinutes: average(prepSamples),
      avgDeliveryMinutes: average(deliverySamples),
      delayedOrders,
      activeStaff,
      activeWithActivity,
      todayRevenue,
      readyOrders,
      preparingOrders,
      peakHour: peakHour?.label || "00:00",
      peakHourOrders: peakHour?.orders || 0,
    },
    leaderboard: {
      fastestKitchen: fastestKitchen
        ? {
            name: fastestKitchen.name,
            value: fastestKitchen.avgPrepMinutes,
            label: "avg prep time",
          }
        : null,
      fastestWaiter: fastestWaiter
        ? {
            name: fastestWaiter.name,
            value: fastestWaiter.avgDeliveryMinutes,
            label: "avg delivery time",
          }
        : null,
      topCloser: topCloser
        ? {
            name: topCloser.name,
            value: topCloser.completedOrders,
            label: "completed orders",
          }
        : null,
    },
    hourlyVolume,
    staff: staffRows,
  };
}
