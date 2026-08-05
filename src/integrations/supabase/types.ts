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
      request_question_answers: {
        Row: {
          answer: Json
          created_at: string
          definition_version: number
          question_id: string
          request_id: string
          updated_at: string
        }
        Insert: {
          answer: Json
          created_at?: string
          definition_version: number
          question_id: string
          request_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          definition_version?: number
          question_id?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "request_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_question_answers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_questions: {
        Row: {
          condition_operator: string | null
          condition_question_id: string | null
          condition_value: Json | null
          created_at: string
          definition_version: number
          field_type: string
          help_text_he: string | null
          id: string
          is_active: boolean
          is_required: boolean
          options: Json
          prompt_he: string
          service_id: string | null
          sort_order: number
          subcategory_id: string
          updated_at: string
        }
        Insert: {
          condition_operator?: string | null
          condition_question_id?: string | null
          condition_value?: Json | null
          created_at?: string
          definition_version?: number
          field_type: string
          help_text_he?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json
          prompt_he: string
          service_id?: string | null
          sort_order?: number
          subcategory_id: string
          updated_at?: string
        }
        Update: {
          condition_operator?: string | null
          condition_question_id?: string | null
          condition_value?: Json | null
          created_at?: string
          definition_version?: number
          field_type?: string
          help_text_he?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json
          prompt_he?: string
          service_id?: string | null
          sort_order?: number
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "request_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_questions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_questions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          budget_type: Database["public"]["Enums"]["budget_type"]
          category_id: string | null
          city: string | null
          closed_at: string | null
          created_at: string
          customer_id: string
          delivery_mode: string | null
          description: string | null
          id: string
          matching_policy: string
          missing_service_text: string | null
          offers_count: number
          published_at: string | null
          schema_version: number
          selected_offer_id: string | null
          service_area_id: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          subcategory_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"]
          category_id?: string | null
          city?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id: string
          delivery_mode?: string | null
          description?: string | null
          id?: string
          matching_policy?: string
          missing_service_text?: string | null
          offers_count?: number
          published_at?: string | null
          schema_version?: number
          selected_offer_id?: string | null
          service_area_id?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subcategory_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["budget_type"]
          category_id?: string | null
          city?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          delivery_mode?: string | null
          description?: string | null
          id?: string
          matching_policy?: string
          missing_service_text?: string | null
          offers_count?: number
          published_at?: string | null
          schema_version?: number
          selected_offer_id?: string | null
          service_area_id?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subcategory_id?: string | null
          title?: string | null
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
            foreignKeyName: "requests_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      service_areas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_he: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_he: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_he?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_he: string
          slug: string
          sort_order: number
          subcategory_id: string
          supports_remote: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_he: string
          slug: string
          sort_order?: number
          subcategory_id: string
          supports_remote?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_he?: string
          slug?: string
          sort_order?: number
          subcategory_id?: string
          supports_remote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "services_subcategory_id_fkey"
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
      supplier_onboarding_state: {
        Row: {
          created_at: string
          current_stage: number
          eligibility_policy: string
          notice_dismissed_at: string | null
          submitted_at: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: number
          eligibility_policy: string
          notice_dismissed_at?: string | null
          submitted_at?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: number
          eligibility_policy?: string
          notice_dismissed_at?: string | null
          submitted_at?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_profiles: {
        Row: {
          base_city: string | null
          business_name: string
          business_type: string | null
          created_at: string
          description: string
          max_travel_km: number | null
          portfolio_links: string[]
          remote_available: boolean | null
          service_area: string
          service_mode: string | null
          starting_price_ils: number | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          base_city?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string
          description?: string
          max_travel_km?: number | null
          portfolio_links?: string[]
          remote_available?: boolean | null
          service_area?: string
          service_mode?: string | null
          starting_price_ils?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          base_city?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          description?: string
          max_travel_km?: number | null
          portfolio_links?: string[]
          remote_available?: boolean | null
          service_area?: string
          service_mode?: string | null
          starting_price_ils?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      supplier_service_areas: {
        Row: {
          created_at: string
          service_area_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          service_area_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          service_area_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_service_areas_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_services: {
        Row: {
          created_at: string
          service_id: string
          subcategory_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          service_id: string
          subcategory_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          service_id?: string
          subcategory_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_services_supplier_id_subcategory_id_fkey"
            columns: ["supplier_id", "subcategory_id"]
            isOneToOne: false
            referencedRelation: "supplier_subcategories"
            referencedColumns: ["supplier_id", "subcategory_id"]
          },
        ]
      }
      supplier_subcategories: {
        Row: {
          created_at: string
          is_primary: boolean
          subcategory_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          subcategory_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
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
      _is_current_supplier_onboarding_data_complete: {
        Args: { _supplier_id: string }
        Returns: boolean
      }
      _is_legacy_supplier_profile_complete: {
        Args: { _supplier_id: string }
        Returns: boolean
      }
      _is_supplier_eligible_for_new_matches: {
        Args: { _supplier_id: string }
        Returns: boolean
      }
      _is_supplier_profile_complete: {
        Args: { _supplier_id: string }
        Returns: boolean
      }
      _match_authorizes_supplier: {
        Args: { _request_id: string; _supplier_id: string }
        Returns: boolean
      }
      _notify_match_created: {
        Args: { _request_id: string; _supplier_id: string }
        Returns: undefined
      }
      _reconcile_matches_for_request: {
        Args: { _request_id: string }
        Returns: number
      }
      _reconcile_matches_for_supplier: {
        Args: { _supplier_id: string }
        Returns: number
      }
      _request_question_is_visible: {
        Args: { _question_id: string; _request_id: string }
        Returns: boolean
      }
      _supplier_has_valid_service_selection: {
        Args: { _service_id?: string; _supplier_id: string }
        Returns: boolean
      }
      _supplier_matches_request_taxonomy: {
        Args: { _request_id: string; _supplier_id: string }
        Returns: boolean
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
      cancel_request: { Args: { _request_id: string }; Returns: string }
      close_request: { Args: { _request_id: string }; Returns: string }
      complete_registration_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
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
          delivery_mode: string
          description: string
          id: string
          match_created_at: string
          missing_service_text: string
          published_at: string
          questionnaire_answers: Json
          service_area_id: string
          service_area_name_he: string
          service_id: string
          service_name_he: string
          status: Database["public"]["Enums"]["request_status"]
          subcategory_id: string
          subcategory_name_he: string
          title: string
        }[]
      }
      get_customer_request_offers: {
        Args: { _request_id: string }
        Returns: {
          base_city: string
          business_description: string
          business_name: string
          created_at: string
          estimated_days: number
          id: string
          message: string
          price: number
          request_id: string
          status: Database["public"]["Enums"]["offer_status"]
          years_experience: number
        }[]
      }
      get_or_create_request_draft: { Args: never; Returns: string }
      get_smart_supplier_requests: {
        Args: { _minimum_score?: number; _request_id?: string }
        Returns: {
          budget_max: number
          budget_min: number
          budget_type: Database["public"]["Enums"]["budget_type"]
          category_id: string
          category_name_he: string
          city: string
          created_at: string
          delivery_mode: string
          description: string
          id: string
          match_badges: Json
          match_created_at: string
          match_explanations: Json
          match_level: string
          match_score: number
          match_strength: string
          missing_service_text: string
          published_at: string
          questionnaire_answers: Json
          service_area_id: string
          service_area_name_he: string
          service_id: string
          service_name_he: string
          status: Database["public"]["Enums"]["request_status"]
          subcategory_id: string
          subcategory_name_he: string
          title: string
        }[]
      }
      get_supplier_offer: {
        Args: { _request_id: string }
        Returns: {
          created_at: string
          estimated_days: number
          id: string
          message: string
          price: number
          request_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
          withdrawn_at: string
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
      publish_request: { Args: { _request_id: string }; Returns: string }
      select_offer: { Args: { _offer_id: string }; Returns: string }
      submit_offer: {
        Args: {
          _estimated_days: number
          _message: string
          _price: number
          _request_id: string
        }
        Returns: string
      }
      submit_supplier_onboarding: { Args: never; Returns: boolean }
      update_submitted_offer: {
        Args: {
          _estimated_days: number
          _message: string
          _offer_id: string
          _price: number
        }
        Returns: string
      }
      withdraw_offer: { Args: { _offer_id: string }; Returns: string }
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
