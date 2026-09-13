export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  delivery_settings: Record<string, unknown> | null;
  payment_methods: string[] | null;
  locale: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "tenant_admin" | "tenant_staff";
  permissions: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  min_weight: number;
  stock_status: "in-stock" | "out-of-stock";
  is_active: boolean;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  customer_name: string;
  phone_number: string;
  district: string;
  delivery_address: string;
  subtotal: number;
  delivery_charge: number;
  payment_method: string;
  order_status: string;
  customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  tenant_id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  product_price: number;
  weight: number;
  quantity: number;
  item_total: number;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  district: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  tenant_id: string;
  product_id: string | null;
  customer_name: string;
  rating: number;
  review_text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: string;
  tenant_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  tenant_id: string;
  product_id: string;
  storage_path: string | null;
  url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface RateLimitLog {
  id: string;
  tenant_id: string | null;
  identifier: string;
  action: string;
  created_at: string;
}
