"use server";

import { requireMembership } from "@/lib/auth/get-membership";
import { requireRole } from "@/lib/auth/permissions";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types/database";

function canManageTarget(currentRole: StaffRole, targetRole: StaffRole) {
  if (currentRole === "owner") {
    return targetRole !== "owner";
  }

  if (currentRole === "manager") {
    return targetRole === "waiter" || targetRole === "kitchen_staff";
  }

  return false;
}

export async function fetchStaffMembers() {
  const supabase = (await createClient()) as any;
  const membership = await requireMembership();

  // Get all members for this restaurant
  const { data: members } = (await supabase
    .from("restaurant_members")
    .select("*")
    .eq("restaurant_id", membership.restaurantId)) as any;

  if (!members) return { staff: [] };

  // Fetch users from admin API to get emails and names
  const adminClient = await createAdminClient();
  const { data: authData, error: authError } =
    await adminClient.auth.admin.listUsers();

  if (authError) return { error: "Failed to fetch user details" };

  const users = authData.users;

  const staff = members.map((m: any) => {
    const authUser = users.find((u: any) => u.id === m.user_id);
    return {
      id: m.id,
      user_id: m.user_id,
      name:
        authUser?.user_metadata?.full_name ||
        authUser?.email?.split("@")[0] ||
        "Unknown User",
      email: authUser?.email || "",
      role: m.role,
      is_active: m.is_active,
      joined_at: new Date(m.created_at).toISOString().split("T")[0],
    };
  });

  return {
    restaurantId: membership.restaurantId,
    currentRole: membership.role,
    currentMemberId: membership.id,
    staff,
  };
}

export async function inviteStaffMember(
  restaurantId: string,
  name: string,
  email: string,
  role: Exclude<StaffRole, "owner">,
) {
  const membership = await requireRole(["owner", "manager"]);
  if (membership.restaurantId !== restaurantId) {
    return { error: "You do not have access to this restaurant" };
  }
  if (!canManageTarget(membership.role, role)) {
    return { error: "You do not have permission to invite this role" };
  }

  const adminClient = await createAdminClient();

  // 1. Send invite email via admin API
  const { data: authData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
    });

  if (inviteError) return { error: inviteError.message };

  const userId = authData.user.id;

  // 2. Add to restaurant_members
  const supabase = (await createClient()) as any;
  const { data, error } = (await supabase
    .from("restaurant_members")
    .insert([{ restaurant_id: restaurantId, user_id: userId, role }] as any)
    .select()
    .single()) as any;

  if (error) return { error: error.message };

  return {
    member: {
      id: data.id,
      user_id: userId,
      name: name,
      email: email,
      role: role,
      is_active: true,
      joined_at: new Date().toISOString().split("T")[0],
    },
  };
}

export async function removeStaffMember(id: string) {
  const membership = await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;

  const { data: target } = (await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, role")
    .eq("id", id)
    .single()) as any;

  if (!target || target.restaurant_id !== membership.restaurantId) {
    return { error: "Staff member not found" };
  }

  if (!canManageTarget(membership.role, target.role)) {
    return { error: "You do not have permission to remove this staff member" };
  }

  const { error } = await supabase
    .from("restaurant_members")
    .update({ is_active: false } as Record<string, any>)
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function changeStaffRole(
  id: string,
  role: Exclude<StaffRole, "owner">,
) {
  const membership = await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;

  const { data: target } = (await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, role")
    .eq("id", id)
    .single()) as any;

  if (!target || target.restaurant_id !== membership.restaurantId) {
    return { error: "Staff member not found" };
  }

  if (
    !canManageTarget(membership.role, target.role) ||
    !canManageTarget(membership.role, role)
  ) {
    return { error: "You do not have permission to assign this role" };
  }

  const { error } = await supabase
    .from("restaurant_members")
    .update({ role } as Record<string, any>)
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
