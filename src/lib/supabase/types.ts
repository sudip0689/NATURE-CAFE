/**
 * Database types for the Phase 1 schema (supabase/migrations/0001_foundation.sql).
 *
 * Hand-written to match that migration, in the shape @supabase/supabase-js
 * expects (every table needs Row/Insert/Update/Relationships, and the schema
 * needs Views/Functions/Enums/CompositeTypes — omit any of them and the client's
 * generics silently resolve each row to `never`).
 *
 * Once the project is linked you can regenerate instead:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 *
 * Money is `numeric(10,2)` in Postgres and arrives over PostgREST as a *string*
 * ("120.00"). That is intentional and must not be "fixed" by casting to number
 * on read — see src/lib/money.ts for why, and for the one place it converts.
 *
 * Note on bills/bill_items: Insert types exist here because Phase 4's RPC needs
 * the shape, but RLS grants no direct INSERT to anyone. Bills are created only
 * through that SECURITY DEFINER function, which re-reads prices server-side.
 */

export type UserRole = "owner" | "cashier";
export type PaymentMethod = "cash" | "upi" | "card";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        // Exactly two rows exist, seeded by migration 0008. The app never
        // inserts or deletes profiles — there is no staff management.
        Insert: {
          id: string;
          username: string;
          full_name?: string;
          role?: UserRole;
          is_active?: boolean;
        };
        Update: {
          full_name?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          price: string;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          price: string | number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category_id?: string | null;
          price?: string | number;
          image_url?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          bill_number: string;
          customer_name: string;
          customer_mobile: string | null;
          subtotal: string;
          discount: string;
          total: string;
          payment_method: PaymentMethod;
          cashier_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bill_number: string;
          customer_name?: string;
          customer_mobile?: string | null;
          subtotal: string | number;
          discount?: string | number;
          total: string | number;
          payment_method: PaymentMethod;
          cashier_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      bill_items: {
        Row: {
          id: string;
          bill_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: string;
          line_total: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bill_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: string | number;
          line_total: string | number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          cafe_name: string;
          tagline: string;
          address: string;
          phone: string;
          upi_id: string;
          upi_name: string;
          upi_qr_url: string | null;
          receipt_footer: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          cafe_name?: string;
          tagline?: string;
          address?: string;
          phone?: string;
          upi_id?: string;
          upi_name?: string;
          upi_qr_url?: string | null;
          receipt_footer?: string;
        };
        Update: {
          cafe_name?: string;
          tagline?: string;
          address?: string;
          phone?: string;
          upi_id?: string;
          upi_name?: string;
          upi_qr_url?: string | null;
          receipt_footer?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_dashboard_today: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_sales: string;
          bill_count: number;
          cash_sales: string;
          upi_sales: string;
          card_sales: string;
        }[];
      };
      get_management_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          food_items: number;
          todays_bills: number;
          todays_sales: string;
          known_customers: number;
        }[];
      };
      get_sales_summary: {
        Args: { p_from: string; p_to: string };
        Returns: {
          total_sales: string;
          bill_count: number;
          cash_sales: string;
          upi_sales: string;
          card_sales: string;
        }[];
      };
      get_daily_sales: {
        Args: { p_from: string; p_to: string };
        Returns: {
          day: string;
          bill_count: number;
          cash_sales: string;
          upi_sales: string;
          card_sales: string;
          total_sales: string;
        }[];
      };
      get_top_items: {
        Args: { p_from: string; p_to: string; p_limit?: number };
        Returns: {
          product_name: string;
          quantity_sold: number;
          revenue: string;
        }[];
      };
      create_bill: {
        Args: {
          /** profiles.id of whoever the server says is signed in. */
          p_actor: string;
          p_items: { product_id: string; quantity: number }[];
          p_payment_method: PaymentMethod;
          p_customer_name?: string | null;
          p_customer_mobile?: string | null;
          p_discount?: string | number;
          p_request_id?: string | null;
        };
        Returns: {
          out_id: string;
          out_bill_number: string;
          out_total: string;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillItem = Database["public"]["Tables"]["bill_items"]["Row"];
export type Settings = Database["public"]["Tables"]["settings"]["Row"];
