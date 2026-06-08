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
      agent_applications: {
        Row: {
          active_markets: string[] | null
          created_at: string
          email: string
          full_name: string
          id: string
          linkedin_url: string | null
          one_closed_transaction: string | null
          primary_country: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          whatsapp: string | null
          years_experience: number | null
        }
        Insert: {
          active_markets?: string[] | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          linkedin_url?: string | null
          one_closed_transaction?: string | null
          primary_country?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Update: {
          active_markets?: string[] | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          linkedin_url?: string | null
          one_closed_transaction?: string | null
          primary_country?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      agent_brand: {
        Row: {
          accent_hex: string | null
          agency_name: string | null
          agent_name: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          phone_e164: string | null
          slug: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          accent_hex?: string | null
          agency_name?: string | null
          agent_name?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone_e164?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          accent_hex?: string | null
          agency_name?: string | null
          agent_name?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone_e164?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          active_markets: string[] | null
          agent_number: number | null
          approx_closes_per_year: number | null
          badge_directory_optin: boolean | null
          created_at: string
          email: string
          full_name: string
          id: string
          primary_country_id: string | null
          user_id: string | null
          verified: boolean | null
          verified_at: string | null
          whatsapp: string | null
          years_experience: number | null
        }
        Insert: {
          active_markets?: string[] | null
          agent_number?: number | null
          approx_closes_per_year?: number | null
          badge_directory_optin?: boolean | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          primary_country_id?: string | null
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Update: {
          active_markets?: string[] | null
          agent_number?: number | null
          approx_closes_per_year?: number | null
          badge_directory_optin?: boolean | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          primary_country_id?: string | null
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          whatsapp?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_primary_country_id_fkey"
            columns: ["primary_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          address: string | null
          ai_summary: string | null
          alternatives: Json | null
          base_votes: number
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
          base_votes?: number
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
          base_votes?: number
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
      commission_terms: {
        Row: {
          base_pct: number | null
          base_pct_top_tier: number | null
          bonus_text: string | null
          display_string: string | null
          escrow_protected: boolean | null
          flat_eur: number | null
          id: string
          payment_milestones: string | null
          project_id: string
        }
        Insert: {
          base_pct?: number | null
          base_pct_top_tier?: number | null
          bonus_text?: string | null
          display_string?: string | null
          escrow_protected?: boolean | null
          flat_eur?: number | null
          id?: string
          payment_milestones?: string | null
          project_id: string
        }
        Update: {
          base_pct?: number | null
          base_pct_top_tier?: number | null
          bonus_text?: string | null
          display_string?: string | null
          escrow_protected?: boolean | null
          flat_eur?: number | null
          id?: string
          payment_milestones?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_terms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          estimated_searches: string | null
          id: string
          message: string | null
          phone: string | null
          source: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          estimated_searches?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          source?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          estimated_searches?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          source?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          active: boolean | null
          created_at: string
          flag_emoji: string | null
          golden_visa_eligible: boolean | null
          id: string
          iso_code: string
          name: string
          project_count: number | null
          region: string | null
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          flag_emoji?: string | null
          golden_visa_eligible?: boolean | null
          id?: string
          iso_code: string
          name: string
          project_count?: number | null
          region?: string | null
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          flag_emoji?: string | null
          golden_visa_eligible?: boolean | null
          id?: string
          iso_code?: string
          name?: string
          project_count?: number | null
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      developers: {
        Row: {
          country_id: string | null
          created_at: string
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          projects_delivered: number | null
          reputation_notes: string | null
          slug: string
          website: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          projects_delivered?: number | null
          reputation_notes?: string | null
          slug: string
          website?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          projects_delivered?: number | null
          reputation_notes?: string | null
          slug?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_downloads: {
        Row: {
          agent_id: string
          downloaded_at: string
          id: string
          project_id: string
        }
        Insert: {
          agent_id: string
          downloaded_at?: string
          id?: string
          project_id: string
        }
        Update: {
          agent_id?: string
          downloaded_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_downloads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_downloads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      due_diligence_checklists: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_checklists_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
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
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          id: string
          played_at: string
          score: number
          total_rounds: number
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string
          score: number
          total_rounds?: number
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string
          score?: number
          total_rounds?: number
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_ideal_message: string | null
          ai_pain_points: Json | null
          ai_recommended_approach: string | null
          ai_summary: string | null
          company_name: string | null
          company_size: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_history: Json | null
          created_at: string
          id: string
          industry: string | null
          last_contacted_at: string | null
          lead_score: number | null
          linkedin_url: string | null
          location: string | null
          metadata: Json | null
          next_followup_at: string | null
          notes: string | null
          source: string | null
          source_url: string | null
          status: string | null
          tags: Json | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          ai_ideal_message?: string | null
          ai_pain_points?: Json | null
          ai_recommended_approach?: string | null
          ai_summary?: string | null
          company_name?: string | null
          company_size?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_history?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          next_followup_at?: string | null
          notes?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: Json | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          ai_ideal_message?: string | null
          ai_pain_points?: Json | null
          ai_recommended_approach?: string | null
          ai_summary?: string | null
          company_name?: string | null
          company_size?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_history?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          lead_score?: number | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          next_followup_at?: string | null
          notes?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: Json | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
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
      pipeline_entries: {
        Row: {
          agent_id: string
          client_alias: string | null
          id: string
          notes: string | null
          project_id: string
          stage: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          client_alias?: string | null
          id?: string
          notes?: string | null
          project_id: string
          stage?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          client_alias?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_properties: {
        Row: {
          analysis_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          purchase_date: string
          purchase_price: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          purchase_price: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          purchase_price?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_properties_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          detected_country: string | null
          email: string | null
          id: string
          last_login_at: string | null
          login_count: number | null
          referral_code: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          detected_country?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          referral_code?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          detected_country?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          referral_code?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_scores: {
        Row: {
          computed_at: string
          dim_delivery_certainty: number | null
          dim_developer_reputation: number | null
          dim_investment_economics: number | null
          dim_legal_protection: number | null
          dim_location_fundamentals: number | null
          id: string
          notes: string | null
          project_id: string
          rank_global: number | null
          rank_in_country: number | null
          weighted_score: number | null
        }
        Insert: {
          computed_at?: string
          dim_delivery_certainty?: number | null
          dim_developer_reputation?: number | null
          dim_investment_economics?: number | null
          dim_legal_protection?: number | null
          dim_location_fundamentals?: number | null
          id?: string
          notes?: string | null
          project_id: string
          rank_global?: number | null
          rank_in_country?: number | null
          weighted_score?: number | null
        }
        Update: {
          computed_at?: string
          dim_delivery_certainty?: number | null
          dim_developer_reputation?: number | null
          dim_investment_economics?: number | null
          dim_legal_protection?: number | null
          dim_location_fundamentals?: number | null
          id?: string
          notes?: string | null
          project_id?: string
          rank_global?: number | null
          rank_in_country?: number | null
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean | null
          asset_tags: string[] | null
          city: string | null
          conflict_disclosure: string | null
          construction_pct: number | null
          country_id: string
          created_at: string
          delivery_quarter: string | null
          description: string | null
          developer_id: string
          district: string | null
          gallery_image_urls: string[] | null
          golden_visa_eligible: boolean | null
          hero_image_url: string | null
          id: string
          is_owned_by_realhunt: boolean | null
          name: string
          risk_flags: string[] | null
          slug: string
          status: string | null
          ticket_max_eur: number | null
          ticket_min_eur: number | null
          unit_types: string[] | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean | null
          asset_tags?: string[] | null
          city?: string | null
          conflict_disclosure?: string | null
          construction_pct?: number | null
          country_id: string
          created_at?: string
          delivery_quarter?: string | null
          description?: string | null
          developer_id: string
          district?: string | null
          gallery_image_urls?: string[] | null
          golden_visa_eligible?: boolean | null
          hero_image_url?: string | null
          id?: string
          is_owned_by_realhunt?: boolean | null
          name: string
          risk_flags?: string[] | null
          slug: string
          status?: string | null
          ticket_max_eur?: number | null
          ticket_min_eur?: number | null
          unit_types?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean | null
          asset_tags?: string[] | null
          city?: string | null
          conflict_disclosure?: string | null
          construction_pct?: number | null
          country_id?: string
          created_at?: string
          delivery_quarter?: string | null
          description?: string | null
          developer_id?: string
          district?: string | null
          gallery_image_urls?: string[] | null
          golden_visa_eligible?: boolean | null
          hero_image_url?: string | null
          id?: string
          is_owned_by_realhunt?: boolean | null
          name?: string
          risk_flags?: string[] | null
          slug?: string
          status?: string | null
          ticket_max_eur?: number | null
          ticket_min_eur?: number | null
          unit_types?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_notes: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          note: string
          tags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          note?: string
          tags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          note?: string
          tags?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_notes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
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
      referrals: {
        Row: {
          bonus_granted: boolean
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_granted?: boolean
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_granted?: boolean
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          agent_id: string
          created_at: string
          filters: Json
          id: string
          name: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          filters: Json
          id?: string
          name: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          filters?: Json
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_alerts: {
        Row: {
          active: boolean
          created_at: string
          criteria: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          criteria?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          criteria?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          analysis_id: string | null
          click_count: number
          created_at: string
          id: string
          last_clicked_at: string | null
          owner_user_id: string | null
          slug: string
          target_url: string
        }
        Insert: {
          analysis_id?: string | null
          click_count?: number
          created_at?: string
          id?: string
          last_clicked_at?: string | null
          owner_user_id?: string | null
          slug: string
          target_url: string
        }
        Update: {
          analysis_id?: string | null
          click_count?: number
          created_at?: string
          id?: string
          last_clicked_at?: string | null
          owner_user_id?: string | null
          slug?: string
          target_url?: string
        }
        Relationships: []
      }
      slot_reservations: {
        Row: {
          agent_id: string
          client_alias: string | null
          id: string
          notes: string | null
          project_id: string
          reserved_at: string
          status: string | null
        }
        Insert: {
          agent_id: string
          client_alias?: string | null
          id?: string
          notes?: string | null
          project_id: string
          reserved_at?: string
          status?: string | null
        }
        Update: {
          agent_id?: string
          client_alias?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          reserved_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_reservations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_reservations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_active_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_active_date?: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_active_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          user_id: string | null
          voter_fingerprint: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          user_id?: string | null
          voter_fingerprint: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
          voter_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          initial_price: string | null
          initial_score: number | null
          last_checked_at: string | null
          latest_price: string | null
          latest_score: number | null
          price_delta: string | null
          score_delta: number | null
          url: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          initial_price?: string | null
          initial_score?: number | null
          last_checked_at?: string | null
          latest_price?: string | null
          latest_score?: number | null
          price_delta?: string | null
          score_delta?: number | null
          url: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          initial_price?: string | null
          initial_score?: number | null
          last_checked_at?: string | null
          latest_price?: string | null
          latest_score?: number | null
          price_delta?: string | null
          score_delta?: number | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_realhunt_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
