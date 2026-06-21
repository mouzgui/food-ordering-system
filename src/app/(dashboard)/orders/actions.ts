"use server";

import { canTransitionOrder } from "@/lib/auth/permissions";
import { requireMembership } from "@/lib/auth/get-membership";
import {
  calculateDueAt,
  normalizeRestaurantSettings,
} from "@/lib/restaurant-settings";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/database";

export async function fetchUserRestaurantId() {
  try {
    const membership = await requireMembership();
    return {
      restaurantId: membership.restaurantId,
      memberId: membership.id,
      role: membership.role,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Restaurant membership not found",
    };
  }
}

function buildTransitionUpdate(
  memberId: string,
  status: OrderStatus,
  settings: ReturnType<typeof normalizeRestaurantSettings>,
) {
  const timestamp = new Date().toISOString();
  const payload: Record<string, string | null | OrderStatus> = {
    status,
  };

  switch (status) {
    case "accepted":
      payload.accepted_by_member_id = memberId;
      payload.accepted_at = timestamp;
      payload.current_assignee_member_id = memberId;
      payload.due_at = calculateDueAt(
        new Date(timestamp),
        settings.orderWorkflow.prepTargetMinutes,
      );
      break;
    case "preparing":
      payload.preparing_started_by_member_id = memberId;
      payload.preparing_started_at = timestamp;
      payload.current_assignee_member_id = memberId;
      break;
    case "ready":
      payload.ready_by_member_id = memberId;
      payload.ready_at = timestamp;
      payload.current_assignee_member_id = null;
      payload.due_at = calculateDueAt(
        new Date(timestamp),
        settings.orderWorkflow.deliveryTargetMinutes,
      );
      break;
    case "served":
      payload.served_by_member_id = memberId;
      payload.served_at = timestamp;
      payload.current_assignee_member_id = memberId;
      break;
    case "delivered":
      payload.delivered_by_member_id = memberId;
      payload.delivered_at = timestamp;
      payload.current_assignee_member_id = memberId;
      payload.due_at = null;
      break;
    case "cancelled":
      payload.current_assignee_member_id = null;
      payload.due_at = null;
      break;
    default:
      break;
  }

  return payload;
}

export async function transitionOrderStatus(
  orderId: string,
  status: OrderStatus,
) {
  const supabase = await createClient();
  const membership = await requireMembership();
  const { data: restaurant } = (await supabase
    .from("restaurants")
    .select("settings")
    .eq("id", membership.restaurantId)
    .single()) as any;
  const settings = normalizeRestaurantSettings(restaurant?.settings);

  const { data: order, error: orderError } = (await supabase
    .from("orders")
    .select("id, restaurant_id, status")
    .eq("id", orderId)
    .single()) as any;

  if (orderError || !order) {
    return { error: orderError?.message || "Order not found" };
  }

  if (order.restaurant_id !== membership.restaurantId) {
    return { error: "You do not have access to this order" };
  }

  if (!canTransitionOrder(membership.role, order.status, status)) {
    return {
      error: `Role "${membership.role}" cannot move an order from "${order.status}" to "${status}"`,
    };
  }

  const updatePayload = buildTransitionUpdate(membership.id, status, settings);
  const ordersQuery = supabase.from("orders") as any;
  const { data: updatedOrder, error: updateError } = (await ordersQuery
    .update(updatePayload)
    .eq("id", orderId)
    .select("id, restaurant_id, status")
    .single()) as any;

  if (updateError || !updatedOrder) {
    return { error: updateError?.message || "Failed to update order status" };
  }

  const { error: eventError } = await (
    supabase.from("order_events") as any
  ).insert({
    restaurant_id: membership.restaurantId,
    order_id: orderId,
    member_id: membership.id,
    actor_user_id: membership.userId,
    actor_role: membership.role,
    event_type: "status_transition",
    from_status: order.status,
    to_status: status,
    metadata: {},
  });

  if (eventError) {
    return { error: eventError.message };
  }

  return { success: true, order: updatedOrder };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return transitionOrderStatus(orderId, status);
}

export async function fetchOrderTimeline(orderId: string) {
  const supabase = await createClient();
  const membership = await requireMembership();

  const { data: order } = (await supabase
    .from("orders")
    .select("id, restaurant_id, order_number")
    .eq("id", orderId)
    .single()) as any;

  if (!order || order.restaurant_id !== membership.restaurantId) {
    return { error: "Order not found" };
  }

  const { data, error } = (await supabase
    .from("order_events")
    .select(
      "id, event_type, actor_role, from_status, to_status, metadata, created_at",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })) as any;

  if (error) {
    return { error: error.message };
  }

  return {
    orderNumber: order.order_number,
    events: data || [],
  };
}
