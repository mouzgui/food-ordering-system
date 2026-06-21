"use server";

import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/types/database";

export interface CurrentMembership {
  id: string;
  userId: string;
  restaurantId: string;
  role: StaffRole;
  isActive: boolean;
}

export async function getCurrentMembership(): Promise<{
  membership: CurrentMembership | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { membership: null, error: "Not authenticated" };
  }

  const { data, error } = (await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single()) as any;

  if (error || !data) {
    return { membership: null, error: "Restaurant membership not found" };
  }

  return {
    membership: {
      id: data.id,
      userId: user.id,
      restaurantId: data.restaurant_id,
      role: data.role,
      isActive: data.is_active,
    },
    error: null,
  };
}

export async function requireMembership(): Promise<CurrentMembership> {
  const { membership, error } = await getCurrentMembership();

  if (!membership) {
    throw new Error(error || "Restaurant membership required");
  }

  return membership;
}
