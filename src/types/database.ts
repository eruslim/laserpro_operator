export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'customer' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          created_by: string | null
          permissions: Json
          last_login_at: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          created_by?: string | null
          permissions?: Json
          last_login_at?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string | null
          permissions?: Json
          last_login_at?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      materials: {
        Row: {
          id: string
          name: string
          type: string
          cost_per_sqm: number
          available_thicknesses: number[]
          colors: string[]
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          cost_per_sqm: number
          available_thicknesses: number[]
          colors?: string[]
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          cost_per_sqm?: number
          available_thicknesses?: number[]
          colors?: string[]
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          status: 'pending' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'cancelled'
          total_amount: number
          subtotal: number
          tax: number
          shipping_cost: number
          shipping_address: Json
          tracking_number: string | null
          estimated_delivery: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number: string
          status?: 'pending' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'cancelled'
          total_amount: number
          subtotal: number
          tax: number
          shipping_cost: number
          shipping_address: Json
          tracking_number?: string | null
          estimated_delivery?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          status?: 'pending' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'cancelled'
          total_amount?: number
          subtotal?: number
          tax?: number
          shipping_cost?: number
          shipping_address?: Json
          tracking_number?: string | null
          estimated_delivery?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          design_file_url: string
          design_file_name: string
          material_id: string
          thickness: number
          quantity: number
          unit_price: number
          total_price: number
          cutting_time_minutes: number
          dimensions: Json
          preview_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          design_file_url: string
          design_file_name: string
          material_id: string
          thickness: number
          quantity: number
          unit_price: number
          total_price: number
          cutting_time_minutes: number
          dimensions: Json
          preview_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          design_file_url?: string
          design_file_name?: string
          material_id?: string
          thickness?: number
          quantity?: number
          unit_price?: number
          total_price?: number
          cutting_time_minutes?: number
          dimensions?: Json
          preview_url?: string | null
          created_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          user_id: string | null
          design_file_url: string
          design_file_name: string
          material_id: string
          thickness: number
          quantity: number
          unit_price: number
          total_price: number
          cutting_time_minutes: number
          dimensions: Json
          preview_url: string | null
          expires_at: string
          converted_to_order: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          design_file_url: string
          design_file_name: string
          material_id: string
          thickness: number
          quantity: number
          unit_price: number
          total_price: number
          cutting_time_minutes: number
          dimensions: Json
          preview_url?: string | null
          expires_at: string
          converted_to_order?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          design_file_url?: string
          design_file_name?: string
          material_id?: string
          thickness?: number
          quantity?: number
          unit_price?: number
          total_price?: number
          cutting_time_minutes?: number
          dimensions?: Json
          preview_url?: string | null
          expires_at?: string
          converted_to_order?: boolean
          created_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string | null
          email: string
          name: string
          subject: string
          message: string
          order_number: string | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          name: string
          subject: string
          message: string
          order_number?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          name?: string
          subject?: string
          message?: string
          order_number?: string | null
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
