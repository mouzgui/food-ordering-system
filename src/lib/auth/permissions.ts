import type { OrderStatus, StaffRole } from "@/types/database";
import {
  KITCHEN_VISIBLE_STATUSES,
  MANAGER_VISIBLE_STATUSES,
  ROLE_HOME_ROUTE,
  WAITER_VISIBLE_STATUSES,
} from "@/types";
import { requireMembership } from "./get-membership";

const ROLE_TRANSITIONS: Record<StaffRole, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  owner: {},
  manager: {},
  kitchen_staff: {
    pending: ["accepted", "cancelled"],
    accepted: ["preparing"],
    preparing: ["ready"],
  },
  waiter: {
    ready: ["served"],
    served: ["delivered"],
  },
};

export async function requireRole(allowedRoles: StaffRole[]) {
  const membership = await requireMembership();

  if (!allowedRoles.includes(membership.role)) {
    throw new Error("You do not have permission to perform this action");
  }

  return membership;
}

export function getVisibleStatusesForRole(role: StaffRole): OrderStatus[] {
  switch (role) {
    case "kitchen_staff":
      return KITCHEN_VISIBLE_STATUSES;
    case "waiter":
      return WAITER_VISIBLE_STATUSES;
    default:
      return MANAGER_VISIBLE_STATUSES;
  }
}

export function getRoleHomeRoute(role: StaffRole) {
  return ROLE_HOME_ROUTE[role];
}

export function canTransitionOrder(
  role: StaffRole,
  fromStatus: OrderStatus,
  toStatus: OrderStatus
) {
  if (role === "owner" || role === "manager") {
    return fromStatus !== toStatus;
  }

  const allowedTargets = ROLE_TRANSITIONS[role][fromStatus] || [];
  return allowedTargets.includes(toStatus);
}
