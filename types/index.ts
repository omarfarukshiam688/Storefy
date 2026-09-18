export type TenantRole = "tenant_admin" | "tenant_staff";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  product_limit: number;
  order_limit: number;
  storage_limit_bytes: number;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
  settings: Record<string, unknown>;
  plan_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  default_tenant_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  is_active: boolean;
  invited_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: TenantRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface SuperAdmin {
  user_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock_status: "in_stock" | "out_of_stock" | "preorder" | "backorder";
  is_active: boolean;
  is_archived: boolean;
  is_featured: boolean;
  metadata: Record<string, unknown>;
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
  storage_path: string;
  url: string | null;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  original_filename: string;
  created_at: string;
  updated_at: string;
}

export type StorefrontSectionKey =
  | 'hero'
  | 'categories'
  | 'featured_products'
  | 'why_choose_us'
  | 'about_us'
  | 'reviews'
  | 'contact'
  | 'footer';

export interface TenantStorefrontSection {
  id: string;
  tenant_id: string;
  section_key: StorefrontSectionKey;
  is_enabled: boolean;
  display_order: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HeroSectionConfig {
  heading: string;
  subheading: string;
  cta_label: string;
  cta_destination: string;
  image_path: string | null;
}

export interface BenefitsItem {
  icon: string;
  title: string;
  description: string;
}

export interface WhyChooseUsSectionConfig {
  heading: string;
  description: string;
  benefits: BenefitsItem[];
}

export interface AboutUsSectionConfig {
  heading: string;
  description: string;
  image_path: string | null;
}

export interface ReviewsSectionConfig {
  heading: string;
  description: string;
}

export interface CategoriesSectionConfig {
  heading: string;
  description: string;
}

export interface FeaturedProductsSectionConfig {
  heading: string;
  description: string;
}

export interface ContactSectionConfig {
  heading: string;
  description: string;
}

export interface FooterSectionConfig {
  description: string;
}

export interface RateLimitLog {
  id: string;
  tenant_id: string | null;
  identifier: string;
  action: string;
  created_at: string;
}