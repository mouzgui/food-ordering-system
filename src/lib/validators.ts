import { z } from "zod";

// ============================================
// Auth Validators
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    restaurantName: z
      .string()
      .min(2, "Restaurant name must be at least 2 characters")
      .max(100, "Restaurant name must be less than 100 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================
// Restaurant Validators
// ============================================

export const restaurantSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
  description: z.string().max(500).optional(),
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  timezone: z.string().optional(),
  address: z.string().max(200).optional(),
});

// ============================================
// Category Validators
// ============================================

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters"),
  description: z.string().max(300).optional(),
  sort_order: z.number().int().min(0).default(0),
});

// ============================================
// Menu Item Validators
// ============================================

export const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, "Item name is required")
    .max(150, "Item name must be less than 150 characters"),
  description: z.string().max(500).optional(),
  price: z
    .number()
    .positive("Price must be greater than 0")
    .max(99999, "Price is too high"),
  category_id: z.string().uuid("Invalid category"),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

// ============================================
// Table Validators
// ============================================

export const tableSchema = z.object({
  label: z
    .string()
    .min(1, "Table label is required")
    .max(50, "Table label must be less than 50 characters"),
  number: z.number().int().positive("Table number must be positive"),
});

// ============================================
// Order Validators
// ============================================

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  item_name: z.string(),
  item_price: z.number().positive(),
  quantity: z.number().int().positive().max(99, "Maximum 99 of each item"),
  notes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  table_id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  notes: z.string().max(500).optional(),
  customer_info: z
    .object({
      name: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
    })
    .optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RestaurantInput = z.infer<typeof restaurantSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
