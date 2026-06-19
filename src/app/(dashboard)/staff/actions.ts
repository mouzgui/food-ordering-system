"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function fetchStaffMembers() {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single() as any;

  if (!member) return { error: "Restaurant not found" };

  // Get all members for this restaurant
  const { data: members } = await supabase
    .from("restaurant_members")
    .select("*")
    .eq("restaurant_id", member.restaurant_id) as any;

  if (!members) return { staff: [] };

  // Fetch users from admin API to get emails and names
  const adminClient = await createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
  
  if (authError) return { error: "Failed to fetch user details" };

  const users = authData.users;

  const staff = members.map((m: any) => {
    const authUser = users.find((u: any) => u.id === m.user_id);
    return {
      id: m.id,
      name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || "Unknown User",
      email: authUser?.email || "",
      role: m.role,
      is_active: m.is_active,
      joined_at: new Date(m.created_at).toISOString().split("T")[0],
    };
  });

  return { restaurantId: member.restaurant_id, staff };
}

export async function inviteStaffMember(restaurantId: string, name: string, email: string, role: string) {
  const adminClient = await createAdminClient();
  
  // 1. Send invite email via admin API
  const { data: authData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name }
  });

  if (inviteError) return { error: inviteError.message };

  const userId = authData.user.id;

  // 2. Add to restaurant_members
  const supabase = await createClient() as any;
  const { data, error } = await supabase
    .from("restaurant_members")
    .insert([
      { restaurant_id: restaurantId, user_id: userId, role }
    ] as any)
    .select()
    .single() as any;

  if (error) return { error: error.message };

  return { 
    member: {
      id: data.id,
      name: name,
      email: email,
      role: role,
      is_active: true,
      joined_at: new Date().toISOString().split("T")[0],
    }
  };
}

export async function removeStaffMember(id: string) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("restaurant_members").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function changeStaffRole(id: string, role: string) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("restaurant_members").update({ role } as Record<string, any>).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
