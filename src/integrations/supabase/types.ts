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
      alerts: {
        Row: {
          active: boolean
          beach: boolean | null
          category: string | null
          countries: string[] | null
          country: string | null
          created_at: string | null
          email: string
          frequency: string
          id: string
          max_price: number | null
          source: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          beach?: boolean | null
          category?: string | null
          countries?: string[] | null
          country?: string | null
          created_at?: string | null
          email: string
          frequency?: string
          id?: string
          max_price?: number | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          beach?: boolean | null
          category?: string | null
          countries?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string
          frequency?: string
          id?: string
          max_price?: number | null
          source?: string | null
          updated_at?: string | null
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
      board_discussion: {
        Row: {
          board_id: string
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          board_id: string
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          board_id?: string
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_discussion_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_invites: {
        Row: {
          board_id: string
          created_by: string
          expires_at: string
          id: string
          revoked: boolean
        }
        Insert: {
          board_id: string
          created_by: string
          expires_at?: string
          id?: string
          revoked?: boolean
        }
        Update: {
          board_id?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "board_invites_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          board_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          board_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          board_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "community_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_alert_receipts: {
        Row: {
          event_id: number
          queued_at: string
          user_id: string
        }
        Insert: {
          event_id: number
          queued_at?: string
          user_id: string
        }
        Update: {
          event_id?: number
          queued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_alert_receipts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "buyer_listing_events"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_listing_events: {
        Row: {
          created_at: string
          deal_id: string
          id: number
          kind: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: never
          kind: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: never
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_listing_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_preferences: {
        Row: {
          changes: string[]
          frequency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          changes?: string[]
          frequency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          changes?: string[]
          frequency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_proofs: {
        Row: {
          created_at: string
          decided_at: string | null
          file_path: string
          kind: string | null
          note: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          file_path: string
          kind?: string | null
          note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          file_path?: string
          kind?: string | null
          note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_seen: {
        Row: {
          deal_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          deal_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          deal_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_seen_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
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
      community_availability: {
        Row: {
          created_at: string
          deal_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_availability_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_boards: {
        Row: {
          created_at: string
          deal_ids: string[]
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_ids?: string[]
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_ids?: string[]
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_buyer_suggestions: {
        Row: {
          created_at: string
          deal_id: string
          from_deal: string | null
          id: number
          reason: string | null
          seen_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          from_deal?: string | null
          id?: number
          reason?: string | null
          seen_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          from_deal?: string | null
          id?: number
          reason?: string | null
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_buyer_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_claims: {
        Row: {
          company: string | null
          created_at: string
          deal_id: string
          decided_at: string | null
          id: number
          phone: string | null
          proof: string | null
          role: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          deal_id: string
          decided_at?: string | null
          id?: number
          phone?: string | null
          proof?: string | null
          role?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          deal_id?: string
          decided_at?: string | null
          id?: number
          phone?: string | null
          proof?: string | null
          role?: string | null
          status?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          body: string
          created_at: string
          deal_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deal_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deal_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_deals: {
        Row: {
          airport_km: number | null
          amen: string[] | null
          approved_at: string | null
          bedrooms: number | null
          boosted_until: string | null
          category: string
          country: string | null
          cover_fixed: boolean
          created_at: string
          currency: string
          developer_id: string | null
          dims: Json | null
          find_id: string | null
          hunter_handle: string | null
          id: string
          image_urls: string[]
          is_editorial_pick: boolean
          lat: number | null
          launch_points: number
          launch_week_id: string | null
          lng: number | null
          location_name: string | null
          nearby: Json | null
          payment_plan: Json | null
          pick_note: string | null
          price_eur: number | null
          publish_at: string | null
          reject_reason: string | null
          sea_km: number | null
          seed_votes: number
          slug: string
          source_domain: string | null
          source_key: string
          source_url: string
          sqm: number | null
          status: string
          submitted_by: string | null
          title: string
          units: Json | null
          updated_at: string
          verified_at: string | null
          verified_note: string | null
          video_url: string | null
          week_id: string | null
          why_great: string | null
        }
        Insert: {
          airport_km?: number | null
          amen?: string[] | null
          approved_at?: string | null
          bedrooms?: number | null
          boosted_until?: string | null
          category?: string
          country?: string | null
          cover_fixed?: boolean
          created_at?: string
          currency?: string
          developer_id?: string | null
          dims?: Json | null
          find_id?: string | null
          hunter_handle?: string | null
          id?: string
          image_urls?: string[]
          is_editorial_pick?: boolean
          lat?: number | null
          launch_points?: number
          launch_week_id?: string | null
          lng?: number | null
          location_name?: string | null
          nearby?: Json | null
          payment_plan?: Json | null
          pick_note?: string | null
          price_eur?: number | null
          publish_at?: string | null
          reject_reason?: string | null
          sea_km?: number | null
          seed_votes?: number
          slug: string
          source_domain?: string | null
          source_key: string
          source_url: string
          sqm?: number | null
          status?: string
          submitted_by?: string | null
          title: string
          units?: Json | null
          updated_at?: string
          verified_at?: string | null
          verified_note?: string | null
          video_url?: string | null
          week_id?: string | null
          why_great?: string | null
        }
        Update: {
          airport_km?: number | null
          amen?: string[] | null
          approved_at?: string | null
          bedrooms?: number | null
          boosted_until?: string | null
          category?: string
          country?: string | null
          cover_fixed?: boolean
          created_at?: string
          currency?: string
          developer_id?: string | null
          dims?: Json | null
          find_id?: string | null
          hunter_handle?: string | null
          id?: string
          image_urls?: string[]
          is_editorial_pick?: boolean
          lat?: number | null
          launch_points?: number
          launch_week_id?: string | null
          lng?: number | null
          location_name?: string | null
          nearby?: Json | null
          payment_plan?: Json | null
          pick_note?: string | null
          price_eur?: number | null
          publish_at?: string | null
          reject_reason?: string | null
          sea_km?: number | null
          seed_votes?: number
          slug?: string
          source_domain?: string | null
          source_key?: string
          source_url?: string
          sqm?: number | null
          status?: string
          submitted_by?: string | null
          title?: string
          units?: Json | null
          updated_at?: string
          verified_at?: string | null
          verified_note?: string | null
          video_url?: string | null
          week_id?: string | null
          why_great?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_deals_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_deals_find_id_fkey"
            columns: ["find_id"]
            isOneToOne: false
            referencedRelation: "ig_finds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_deals_launch_week_id_fkey"
            columns: ["launch_week_id"]
            isOneToOne: false
            referencedRelation: "community_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_deals_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "community_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_hunters: {
        Row: {
          bio: string
          created_at: string
          display_name: string
          handle: string
          public_saves: boolean
          user_id: string
        }
        Insert: {
          bio?: string
          created_at?: string
          display_name?: string
          handle: string
          public_saves?: boolean
          user_id: string
        }
        Update: {
          bio?: string
          created_at?: string
          display_name?: string
          handle?: string
          public_saves?: boolean
          user_id?: string
        }
        Relationships: []
      }
      community_identities: {
        Row: {
          actor: string
          issued_at: string
          token_hash: string
        }
        Insert: {
          actor: string
          issued_at?: string
          token_hash: string
        }
        Update: {
          actor?: string
          issued_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      community_info_requests: {
        Row: {
          agent_id: string | null
          budget_eur: number | null
          consent_at: string | null
          consent_text: string | null
          created_at: string
          deal_id: string
          email: string
          financing: string | null
          id: string
          intent: string | null
          message: string | null
          name: string | null
          phone: string | null
          status: string
          timeframe: string | null
          user_id: string
          video_call: boolean | null
          video_slots: string | null
        }
        Insert: {
          agent_id?: string | null
          budget_eur?: number | null
          consent_at?: string | null
          consent_text?: string | null
          created_at?: string
          deal_id: string
          email: string
          financing?: string | null
          id?: string
          intent?: string | null
          message?: string | null
          name?: string | null
          phone?: string | null
          status?: string
          timeframe?: string | null
          user_id: string
          video_call?: boolean | null
          video_slots?: string | null
        }
        Update: {
          agent_id?: string | null
          budget_eur?: number | null
          consent_at?: string | null
          consent_text?: string | null
          created_at?: string
          deal_id?: string
          email?: string
          financing?: string | null
          id?: string
          intent?: string | null
          message?: string | null
          name?: string | null
          phone?: string | null
          status?: string
          timeframe?: string | null
          user_id?: string
          video_call?: boolean | null
          video_slots?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_info_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_insiders: {
        Row: {
          created_at: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      community_limits: {
        Row: {
          bucket: string
          hits: number
          window_at: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_at: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_at?: string
        }
        Relationships: []
      }
      community_price_history: {
        Row: {
          deal_id: string
          id: number
          price_eur: number
          seen_at: string
        }
        Insert: {
          deal_id: string
          id?: number
          price_eur: number
          seen_at?: string
        }
        Update: {
          deal_id?: string
          id?: number
          price_eur?: number
          seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_price_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_referrals: {
        Row: {
          created_at: string
          referred_user: string
          referrer_user: string
        }
        Insert: {
          created_at?: string
          referred_user: string
          referrer_user: string
        }
        Update: {
          created_at?: string
          referred_user?: string
          referrer_user?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          deal_id: string | null
          detail: string | null
          id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          deal_id?: string | null
          detail?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          deal_id?: string | null
          detail?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saves: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saves_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_service_requests: {
        Row: {
          country: string | null
          created_at: string
          deal_id: string | null
          email: string
          id: string
          message: string | null
          services: string[]
          status: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          deal_id?: string | null
          email: string
          id?: string
          message?: string | null
          services?: string[]
          status?: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          deal_id?: string | null
          email?: string
          id?: string
          message?: string | null
          services?: string[]
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      community_views: {
        Row: {
          deal_id: string
          viewed_on: string
          voter_key: string
        }
        Insert: {
          deal_id: string
          viewed_on?: string
          voter_key: string
        }
        Update: {
          deal_id?: string
          viewed_on?: string
          voter_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_views_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      community_votes: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          updated_at: string
          user_id: string | null
          value: number
          voter_key: string
          week_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          updated_at?: string
          user_id?: string | null
          value: number
          voter_key: string
          week_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          updated_at?: string
          user_id?: string | null
          value?: number
          voter_key?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_votes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_votes_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "community_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_week_votes: {
        Row: {
          actor: string
          created_at: string
          deal_id: string
          updated_at: string
          value: number
          week_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          deal_id: string
          updated_at?: string
          value: number
          week_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          deal_id?: string
          updated_at?: string
          value?: number
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_week_votes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_week_votes_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "community_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_week_winners: {
        Row: {
          archived_at: string
          deal_id: string
          down_votes: number
          net_score: number
          rank: number
          snapshot: Json | null
          up_votes: number
          week_id: string
        }
        Insert: {
          archived_at?: string
          deal_id: string
          down_votes: number
          net_score: number
          rank: number
          snapshot?: Json | null
          up_votes: number
          week_id: string
        }
        Update: {
          archived_at?: string
          deal_id?: string
          down_votes?: number
          net_score?: number
          rank?: number
          snapshot?: Json | null
          up_votes?: number
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_week_winners_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_week_winners_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "community_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      community_weeks: {
        Row: {
          closed_at: string | null
          created_at: string
          ends_at: string
          id: string
          label: string
          starts_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          ends_at: string
          id?: string
          label: string
          starts_at: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          label?: string
          starts_at?: string
        }
        Relationships: []
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
      dev_boosts: {
        Row: {
          created_at: string
          deal_id: string
          developer_id: string
          ends_at: string | null
          id: number
          starts_at: string | null
          status: string
          weeks: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          developer_id: string
          ends_at?: string | null
          id?: never
          starts_at?: string | null
          status?: string
          weeks?: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          developer_id?: string
          ends_at?: string | null
          id?: never
          starts_at?: string | null
          status?: string
          weeks?: number
        }
        Relationships: []
      }
      dev_prospects: {
        Row: {
          area: string | null
          claim_code: string | null
          claimed_at: string | null
          claimed_by: string | null
          company: string
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          email_source_url: string | null
          emailed_at: string | null
          followup_at: string | null
          id: string
          kind: string | null
          last_error: string | null
          notes: string | null
          opened_at: string | null
          preview: Json | null
          price_from_eur: number | null
          price_from_text: string | null
          project_name: string | null
          project_url: string | null
          region: string | null
          source_url: string | null
          status: string
          website: string | null
        }
        Insert: {
          area?: string | null
          claim_code?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          company: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_source_url?: string | null
          emailed_at?: string | null
          followup_at?: string | null
          id?: string
          kind?: string | null
          last_error?: string | null
          notes?: string | null
          opened_at?: string | null
          preview?: Json | null
          price_from_eur?: number | null
          price_from_text?: string | null
          project_name?: string | null
          project_url?: string | null
          region?: string | null
          source_url?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          area?: string | null
          claim_code?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          company?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_source_url?: string | null
          emailed_at?: string | null
          followup_at?: string | null
          id?: string
          kind?: string | null
          last_error?: string | null
          notes?: string | null
          opened_at?: string | null
          preview?: Json | null
          price_from_eur?: number | null
          price_from_text?: string | null
          project_name?: string | null
          project_url?: string | null
          region?: string | null
          source_url?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      dev_reviews: {
        Row: {
          body: string | null
          created_at: string
          developer_id: string
          id: number
          rating: number
          status: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          developer_id: string
          id?: number
          rating: number
          status?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          developer_id?: string
          id?: number
          rating?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dev_reviews_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
        ]
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
      ext_ai_cache: {
        Row: {
          hash: string
          lang: string
          t: string | null
          text_hash: string | null
          user_id: string | null
          v: Json | null
        }
        Insert: {
          hash: string
          lang: string
          t?: string | null
          text_hash?: string | null
          user_id?: string | null
          v?: Json | null
        }
        Update: {
          hash?: string
          lang?: string
          t?: string | null
          text_hash?: string | null
          user_id?: string | null
          v?: Json | null
        }
        Relationships: []
      }
      ext_events: {
        Row: {
          created_at: string | null
          device_id: string | null
          hash: string | null
          id: number
          kind: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          hash?: string | null
          id?: number
          kind: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          hash?: string | null
          id?: number
          kind?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ext_geo_cache: {
        Row: {
          key: string
          t: string | null
          v: Json | null
        }
        Insert: {
          key: string
          t?: string | null
          v?: Json | null
        }
        Update: {
          key?: string
          t?: string | null
          v?: Json | null
        }
        Relationships: []
      }
      ext_geo_queue: {
        Row: {
          key: string
          lat: number | null
          lng: number | null
          t: string | null
          tries: number | null
        }
        Insert: {
          key: string
          lat?: number | null
          lng?: number | null
          t?: string | null
          tries?: number | null
        }
        Update: {
          key?: string
          lat?: number | null
          lng?: number | null
          t?: string | null
          tries?: number | null
        }
        Relationships: []
      }
      ext_geocode_cache: {
        Row: {
          created_at: string | null
          label: string | null
          lat: number | null
          lng: number | null
          q: string
          rank: number | null
        }
        Insert: {
          created_at?: string | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          q: string
          rank?: number | null
        }
        Update: {
          created_at?: string | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          q?: string
          rank?: number | null
        }
        Relationships: []
      }
      ext_listings: {
        Row: {
          area: string | null
          baths: number | null
          city_id: number | null
          city_text: string | null
          country: string | null
          currency: string | null
          days_listed: number | null
          deal: string
          deep: boolean | null
          fair: number | null
          first_seen: string | null
          flags: string[] | null
          hash: string
          last_seen: string | null
          lat: number | null
          lng: number | null
          pct: number | null
          photos: number | null
          portal: string
          ppsqm: number | null
          price: number | null
          ptype: string | null
          rooms: number | null
          score: number | null
          score_at: string | null
          seen_count: number | null
          sqm: number | null
          title: string | null
          url: string | null
        }
        Insert: {
          area?: string | null
          baths?: number | null
          city_id?: number | null
          city_text?: string | null
          country?: string | null
          currency?: string | null
          days_listed?: number | null
          deal?: string
          deep?: boolean | null
          fair?: number | null
          first_seen?: string | null
          flags?: string[] | null
          hash: string
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          pct?: number | null
          photos?: number | null
          portal: string
          ppsqm?: number | null
          price?: number | null
          ptype?: string | null
          rooms?: number | null
          score?: number | null
          score_at?: string | null
          seen_count?: number | null
          sqm?: number | null
          title?: string | null
          url?: string | null
        }
        Update: {
          area?: string | null
          baths?: number | null
          city_id?: number | null
          city_text?: string | null
          country?: string | null
          currency?: string | null
          days_listed?: number | null
          deal?: string
          deep?: boolean | null
          fair?: number | null
          first_seen?: string | null
          flags?: string[] | null
          hash?: string
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          pct?: number | null
          photos?: number | null
          portal?: string
          ppsqm?: number | null
          price?: number | null
          ptype?: string | null
          rooms?: number | null
          score?: number | null
          score_at?: string | null
          seen_count?: number | null
          sqm?: number | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      ext_price_history: {
        Row: {
          hash: string
          price: number
          t: string
        }
        Insert: {
          hash: string
          price: number
          t?: string
        }
        Update: {
          hash?: string
          price?: number
          t?: string
        }
        Relationships: []
      }
      ext_profiles: {
        Row: {
          budget: number | null
          places: string[] | null
          ptype: string | null
          purpose: string | null
          signals: Json | null
          timeline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget?: number | null
          places?: string[] | null
          ptype?: string | null
          purpose?: string | null
          signals?: Json | null
          timeline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget?: number | null
          places?: string[] | null
          ptype?: string | null
          purpose?: string | null
          signals?: Json | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ext_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "ext_user_tastes"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ext_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "ext_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ext_rankings: {
        Row: {
          cc: string | null
          city: string | null
          created_at: string
          id: string
          items: Json
          kind: string
          n: number | null
          src: string | null
          title: string | null
          user_id: string | null
          views: number
        }
        Insert: {
          cc?: string | null
          city?: string | null
          created_at?: string
          id: string
          items: Json
          kind?: string
          n?: number | null
          src?: string | null
          title?: string | null
          user_id?: string | null
          views?: number
        }
        Update: {
          cc?: string | null
          city?: string | null
          created_at?: string
          id?: string
          items?: Json
          kind?: string
          n?: number | null
          src?: string | null
          title?: string | null
          user_id?: string | null
          views?: number
        }
        Relationships: []
      }
      ext_recipes: {
        Row: {
          active: boolean
          host: string
          notes: string | null
          recipe: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          host: string
          notes?: string | null
          recipe?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          host?: string
          notes?: string | null
          recipe?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ext_saved: {
        Row: {
          created_at: string | null
          hash: string
          kind: string
          notified_at: string | null
          notified_price: number | null
          price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hash: string
          kind?: string
          notified_at?: string | null
          notified_price?: number | null
          price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hash?: string
          kind?: string
          notified_at?: string | null
          notified_price?: number | null
          price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ext_saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ext_user_tastes"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ext_saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ext_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ext_taste: {
        Row: {
          city_text: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deal: string | null
          hash: string
          like_v: number
          price: number | null
          ptype: string | null
          rooms: number | null
          score: number | null
          sqm: number | null
          url: string | null
          user_id: string
        }
        Insert: {
          city_text?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deal?: string | null
          hash: string
          like_v: number
          price?: number | null
          ptype?: string | null
          rooms?: number | null
          score?: number | null
          sqm?: number | null
          url?: string | null
          user_id: string
        }
        Update: {
          city_text?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deal?: string | null
          hash?: string
          like_v?: number
          price?: number | null
          ptype?: string | null
          rooms?: number | null
          score?: number | null
          sqm?: number | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ext_users: {
        Row: {
          code_exp: string | null
          code_hash: string | null
          code_sent_at: string | null
          code_tries: number | null
          consent_at: string | null
          consent_version: string | null
          created_at: string | null
          deleted_at: string | null
          device_id: string | null
          email: string | null
          email_verified_at: string | null
          id: string
          lang: string | null
          last_seen_at: string | null
          marketing_ok: boolean | null
          pending_email: string | null
          phone: string | null
          source: string | null
          token: string
        }
        Insert: {
          code_exp?: string | null
          code_hash?: string | null
          code_sent_at?: string | null
          code_tries?: number | null
          consent_at?: string | null
          consent_version?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          email?: string | null
          email_verified_at?: string | null
          id?: string
          lang?: string | null
          last_seen_at?: string | null
          marketing_ok?: boolean | null
          pending_email?: string | null
          phone?: string | null
          source?: string | null
          token?: string
        }
        Update: {
          code_exp?: string | null
          code_hash?: string | null
          code_sent_at?: string | null
          code_tries?: number | null
          consent_at?: string | null
          consent_version?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          email?: string | null
          email_verified_at?: string | null
          id?: string
          lang?: string | null
          last_seen_at?: string | null
          marketing_ok?: boolean | null
          pending_email?: string | null
          phone?: string | null
          source?: string | null
          token?: string
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
      hunt_city_mins: {
        Row: {
          aliases: string[] | null
          city: string
          country: string | null
          lat: number | null
          lng: number | null
          min_city: number
          min_near: number
        }
        Insert: {
          aliases?: string[] | null
          city: string
          country?: string | null
          lat?: number | null
          lng?: number | null
          min_city: number
          min_near: number
        }
        Update: {
          aliases?: string[] | null
          city?: string
          country?: string | null
          lat?: number | null
          lng?: number | null
          min_city?: number
          min_near?: number
        }
        Relationships: []
      }
      hunt_requests: {
        Row: {
          code: string
          consent: boolean
          created_at: string
          email: string
          id: string
          kind: string | null
          lang: string | null
          lat: number | null
          lng: number | null
          max_price: number
          must: string[] | null
          near_city: boolean | null
          note: string | null
          place: string
          ref: string | null
          referrals: number
          status: string
          timeline: string | null
        }
        Insert: {
          code: string
          consent: boolean
          created_at?: string
          email: string
          id?: string
          kind?: string | null
          lang?: string | null
          lat?: number | null
          lng?: number | null
          max_price: number
          must?: string[] | null
          near_city?: boolean | null
          note?: string | null
          place: string
          ref?: string | null
          referrals?: number
          status?: string
          timeline?: string | null
        }
        Update: {
          code?: string
          consent?: boolean
          created_at?: string
          email?: string
          id?: string
          kind?: string | null
          lang?: string | null
          lat?: number | null
          lng?: number | null
          max_price?: number
          must?: string[] | null
          near_city?: boolean | null
          note?: string | null
          place?: string
          ref?: string | null
          referrals?: number
          status?: string
          timeline?: string | null
        }
        Relationships: []
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
      intro_messages: {
        Row: {
          body: string
          created_at: string
          id: number
          introduction_id: string
          read_at: string | null
          role: string
          sender: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: never
          introduction_id: string
          read_at?: string | null
          role: string
          sender?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: never
          introduction_id?: string
          read_at?: string | null
          role?: string
          sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intro_messages_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      introductions: {
        Row: {
          agent_user: string | null
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
          deal_id: string | null
          dev_notes: string | null
          expired_at: string | null
          fee_eur: number
          first_response_at: string | null
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
          agent_user?: string | null
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
          deal_id?: string | null
          dev_notes?: string | null
          expired_at?: string | null
          fee_eur?: number
          first_response_at?: string | null
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
          agent_user?: string | null
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
          deal_id?: string | null
          dev_notes?: string | null
          expired_at?: string | null
          fee_eur?: number
          first_response_at?: string | null
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
      lead_sharing_history: {
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
      listing_checks: {
        Row: {
          actor: string
          after_values: Json
          before_values: Json
          created_at: string
          deal_id: string
          id: string
          note: string
          scope: string
          source_url: string
        }
        Insert: {
          actor: string
          after_values?: Json
          before_values?: Json
          created_at?: string
          deal_id: string
          id?: string
          note: string
          scope: string
          source_url: string
        }
        Update: {
          actor?: string
          after_values?: Json
          before_values?: Json
          created_at?: string
          deal_id?: string
          id?: string
          note?: string
          scope?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_checks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "community_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      network_agents: {
        Row: {
          agency: string | null
          country: string | null
          created_at: string
          name: string
          phone: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          agency?: string | null
          country?: string | null
          created_at?: string
          name: string
          phone?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          agency?: string | null
          country?: string | null
          created_at?: string
          name?: string
          phone?: string | null
          status?: string
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
      network_case_notes: {
        Row: {
          actor: string
          body: string
          case_id: string
          created_at: string
          id: string
        }
        Insert: {
          actor: string
          body: string
          case_id: string
          created_at?: string
          id?: string
        }
        Update: {
          actor?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "network_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      network_cases: {
        Row: {
          assigned_to: string | null
          created_at: string
          deadline: string
          id: string
          introduction_id: string
          opened_by: string
          reason: string
          resolution: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deadline?: string
          id?: string
          introduction_id: string
          opened_by: string
          reason: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deadline?: string
          id?: string
          introduction_id?: string
          opened_by?: string
          reason?: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_cases_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      network_cash_journal: {
        Row: {
          actor: string | null
          amount: number
          created_at: string
          deal_id: string
          id: string
          kind: string
          reference: string
          request_key: string
        }
        Insert: {
          actor?: string | null
          amount: number
          created_at?: string
          deal_id: string
          id?: string
          kind: string
          reference: string
          request_key: string
        }
        Update: {
          actor?: string | null
          amount?: number
          created_at?: string
          deal_id?: string
          id?: string
          kind?: string
          reference?: string
          request_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_cash_journal_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "network_deals"
            referencedColumns: ["id"]
          },
        ]
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
          about: string | null
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
          notify_email: boolean
          onboarding: Json | null
          phone: string | null
          price_from: number | null
          project_name: string | null
          project_url: string | null
          receiving_enabled: boolean
          referred_by: string | null
          share_default: boolean
          slug: string | null
          source_share_pct: number
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          website: string | null
        }
        Insert: {
          about?: string | null
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
          notify_email?: boolean
          onboarding?: Json | null
          phone?: string | null
          price_from?: number | null
          project_name?: string | null
          project_url?: string | null
          receiving_enabled?: boolean
          referred_by?: string | null
          share_default?: boolean
          slug?: string | null
          source_share_pct?: number
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          about?: string | null
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
          notify_email?: boolean
          onboarding?: Json | null
          phone?: string | null
          price_from?: number | null
          project_name?: string | null
          project_url?: string | null
          receiving_enabled?: boolean
          referred_by?: string | null
          share_default?: boolean
          slug?: string | null
          source_share_pct?: number
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_developers_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "network_developers"
            referencedColumns: ["id"]
          },
        ]
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
      rh_airports: {
        Row: {
          city: string | null
          country: string | null
          iata: string
          kind: string | null
          lat: number | null
          lng: number | null
          name: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          iata: string
          kind?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          iata?: string
          kind?: string | null
          lat?: number | null
          lng?: number | null
          name?: string | null
        }
        Relationships: []
      }
      rh_cache: {
        Row: {
          k: string
          t: string
          v: Json
        }
        Insert: {
          k: string
          t?: string
          v: Json
        }
        Update: {
          k?: string
          t?: string
          v?: Json
        }
        Relationships: []
      }
      rh_cities: {
        Row: {
          cc: string
          id: number
          lat: number
          lng: number
          name: string
          pop: number
          slug: string
        }
        Insert: {
          cc: string
          id: number
          lat: number
          lng: number
          name: string
          pop: number
          slug: string
        }
        Update: {
          cc?: string
          id?: number
          lat?: number
          lng?: number
          name?: string
          pop?: number
          slug?: string
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
      rh_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
      top_claims: {
        Row: {
          company: string
          country: string | null
          created_at: string
          decided_at: string | null
          email: string | null
          files: string[]
          full_name: string
          id: string
          legal_name: string | null
          message: string | null
          phone: string | null
          project_id: string
          reason: string | null
          reg_number: string | null
          role: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          company: string
          country?: string | null
          created_at?: string
          decided_at?: string | null
          email?: string | null
          files?: string[]
          full_name: string
          id?: string
          legal_name?: string | null
          message?: string | null
          phone?: string | null
          project_id: string
          reason?: string | null
          reg_number?: string | null
          role?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string
          country?: string | null
          created_at?: string
          decided_at?: string | null
          email?: string | null
          files?: string[]
          full_name?: string
          id?: string
          legal_name?: string | null
          message?: string | null
          phone?: string | null
          project_id?: string
          reason?: string | null
          reg_number?: string | null
          role?: string | null
          status?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "top_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "top_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      top_contacts: {
        Row: {
          company: string
          contacted_at: string | null
          created_at: string
          dest: string
          emails: string[]
          id: string
          kind: string
          notes: string | null
          phones: string[]
          projects: string[]
          sources: string[]
          status: string
          website: string | null
          whatsapp: string[]
        }
        Insert: {
          company: string
          contacted_at?: string | null
          created_at?: string
          dest: string
          emails?: string[]
          id?: string
          kind?: string
          notes?: string | null
          phones?: string[]
          projects?: string[]
          sources?: string[]
          status?: string
          website?: string | null
          whatsapp?: string[]
        }
        Update: {
          company?: string
          contacted_at?: string | null
          created_at?: string
          dest?: string
          emails?: string[]
          id?: string
          kind?: string
          notes?: string | null
          phones?: string[]
          projects?: string[]
          sources?: string[]
          status?: string
          website?: string | null
          whatsapp?: string[]
        }
        Relationships: []
      }
      top_project_events: {
        Row: {
          anon: string | null
          created_at: string
          day: string
          id: number
          kind: string
          project_id: string
          user_id: string | null
        }
        Insert: {
          anon?: string | null
          created_at?: string
          day?: string
          id?: number
          kind: string
          project_id: string
          user_id?: string | null
        }
        Update: {
          anon?: string | null
          created_at?: string
          day?: string
          id?: number
          kind?: string
          project_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "top_project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "top_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      top_project_requests: {
        Row: {
          answer: string | null
          answered_at: string | null
          budget_eur: number | null
          created_at: string
          email: string | null
          id: string
          is_public: boolean
          message: string | null
          name: string | null
          project_id: string
          status: string
          timeframe: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          budget_eur?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          name?: string | null
          project_id: string
          status?: string
          timeframe?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          budget_eur?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          name?: string | null
          project_id?: string
          status?: string
          timeframe?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_project_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "top_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      top_projects: {
        Row: {
          address: string | null
          amen: string[] | null
          base_rank: number | null
          base_score: number
          blurb: string | null
          claimed_by: string | null
          completion: string | null
          created_at: string
          dest: string
          dev_note: string | null
          developer: string | null
          dims: Json | null
          id: string
          images: string[]
          lat: number | null
          layouts: Json
          lng: number | null
          locality: string | null
          name: string
          ownership: string | null
          parts: Json
          permit_ref: string | null
          permit_status: string
          ppsqm_usd: number | null
          price_eur: number | null
          price_usd: number | null
          ptype: string | null
          reviewed_at: string | null
          sea_km: number | null
          size_min: number | null
          slug: string
          sources: string[]
          status: string
          updated_at: string
          ver_legal_name: string | null
          ver_license: string | null
          ver_reg: string | null
          verified: boolean
          verified_at: string | null
          visit_note: string | null
          visit_photos: string[]
          visited_at: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          amen?: string[] | null
          base_rank?: number | null
          base_score?: number
          blurb?: string | null
          claimed_by?: string | null
          completion?: string | null
          created_at?: string
          dest?: string
          dev_note?: string | null
          developer?: string | null
          dims?: Json | null
          id?: string
          images?: string[]
          lat?: number | null
          layouts?: Json
          lng?: number | null
          locality?: string | null
          name: string
          ownership?: string | null
          parts?: Json
          permit_ref?: string | null
          permit_status?: string
          ppsqm_usd?: number | null
          price_eur?: number | null
          price_usd?: number | null
          ptype?: string | null
          reviewed_at?: string | null
          sea_km?: number | null
          size_min?: number | null
          slug: string
          sources?: string[]
          status?: string
          updated_at?: string
          ver_legal_name?: string | null
          ver_license?: string | null
          ver_reg?: string | null
          verified?: boolean
          verified_at?: string | null
          visit_note?: string | null
          visit_photos?: string[]
          visited_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          amen?: string[] | null
          base_rank?: number | null
          base_score?: number
          blurb?: string | null
          claimed_by?: string | null
          completion?: string | null
          created_at?: string
          dest?: string
          dev_note?: string | null
          developer?: string | null
          dims?: Json | null
          id?: string
          images?: string[]
          lat?: number | null
          layouts?: Json
          lng?: number | null
          locality?: string | null
          name?: string
          ownership?: string | null
          parts?: Json
          permit_ref?: string | null
          permit_status?: string
          ppsqm_usd?: number | null
          price_eur?: number | null
          price_usd?: number | null
          ptype?: string | null
          reviewed_at?: string | null
          sea_km?: number | null
          size_min?: number | null
          slug?: string
          sources?: string[]
          status?: string
          updated_at?: string
          ver_legal_name?: string | null
          ver_license?: string | null
          ver_reg?: string | null
          verified?: boolean
          verified_at?: string | null
          visit_note?: string | null
          visit_photos?: string[]
          visited_at?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      top_reports: {
        Row: {
          anon: string | null
          created_at: string
          email: string | null
          id: string
          kind: string
          message: string
          project_id: string
          resolved_at: string | null
          response: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          anon?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind: string
          message: string
          project_id: string
          resolved_at?: string | null
          response?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          anon?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          message?: string
          project_id?: string
          resolved_at?: string | null
          response?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "top_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "top_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      top_reviews: {
        Row: {
          body: string
          created_at: string
          hide_reason: string | null
          id: string
          name: string | null
          project_id: string
          rating: number
          replied_at: string | null
          reply: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hide_reason?: string | null
          id?: string
          name?: string | null
          project_id: string
          rating: number
          replied_at?: string | null
          reply?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hide_reason?: string | null
          id?: string
          name?: string | null
          project_id?: string
          rating?: number
          replied_at?: string | null
          reply?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "top_projects"
            referencedColumns: ["id"]
          },
        ]
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
      ext_user_tastes: {
        Row: {
          budget: number | null
          countries: string[] | null
          created_at: string | null
          currency: string | null
          email: string | null
          email_verified_at: string | null
          lang: string | null
          last_seen_at: string | null
          marketing_ok: boolean | null
          median_price: number | null
          median_sqm: number | null
          p25_price: number | null
          p75_price: number | null
          phone: string | null
          places: string[] | null
          pref_type: string | null
          ptypes: string[] | null
          purpose: string | null
          saves: number | null
          timeline: string | null
          top_areas: string[] | null
          user_id: string | null
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
      agent_join: {
        Args: {
          p_agency: string
          p_country: string
          p_name: string
          p_phone: string
          p_website: string
        }
        Returns: Json
      }
      agent_me: { Args: never; Returns: Json }
      agent_projects: { Args: never; Returns: Json }
      agent_refer: {
        Args: {
          p_consent: boolean
          p_deal: string
          p_email: string
          p_name: string
          p_note: string
          p_phone: string
        }
        Returns: Json
      }
      buyer_inbox: { Args: never; Returns: Json }
      buyer_proof_me: { Args: never; Returns: Json }
      buyer_proof_submit: {
        Args: { p_kind: string; p_path: string }
        Returns: Json
      }
      community_admin_inbox: { Args: never; Returns: Json }
      community_admin_mark: {
        Args: { p_id: string; p_kind: string; p_status: string }
        Returns: Json
      }
      community_admin_verify: {
        Args: { p_clear?: boolean; p_deal: string; p_note: string }
        Returns: Json
      }
      community_api: {
        Args: { p_action: string; p_payload?: Json; p_token?: string }
        Returns: Json
      }
      community_availability_summary: {
        Args: { p_deal: string }
        Returns: Json
      }
      community_availability_vote: {
        Args: { p_deal: string; p_status: string }
        Returns: Json
      }
      community_board_copy: { Args: { p_slug: string }; Returns: Json }
      community_board_delete: { Args: { p_board: string }; Returns: Json }
      community_board_public: { Args: { p_slug: string }; Returns: Json }
      community_board_toggle: {
        Args: { p_board?: string; p_deal?: string; p_name?: string }
        Returns: Json
      }
      community_boards_mine: { Args: never; Returns: Json }
      community_buyer_home: { Args: never; Returns: Json }
      community_can_see_early: { Args: { p_ref: string }; Returns: boolean }
      community_cast_vote: {
        Args: {
          p_deal: string
          p_user: string
          p_value: number
          p_voter: string
        }
        Returns: Json
      }
      community_claim_listing: {
        Args: {
          p_company: string
          p_deal: string
          p_phone: string
          p_proof: string
          p_role: string
          p_website: string
        }
        Returns: Json
      }
      community_claim_referral: { Args: { p_code: string }; Returns: Json }
      community_close_week: { Args: { p_week: string }; Returns: Json }
      community_compare_builds: { Args: { p_slugs: string[] }; Returns: Json }
      community_current_week: {
        Args: never
        Returns: {
          closed_at: string | null
          created_at: string
          ends_at: string
          id: string
          label: string
          starts_at: string
        }
        SetofOptions: {
          from: "*"
          to: "community_weeks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      community_deal: {
        Args: { p_slug: string; p_voter?: string }
        Returns: Json
      }
      community_dev_leaderboard: { Args: never; Returns: Json }
      community_developer_public: { Args: { p_slug: string }; Returns: Json }
      community_dims_fill: { Args: never; Returns: number }
      community_feed: { Args: { p?: Json }; Returns: Json }
      community_hunter: { Args: { p_handle: string }; Returns: Json }
      community_insider: { Args: { p_ref?: string }; Returns: Json }
      community_is_insider: { Args: { p_uid: string }; Returns: boolean }
      community_leaderboard: { Args: { p_limit?: number }; Returns: Json }
      community_limit: {
        Args: { p_key: string; p_max: number; p_seconds: number }
        Returns: boolean
      }
      community_merge_votes: {
        Args: { p_anon: string; p_user: string }
        Returns: Json
      }
      community_moderate_deal: {
        Args: {
          p_action: string
          p_deal: string
          p_pick?: boolean
          p_pick_note?: string
          p_reason?: string
        }
        Returns: Json
      }
      community_moderation_queue: { Args: never; Returns: Json }
      community_my_referral: { Args: never; Returns: Json }
      community_near: { Args: { p: Json }; Returns: Json }
      community_nearby: { Args: { p_slug: string }; Returns: Json }
      community_new_builds: { Args: { p_country: string }; Returns: Json }
      community_newbuild_report: { Args: never; Returns: Json }
      community_next_drop: { Args: { p_from?: string }; Returns: string }
      community_public_collection: { Args: { p_handle: string }; Returns: Json }
      community_quick_counts: { Args: { p?: Json }; Returns: Json }
      community_rankings: {
        Args: {
          p_category?: string
          p_country?: string
          p_limit?: number
          p_offset?: number
          p_scope?: string
          p_voter?: string
        }
        Returns: Json
      }
      community_record_view: {
        Args: { p_deal: string; p_voter: string }
        Returns: undefined
      }
      community_ref_code: { Args: { p_user: string }; Returns: string }
      community_ref_owner: { Args: { p_code: string }; Returns: string }
      community_request_info: {
        Args: {
          p_budget?: number
          p_consent?: boolean
          p_deal: string
          p_financing?: string
          p_intent: string
          p_message: string
          p_name: string
          p_phone: string
          p_slots?: string
          p_timeframe?: string
          p_video?: boolean
        }
        Returns: Json
      }
      community_request_service: {
        Args: {
          p_country: string
          p_deal?: string
          p_email: string
          p_message: string
          p_services: string[]
        }
        Returns: Json
      }
      community_rollover: {
        Args: never
        Returns: {
          closed_at: string | null
          created_at: string
          ends_at: string
          id: string
          label: string
          starts_at: string
        }
        SetofOptions: {
          from: "*"
          to: "community_weeks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      community_save_alert: {
        Args: {
          p_category: string
          p_countries: string[]
          p_email: string
          p_max_price: number
          p_source?: string
        }
        Returns: Json
      }
      community_score_map: { Args: { p_rows: Json }; Returns: Json }
      community_scores: { Args: never; Returns: Json }
      community_set_public_saves: { Args: { p_public: boolean }; Returns: Json }
      community_similar: {
        Args: { p_limit?: number; p_slug: string }
        Returns: Json
      }
      community_source_key: { Args: { p_url: string }; Returns: string }
      dev_admin_boost_decide: {
        Args: { p_id: number; p_on: boolean }
        Returns: Json
      }
      dev_admin_boosts: { Args: never; Returns: Json }
      dev_admin_claim_decide: {
        Args: { p_approve: boolean; p_id: number }
        Returns: Json
      }
      dev_admin_funnel: { Args: never; Returns: Json }
      dev_admin_pending_projects: { Args: never; Returns: Json }
      dev_admin_proof_decide: {
        Args: { p_note?: string; p_ok: boolean; p_user: string }
        Returns: Json
      }
      dev_admin_proofs: { Args: never; Returns: Json }
      dev_admin_send_prospects: { Args: { p_limit: number }; Returns: Json }
      dev_admin_setting: {
        Args: { p_key: string; p_on: boolean }
        Returns: Json
      }
      dev_admin_verify: { Args: { p_id: string; p_on: boolean }; Returns: Json }
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
      dev_boost_request: {
        Args: { p_deal: string; p_weeks: number }
        Returns: Json
      }
      dev_boost_rotate: { Args: never; Returns: number }
      dev_build_prospect_previews: { Args: { p_n: number }; Returns: number }
      dev_buyer_history: { Args: { p_id: string }; Returns: Json }
      dev_check_fp: { Args: { p_fp: string }; Returns: Json }
      dev_claim_view: {
        Args: { p_code: string; p_optout?: boolean }
        Returns: Json
      }
      dev_code: { Args: { p_id: string }; Returns: string }
      dev_contacts_page: {
        Args: {
          p_limit?: number
          p_mode?: string
          p_offset?: number
          p_query?: string
        }
        Returns: Json
      }
      dev_country_rank: { Args: never; Returns: Json }
      dev_expire_intros: { Args: never; Returns: number }
      dev_lead_tags: { Args: never; Returns: Json }
      dev_meta: { Args: { p_body: string; p_key: string }; Returns: string }
      dev_my_boosts: { Args: never; Returns: Json }
      dev_network_preferences: { Args: { p_receive: boolean }; Returns: Json }
      dev_onboard: { Args: { p: Json }; Returns: Json }
      dev_outreach_tick: { Args: never; Returns: Json }
      dev_overview: { Args: never; Returns: Json }
      dev_preview: { Args: { p_url: string }; Returns: Json }
      dev_preview_core: { Args: { p_url: string }; Returns: Json }
      dev_projects: { Args: never; Returns: Json }
      dev_prospect_email_html: {
        Args: { p: Database["public"]["Tables"]["dev_prospects"]["Row"] }
        Returns: string
      }
      dev_prospect_followup_html: {
        Args: { p: Database["public"]["Tables"]["dev_prospects"]["Row"] }
        Returns: string
      }
      dev_prospect_followups: { Args: never; Returns: number }
      dev_report_sale: {
        Args: { p_intro: string; p_note: string; p_price: number }
        Returns: Json
      }
      dev_review_submit: {
        Args: { p_developer: string; p_rating: number; p_text: string }
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
      dev_send_prospect_batch: { Args: { p_limit: number }; Returns: number }
      dev_set_contact_sharing: {
        Args: { p_ids: number[]; p_shared: boolean }
        Returns: Json
      }
      dev_set_notify: { Args: { p_on: boolean }; Returns: Json }
      dev_share_by_filter: {
        Args: {
          p_country: string
          p_min_budget: number
          p_shared: boolean
          p_tag: string
        }
        Returns: Json
      }
      dev_sign_agreement: {
        Args: { p_name: string; p_ua: string; p_version: string }
        Returns: Json
      }
      dev_slugify: { Args: { p: string }; Returns: string }
      dev_stats: { Args: { p_dev: string }; Returns: Json }
      dev_tasks: { Args: never; Returns: Json }
      dev_unescape: { Args: { p: string }; Returns: string }
      dev_unread_messages: { Args: never; Returns: Json }
      dev_update_intro: { Args: { p_id: string; p_patch: Json }; Returns: Json }
      dev_update_project: { Args: { p: Json; p_id: string }; Returns: Json }
      dev_upload_fps: { Args: { p_rows: Json }; Returns: Json }
      dev_weekly_report: { Args: never; Returns: Json }
      ext_admin_stats: { Args: never; Returns: Json }
      ext_admin_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_only_email?: boolean
          p_q?: string
        }
        Returns: {
          budget: number | null
          countries: string[] | null
          created_at: string | null
          currency: string | null
          email: string | null
          email_verified_at: string | null
          lang: string | null
          last_seen_at: string | null
          marketing_ok: boolean | null
          median_price: number | null
          median_sqm: number | null
          p25_price: number | null
          p75_price: number | null
          phone: string | null
          places: string[] | null
          pref_type: string | null
          ptypes: string[] | null
          purpose: string | null
          saves: number | null
          timeline: string | null
          top_areas: string[] | null
          user_id: string | null
          views: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ext_user_tastes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ext_cards_seen: { Args: { p: Json }; Returns: Json }
      ext_city_list: { Args: { p_cc?: string; p_deal?: string }; Returns: Json }
      ext_city_top: {
        Args: {
          p_cc: string
          p_deal?: string
          p_limit?: number
          p_slug: string
        }
        Returns: Json
      }
      ext_comps: { Args: { p: Json }; Returns: Json }
      ext_consent: { Args: { p: Json }; Returns: Json }
      ext_delete_me: { Args: { p_token: string }; Returns: Json }
      ext_geo_work: { Args: never; Returns: number }
      ext_geocode: { Args: { p: Json }; Returns: Json }
      ext_insights: { Args: { p: Json }; Returns: Json }
      ext_is_admin: { Args: never; Returns: boolean }
      ext_listing_seen: { Args: { p: Json }; Returns: Json }
      ext_me: { Args: { p_token: string }; Returns: Json }
      ext_nearby: { Args: { p: Json }; Returns: Json }
      ext_price_drop_work: { Args: never; Returns: number }
      ext_profile_save: { Args: { p: Json }; Returns: Json }
      ext_ranking_get: { Args: { p_id: string }; Returns: Json }
      ext_ranking_save: { Args: { p: Json }; Returns: Json }
      ext_recommend: { Args: { p_token: string }; Returns: Json }
      ext_saved_list: { Args: { p_token: string }; Returns: Json }
      ext_signup: { Args: { p: Json }; Returns: Json }
      ext_site_score: {
        Args: { p_dest?: string; p_slug: string }
        Returns: Json
      }
      ext_taste_save: { Args: { p: Json }; Returns: Json }
      ext_top_global: {
        Args: { p_cc?: string; p_deal?: string; p_limit?: number }
        Returns: Json
      }
      ext_track: { Args: { p: Json }; Returns: undefined }
      ext_uid: { Args: { p_token: string }; Returns: string }
      ext_verify_check: { Args: { p: Json }; Returns: Json }
      ext_verify_start: { Args: { p: Json }; Returns: Json }
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
      hunt_min_for: {
        Args: { p_near: boolean; p_place: string }
        Returns: Json
      }
      hunt_request_create: { Args: { p: Json }; Returns: Json }
      hunt_request_status: { Args: { p_code: string }; Returns: Json }
      hunt_wanted_board: { Args: { p_limit?: number }; Returns: Json }
      intro_role: { Args: { p_intro: string }; Returns: string }
      intro_send: { Args: { p_body: string; p_intro: string }; Returns: Json }
      intro_thread: { Args: { p_intro: string }; Returns: Json }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_realhunt_admin: { Args: { _user_id: string }; Returns: boolean }
      is_serious_buyer: { Args: { p_user: string }; Returns: boolean }
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
      px_homes_seen: {
        Args: {
          p_deal?: string
          p_limit?: number
          p_max?: number
          p_q?: string
        }
        Returns: Json
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
      rh_airport_score: { Args: { km: number }; Returns: number }
      rh_board_workspace: {
        Args: { p_action?: string; p_slug: string; p_value?: string }
        Returns: Json
      }
      rh_buyer_preferences: {
        Args: { p_changes?: string[]; p_frequency?: string }
        Returns: Json
      }
      rh_check_listing: {
        Args: {
          p_bedrooms: number
          p_id: string
          p_note: string
          p_scope: string
          p_source: string
          p_sqm: number
        }
        Returns: Json
      }
      rh_city_near: { Args: { p_lat: number; p_lng: number }; Returns: number }
      rh_city_text: { Args: { p_cc: string; p_text: string }; Returns: number }
      rh_confirm_email_html: { Args: { p_link: string }; Returns: string }
      rh_finance: {
        Args: {
          p_amount?: number
          p_deal?: string
          p_key?: string
          p_kind?: string
          p_reference?: string
        }
        Returns: Json
      }
      rh_fp: { Args: { p: string }; Returns: string }
      rh_html: { Args: { p: string }; Returns: string }
      rh_live_stats: {
        Args: never
        Returns: {
          live: number
          today: number
        }[]
      }
      rh_nearest_airport: {
        Args: { p_lat: number; p_lng: number }
        Returns: Json
      }
      rh_network_cases: {
        Args: {
          p_action?: string
          p_case?: string
          p_intro?: string
          p_text?: string
        }
        Returns: Json
      }
      rh_network_health: { Args: never; Returns: Json }
      rh_notifications: { Args: { p_mark_read?: boolean }; Returns: Json }
      rh_quality_metrics: { Args: never; Returns: Json }
      rh_quality_queue: { Args: never; Returns: Json }
      rh_queue_buyer_alerts: { Args: never; Returns: number }
      rh_queue_weekly_top10: { Args: { p_confirm: string }; Returns: Json }
      rh_refresh_live_stats: { Args: never; Returns: undefined }
      rh_seen: { Args: { p_slug: string }; Returns: undefined }
      rh_setting_on: { Args: { p_key: string }; Returns: boolean }
      rh_slug: { Args: { s: string }; Returns: string }
      rh_top10_html: { Args: never; Returns: string }
      rh_urlencode: { Args: { value: string }; Returns: string }
      rh_weekly_top10_html: { Args: never; Returns: string }
      send_brevo: {
        Args: { p_html: string; p_subject: string; p_to: string }
        Returns: undefined
      }
      send_weekly_digest: { Args: never; Returns: number }
      top_admin_claim_decide: {
        Args: { p_id: string; p_ok: boolean; p_reason?: string }
        Returns: Json
      }
      top_admin_claims: { Args: never; Returns: Json }
      top_admin_contact_mark: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      top_admin_contacts: { Args: { p_dest?: string }; Returns: Json }
      top_admin_report_resolve: {
        Args: { p_id: string; p_response: string; p_status: string }
        Returns: Json
      }
      top_admin_reports: { Args: never; Returns: Json }
      top_admin_requests: { Args: never; Returns: Json }
      top_admin_review_hide: {
        Args: { p_hide: boolean; p_id: string; p_reason: string }
        Returns: Json
      }
      top_admin_reviews: { Args: never; Returns: Json }
      top_admin_set_trust: {
        Args: {
          p_permit_ref: string
          p_permit_status: string
          p_reviewed_at: string
          p_slug: string
          p_ver_legal_name: string
          p_ver_license: string
          p_ver_reg: string
          p_visit_note: string
          p_visit_photos: string[]
          p_visited_at: string
        }
        Returns: Json
      }
      top_admin_trust: { Args: { p_slug: string }; Returns: Json }
      top_answer: { Args: { p_answer: string; p_id: string }; Returns: Json }
      top_ask: {
        Args: {
          p_budget: number
          p_message: string
          p_name: string
          p_public?: boolean
          p_slug: string
          p_timeframe: string
        }
        Returns: Json
      }
      top_claim_submit: {
        Args: {
          p_company: string
          p_country: string
          p_files: string[]
          p_full_name: string
          p_legal_name: string
          p_message: string
          p_phone: string
          p_reg_number: string
          p_role: string
          p_slug: string
          p_website: string
        }
        Returns: Json
      }
      top_contact_ok: {
        Args: { p_dest: string; p_developer: string }
        Returns: boolean
      }
      top_dev_update: {
        Args: {
          p_completion: string
          p_note: string
          p_price_eur: number
          p_slug: string
          p_website: string
          p_whatsapp: string
        }
        Returns: Json
      }
      top_dims_refresh: { Args: never; Returns: number }
      top_grades: {
        Args: { p_dest: string }
        Returns: {
          asks: number
          demand: number
          dims: Json
          id: string
          nota: number
          rnk: number
          saves: number
          score: number
          shares: number
          views: number
          votes: number
          webs: number
        }[]
      }
      top_list: { Args: { p_dest?: string }; Returns: Json }
      top_my_pages: { Args: never; Returns: Json }
      top_project: { Args: { p_slug: string }; Returns: Json }
      top_report: {
        Args: {
          p_anon?: string
          p_email?: string
          p_kind: string
          p_message: string
          p_slug: string
        }
        Returns: Json
      }
      top_review_json: { Args: { p: string }; Returns: Json }
      top_review_reply: {
        Args: { p_id: string; p_reply: string }
        Returns: Json
      }
      top_review_submit: {
        Args: {
          p_body: string
          p_name: string
          p_rating: number
          p_slug: string
        }
        Returns: Json
      }
      top_scores: {
        Args: { p_dest: string }
        Returns: {
          asks: number
          demand: number
          dims: Json
          id: string
          rnk: number
          saves: number
          score: number
          shares: number
          views: number
          votes: number
          webs: number
        }[]
      }
      top_toggle: { Args: { p_kind: string; p_slug: string }; Returns: Json }
      top_track: {
        Args: { p_anon?: string; p_kind: string; p_slug: string }
        Returns: Json
      }
      vote_counts: {
        Args: never
        Returns: {
          analysis_id: string
          votes: number
        }[]
      }
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
