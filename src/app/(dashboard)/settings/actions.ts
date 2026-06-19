"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchSettings() {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single() as any;

  if (!member) return { error: "Restaurant not found" };

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", member.restaurant_id)
    .single() as any;

  return { restaurant };
}

export async function updateSettings(
  id: string,
  data: {
    name: string;
    slug: string;
    description: string;
    address: string;
    currency: string;
    timezone: string;
    settings: any;
  }
) {
  const supabase = await createClient() as any;
  const { error } = await supabase
    .from("restaurants")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description,
      address: data.address,
      currency: data.currency,
      timezone: data.timezone,
      settings: data.settings,
    } as Record<string, any>)
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
