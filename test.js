require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("slug", "bob").single();
  const restaurantId = restaurant.id;
  
  // Insert Categories
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .insert([
      { restaurant_id: restaurantId, name: "Starters", sort_order: 1 },
      { restaurant_id: restaurantId, name: "Main Courses", sort_order: 2 },
      { restaurant_id: restaurantId, name: "Beverages", sort_order: 3 },
    ])
    .select("id, name");

  const startersId = categories.find(c => c.name === "Starters").id;
  const mainsId = categories.find(c => c.name === "Main Courses").id;
  const bevsId = categories.find(c => c.name === "Beverages").id;

  // Insert Menu Items
  await supabase.from("menu_items").insert([
    { category_id: startersId, restaurant_id: restaurantId, name: "Bruschetta", description: "Toasted bread with fresh tomatoes", price: 8.5 },
    { category_id: startersId, restaurant_id: restaurantId, name: "Caesar Salad", description: "Crisp romaine lettuce with parmesan", price: 10.0 },
    { category_id: mainsId, restaurant_id: restaurantId, name: "Grilled Salmon", description: "Atlantic salmon with lemon dill sauce", price: 22.0 },
    { category_id: mainsId, restaurant_id: restaurantId, name: "Beef Tenderloin", description: "8oz tenderloin with red wine reduction", price: 28.0 },
    { category_id: bevsId, restaurant_id: restaurantId, name: "Espresso", description: "Single shot of rich Italian espresso", price: 3.5 },
    { category_id: bevsId, restaurant_id: restaurantId, name: "Sparkling Water", description: "San Pellegrino 500ml", price: 3.0 },
  ]);

  console.log("Demo data successfully injected for bob!");
}
run();
