"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/permissions";

export async function fetchMenuData() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single() as any;

  if (!member || !member.restaurant_id) return { error: "Restaurant not found" };

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("sort_order");

  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", member.restaurant_id)
    .order("sort_order");

  return {
    restaurantId: member.restaurant_id,
    categories: categories || [],
    items: items || [],
  };
}

export async function createCategory(restaurantId: string, name: string, description: string, sortOrder: number) {
  const membership = await requireRole(["owner", "manager"]);
  if (membership.restaurantId !== restaurantId) return { error: "Unauthorized" };

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("categories")
    .insert([{ restaurant_id: restaurantId, name, description, sort_order: sortOrder }])
    .select()
    .single();

  if (error) return { error: error.message };
  return { category: data };
}

export async function deleteCategory(id: string) {
  await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
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
  const membership = await requireRole(["owner", "manager"]);
  if (membership.restaurantId !== restaurantId) return { error: "Unauthorized" };

  const supabase = (await createClient()) as any;
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
    ])
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
  await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("menu_items")
    .update({ 
      name, 
      description, 
      price, 
      image_url: imageUrl,
      extras: extras
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { item: data };
}

export async function uploadMenuImage(formData: FormData) {
  // STRICT AUTHORIZATION CHECK BEFORE USING ADMIN CLIENT
  await requireRole(["owner", "manager"]);
  
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

  const { error } = await supabaseAdmin.storage
    .from('menu-images')
    .upload(fileName, file, { contentType: file.type });

  if (error) return { error: error.message };

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('menu-images')
    .getPublicUrl(fileName);

  return { url: publicUrl };
}

export async function deleteMenuItem(id: string) {
  await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleItemAvailability(id: string, isAvailable: boolean) {
  await requireRole(["owner", "manager"]);
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from("menu_items").update({ is_available: isAvailable }).eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function generateTemplate(restaurantId: string, templateType: 'pizzeria' | 'cafe' | 'fine_dining') {
  const membership = await requireRole(["owner", "manager"]);
  if (membership.restaurantId !== restaurantId) return { error: "Unauthorized" };

  const supabase = (await createClient()) as any;
  
  let categoriesData: { name: string; desc: string }[] = [];
  if (templateType === 'pizzeria') {
    categoriesData = [
      { name: "Wood-Fired Pizzas", desc: "Authentic Neapolitan style pizzas crafted with 48-hour fermented dough." },
      { name: "Artisan Starters", desc: "Perfectly portioned beginnings to share with the table." },
      { name: "Craft Beverages", desc: "Hand-selected local sodas and signature refreshments." }
    ];
  } else if (templateType === 'cafe') {
    categoriesData = [
      { name: "Signature Brews", desc: "Ethically sourced, single-origin coffee roasted to perfection." },
      { name: "Cold Refreshments", desc: "Iced lattes, cold brews, and seasonal infused teas." },
      { name: "Gourmet Pastries", desc: "Baked fresh every morning by our in-house pastry chef." }
    ];
  } else if (templateType === 'fine_dining') {
    categoriesData = [
      { name: "Hors d'oeuvres", desc: "Delicate bites designed to awaken the palate." },
      { name: "Les Plats Principaux", desc: "Masterfully composed main courses featuring seasonal ingredients." },
      { name: "Desserts & Fromage", desc: "Decadent sweets and curated artisanal cheeses." }
    ];
  }

  const categories = [];
  for (let i = 0; i < categoriesData.length; i++) {
    const { data } = await supabase
      .from("categories")
      .insert([{ restaurant_id: restaurantId, name: categoriesData[i].name, description: categoriesData[i].desc, sort_order: i }])
      .select().single();
    if (data) categories.push(data);
  }

  if (templateType === 'pizzeria' && categories.length > 0) {
    await supabase.from("menu_items").insert([
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Margherita Classica", description: "San Marzano tomato sauce, fresh buffalo mozzarella, hand-torn basil, and extra virgin olive oil.", price: 16.00, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Spicy Diavola", description: "Tomato sauce, fior di latte, spicy Calabrian salami, chili flakes, and hot honey drizzle.", price: 19.50, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Truffle Mushroom", description: "White base with roasted wild mushrooms, truffle cream, fontina cheese, and fresh thyme.", price: 22.00, is_available: true, sort_order: 2, image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[1].id, restaurant_id: restaurantId, name: "Wood-Fired Garlic Bread", description: "Rustic sourdough batons smothered in roasted garlic butter and pecorino romano.", price: 8.50, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[1].id, restaurant_id: restaurantId, name: "Burrata Caprese", description: "Creamy burrata cheese served with heirloom cherry tomatoes, basil pesto, and balsamic glaze.", price: 14.00, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1606850246029-dd00e5270ce4?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[2].id, restaurant_id: restaurantId, name: "Italian Craft Cola", description: "Artisan cola brewed with natural botanicals and citrus zest.", price: 4.50, is_available: true, sort_order: 0 },
      { category_id: categories[2].id, restaurant_id: restaurantId, name: "Blood Orange Soda", description: "Sparkling blood orange soda, chilled to perfection.", price: 4.50, is_available: true, sort_order: 1 },
    ]);
  } else if (templateType === 'cafe' && categories.length > 0) {
     await supabase.from("menu_items").insert([
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Double Shot Espresso", description: "A rich, full-bodied double shot of our house blend espresso with a beautiful crema.", price: 3.50, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Oat Milk Flat White", description: "Smooth microfoam oat milk poured over a velvety double ristretto.", price: 4.80, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[1].id, restaurant_id: restaurantId, name: "Kyoto Cold Brew", description: "Slow-drip cold brew coffee steeped for 18 hours, served over craft ice.", price: 5.50, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[1].id, restaurant_id: restaurantId, name: "Matcha Lemonade", description: "Ceremonial grade matcha whisked with fresh squeezed lemonade.", price: 6.00, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[2].id, restaurant_id: restaurantId, name: "Almond Croissant", description: "Flaky all-butter croissant filled with almond frangipane and topped with toasted almonds.", price: 4.50, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1555507036-ab1f40ce88f7?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[2].id, restaurant_id: restaurantId, name: "Avocado Toast", description: "Smashed avocado, radish shavings, and micro-greens on toasted seeded sourdough.", price: 9.50, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?q=80&w=800&auto=format&fit=crop" },
    ]);
  } else if (templateType === 'fine_dining' && categories.length > 0) {
     await supabase.from("menu_items").insert([
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Wagyu Beef Tartare", description: "Hand-cut A5 Wagyu, cured egg yolk, caper berries, and house-made truffle brioche crisps.", price: 28.00, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1626078235282-3df64bba2da5?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[0].id, restaurant_id: restaurantId, name: "Seared Foie Gras", description: "Hudson Valley foie gras, fig compote, aged balsamic reduction, and toasted hazelnuts.", price: 32.00, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[1].id, restaurant_id: restaurantId, name: "Pan-Roasted Halibut", description: "Wild-caught Alaskan halibut, saffron beurre blanc, beluga lentils, and charred asparagus.", price: 46.00, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[1].id, restaurant_id: restaurantId, name: "Dry-Aged Duck Breast", description: "Lavender-honey glazed duck breast, parsnip purée, sour cherry jus, and braised endive.", price: 42.00, is_available: true, sort_order: 1, image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop" },
      { category_id: categories[2].id, restaurant_id: restaurantId, name: "Valrhona Chocolate Soufflé", description: "Guanaja dark chocolate soufflé served with a quenelle of Madagascar vanilla bean crème anglaise.", price: 18.00, is_available: true, sort_order: 0, image_url: "https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?q=80&w=800&auto=format&fit=crop" },
    ]);
  }

  return { success: true, error: null };
}
