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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          address: string | null
          ai_summary: string | null
          alternatives: Json | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          confidence_level: string | null
          cons: Json | null
          country: string | null
          created_at: string
          currency: string | null
          data_source: string | null
          demand_strength: number | null
          downside_scenario: number | null
          global_score: number | null
          id: string
          image_url: string | null
          liquidity_outlook: number | null
          market_classification: string | null
          market_rank: number | null
          market_stability: number | null
          market_total: number | null
          opportunity_signals: Json | null
          percentile: number | null
          price: string | null
          price_history: Json | null
          primary_insight: string | null
          projected_roi_high: number | null
          projected_roi_low: number | null
          property_type: string | null
          pros: Json | null
          red_flags: Json | null
          risk_level: number | null
          roi_potential: number | null
          score_explanations: Json | null
          size_sqm: number | null
          slug: string | null
          upside_scenario: number | null
          url: string
          user_id: string
          verdict: string | null
          why_not_90: Json | null
          year_built: number | null
          yield_trend: Json | null
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          alternatives?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          confidence_level?: string | null
          cons?: Json | null
          country?: string | null
          created_at?: string
          currency?: string | null
          data_source?: string | null
          demand_strength?: number | null
          downside_scenario?: number | null
          global_score?: number | null
          id?: string
          image_url?: string | null
          liquidity_outlook?: number | null
          market_classification?: string | null
          market_rank?: number | null
          market_stability?: number | null
          market_total?: number | null
          opportunity_signals?: Json | null
          percentile?: number | null
          price?: string | null
          price_history?: Json | null
          primary_insight?: string | null
          projected_roi_high?: number | null
          projected_roi_low?: number | null
          property_type?: string | null
          pros?: Json | null
          red_flags?: Json | null
          risk_level?: number | null
          roi_potential?: number | null
          score_explanations?: Json | null
          size_sqm?: number | null
          slug?: string | null
          upside_scenario?: number | null
          url: string
          user_id: string
          verdict?: string | null
          why_not_90?: Json | null
          year_built?: number | null
          yield_trend?: Json | null
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          alternatives?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          confidence_level?: string | null
          cons?: Json | null
          country?: string | null
          created_at?: string
          currency?: string | null
          data_source?: string | null
          demand_strength?: number | null
          downside_scenario?: number | null
          global_score?: number | null
          id?: string
          image_url?: string | null
          liquidity_outlook?: number | null
          market_classification?: string | null
          market_rank?: number | null
          market_stability?: number | null
          market_total?: number | null
          opportunity_signals?: Json | null
          percentile?: number | null
          price?: string | null
          price_history?: Json | null
          primary_insight?: string | null
          projected_roi_high?: number | null
          projected_roi_low?: number | null
          property_type?: string | null
          pros?: Json | null
          red_flags?: Json | null
          risk_level?: number | null
          roi_potential?: number | null
          score_explanations?: Json | null
          size_sqm?: number | null
          slug?: string | null
          upside_scenario?: number | null
          url?: string
          user_id?: string
          verdict?: string | null
          why_not_90?: Json | null
          year_built?: number | null
          yield_trend?: Json | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          url: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type?: string
          id?: string
          metadata?: Json | null
          url?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          url?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          created_at: string
          id: string
          ip_country: string | null
          ip_country_code: string | null
          is_bounce: boolean | null
          page_load_time_ms: number | null
          path: string
          referrer: string | null
          session_id: string
          time_on_page_ms: number | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_country?: string | null
          ip_country_code?: string | null
          is_bounce?: boolean | null
          page_load_time_ms?: number | null
          path: string
          referrer?: string | null
          session_id: string
          time_on_page_ms?: number | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_country?: string | null
          ip_country_code?: string | null
          is_bounce?: boolean | null
          page_load_time_ms?: number | null
          path?: string
          referrer?: string | null
          session_id?: string
          time_on_page_ms?: number | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          detected_country: string | null
          email: string | null
          id: string
          last_login_at: string | null
          login_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detected_country?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          detected_country?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      property_reviews: {
        Row: {
          analysis_id: string
          comment: string
          created_at: string
          id: string
          is_verified_owner: boolean
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          comment: string
          created_at?: string
          id?: string
          is_verified_owner?: boolean
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          comment?: string
          created_at?: string
          id?: string
          is_verified_owner?: boolean
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reviews_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          credits_total: number
          credits_used: number
          id: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
