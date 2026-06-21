/**
 * Database type definitions for Supabase.
 *
 * When your Supabase project is ready, generate these types automatically:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, these are hand-written to match our migration schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "delivered"
  | "cancelled";

export type StaffRole = "owner" | "manager" | "kitchen_staff" | "waiter";

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          currency: string;
          timezone: string;
          address: string | null;
          settings: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          currency?: string;
          timezone?: string;
          address?: string | null;
          settings?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          currency?: string;
          timezone?: string;
          address?: string | null;
          settings?: Json | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      restaurant_members: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: StaffRole;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role: StaffRole;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          role?: StaffRole;
          is_active?: boolean;
        };
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          label: string;
          number: number;
          qr_code_token: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          label: string;
          number: number;
          qr_code_token?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          label?: string;
          number?: number;
          qr_code_token?: string;
          is_active?: boolean;
        };
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          sort_order: number;
          extras: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          sort_order?: number;
          extras?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          sort_order?: number;
          extras?: Json | null;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          order_number: string;
          status: OrderStatus;
          total_amount: number;
          notes: string | null;
          customer_info: Json | null;
          accepted_by_member_id: string | null;
          accepted_at: string | null;
          preparing_started_by_member_id: string | null;
          preparing_started_at: string | null;
          ready_by_member_id: string | null;
          ready_at: string | null;
          served_by_member_id: string | null;
          served_at: string | null;
          delivered_by_member_id: string | null;
          delivered_at: string | null;
          current_assignee_member_id: string | null;
          priority: string;
          due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          order_number?: string;
          status?: OrderStatus;
          total_amount: number;
          notes?: string | null;
          customer_info?: Json | null;
          accepted_by_member_id?: string | null;
          accepted_at?: string | null;
          preparing_started_by_member_id?: string | null;
          preparing_started_at?: string | null;
          ready_by_member_id?: string | null;
          ready_at?: string | null;
          served_by_member_id?: string | null;
          served_at?: string | null;
          delivered_by_member_id?: string | null;
          delivered_at?: string | null;
          current_assignee_member_id?: string | null;
          priority?: string;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string;
          order_number?: string;
          status?: OrderStatus;
          total_amount?: number;
          notes?: string | null;
          customer_info?: Json | null;
          accepted_by_member_id?: string | null;
          accepted_at?: string | null;
          preparing_started_by_member_id?: string | null;
          preparing_started_at?: string | null;
          ready_by_member_id?: string | null;
          ready_at?: string | null;
          served_by_member_id?: string | null;
          served_at?: string | null;
          delivered_by_member_id?: string | null;
          delivered_at?: string | null;
          current_assignee_member_id?: string | null;
          priority?: string;
          due_at?: string | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          item_price: number;
          quantity: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          item_name: string;
          item_price: number;
          quantity: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          item_name?: string;
          item_price?: number;
          quantity?: number;
          notes?: string | null;
        };
      };
      order_events: {
        Row: {
          id: string;
          restaurant_id: string;
          order_id: string;
          member_id: string | null;
          actor_user_id: string | null;
          actor_role: StaffRole | null;
          event_type: string;
          from_status: OrderStatus | null;
          to_status: OrderStatus | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          order_id: string;
          member_id?: string | null;
          actor_user_id?: string | null;
          actor_role?: StaffRole | null;
          event_type: string;
          from_status?: OrderStatus | null;
          to_status?: OrderStatus | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          order_id?: string;
          member_id?: string | null;
          actor_user_id?: string | null;
          actor_role?: StaffRole | null;
          event_type?: string;
          from_status?: OrderStatus | null;
          to_status?: OrderStatus | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_restaurant_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
    };
    Enums: {
      order_status: OrderStatus;
      staff_role: StaffRole;
    };
  };
}

// Convenience type aliases
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type RestaurantInsert = Database["public"]["Tables"]["restaurants"]["Insert"];
export type RestaurantUpdate = Database["public"]["Tables"]["restaurants"]["Update"];

export type RestaurantMember = Database["public"]["Tables"]["restaurant_members"]["Row"];

export type Table = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
export type MenuItemUpdate = Database["public"]["Tables"]["menu_items"]["Update"];

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"];

export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];
export type OrderEventInsert = Database["public"]["Tables"]["order_events"]["Insert"];
