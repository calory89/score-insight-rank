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
      alerts: {
        Row: {
          beach: boolean | null
          country: string | null
          created_at: string | null
          email: string
          id: string
          max_price: number | null
          user_id: string | null
        }
        Insert: {
          beach?: boolean | null
          country?: string | null
          created_at?: string | null
          email: string
          id?: string
          max_price?: number | null
          user_id?: string | null
        }
        Update: {
          beach?: boolean | null
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          max_price?: number | null
          user_id?: string | null
        }
        Relationships: []
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
      app_secrets: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
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
      email_delivery_events: {
        Row: {
          event_at: string
          event_id: string
          event_type: string
          provider_email_id: string
          received_at: string
        }
        Insert: {
          event_at: string
          event_id: string
          event_type: string
          provider_email_id: string
          received_at?: string
        }
        Update: {
          event_at?: string
          event_id?: string
          event_type?: string
          provider_email_id?: string
          received_at?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string | null
          html: string
          id: number
          label: string | null
          last_error: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          html: string
          id?: never
          label?: string | null
          last_error?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          html?: string
          id?: never
          label?: string | null
          last_error?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          message_id: string | null
          provider_email_id: string | null
          recipient_email: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: never
          message_id?: string | null
          provider_email_id?: string | null
          recipient_email?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: never
          message_id?: string | null
          provider_email_id?: string | null
          recipient_email?: string | null
          status?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string | null
          email: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          token?: string
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
      experiments: {
        Row: {
          active: boolean
          created_at: string
          goals: string[]
          key: string
          kind: string
          name: string
          notes: string | null
          page: string
          updated_at: string
          variants: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          goals?: string[]
          key: string
          kind?: string
          name: string
          notes?: string | null
          page?: string
          updated_at?: string
          variants?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          goals?: string[]
          key?: string
          kind?: string
          name?: string
          notes?: string | null
          page?: string
          updated_at?: string
          variants?: Json
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
      find_events: {
        Row: {
          created_at: string | null
          event: string
          find_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          find_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          find_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "find_events_find_id_fkey"
            columns: ["find_id"]
            isOneToOne: false
            referencedRelation: "ig_finds"
            referencedColumns: ["id"]
          },
        ]
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
      home_requests: {
        Row: {
          contacted: boolean
          created_at: string | null
          email: string | null
          find_id: string | null
          find_shortcode: string | null
          id: string
          message: string | null
          name: string | null
          phone: string | null
          sold: boolean
          user_id: string | null
        }
        Insert: {
          contacted?: boolean
          created_at?: string | null
          email?: string | null
          find_id?: string | null
          find_shortcode?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          sold?: boolean
          user_id?: string | null
        }
        Update: {
          contacted?: boolean
          created_at?: string | null
          email?: string | null
          find_id?: string | null
          find_shortcode?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          sold?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_requests_find_id_fkey"
            columns: ["find_id"]
            isOneToOne: false
            referencedRelation: "ig_finds"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_finds: {
        Row: {
          bedrooms: number | null
          caption: string | null
          caption_en: string | null
          country_guess: string | null
          created_at: string | null
          external_url: string | null
          hook: string | null
          id: string
          image_urls: string[] | null
          is_beach: boolean
          lat: number | null
          likes: number | null
          lng: number | null
          location_name: string | null
          photo_score: number | null
          post_url: string
          posted_at: string | null
          price_eur: number | null
          price_in_image: boolean
          price_raw: string | null
          rank_score: number | null
          saves_count: number
          shortcode: string | null
          source_account: string
          source_checked_at: string | null
          sqm: number | null
          status: string | null
          verified: boolean
        }
        Insert: {
          bedrooms?: number | null
          caption?: string | null
          caption_en?: string | null
          country_guess?: string | null
          created_at?: string | null
          external_url?: string | null
          hook?: string | null
          id?: string
          image_urls?: string[] | null
          is_beach?: boolean
          lat?: number | null
          likes?: number | null
          lng?: number | null
          location_name?: string | null
          photo_score?: number | null
          post_url: string
          posted_at?: string | null
          price_eur?: number | null
          price_in_image?: boolean
          price_raw?: string | null
          rank_score?: number | null
          saves_count?: number
          shortcode?: string | null
          source_account: string
          source_checked_at?: string | null
          sqm?: number | null
          status?: string | null
          verified?: boolean
        }
        Update: {
          bedrooms?: number | null
          caption?: string | null
          caption_en?: string | null
          country_guess?: string | null
          created_at?: string | null
          external_url?: string | null
          hook?: string | null
          id?: string
          image_urls?: string[] | null
          is_beach?: boolean
          lat?: number | null
          likes?: number | null
          lng?: number | null
          location_name?: string | null
          photo_score?: number | null
          post_url?: string
          posted_at?: string | null
          price_eur?: number | null
          price_in_image?: boolean
          price_raw?: string | null
          rank_score?: number | null
          saves_count?: number
          shortcode?: string | null
          source_account?: string
          source_checked_at?: string | null
          sqm?: number | null
          status?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      introductions: {
        Row: {
          buyer_budget: number | null
          buyer_contact: string | null
          buyer_country: string | null
          buyer_fp: string
          commission_pct_snapshot: number | null
          contact_authorization_note: string | null
          contact_authorized_at: string | null
          contact_authorized_by: string | null
          contact_revealed_at: string | null
          created_at: string
          created_by: string | null
          dev_notes: string | null
          fee_eur: number
          from_developer: string | null
          id: string
          next_action_at: string | null
          note: string | null
          prior_contact_at: string | null
          protection_checked_at: string | null
          source_share_pct_snapshot: number | null
          status: string
          to_developer: string
          updated_at: string
        }
        Insert: {
          buyer_budget?: number | null
          buyer_contact?: string | null
          buyer_country?: string | null
          buyer_fp: string
          commission_pct_snapshot?: number | null
          contact_authorization_note?: string | null
          contact_authorized_at?: string | null
          contact_authorized_by?: string | null
          contact_revealed_at?: string | null
          created_at?: string
          created_by?: string | null
          dev_notes?: string | null
          fee_eur?: number
          from_developer?: string | null
          id?: string
          next_action_at?: string | null
          note?: string | null
          prior_contact_at?: string | null
          protection_checked_at?: string | null
          source_share_pct_snapshot?: number | null
          status?: string
          to_developer: string
          updated_at?: string
        }
        Update: {
          buyer_budget?: number | null
          buyer_contact?: string | null
          buyer_country?: string | null
          buyer_fp?: string
          commission_pct_snapshot?: number | null
          contact_authorization_note?: string | null
          contact_authorized_at?: string | null
          contact_authorized_by?: string | null
          contact_revealed_at?: string | null
          created_at?: string
          created_by?: string | null
          dev_notes?: string | null
          fee_eur?: number
          from_developer?: string | null
          id?: string
          next_action_at?: string | null
          note?: string | null
          prior_contact_at?: string | null
          protection_checked_at?: string | null
          source_share_pct_snapshot?: number | null
          status?: string
          to_developer?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "introductions_from_developer_fkey"
            columns: ["from_developer"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "introductions_to_developer_fkey"
            columns: ["to_developer"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_fingerprints: {
        Row: {
          budget: number | null
          country: string | null
          developer_id: string
          fp: string
          id: number
          kind: string
          shared: boolean
          source: string | null
          tag: string | null
          uploaded_at: string
        }
        Insert: {
          budget?: number | null
          country?: string | null
          developer_id: string
          fp: string
          id?: number
          kind?: string
          shared?: boolean
          source?: string | null
          tag?: string | null
          uploaded_at?: string
        }
        Update: {
          budget?: number | null
          country?: string | null
          developer_id?: string
          fp?: string
          id?: number
          kind?: string
          shared?: boolean
          source?: string | null
          tag?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_fingerprints_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
        ]
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
      network_audit: {
        Row: {
          action: string
          actor: string | null
          after_values: Json
          before_values: Json
          created_at: string
          entity: string
          entity_id: string
          fields: string[]
          id: number
          next_status: string | null
          previous_status: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          after_values?: Json
          before_values?: Json
          created_at?: string
          entity: string
          entity_id: string
          fields?: string[]
          id?: never
          next_status?: string | null
          previous_status?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          after_values?: Json
          before_values?: Json
          created_at?: string
          entity?: string
          entity_id?: string
          fields?: string[]
          id?: never
          next_status?: string | null
          previous_status?: string | null
        }
        Relationships: []
      }
      network_deals: {
        Row: {
          buyer_fp: string | null
          commission_eur: number
          commission_pct: number
          created_by: string | null
          currency: string
          developer_id: string
          exempt: boolean
          exempt_reason: string | null
          id: string
          introduction_id: string | null
          invoiced_at: string | null
          notes: string | null
          paid_at: string | null
          reported_at: string
          sale_price: number
          source_developer_id: string | null
          source_paid_at: string | null
          source_share_eur: number
          source_share_pct: number
          status: string
          updated_at: string
        }
        Insert: {
          buyer_fp?: string | null
          commission_eur?: number
          commission_pct?: number
          created_by?: string | null
          currency?: string
          developer_id: string
          exempt?: boolean
          exempt_reason?: string | null
          id?: string
          introduction_id?: string | null
          invoiced_at?: string | null
          notes?: string | null
          paid_at?: string | null
          reported_at?: string
          sale_price: number
          source_developer_id?: string | null
          source_paid_at?: string | null
          source_share_eur?: number
          source_share_pct?: number
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_fp?: string | null
          commission_eur?: number
          commission_pct?: number
          created_by?: string | null
          currency?: string
          developer_id?: string
          exempt?: boolean
          exempt_reason?: string | null
          id?: string
          introduction_id?: string | null
          invoiced_at?: string | null
          notes?: string | null
          paid_at?: string | null
          reported_at?: string
          sale_price?: number
          source_developer_id?: string | null
          source_paid_at?: string | null
          source_share_eur?: number
          source_share_pct?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_deals_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_deals_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_deals_source_developer_id_fkey"
            columns: ["source_developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
        ]
      }
      network_developers: {
        Row: {
          agreement_accepted_at: string | null
          agreement_signer: string | null
          agreement_ua: string | null
          agreement_version: string | null
          avg_ticket: number | null
          commission_pct: number
          company: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          fee_eur: number
          id: string
          mode: string | null
          notes: string | null
          phone: string | null
          price_from: number | null
          project_name: string | null
          project_url: string | null
          receiving_enabled: boolean
          share_default: boolean
          source_share_pct: number
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          agreement_accepted_at?: string | null
          agreement_signer?: string | null
          agreement_ua?: string | null
          agreement_version?: string | null
          avg_ticket?: number | null
          commission_pct?: number
          company?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          fee_eur?: number
          id?: string
          mode?: string | null
          notes?: string | null
          phone?: string | null
          price_from?: number | null
          project_name?: string | null
          project_url?: string | null
          receiving_enabled?: boolean
          share_default?: boolean
          source_share_pct?: number
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          agreement_accepted_at?: string | null
          agreement_signer?: string | null
          agreement_ua?: string | null
          agreement_version?: string | null
          avg_ticket?: number | null
          commission_pct?: number
          company?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          fee_eur?: number
          id?: string
          mode?: string | null
          notes?: string | null
          phone?: string | null
          price_from?: number | null
          project_name?: string | null
          project_url?: string | null
          receiving_enabled?: boolean
          share_default?: boolean
          source_share_pct?: number
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      network_sharing_events: {
        Row: {
          actor: string | null
          created_at: string
          developer_id: string
          fp: string
          id: number
          shared: boolean
        }
        Insert: {
          actor?: string | null
          created_at?: string
          developer_id: string
          fp: string
          id?: never
          shared: boolean
        }
        Update: {
          actor?: string | null
          created_at?: string
          developer_id?: string
          fp?: string
          id?: never
          shared?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "network_sharing_events_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
        ]
      }
      network_tasks: {
        Row: {
          created_at: string
          developer_id: string
          done: boolean
          due_on: string
          id: string
          introduction_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          developer_id: string
          done?: boolean
          due_on: string
          id?: string
          introduction_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          developer_id?: string
          done?: boolean
          due_on?: string
          id?: string
          introduction_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_tasks_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_tasks_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          country: string | null
          created_at: string
          email: string
          id: string
          meta: Json | null
          path: string | null
          sid: string | null
          source: string | null
          status: string
          tz: string | null
          user_id: string | null
          welcome_sent_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          id?: string
          meta?: Json | null
          path?: string | null
          sid?: string | null
          source?: string | null
          status?: string
          tz?: string | null
          user_id?: string | null
          welcome_sent_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          meta?: Json | null
          path?: string | null
          sid?: string | null
          source?: string | null
          status?: string
          tz?: string | null
          user_id?: string | null
          welcome_sent_at?: string | null
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
      outreach_regions: {
        Row: {
          areas: string
          country: string
          exhausted_at: string | null
          language: string
          notes: string | null
          ord: number
          region: string
          sent: number
          status: string
        }
        Insert: {
          areas: string
          country: string
          exhausted_at?: string | null
          language: string
          notes?: string | null
          ord: number
          region: string
          sent?: number
          status?: string
        }
        Update: {
          areas?: string
          country?: string
          exhausted_at?: string | null
          language?: string
          notes?: string | null
          ord?: number
          region?: string
          sent?: number
          status?: string
        }
        Relationships: []
      }
      outreach_targets: {
        Row: {
          area: string | null
          batch: number | null
          company: string
          contact_name: string | null
          country: string
          created_at: string | null
          domain: string
          email: string
          error: string | null
          hook: string | null
          id: string
          label: string | null
          language: string
          region: string
          sent_at: string | null
          source_page: string | null
          status: string
          subject: string | null
          website: string | null
        }
        Insert: {
          area?: string | null
          batch?: number | null
          company: string
          contact_name?: string | null
          country?: string
          created_at?: string | null
          domain: string
          email: string
          error?: string | null
          hook?: string | null
          id?: string
          label?: string | null
          language?: string
          region?: string
          sent_at?: string | null
          source_page?: string | null
          status?: string
          subject?: string | null
          website?: string | null
        }
        Update: {
          area?: string | null
          batch?: number | null
          company?: string
          contact_name?: string | null
          country?: string
          created_at?: string | null
          domain?: string
          email?: string
          error?: string | null
          hook?: string | null
          id?: string
          label?: string | null
          language?: string
          region?: string
          sent_at?: string | null
          source_page?: string | null
          status?: string
          subject?: string | null
          website?: string | null
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
      price_history: {
        Row: {
          created_at: string | null
          find_id: string | null
          id: number
          price_eur: number | null
        }
        Insert: {
          created_at?: string | null
          find_id?: string | null
          id?: never
          price_eur?: number | null
        }
        Update: {
          created_at?: string | null
          find_id?: string | null
          id?: never
          price_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_find_id_fkey"
            columns: ["find_id"]
            isOneToOne: false
            referencedRelation: "ig_finds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          budget_max: number | null
          created_at: string
          detected_country: string | null
          email: string | null
          id: string
          interest_country: string | null
          last_login_at: string | null
          login_count: number | null
          onboarded: boolean
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          saved_public: boolean
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          created_at?: string
          detected_country?: string | null
          email?: string | null
          id?: string
          interest_country?: string | null
          last_login_at?: string | null
          login_count?: number | null
          onboarded?: boolean
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          saved_public?: boolean
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          created_at?: string
          detected_country?: string | null
          email?: string | null
          id?: string
          interest_country?: string | null
          last_login_at?: string | null
          login_count?: number | null
          onboarded?: boolean
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          saved_public?: boolean
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
          accepts_custom_plan: boolean | null
          active: boolean | null
          asset_tags: string[] | null
          balloon_pct: number | null
          caveats: string | null
          city: string | null
          conflict_disclosure: string | null
          construction_pct: number | null
          country_id: string
          created_at: string
          delivery_quarter: string | null
          deposit_pct: number | null
          description: string | null
          developer_id: string
          district: string | null
          gallery_image_urls: string[] | null
          golden_visa_eligible: boolean | null
          hero_image_url: string | null
          id: string
          is_deal_of_week: boolean | null
          is_owned_by_realhunt: boolean | null
          name: string
          payment_terms_source: string | null
          plan_months: number | null
          rejection_reason: string | null
          risk_flags: string[] | null
          slug: string
          status: string | null
          ticket_max_eur: number | null
          ticket_min_eur: number | null
          unit_types: string[] | null
          updated_at: string
          video_url: string | null
          why_cheap: string | null
        }
        Insert: {
          accepts_custom_plan?: boolean | null
          active?: boolean | null
          asset_tags?: string[] | null
          balloon_pct?: number | null
          caveats?: string | null
          city?: string | null
          conflict_disclosure?: string | null
          construction_pct?: number | null
          country_id: string
          created_at?: string
          delivery_quarter?: string | null
          deposit_pct?: number | null
          description?: string | null
          developer_id: string
          district?: string | null
          gallery_image_urls?: string[] | null
          golden_visa_eligible?: boolean | null
          hero_image_url?: string | null
          id?: string
          is_deal_of_week?: boolean | null
          is_owned_by_realhunt?: boolean | null
          name: string
          payment_terms_source?: string | null
          plan_months?: number | null
          rejection_reason?: string | null
          risk_flags?: string[] | null
          slug: string
          status?: string | null
          ticket_max_eur?: number | null
          ticket_min_eur?: number | null
          unit_types?: string[] | null
          updated_at?: string
          video_url?: string | null
          why_cheap?: string | null
        }
        Update: {
          accepts_custom_plan?: boolean | null
          active?: boolean | null
          asset_tags?: string[] | null
          balloon_pct?: number | null
          caveats?: string | null
          city?: string | null
          conflict_disclosure?: string | null
          construction_pct?: number | null
          country_id?: string
          created_at?: string
          delivery_quarter?: string | null
          deposit_pct?: number | null
          description?: string | null
          developer_id?: string
          district?: string | null
          gallery_image_urls?: string[] | null
          golden_visa_eligible?: boolean | null
          hero_image_url?: string | null
          id?: string
          is_deal_of_week?: boolean | null
          is_owned_by_realhunt?: boolean | null
          name?: string
          payment_terms_source?: string | null
          plan_months?: number | null
          rejection_reason?: string | null
          risk_flags?: string[] | null
          slug?: string
          status?: string | null
          ticket_max_eur?: number | null
          ticket_min_eur?: number | null
          unit_types?: string[] | null
          updated_at?: string
          video_url?: string | null
          why_cheap?: string | null
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
      rh_events: {
        Row: {
          created_at: string | null
          event: string
          find_shortcode: string | null
          id: number
          meta: Json | null
          path: string | null
          sid: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          find_shortcode?: string | null
          id?: never
          meta?: Json | null
          path?: string | null
          sid?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          find_shortcode?: string | null
          id?: never
          meta?: Json | null
          path?: string | null
          sid?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rh_fingerprints: {
        Row: {
          budget: number | null
          country: string | null
          fp: string
          kind: string
          last_seen: string
        }
        Insert: {
          budget?: number | null
          country?: string | null
          fp: string
          kind?: string
          last_seen?: string
        }
        Update: {
          budget?: number | null
          country?: string | null
          fp?: string
          kind?: string
          last_seen?: string
        }
        Relationships: []
      }
      rh_stats_cache: {
        Row: {
          drops: string[]
          drops_at: string
          id: number
          live: number
          stats_at: string
          today: number
        }
        Insert: {
          drops?: string[]
          drops_at?: string
          id: number
          live?: number
          stats_at?: string
          today?: number
        }
        Update: {
          drops?: string[]
          drops_at?: string
          id?: number
          live?: number
          stats_at?: string
          today?: number
        }
        Relationships: []
      }
      rh_telemetry_events: {
        Row: {
          created_at: string
          event: string
          event_id: string
          find_shortcode: string | null
          id: number
          meta: Json | null
          path: string | null
          sid: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          event_id: string
          find_shortcode?: string | null
          id?: never
          meta?: Json | null
          path?: string | null
          sid: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          event_id?: string
          find_shortcode?: string | null
          id?: never
          meta?: Json | null
          path?: string | null
          sid?: string
          user_id?: string | null
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
      submissions: {
        Row: {
          contact: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string
          id: string
          image_urls: string[] | null
          location: string | null
          name: string | null
          price_eur: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          contact?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email: string
          id?: string
          image_urls?: string[] | null
          location?: string | null
          name?: string | null
          price_eur?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          contact?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          image_urls?: string[] | null
          location?: string | null
          name?: string | null
          price_eur?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
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
      suppressed_emails: {
        Row: {
          created_at: string | null
          email: string
        }
        Insert: {
          created_at?: string | null
          email: string
        }
        Update: {
          created_at?: string | null
          email?: string
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
      admin_user_activity: {
        Row: {
          clicks: number | null
          email: string | null
          favorites: number | null
          first_event: string | null
          first_find: string | null
          first_shortcode: string | null
          last_event: string | null
          last_login_at: string | null
          user_id: string | null
          username: string | null
          views: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_submission: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      admin_candidates_page: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string }
        Returns: Json
      }
      admin_contacts_page: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string }
        Returns: Json
      }
      admin_experiments: {
        Args: { p_days?: number; p_exclude_tz?: string[] }
        Returns: Json
      }
      admin_intro_preview: {
        Args: { p_fp: string; p_from: string; p_to: string }
        Returns: Json
      }
      admin_introduce: {
        Args: { p_fp: string; p_from: string; p_note: string; p_to: string }
        Returns: Json
      }
      admin_introduce_checked: {
        Args: {
          p_expected: Json
          p_fp: string
          p_from: string
          p_note: string
          p_to: string
        }
        Returns: Json
      }
      admin_mark_share_paid: { Args: { p_id: string }; Returns: Json }
      admin_network: { Args: never; Returns: Json }
      admin_platform_health: { Args: never; Returns: Json }
      admin_rh_candidates: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string }
        Returns: Json
      }
      admin_set_deal: {
        Args: { p_id: string; p_notes: string; p_status: string }
        Returns: Json
      }
      admin_set_find: {
        Args: { p_id: string; p_status: string; p_verified: boolean }
        Returns: undefined
      }
      admin_set_intro_contact: {
        Args: {
          p_budget: number
          p_contact: string
          p_country: string
          p_id: string
        }
        Returns: Json
      }
      admin_supply_intro_contact: {
        Args: {
          p_budget: number
          p_contact: string
          p_country: string
          p_id: string
          p_permission_note: string
        }
        Returns: Json
      }
      admin_update_intro: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      admin_web_vitals: { Args: never; Returns: Json }
      dev_authorize_intro_contact: {
        Args: {
          p_authorized: boolean
          p_email: string
          p_intro: string
          p_name: string
          p_phone: string
        }
        Returns: Json
      }
      dev_buyer_history: { Args: { p_id: string }; Returns: Json }
      dev_check_fp: { Args: { p_fp: string }; Returns: Json }
      dev_contacts_page: {
        Args: {
          p_limit?: number
          p_mode?: string
          p_offset?: number
          p_query?: string
        }
        Returns: Json
      }
      dev_network_preferences: { Args: { p_receive: boolean }; Returns: Json }
      dev_overview: { Args: never; Returns: Json }
      dev_report_sale: {
        Args: { p_intro: string; p_note: string; p_price: number }
        Returns: Json
      }
      dev_save_task: {
        Args: {
          p_done: boolean
          p_due: string
          p_id: string
          p_intro: string
          p_title: string
        }
        Returns: Json
      }
      dev_set_contact_sharing: {
        Args: { p_ids: number[]; p_shared: boolean }
        Returns: Json
      }
      dev_sign_agreement: {
        Args: { p_name: string; p_ua: string; p_version: string }
        Returns: Json
      }
      dev_tasks: { Args: never; Returns: Json }
      dev_update_intro: { Args: { p_id: string; p_patch: Json }; Returns: Json }
      dev_upload_fps: { Args: { p_rows: Json }; Returns: Json }
      find_card_html: {
        Args: { f: Database["public"]["Tables"]["ig_finds"]["Row"] }
        Returns: string
      }
      find_social: {
        Args: { codes: string[] }
        Returns: {
          asks: number
          saves: number
          shortcode: string
          views7: number
        }[]
      }
      find_view_counts: {
        Args: { codes: string[] }
        Returns: {
          shortcode: string
          views: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_realhunt_admin: { Args: { _user_id: string }; Returns: boolean }
      outreach_check: { Args: { p_secret: string }; Returns: undefined }
      outreach_exclusions: { Args: { p_secret: string }; Returns: Json }
      outreach_import: {
        Args: { p_rows: Json; p_secret: string }
        Returns: number
      }
      outreach_mark: {
        Args: {
          p_email: string
          p_error?: string
          p_secret: string
          p_status: string
          p_subject?: string
        }
        Returns: undefined
      }
      outreach_queued: {
        Args: { p_batch?: number; p_secret: string }
        Returns: Json
      }
      outreach_region_update: {
        Args: {
          p_notes?: string
          p_ord: number
          p_secret: string
          p_status: string
        }
        Returns: undefined
      }
      outreach_status: { Args: { p_secret: string }; Returns: Json }
      outreach_to_outbox: {
        Args: { p_rows: Json; p_secret: string }
        Returns: number
      }
      process_email_outbox: { Args: never; Returns: number }
      public_saved: {
        Args: { uname: string }
        Returns: {
          country_guess: string
          hook: string
          image_urls: string[]
          location_name: string
          price_eur: number
          price_in_image: boolean
          shortcode: string
        }[]
      }
      record_email_delivery: {
        Args: {
          p_at: string
          p_event_id: string
          p_provider_id: string
          p_type: string
        }
        Returns: undefined
      }
      record_telemetry: { Args: { p_rows: Json }; Returns: undefined }
      rh_confirm_email_html: { Args: { p_link: string }; Returns: string }
      rh_fp: { Args: { p: string }; Returns: string }
      rh_live_stats: {
        Args: never
        Returns: {
          live: number
          today: number
        }[]
      }
      rh_top10_html: { Args: never; Returns: string }
      rh_urlencode: { Args: { value: string }; Returns: string }
      send_brevo: {
        Args: { p_html: string; p_subject: string; p_to: string }
        Returns: undefined
      }
      send_weekly_digest: { Args: never; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
