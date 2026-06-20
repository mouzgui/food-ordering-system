"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function fetchMenuData() {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single() as any;

  if (!member) return { error: "Restaurant not found" };

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("sort_order") as any;

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("sort_order") as any;

  return {
    restaurantId: member.restaurant_id,
    categories: categories || [],
    items: items || [],
  };
}

export async function createCategory(restaurantId: string, name: string, description: string, sortOrder: number) {
  const supabase = await createClient() as any;
  const { data, error } = await supabase
    .from("categories")
    .insert([{ restaurant_id: restaurantId, name, description, sort_order: sortOrder }] as any)
    .select()
    .single();

  if (error) return { error: error.message };
  return { category: data };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function createMenuItem(
  categoryId: string,
  restaurantId: string,
  name: string,
  description: string,
  price: number,
  imageUrl: string | null = null,
  extras: any = {}
) {
  const supabase = await createClient() as any;
  const { data, error } = await supabase
    .from("menu_items")
    .insert([
      { 
        category_id: categoryId, 
        restaurant_id: restaurantId, 
        name, 
        description, 
        price, 
        image_url: imageUrl,
        extras: extras,
        is_available: true 
      }
    ] as any)
    .select()
    .single();

  if (error) return { error: error.message };
  return { item: data };
}

export async function updateMenuItem(
  id: string,
  name: string,
  description: string,
  price: number,
  imageUrl: string | null,
  extras: any
) {
  const supabase = await createClient() as any;
  const { data, error } = await supabase
    .from("menu_items")
    .update({ 
      name, 
      description, 
      price, 
      image_url: imageUrl,
      extras: extras
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { item: data };
}

export async function uploadMenuImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Ensure bucket exists (will fail silently if it already exists, which is fine)
  await supabaseAdmin.storage.createBucket('menu-images', { public: true }).catch(() => {});

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabaseAdmin.storage
    .from('menu-images')
    .upload(fileName, file, { contentType: file.type });

  if (error) return { error: error.message };

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('menu-images')
    .getPublicUrl(fileName);

  return { url: publicUrl };
}

export async function deleteMenuItem(id: string) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleItemAvailability(id: string, isAvailable: boolean) {
  const supabase = await createClient() as any;
  const { error } = await supabase.from("menu_items").update({ is_available: isAvailable } as any).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}
