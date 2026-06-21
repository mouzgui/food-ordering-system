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
  const { data: members } = await supabase
    .from("restaurant_members")
    .select("*")
    .eq("restaurant_id", membership.restaurantId);

  if (!members) return { staff: [] };

  // Fetch users from admin API to get emails and names
  const adminClient = (await createAdminClient()) as any;
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
        authUser?.user_metadata?.username ||
        "Unknown User",
      email: authUser?.email || "",
      username: authUser?.user_metadata?.username || "",
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

export async function createStaffMember(
  restaurantId: string,
  name: string,
  username: string,
  password: string,
  role: Exclude<StaffRole, "owner">,
) {
  const membership = await requireRole(["owner", "manager"]);
  if (membership.restaurantId !== restaurantId) {
    return { error: "You do not have access to this restaurant" };
  }
  if (!canManageTarget(membership.role, role)) {
    return { error: "You do not have permission to create this role" };
  }

  const adminClient = (await createAdminClient()) as any;
  const internalEmail = `${username}@${restaurantId}.local`;

  // 1. Create user via admin API
  const { data: authData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: name, username: username },
    });

  if (createError) return { error: createError.message };

  const userId = authData.user.id;

  // 2. Add to restaurant_members
  // Use adminClient to bypass RLS and avoid infinite recursion
  const { data, error } = await adminClient
    .from("restaurant_members")
    .insert([{ restaurant_id: restaurantId, user_id: userId, role }])
    .select()
    .single();

  if (error) {
    // If inserting into restaurant_members fails, we should ideally clean up the created user
    // For now, return the error
    return { error: error.message };
  }

  return {
    member: {
      id: data.id,
      user_id: userId,
      name: name,
      username: username,
      email: internalEmail,
      role: role,
      is_active: true,
      joined_at: new Date().toISOString().split("T")[0],
    },
  };
}

export async function removeStaffMember(id: string) {
  const membership = await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;

  const { data: target } = await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, role")
    .eq("id", id)
    .single();

  if (!target || target.restaurant_id !== membership.restaurantId) {
    return { error: "Staff member not found" };
  }

  if (!canManageTarget(membership.role, target.role)) {
    return { error: "You do not have permission to remove this staff member" };
  }

  const adminClient = (await createAdminClient()) as any;
  const { error } = await adminClient
    .from("restaurant_members")
    .update({ is_active: false })
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

  const { data: target } = await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, role")
    .eq("id", id)
    .single();

  if (!target || target.restaurant_id !== membership.restaurantId) {
    return { error: "Staff member not found" };
  }

  if (
    !canManageTarget(membership.role, target.role) ||
    !canManageTarget(membership.role, role)
  ) {
    return { error: "You do not have permission to assign this role" };
  }

  const adminClient = (await createAdminClient()) as any;
  const { error } = await adminClient
    .from("restaurant_members")
    .update({ role })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
