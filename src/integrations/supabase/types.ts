export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_he: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_he: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_he?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          request_id: string
          status: Database["public"]["Enums"]["match_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          status?: Database["public"]["Enums"]["match_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["match_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          offer_id: string | null
          read_at: string | null
          request_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          read_at?: string | null
          request_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          read_at?: string | null
          request_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          estimated_days: number
          id: string
          message: string
          price: number
          request_id: string
          status: Database["public"]["Enums"]["offer_status"]
          supplier_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          estimated_days: number
          id?: string
          message: string
          price: number
          request_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          supplier_id: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          estimated_days?: number
          id?: string
          message?: string
          price?: number
          request_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          supplier_id?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      request_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          request_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          request_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          request_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          budget_type: Database["public"]["Enums"]["budget_type"]
          category_id: string
          city: string
          closed_at: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          offers_count: number
          published_at: string
          selected_offer_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          subcategory_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"]
          category_id: string
          city: string
          closed_at?: string | null
          created_at?: string
          customer_id: string
          description: string
          id?: string
          offers_count?: number
          published_at?: string
          selected_offer_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subcategory_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"]
          category_id?: string
          city?: string
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          offers_count?: number
          published_at?: string
          selected_offer_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subcategory_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_selected_offer_fk"
            columns: ["selected_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          name_he: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_he: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_he?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_categories: {
        Row: {
          category_id: string
          created_at: string
          supplier_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          supplier_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          business_name: string
          created_at: string
          description: string
          portfolio_links: string[]
          service_area: string
          starting_price_ils: number | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string
          portfolio_links?: string[]
          service_area?: string
          starting_price_ils?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string
          portfolio_links?: string[]
          service_area?: string
          starting_price_ils?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      supplier_subcategories: {
        Row: {
          created_at: string
          subcategory_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          subcategory_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          subcategory_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _deactivate_matches_for_request: {
        Args: { _request_id: string }
        Returns: number
      }
      _deactivate_matches_for_supplier: {
        Args: { _supplier_id: string }
        Returns: number
      }
      _deactivate_matches_for_supplier_subcategory: {
        Args: { _subcategory_id: string; _supplier_id: string }
        Returns: number
      }
      _generate_matches_for_request: {
        Args: { _request_id: string }
        Returns: number
      }
      _generate_matches_for_supplier: {
        Args: { _supplier_id: string }
        Returns: number
      }
      _generate_matches_for_supplier_subcategory: {
        Args: { _subcategory_id: string; _supplier_id: string }
        Returns: number
      }
      _is_supplier_profile_complete: {
        Args: { _supplier_id: string }
        Returns: boolean
      }
      _notify_match_created: {
        Args: { _request_id: string; _supplier_id: string }
        Returns: undefined
      }
      _supplier_serves_subcategory: {
        Args: { _subcategory_id: string; _supplier_id: string }
        Returns: boolean
      }
      admin_create_match: {
        Args: { _request_id: string; _supplier_id: string }
        Returns: string
      }
      admin_reconcile_matches: {
        Args: never
        Returns: {
          created: number
          deactivated: number
          reactivated: number
        }[]
      }
      can_submit_offer: { Args: { _request_id: string }; Returns: boolean }
      get_active_supplier_requests: {
        Args: { _request_id?: string }
        Returns: {
          budget_max: number
          budget_min: number
          budget_type: Database["public"]["Enums"]["budget_type"]
          category_id: string
          category_name_he: string
          city: string
          created_at: string
          description: string
          id: string
          match_created_at: string
          published_at: string
          status: Database["public"]["Enums"]["request_status"]
          subcategory_id: string
          subcategory_name_he: string
          title: string
        }[]
      }
      has_active_match: { Args: { _request_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_supplier_profile_complete: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "supplier" | "admin"
      budget_type: "fixed" | "range" | "open"
      match_status: "active" | "inactive"
      notification_type:
        | "request_cancelled"
        | "request_awarded"
        | "request_closed"
        | "offer_received"
        | "offer_selected"
        | "offer_rejected"
        | "offer_withdrawn"
        | "match_created"
      offer_status: "submitted" | "withdrawn" | "selected" | "rejected"
      request_status: "open" | "awarded" | "closed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "supplier", "admin"],
      budget_type: ["fixed", "range", "open"],
      match_status: ["active", "inactive"],
      notification_type: [
        "request_cancelled",
        "request_awarded",
        "request_closed",
        "offer_received",
        "offer_selected",
        "offer_rejected",
        "offer_withdrawn",
        "match_created",
      ],
      offer_status: ["submitted", "withdrawn", "selected", "rejected"],
      request_status: ["open", "awarded", "closed", "cancelled"],
    },
  },
} as const
