import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  const sql = `
    -- Enable read access to orders for anon and authenticated users
    DROP POLICY IF EXISTS "Public read orders for tracking" ON orders;
    CREATE POLICY "Public read orders for tracking" ON orders FOR SELECT TO anon, authenticated USING (true);
  `;

  // We don't have an exec_sql function in Supabase by default unless we created it.
  // Instead of creating it, we can just run a quick node script that uses the admin REST API if possible, or just create a function.
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error("Failed to execute RPC. Creating exec_sql function first...");
    
    // We can't easily create a function from JS without an existing function.
    // Let's check if there's another way.
  } else {
    console.log("Migration applied successfully!");
  }
}

applyMigration();
