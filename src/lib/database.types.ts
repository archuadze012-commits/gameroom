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
      admin_actions: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_actor_id_profiles_id_fk"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string | null
          expires_at: string | null
          id: string
          severity: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          severity?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          game_slug: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
        }
        Insert: {
          author_id: string
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          game_slug?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          game_slug?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["slug"]
          },
        ]
      }
      badge_unlocks: {
        Row: {
          badge_code: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          badge_code: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          badge_code?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_unlocks_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_words: {
        Row: {
          created_at: string | null
          id: string
          word: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          word: string
        }
        Update: {
          created_at?: string | null
          id?: string
          word?: string
        }
        Relationships: []
      }
      box_items: {
        Row: {
          box_id: string
          created_at: string
          id: string
          image_url: string | null
          item_name: string
          item_type: string
          tier: string
          weight: number
        }
        Insert: {
          box_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          item_name: string
          item_type: string
          tier: string
          weight: number
        }
        Update: {
          box_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          item_name?: string
          item_type?: string
          tier?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "box_items_box_id_event_boxes_id_fk"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "event_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_id: string
          body: string
          channel_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
        }
        Insert: {
          author_id: string
          body: string
          channel_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          channel_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_deleted_by_profiles_id_fk"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_announcements: {
        Row: {
          author_id: string | null
          body: string
          clan_id: string
          created_at: string
          id: string
          pinned: boolean
          poll_question: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          clan_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          poll_question?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          clan_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          poll_question?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_announcements_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_highlights: {
        Row: { clan_id: string; created_at: string; id: string; platform: string | null; title: string | null; url: string; user_id: string | null }
        Insert: { clan_id: string; created_at?: string; id?: string; platform?: string | null; title?: string | null; url: string; user_id?: string | null }
        Update: { clan_id?: string; created_at?: string; id?: string; platform?: string | null; title?: string | null; url?: string; user_id?: string | null }
        Relationships: []
      }
      clan_poll_options: {
        Row: { announcement_id: string; id: string; label: string; sort: number }
        Insert: { announcement_id: string; id?: string; label: string; sort?: number }
        Update: { announcement_id?: string; id?: string; label?: string; sort?: number }
        Relationships: []
      }
      clan_poll_votes: {
        Row: { announcement_id: string; created_at: string; option_id: string; user_id: string }
        Insert: { announcement_id: string; created_at?: string; option_id: string; user_id: string }
        Update: { announcement_id?: string; created_at?: string; option_id?: string; user_id?: string }
        Relationships: []
      }
      clan_cosmetic_catalog: {
        Row: {
          cost: number
          key: string
          name: string
          sort: number
          type: string
          value: string
        }
        Insert: {
          cost: number
          key: string
          name: string
          sort?: number
          type: string
          value: string
        }
        Update: {
          cost?: number
          key?: string
          name?: string
          sort?: number
          type?: string
          value?: string
        }
        Relationships: []
      }
      clan_cosmetics: {
        Row: {
          clan_id: string
          cosmetic_key: string
          purchased_at: string
        }
        Insert: {
          clan_id: string
          cosmetic_key: string
          purchased_at?: string
        }
        Update: {
          clan_id?: string
          cosmetic_key?: string
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_cosmetics_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_cosmetics_cosmetic_key_fkey"
            columns: ["cosmetic_key"]
            isOneToOne: false
            referencedRelation: "clan_cosmetic_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      clan_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "clan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_events: {
        Row: {
          clan_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          starts_at: string
          title: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          starts_at: string
          title: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_events_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_fixture_rsvps: {
        Row: {
          clan_id: string
          created_at: string
          status: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          status: string
          tournament_id: string
          user_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          status?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_fixture_rsvps_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_fixture_rsvps_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_fixture_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_invites: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          invited_by: string | null
          invited_user: string
          status: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_user: string
          status?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_user?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_invites_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_invites_invited_user_fkey"
            columns: ["invited_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_members: {
        Row: {
          clan_id: string
          contribution: number
          id: string
          is_captain: boolean
          jersey_number: number | null
          joined_at: string
          lineup_status: string
          position: string | null
          role: Database["public"]["Enums"]["clan_role"]
          user_id: string
        }
        Insert: {
          clan_id: string
          contribution?: number
          id?: string
          is_captain?: boolean
          jersey_number?: number | null
          joined_at?: string
          lineup_status?: string
          position?: string | null
          role?: Database["public"]["Enums"]["clan_role"]
          user_id: string
        }
        Update: {
          clan_id?: string
          contribution?: number
          id?: string
          is_captain?: boolean
          jersey_number?: number | null
          joined_at?: string
          lineup_status?: string
          position?: string | null
          role?: Database["public"]["Enums"]["clan_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_clans_id_fk"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_members_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_messages: {
        Row: {
          body: string
          clan_id: string
          created_at: string
          deleted_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          body: string
          clan_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          clan_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_messages_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_requests: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["clan_request_status"]
          user_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["clan_request_status"]
          user_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["clan_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_requests_clan_id_clans_id_fk"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_requests_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_treasury_ledger: {
        Row: {
          clan_id: string
          created_at: string
          delta: number
          id: string
          kind: string
          memo: string | null
          user_id: string | null
        }
        Insert: {
          clan_id: string
          created_at?: string
          delta: number
          id?: string
          kind: string
          memo?: string | null
          user_id?: string | null
        }
        Update: {
          clan_id?: string
          created_at?: string
          delta?: number
          id?: string
          kind?: string
          memo?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_treasury_ledger_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_treasury_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          discord_url: string | null
          emblem: string | null
          game_slug: string | null
          id: string
          instagram_url: string | null
          level: number
          name: string
          recruit_note: string | null
          recruiting: boolean
          recruiting_roles: string[]
          rules: string | null
          slug: string
          status: Database["public"]["Enums"]["clan_status"]
          tag: string
          tiktok_url: string | null
          treasury: number
          twitch_url: string | null
          updated_at: string
          xp: number
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discord_url?: string | null
          emblem?: string | null
          game_slug?: string | null
          id?: string
          instagram_url?: string | null
          level?: number
          name: string
          recruit_note?: string | null
          recruiting?: boolean
          recruiting_roles?: string[]
          rules?: string | null
          slug: string
          status?: Database["public"]["Enums"]["clan_status"]
          tag: string
          tiktok_url?: string | null
          treasury?: number
          twitch_url?: string | null
          updated_at?: string
          xp?: number
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discord_url?: string | null
          emblem?: string | null
          game_slug?: string | null
          id?: string
          instagram_url?: string | null
          level?: number
          name?: string
          recruit_note?: string | null
          recruiting?: boolean
          recruiting_roles?: string[]
          rules?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["clan_status"]
          tag?: string
          tiktok_url?: string | null
          treasury?: number
          twitch_url?: string | null
          updated_at?: string
          xp?: number
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clans_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_conversations_id_fk"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_sender_id_profiles_id_fk"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_profiles_id_fk"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_profiles_id_fk"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cracked_games: {
        Row: {
          accent: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string
          download_url: string
          emoji: string
          gameplay_url: string | null
          genres: string[]
          id: string
          metacritic_score: number | null
          platforms: string[]
          rating: number
          release_year: number
          system_reqs: Json
          title: string
          trending: boolean
          updated_at: string
        }
        Insert: {
          accent?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          download_url?: string
          emoji?: string
          gameplay_url?: string | null
          genres?: string[]
          id: string
          metacritic_score?: number | null
          platforms?: string[]
          rating?: number
          release_year?: number
          system_reqs: Json
          title: string
          trending?: boolean
          updated_at?: string
        }
        Update: {
          accent?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          download_url?: string
          emoji?: string
          gameplay_url?: string | null
          genres?: string[]
          id?: string
          metacritic_score?: number | null
          platforms?: string[]
          rating?: number
          release_year?: number
          system_reqs?: Json
          title?: string
          trending?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cracked_games_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          active_date: string
          challenge_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          target_count: number
          title: string
          xp_reward: number
        }
        Insert: {
          active_date: string
          challenge_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          target_count?: number
          title: string
          xp_reward?: number
        }
        Update: {
          active_date?: string
          challenge_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          target_count?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      event_boxes: {
        Row: {
          cost_amount: number
          cost_currency: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          cost_amount: number
          cost_currency: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          cost_amount?: number
          cost_currency?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      featured_content: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          feature_type: string
          id: string
          position: number | null
          target_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          feature_type: string
          id?: string
          position?: number | null
          target_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          feature_type?: string
          id?: string
          position?: number | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_content_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_profiles_id_fk"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_profiles_id_fk"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          game_id: string | null
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_id?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_categories_game_id_games_id_fk"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_post_id_forum_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited: boolean
          id: string
          parent_post_id: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited?: boolean
          id?: string
          parent_post_id?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited?: boolean
          id?: string
          parent_post_id?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_forum_threads_id_fk"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          category_id: string
          created_at: string
          id: string
          last_reply_at: string
          locked: boolean
          pinned: boolean
          slug: string
          title: string
          views: number
        }
        Insert: {
          author_id: string
          category_id: string
          created_at?: string
          id?: string
          last_reply_at?: string
          locked?: boolean
          pinned?: boolean
          slug: string
          title: string
          views?: number
        }
        Update: {
          author_id?: string
          category_id?: string
          created_at?: string
          id?: string
          last_reply_at?: string
          locked?: boolean
          pinned?: boolean
          slug?: string
          title?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_category_id_forum_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          current_players: number
          expires_at: string
          game_slug: string
          host_id: string
          id: string
          is_private: boolean
          map: string | null
          max_players: number
          mode: string
          notes: string | null
          password: string | null
          perspective: string
          room_code: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          current_players?: number
          expires_at: string
          game_slug: string
          host_id: string
          id?: string
          is_private?: boolean
          map?: string | null
          max_players?: number
          mode?: string
          notes?: string | null
          password?: string | null
          perspective?: string
          room_code: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          current_players?: number
          expires_at?: string
          game_slug?: string
          host_id?: string
          id?: string
          is_private?: boolean
          map?: string | null
          max_players?: number
          mode?: string
          notes?: string | null
          password?: string | null
          perspective?: string
          room_code?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_host_id_profiles_id_fk"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          accent_color: string | null
          active: boolean
          banner_url: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          emoji: string | null
          icon_url: string | null
          id: string
          name_en: string
          name_ka: string
          position: number
          slug: string
        }
        Insert: {
          accent_color?: string | null
          active?: boolean
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name_en: string
          name_ka: string
          position?: number
          slug: string
        }
        Update: {
          accent_color?: string | null
          active?: boolean
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name_en?: string
          name_ka?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      hidden_cracked_games: {
        Row: {
          hidden_at: string
          id: string
        }
        Insert: {
          hidden_at?: string
          id: string
        }
        Update: {
          hidden_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_cracked_games_id_cracked_games_id_fk"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "cracked_games"
            referencedColumns: ["id"]
          },
        ]
      }
      lfg_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lfg_comments_post_id_lfg_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "lfg_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_comments_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lfg_posts: {
        Row: {
          author_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          expires_at: string | null
          game_id: string
          game_slug: string | null
          id: string
          mode: string | null
          rank: string | null
          rank_max: string | null
          rank_min: string | null
          region: string | null
          slots_filled: number
          slots_total: number
          status: Database["public"]["Enums"]["lfg_status"]
          title: string
          voice_required: boolean
        }
        Insert: {
          author_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expires_at?: string | null
          game_id: string
          game_slug?: string | null
          id?: string
          mode?: string | null
          rank?: string | null
          rank_max?: string | null
          rank_min?: string | null
          region?: string | null
          slots_filled?: number
          slots_total?: number
          status?: Database["public"]["Enums"]["lfg_status"]
          title: string
          voice_required?: boolean
        }
        Update: {
          author_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expires_at?: string | null
          game_id?: string
          game_slug?: string | null
          id?: string
          mode?: string | null
          rank?: string | null
          rank_max?: string | null
          rank_min?: string | null
          region?: string | null
          slots_filled?: number
          slots_total?: number
          status?: Database["public"]["Enums"]["lfg_status"]
          title?: string
          voice_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lfg_posts_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_posts_game_id_games_id_fk"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      lfg_queue: {
        Row: {
          created_at: string | null
          expires_at: string | null
          game_slug: string
          id: string
          matched_at: string | null
          matched_conversation_id: string | null
          matched_with: string | null
          rank_filter: string | null
          region: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          game_slug: string
          id?: string
          matched_at?: string | null
          matched_conversation_id?: string | null
          matched_with?: string | null
          rank_filter?: string | null
          region?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          game_slug?: string
          id?: string
          matched_at?: string | null
          matched_conversation_id?: string | null
          matched_with?: string | null
          rank_filter?: string | null
          region?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lfg_queue_matched_conversation_id_conversations_id_fk"
            columns: ["matched_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_queue_matched_with_profiles_id_fk"
            columns: ["matched_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_queue_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lfg_responses: {
        Row: {
          created_at: string
          id: string
          message: string | null
          post_id: string
          status: Database["public"]["Enums"]["lfg_response_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["lfg_response_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["lfg_response_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lfg_responses_post_id_lfg_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "lfg_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_responses_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linked_accounts: {
        Row: {
          created_at: string | null
          external_id: string
          external_name: string | null
          id: string
          metadata: Json | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          external_id: string
          external_name?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          external_id?: string
          external_name?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linked_accounts_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          ai_reason: string | null
          ai_score: number | null
          author_id: string | null
          content_id: string
          content_snapshot: string
          content_type: string
          created_at: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          ai_reason?: string | null
          ai_score?: number | null
          author_id?: string | null
          content_id: string
          content_snapshot: string
          content_type: string
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          ai_reason?: string | null
          ai_score?: number | null
          author_id?: string | null
          content_id?: string
          content_snapshot?: string
          content_type?: string
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_resolved_by_profiles_id_fk"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author_id: string
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          game_id: string | null
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          game_id?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          game_id?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_game_id_games_id_fk"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      news_comments: {
        Row: {
          article_id: string
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_comments_article_id_news_articles_id_fk"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_comments_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_content: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          pinned_by: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          pinned_by?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          pinned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pinned_content_pinned_by_profiles_id_fk"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_academy_prospects: {
        Row: {
          age: number
          created_at: string
          display_name: string
          id: string
          normalized_name: string
          ovr_base: number
          player_id: string | null
          position: string
          potential_ovr: number
          signing_cost: number
          status: string
          talent: number
          team_id: string
        }
        Insert: {
          age: number
          created_at?: string
          display_name: string
          id?: string
          normalized_name: string
          ovr_base: number
          player_id?: string | null
          position: string
          potential_ovr: number
          signing_cost?: number
          status?: string
          talent: number
          team_id: string
        }
        Update: {
          age?: number
          created_at?: string
          display_name?: string
          id?: string
          normalized_name?: string
          ovr_base?: number
          player_id?: string | null
          position?: string
          potential_ovr?: number
          signing_cost?: number
          status?: string
          talent?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_academy_prospects_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_academy_prospects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_calendar: {
        Row: {
          day_no: number
          team_id: string
          total_days: number
          train_day: number
          train_used: number
          updated_at: string
          week_no: number
        }
        Insert: {
          day_no?: number
          team_id: string
          total_days?: number
          train_day?: number
          train_used?: number
          updated_at?: string
          week_no?: number
        }
        Update: {
          day_no?: number
          team_id?: string
          total_days?: number
          train_day?: number
          train_used?: number
          updated_at?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_calendar_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_cup_instances: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          started_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_cup_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pm_cup_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_cup_matches: {
        Row: {
          claimed_at: string | null
          cup_instance_id: string | null
          id: string
          position: number
          round: number
          score1: number | null
          score2: number | null
          start_time: string | null
          status: string
          team1_id: string | null
          team2_id: string | null
          winner_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          cup_instance_id?: string | null
          id?: string
          position: number
          round: number
          score1?: number | null
          score2?: number | null
          start_time?: string | null
          status?: string
          team1_id?: string | null
          team2_id?: string | null
          winner_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          cup_instance_id?: string | null
          id?: string
          position?: number
          round?: number
          score1?: number | null
          score2?: number | null
          start_time?: string | null
          status?: string
          team1_id?: string | null
          team2_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_cup_matches_cup_instance_id_fkey"
            columns: ["cup_instance_id"]
            isOneToOne: false
            referencedRelation: "pm_cup_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_cup_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_cup_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_cup_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_cup_participants: {
        Row: {
          cup_instance_id: string
          registered_at: string | null
          team_id: string
        }
        Insert: {
          cup_instance_id: string
          registered_at?: string | null
          team_id: string
        }
        Update: {
          cup_instance_id?: string
          registered_at?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_cup_participants_cup_instance_id_fkey"
            columns: ["cup_instance_id"]
            isOneToOne: false
            referencedRelation: "pm_cup_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_cup_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_cup_templates: {
        Row: {
          entry_fee: number
          id: string
          max_teams: number
          name: string
          prize_pool: number
          schedule_type: string
        }
        Insert: {
          entry_fee?: number
          id: string
          max_teams?: number
          name: string
          prize_pool: number
          schedule_type: string
        }
        Update: {
          entry_fee?: number
          id?: string
          max_teams?: number
          name?: string
          prize_pool?: number
          schedule_type?: string
        }
        Relationships: []
      }
      pm_divisions: {
        Row: {
          id: number
          level: number
          name: string
          registration_open: boolean
        }
        Insert: {
          id?: number
          level?: number
          name: string
          registration_open?: boolean
        }
        Update: {
          id?: number
          level?: number
          name?: string
          registration_open?: boolean
        }
        Relationships: []
      }
      pm_engagement: {
        Row: {
          last_claim_day: number
          streak: number
          team_id: string
          updated_at: string
        }
        Insert: {
          last_claim_day?: number
          streak?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          last_claim_day?: number
          streak?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_engagement_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_event_feed: {
        Row: {
          accent: string
          category: string
          created_at: string
          day_no: number
          detail: string | null
          href: string | null
          id: number
          team_id: string
          title: string
          week_no: number
        }
        Insert: {
          accent?: string
          category: string
          created_at?: string
          day_no?: number
          detail?: string | null
          href?: string | null
          id?: never
          team_id: string
          title: string
          week_no?: number
        }
        Update: {
          accent?: string
          category?: string
          created_at?: string
          day_no?: number
          detail?: string | null
          href?: string | null
          id?: never
          team_id?: string
          title?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_event_feed_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_facilities: {
        Row: {
          last_action_day: number
          last_action_week: number
          level: number
          progress: number
          sprite_key: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          last_action_day?: number
          last_action_week?: number
          level?: number
          progress?: number
          sprite_key: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          last_action_day?: number
          last_action_week?: number
          level?: number
          progress?: number
          sprite_key?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_facilities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_finance_state: {
        Row: {
          last_settled_week: number
          sponsor_tier: string
          sponsor_weekly_amount: number
          team_id: string
          ticket_price: number
          updated_at: string
        }
        Insert: {
          last_settled_week?: number
          sponsor_tier?: string
          sponsor_weekly_amount?: number
          team_id: string
          ticket_price?: number
          updated_at?: string
        }
        Update: {
          last_settled_week?: number
          sponsor_tier?: string
          sponsor_weekly_amount?: number
          team_id?: string
          ticket_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_finance_state_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_free_agent_cycles: {
        Row: {
          generated_at: string
          offer_player_ids: string[]
          refresh_at: string
          scout_level: number
          team_id: string
          updated_at: string
        }
        Insert: {
          generated_at?: string
          offer_player_ids?: string[]
          refresh_at?: string
          scout_level?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          generated_at?: string
          offer_player_ids?: string[]
          refresh_at?: string
          scout_level?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_free_agent_cycles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_league_fixtures: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          claimed_at: string | null
          home_goals: number | null
          home_team_id: string | null
          id: string
          league_id: string
          played_at: string | null
          position: number | null
          round: number
          start_time: string
          status: string
          winner_id: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          claimed_at?: string | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          league_id: string
          played_at?: string | null
          position?: number | null
          round: number
          start_time?: string
          status?: string
          winner_id?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          claimed_at?: string | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          league_id?: string
          played_at?: string | null
          position?: number | null
          round?: number
          start_time?: string
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_league_fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_league_fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_league_fixtures_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "pm_league_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_league_fixtures_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_league_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          division_level: number
          format: string
          id: string
          max_teams: number
          name: string
          prize_pool: number
          season_no: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          division_level?: number
          format?: string
          id?: string
          max_teams?: number
          name: string
          prize_pool?: number
          season_no?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          division_level?: number
          format?: string
          id?: string
          max_teams?: number
          name?: string
          prize_pool?: number
          season_no?: number
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      pm_league_participants: {
        Row: {
          drawn: number
          goals_against: number
          goals_for: number
          id: string
          joined_at: string
          league_id: string
          lost: number
          played: number
          points: number
          team_id: string
          won: number
        }
        Insert: {
          drawn?: number
          goals_against?: number
          goals_for?: number
          id?: string
          joined_at?: string
          league_id: string
          lost?: number
          played?: number
          points?: number
          team_id: string
          won?: number
        }
        Update: {
          drawn?: number
          goals_against?: number
          goals_for?: number
          id?: string
          joined_at?: string
          league_id?: string
          lost?: number
          played?: number
          points?: number
          team_id?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_league_participants_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "pm_league_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_league_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_market_shortlist: {
        Row: {
          created_at: string
          player_key: string
          team_id: string
        }
        Insert: {
          created_at?: string
          player_key: string
          team_id: string
        }
        Update: {
          created_at?: string
          player_key?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_market_shortlist_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_match_history: {
        Row: {
          attendance: number
          conceded: number
          created_at: string
          fan_mood: number
          id: number
          income: number
          opponent_name: string
          result: string
          round_no: number
          scored: number
          team_id: string
          venue: string
        }
        Insert: {
          attendance?: number
          conceded?: number
          created_at?: string
          fan_mood?: number
          id?: never
          income?: number
          opponent_name: string
          result: string
          round_no: number
          scored?: number
          team_id: string
          venue?: string
        }
        Update: {
          attendance?: number
          conceded?: number
          created_at?: string
          fan_mood?: number
          id?: never
          income?: number
          opponent_name?: string
          result?: string
          round_no?: number
          scored?: number
          team_id?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_match_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_match_settings: {
        Row: {
          defensive_line: string
          focus_side: string
          formation: string
          tactical_style: string
          team_id: string
          tempo: string
          updated_at: string
        }
        Insert: {
          defensive_line?: string
          focus_side?: string
          formation?: string
          tactical_style?: string
          team_id: string
          tempo?: string
          updated_at?: string
        }
        Update: {
          defensive_line?: string
          focus_side?: string
          formation?: string
          tactical_style?: string
          team_id?: string
          tempo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_match_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_pack_openings: {
        Row: {
          id: number
          opened_at: string
          pack_id: number
          players_received: string[]
          team_id: string
        }
        Insert: {
          id?: number
          opened_at?: string
          pack_id: number
          players_received: string[]
          team_id: string
        }
        Update: {
          id?: number
          opened_at?: string
          pack_id?: number
          players_received?: string[]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_pack_openings_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "pm_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_pack_openings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_packs: {
        Row: {
          cost_coins: number | null
          cost_pm: number
          description: string | null
          id: number
          name: string
          player_count: number
          rarity_weights: Json
        }
        Insert: {
          cost_coins?: number | null
          cost_pm?: number
          description?: string | null
          id?: number
          name: string
          player_count?: number
          rarity_weights: Json
        }
        Update: {
          cost_coins?: number | null
          cost_pm?: number
          description?: string | null
          id?: number
          name?: string
          player_count?: number
          rarity_weights?: Json
        }
        Relationships: []
      }
      pm_player_position_unlocks: {
        Row: {
          created_at: string
          player_id: string
          team_id: string
          unlocked_position: string
        }
        Insert: {
          created_at?: string
          player_id: string
          team_id: string
          unlocked_position: string
        }
        Update: {
          created_at?: string
          player_id?: string
          team_id?: string
          unlocked_position?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_player_position_unlocks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_player_position_unlocks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_player_real_age_stage: {
        Row: {
          normalized_name: string
          real_age: number
        }
        Insert: {
          normalized_name: string
          real_age: number
        }
        Update: {
          normalized_name?: string
          real_age?: number
        }
        Relationships: []
      }
      pm_players: {
        Row: {
          age: number
          age_started_total_days: number | null
          available_via_career: boolean
          base_card_stats: Json | null
          base_transfer_value_gel: number
          behavioral: Json
          card_content_y: number | null
          card_display_name: string | null
          card_image_url: string | null
          card_name_size: number | null
          card_sil_height: number | null
          card_sil_opacity: number | null
          card_sil_width: number | null
          card_sil_x: number | null
          card_sil_y: number | null
          card_stats: Json | null
          card_stats_scale: number | null
          career_end_age: number | null
          career_notified: boolean
          created_at: string
          current_transfer_value_gel: number
          display_name: string
          ea_fc_ovr: number | null
          fatigue: number
          first_name: string | null
          id: string
          injury_matches: number
          is_real: boolean
          last_name: string | null
          last_train_match: number
          morale: number
          nationality_code: string | null
          normalized_name: string
          ovr_base: number
          ovr_current: number
          ovr_source: string
          owner_id: string | null
          pending_card_stats: Json | null
          pending_repack: boolean
          primary_position: string | null
          real_age: number | null
          retired_at: string | null
          skill_dev_pct: number
          skill_moves: number
          skill_moves_cap: number | null
          status: string
          tac: number | null
          talent: number
          traits: string[]
          weak_foot: number
          xp: number
        }
        Insert: {
          age?: number
          age_started_total_days?: number | null
          available_via_career?: boolean
          base_card_stats?: Json | null
          base_transfer_value_gel?: number
          behavioral?: Json
          card_content_y?: number | null
          card_display_name?: string | null
          card_image_url?: string | null
          card_name_size?: number | null
          card_sil_height?: number | null
          card_sil_opacity?: number | null
          card_sil_width?: number | null
          card_sil_x?: number | null
          card_sil_y?: number | null
          card_stats?: Json | null
          card_stats_scale?: number | null
          career_end_age?: number | null
          career_notified?: boolean
          created_at?: string
          current_transfer_value_gel?: number
          display_name: string
          ea_fc_ovr?: number | null
          fatigue?: number
          first_name?: string | null
          id?: string
          injury_matches?: number
          is_real?: boolean
          last_name?: string | null
          last_train_match?: number
          morale?: number
          nationality_code?: string | null
          normalized_name: string
          ovr_base: number
          ovr_current: number
          ovr_source?: string
          owner_id?: string | null
          pending_card_stats?: Json | null
          pending_repack?: boolean
          primary_position?: string | null
          real_age?: number | null
          retired_at?: string | null
          skill_dev_pct?: number
          skill_moves?: number
          skill_moves_cap?: number | null
          status?: string
          tac?: number | null
          talent: number
          traits?: string[]
          weak_foot?: number
          xp?: number
        }
        Update: {
          age?: number
          age_started_total_days?: number | null
          available_via_career?: boolean
          base_card_stats?: Json | null
          base_transfer_value_gel?: number
          behavioral?: Json
          card_content_y?: number | null
          card_display_name?: string | null
          card_image_url?: string | null
          card_name_size?: number | null
          card_sil_height?: number | null
          card_sil_opacity?: number | null
          card_sil_width?: number | null
          card_sil_x?: number | null
          card_sil_y?: number | null
          card_stats?: Json | null
          card_stats_scale?: number | null
          career_end_age?: number | null
          career_notified?: boolean
          created_at?: string
          current_transfer_value_gel?: number
          display_name?: string
          ea_fc_ovr?: number | null
          fatigue?: number
          first_name?: string | null
          id?: string
          injury_matches?: number
          is_real?: boolean
          last_name?: string | null
          last_train_match?: number
          morale?: number
          nationality_code?: string | null
          normalized_name?: string
          ovr_base?: number
          ovr_current?: number
          ovr_source?: string
          owner_id?: string | null
          pending_card_stats?: Json | null
          pending_repack?: boolean
          primary_position?: string | null
          real_age?: number | null
          retired_at?: string | null
          skill_dev_pct?: number
          skill_moves?: number
          skill_moves_cap?: number | null
          status?: string
          tac?: number | null
          talent?: number
          traits?: string[]
          weak_foot?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_players_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_season_rows: {
        Row: {
          club_name: string
          drawn: number
          form_percent: number
          goals_against: number
          goals_for: number
          lost: number
          played: number
          points: number
          row_order: number
          team_id: string
          updated_at: string
          won: number
        }
        Insert: {
          club_name: string
          drawn?: number
          form_percent?: number
          goals_against?: number
          goals_for?: number
          lost?: number
          played?: number
          points?: number
          row_order?: number
          team_id: string
          updated_at?: string
          won?: number
        }
        Update: {
          club_name?: string
          drawn?: number
          form_percent?: number
          goals_against?: number
          goals_for?: number
          lost?: number
          played?: number
          points?: number
          row_order?: number
          team_id?: string
          updated_at?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "pm_season_rows_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_season_state: {
        Row: {
          is_completed: boolean
          last_finish: number | null
          last_outcome: string | null
          last_reward: number
          season_no: number
          team_id: string
          updated_at: string
        }
        Insert: {
          is_completed?: boolean
          last_finish?: number | null
          last_outcome?: string | null
          last_reward?: number
          season_no?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          is_completed?: boolean
          last_finish?: number | null
          last_outcome?: string | null
          last_reward?: number
          season_no?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_season_state_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_squads: {
        Row: {
          id: number
          player_id: string
          position: string
          shirt_number: number | null
          squad_number: number | null
          team_id: string
        }
        Insert: {
          id?: number
          player_id: string
          position: string
          shirt_number?: number | null
          squad_number?: number | null
          team_id: string
        }
        Update: {
          id?: number
          player_id?: string
          position?: string
          shirt_number?: number | null
          squad_number?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_squads_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "pm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_squads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_staff: {
        Row: {
          hired_at: string
          level: number
          role_key: string
          team_id: string
          updated_at: string
        }
        Insert: {
          hired_at?: string
          level?: number
          role_key: string
          team_id: string
          updated_at?: string
        }
        Update: {
          hired_at?: string
          level?: number
          role_key?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_staff_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_team_assets: {
        Row: {
          asset_key: string
          quantity: number
          team_id: string
          updated_at: string
        }
        Insert: {
          asset_key: string
          quantity?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          asset_key?: string
          quantity?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_team_assets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_team_privacy: {
        Row: {
          hide_squad: boolean
          hide_transfers: boolean
          hide_wallet: boolean
          team_id: string
          updated_at: string
        }
        Insert: {
          hide_squad?: boolean
          hide_transfers?: boolean
          hide_wallet?: boolean
          team_id: string
          updated_at?: string
        }
        Update: {
          hide_squad?: boolean
          hide_transfers?: boolean
          hide_wallet?: boolean
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_team_privacy_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_teams: {
        Row: {
          created_at: string
          division_id: number
          id: string
          is_bot: boolean
          name: string
          notifications_seen_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          division_id?: number
          id?: string
          is_bot?: boolean
          name: string
          notifications_seen_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          division_id?: number
          id?: string
          is_bot?: boolean
          name?: string
          notifications_seen_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "pm_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_transactions: {
        Row: {
          amount: number
          created_at: string
          id: number
          reason: string
          team_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          reason: string
          team_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          reason?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_transfer_ledger: {
        Row: {
          buyer_team_id: string
          created_at: string
          id: string
          player_id: string
          price: number
          season_no: number
          seller_team_id: string
          via: string
        }
        Insert: {
          buyer_team_id: string
          created_at?: string
          id?: string
          player_id: string
          price: number
          season_no: number
          seller_team_id: string
          via: string
        }
        Update: {
          buyer_team_id?: string
          created_at?: string
          id?: string
          player_id?: string
          price?: number
          season_no?: number
          seller_team_id?: string
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_transfer_ledger_buyer_team_id_fkey"
            columns: ["buyer_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_ledger_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_ledger_seller_team_id_fkey"
            columns: ["seller_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_transfer_listings: {
        Row: {
          asking_price: number
          created_at: string
          id: string
          player_id: string
          seller_team_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          asking_price: number
          created_at?: string
          id?: string
          player_id: string
          seller_team_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          asking_price?: number
          created_at?: string
          id?: string
          player_id?: string
          seller_team_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_transfer_listings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_listings_seller_team_id_fkey"
            columns: ["seller_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_transfer_offers: {
        Row: {
          amount_gel: number
          awaiting_team_id: string | null
          created_at: string
          from_team_id: string
          id: string
          listing_id: string | null
          offer_type: string
          player_id: string
          status: string
          to_team_id: string
          updated_at: string
        }
        Insert: {
          amount_gel: number
          awaiting_team_id?: string | null
          created_at?: string
          from_team_id: string
          id?: string
          listing_id?: string | null
          offer_type: string
          player_id: string
          status?: string
          to_team_id: string
          updated_at?: string
        }
        Update: {
          amount_gel?: number
          awaiting_team_id?: string | null
          created_at?: string
          from_team_id?: string
          id?: string
          listing_id?: string | null
          offer_type?: string
          player_id?: string
          status?: string
          to_team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_transfer_offers_awaiting_team_id_fkey"
            columns: ["awaiting_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_offers_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pm_transfer_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_offers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pm_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_transfer_offers_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_wallets: {
        Row: {
          balance: number
          team_id: string
        }
        Insert: {
          balance?: number
          team_id: string
        }
        Update: {
          balance?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_wallets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "pm_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          emoji: string
          post_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          post_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          likes_count: number
          media_urls: string[] | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          likes_count?: number
          media_urls?: string[] | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          likes_count?: number
          media_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_profiles_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_deleted_by_profiles_id_fk"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_game_setups: {
        Row: { device: string | null; game_slug: string; headset: string | null; keyboard: string | null; monitor: string | null; mouse: string | null; notes: string | null; sensitivity: string | null; updated_at: string; user_id: string }
        Insert: { device?: string | null; game_slug: string; headset?: string | null; keyboard?: string | null; monitor?: string | null; mouse?: string | null; notes?: string | null; sensitivity?: string | null; updated_at?: string; user_id: string }
        Update: { device?: string | null; game_slug?: string; headset?: string | null; keyboard?: string | null; monitor?: string | null; mouse?: string | null; notes?: string | null; sensitivity?: string | null; updated_at?: string; user_id?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          available_hours: Json | null
          avatar_url: string | null
          ban_expires_at: string | null
          ban_reason: string | null
          banned: boolean
          banner_url: string | null
          bio: string | null
          created_at: string
          daily_streak_count: number
          display_name: string | null
          display_name_changed_at: string | null
          dm_privacy: string
          email: string | null
          emoji: string | null
          favorite_game_slugs: string[] | null
          game_id: string | null
          id: string
          in_game_name: string | null
          is_verified: boolean
          last_login_award_at: string | null
          last_seen_at: string | null
          last_xp_at: string | null
          level: number
          looking_for_clan: boolean
          main_game_slug: string | null
          referral_code: string | null
          region: string | null
          role: Database["public"]["Enums"]["user_role"]
          tiktok_followers: string | null
          tiktok_handle: string | null
          updated_at: string
          username: string
          voice_chat: boolean
          xp: number
          youtube_handle: string | null
        }
        Insert: {
          available_hours?: Json | null
          avatar_url?: string | null
          ban_expires_at?: string | null
          ban_reason?: string | null
          banned?: boolean
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          daily_streak_count?: number
          display_name?: string | null
          display_name_changed_at?: string | null
          dm_privacy?: string
          email?: string | null
          emoji?: string | null
          favorite_game_slugs?: string[] | null
          game_id?: string | null
          id: string
          in_game_name?: string | null
          is_verified?: boolean
          last_login_award_at?: string | null
          last_seen_at?: string | null
          last_xp_at?: string | null
          level?: number
          looking_for_clan?: boolean
          main_game_slug?: string | null
          referral_code?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tiktok_followers?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          username: string
          voice_chat?: boolean
          xp?: number
          youtube_handle?: string | null
        }
        Update: {
          available_hours?: Json | null
          avatar_url?: string | null
          ban_expires_at?: string | null
          ban_reason?: string | null
          banned?: boolean
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          daily_streak_count?: number
          display_name?: string | null
          display_name_changed_at?: string | null
          dm_privacy?: string
          email?: string | null
          emoji?: string | null
          favorite_game_slugs?: string[] | null
          game_id?: string | null
          id?: string
          in_game_name?: string | null
          is_verified?: boolean
          last_login_award_at?: string | null
          last_seen_at?: string | null
          last_xp_at?: string | null
          level?: number
          looking_for_clan?: boolean
          main_game_slug?: string | null
          referral_code?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tiktok_followers?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          username?: string
          voice_chat?: boolean
          xp?: number
          youtube_handle?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          count: number
          reset_at: string
        }
        Insert: {
          bucket_key: string
          count?: number
          reset_at: string
        }
        Update: {
          bucket_key?: string
          count?: number
          reset_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code_used: string | null
          coop_rewarded_at: string | null
          created_at: string
          id: string
          qualified_at: string | null
          referred_id: string
          referred_reward: number
          referrer_id: string
          referrer_reward: number
          status: string
        }
        Insert: {
          code_used?: string | null
          coop_rewarded_at?: string | null
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_id: string
          referred_reward?: number
          referrer_id: string
          referrer_reward?: number
          status?: string
        }
        Update: {
          code_used?: string | null
          coop_rewarded_at?: string | null
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_id?: string
          referred_reward?: number
          referrer_id?: string
          referrer_reward?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_profiles_id_fk"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_profiles_id_fk"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_chat_messages_room_id_game_rooms_id_fk"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_chat_messages_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          cost_amount: number
          cost_currency: string
          created_at: string
          description: string | null
          game_slug: string | null
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json
          name: string
          sort_order: number
          tier: string
        }
        Insert: {
          category: string
          cost_amount: number
          cost_currency: string
          created_at?: string
          description?: string | null
          game_slug?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
          name: string
          sort_order?: number
          tier: string
        }
        Update: {
          category?: string
          cost_amount?: number
          cost_currency?: string
          created_at?: string
          description?: string | null
          game_slug?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
          name?: string
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          status: string
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price: number
          status?: string
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          status?: string
          stock?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string
          id: string
          next_match_id: string | null
          player1_id: string | null
          player2_id: string | null
          position: number
          round: number
          scheduled_at: string | null
          score1: number | null
          score2: number | null
          status: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          next_match_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          position: number
          round: number
          scheduled_at?: string | null
          score1?: number | null
          score2?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          next_match_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          position?: number
          round?: number
          scheduled_at?: string | null
          score1?: number | null
          score2?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_player1_id_profiles_id_fk"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player2_id_profiles_id_fk"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_tournaments_id_fk"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_profiles_id_fk"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          checked_in: boolean
          clan_id: string | null
          eliminated_at: string | null
          id: string
          registered_at: string
          seed: number | null
          team_name: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          checked_in?: boolean
          clan_id?: string | null
          eliminated_at?: string | null
          id?: string
          registered_at?: string
          seed?: number | null
          team_name?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          checked_in?: boolean
          clan_id?: string | null
          eliminated_at?: string | null
          id?: string
          registered_at?: string
          seed?: number | null
          team_name?: string | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_tournaments_id_fk"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          checkin_opens_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          format: Database["public"]["Enums"]["tournament_format"]
          game_id: string
          id: string
          is_practice: boolean
          max_participants: number
          name: string
          prize_pool: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          rules: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          winner_id: string | null
        }
        Insert: {
          banner_url?: string | null
          checkin_opens_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          game_id: string
          id?: string
          is_practice?: boolean
          max_participants?: number
          name: string
          prize_pool?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          rules?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          winner_id?: string | null
        }
        Update: {
          banner_url?: string | null
          checkin_opens_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          game_id?: string
          id?: string
          is_practice?: boolean
          max_participants?: number
          name?: string
          prize_pool?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          rules?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_profiles_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_game_id_games_id_fk"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_winner_id_profiles_id_fk"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          claimed: boolean
          claimed_at: string | null
          completed: boolean
          created_at: string | null
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          claimed?: boolean
          claimed_at?: string | null
          completed?: boolean
          created_at?: string | null
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          claimed?: boolean
          claimed_at?: string | null
          completed?: boolean
          created_at?: string | null
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_equipped: {
        Row: {
          category: string
          equipped_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          category: string
          equipped_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          category?: string
          equipped_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_equipped_item_id_shop_items_id_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_equipped_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_profiles: {
        Row: {
          created_at: string
          game_id: string
          id: string
          in_game_id: string | null
          playstyle: string | null
          position: string | null
          rank: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          in_game_id?: string | null
          playstyle?: string | null
          position?: string | null
          rank?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          in_game_id?: string | null
          playstyle?: string | null
          position?: string | null
          rank?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_profiles_game_id_games_id_fk"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_game_profiles_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          box_id: string | null
          id: string
          item_id: string
          obtained_at: string
          user_id: string
        }
        Insert: {
          box_id?: string | null
          id?: string
          item_id: string
          obtained_at?: string
          user_id: string
        }
        Update: {
          box_id?: string | null
          id?: string
          item_id?: string
          obtained_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_box_id_event_boxes_id_fk"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "event_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_item_id_box_items_id_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "box_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lobby_loadouts: {
        Row: {
          game_slug: string
          loadout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          game_slug: string
          loadout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          game_slug?: string
          loadout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mutes: {
        Row: {
          channel_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          muted_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          muted_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          muted_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mutes_muted_by_profiles_id_fk"
            columns: ["muted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mutes_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          id: string
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_item_id_shop_items_id_fk"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          granted_by: string | null
          id: string
          note: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          granted_by?: string | null
          id?: string
          note?: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_granted_by_profiles_id_fk"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          nc_balance: number
          pro_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          nc_balance?: number
          pro_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          nc_balance?: number
          pro_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: number
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_currency: {
        Args: { p_id: string; p_int: number; p_text: string; p_text2: string }
        Returns: undefined
      }
      admin_grant_currency_as: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_currency: string
          p_note?: string
          p_user_id: string
        }
        Returns: Json
      }
      award_clan_xp: {
        Args: { p_amount: number; p_clan: string; p_user: string }
        Returns: undefined
      }
      award_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      award_xp_capped: {
        Args: {
          p_amount: number
          p_daily_cap: number
          p_source_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      award_xp_once: {
        Args: {
          p_amount: number
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_manage_shop_products: { Args: never; Returns: boolean }
      claim_daily_bonus: { Args: never; Returns: undefined }
      claim_daily_bonus_as: { Args: { p_user_id: string }; Returns: Json }
      clan_announcement_teaser: {
        Args: { p_clan_id: string }
        Returns: {
          cnt: number
          latest_at: string
        }[]
      }
      clan_buy_cosmetic: {
        Args: { p_clan: string; p_key: string; p_user: string }
        Returns: Json
      }
      clan_donate_nc: {
        Args: { p_amount: number; p_clan: string; p_user: string }
        Returns: Json
      }
      equip_item: { Args: { p_id: string }; Returns: undefined }
      equip_item_as: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: Json
      }
      expire_old_lfg_posts: { Args: never; Returns: undefined }
      gen_ref_code: { Args: never; Returns: string }
      get_suggested_follows: {
        Args: { p_limit?: number; p_user: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          last_seen_at: string
          level: number
          mutual_count: number
          shared_games: number
          username: string
        }[]
      }
      get_top_referrers: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          invites: number
          username: string
        }[]
      }
      get_top_wallets: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          is_verified: boolean
          nc_balance: number
          username: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_clan_member: {
        Args: { p_clan: string; p_user: string }
        Returns: boolean
      }
      open_box: { Args: { p_id: string }; Returns: undefined }
      open_box_as: {
        Args: { p_box_id: string; p_user_id: string }
        Returns: Json
      }
      open_box_bundle: {
        Args: {
          p_box_id: string
          p_paid_opens?: number
          p_total_opens?: number
        }
        Returns: Json
      }
      open_box_bundle_as: {
        Args: {
          p_box_id: string
          p_paid_opens?: number
          p_total_opens?: number
          p_user_id: string
        }
        Returns: Json
      }
      pm_advance_time: {
        Args: { p_days?: number; p_team_id: string }
        Returns: Json
      }
      pm_apply_age_threshold_decay: {
        Args: { p_position: string; p_stats: Json; p_threshold: number }
        Returns: Json
      }
      pm_apply_squad_morale_drain: {
        Args: { p_days?: number; p_team_id: string }
        Returns: undefined
      }
      pm_apply_stat_drop: {
        Args: { p_drop: number; p_label: string; p_stats: Json }
        Returns: Json
      }
      pm_apply_weekly_finance: {
        Args: { p_team_id: string; p_week_no: number }
        Returns: Json
      }
      pm_buy_listed_player: {
        Args: { p_buyer_team_id: string; p_listing_id: string }
        Returns: Json
      }
      pm_buy_market_player: {
        Args: { p_player: Json; p_team_id: string }
        Returns: Json
      }
      pm_buy_position_shift_token: {
        Args: { p_team_id: string }
        Returns: Json
      }
      pm_buy_xp_pack: {
        Args: { p_pack: string; p_team_id: string }
        Returns: Json
      }
      pm_calculate_weekly_wages: {
        Args: { p_team_id: string }
        Returns: number
      }
      pm_cancel_transfer_offer: {
        Args: { p_offer_id: string; p_team_id: string }
        Returns: undefined
      }
      pm_career_release: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: Json
      }
      pm_career_renew: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: Json
      }
      pm_claim_daily_reward: { Args: { p_team_id: string }; Returns: Json }
      pm_confirm_ovr_upgrade: {
        Args: { p_fodder_ids: string[]; p_player_id: string; p_team_id: string }
        Returns: Json
      }
      pm_create_team: {
        Args: { p_players: Json; p_team_name: string; p_user_id: string }
        Returns: string
      }
      pm_create_team_v2: {
        Args: { p_team_name: string; p_user_id: string }
        Returns: string
      }
      pm_credit: {
        Args: { p_amount: number; p_reason: string; p_team_id: string }
        Returns: undefined
      }
      pm_debit: {
        Args: { p_amount: number; p_reason: string; p_team_id: string }
        Returns: undefined
      }
      pm_develop_academy_prospects: {
        Args: { p_days?: number; p_team_id: string }
        Returns: Json
      }
      pm_draft_squad: {
        Args: { p_max_ovr?: number; p_min_ovr?: number; p_team_id: string }
        Returns: number
      }
      pm_ensure_academy_prospects: {
        Args: { p_prospects: Json; p_team_id: string }
        Returns: undefined
      }
      pm_ensure_academy_youth: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      pm_ensure_calendar: { Args: { p_team_id: string }; Returns: undefined }
      pm_ensure_facilities: { Args: { p_team_id: string }; Returns: undefined }
      pm_ensure_finance_state: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      pm_ensure_match_settings: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      pm_ensure_season_rows: { Args: { p_team_id: string }; Returns: undefined }
      pm_ensure_season_state: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      pm_facility_upgrade_cost: {
        Args: { p_level: number; p_sprite_key: string }
        Returns: number
      }
      pm_finalize_season: { Args: { p_team_id: string }; Returns: Json }
      pm_grant_match_development: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      pm_grant_skill_development: {
        Args: { p_days: number; p_team_id: string }
        Returns: undefined
      }
      pm_hire_staff: {
        Args: { p_role_key: string; p_team_id: string }
        Returns: {
          level: number
          role_key: string
        }[]
      }
      pm_join_cup: {
        Args: { p_cup_instance_id: string; p_team_id: string }
        Returns: Json
      }
      pm_list_player: {
        Args: { p_player_id: string; p_price: number; p_team_id: string }
        Returns: string
      }
      pm_log_event: {
        Args: {
          p_accent?: string
          p_category: string
          p_detail?: string
          p_href?: string
          p_team_id: string
          p_title: string
        }
        Returns: undefined
      }
      pm_make_transfer_offer: {
        Args: { p_amount: number; p_from_team_id: string; p_listing_id: string }
        Returns: string
      }
      pm_mark_notifications_seen: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      pm_match_player_events: {
        Args: { p_home_goals: number; p_result: string; p_team_id: string }
        Returns: Json
      }
      pm_negotiate_sponsor: { Args: { p_team_id: string }; Returns: Json }
      pm_normalize_position: { Args: { p_pos: string }; Returns: string }
      pm_open_pack: {
        Args: { p_pack_id: number; p_team_id: string }
        Returns: Json
      }
      pm_ovr_upgrade_cost: { Args: { p_from_ovr: number }; Returns: number }
      pm_ovr_upgrade_total_cost: {
        Args: { p_from_ovr: number; p_to_ovr: number }
        Returns: number
      }
      pm_pair_transfers_this_season: {
        Args: { p_a: string; p_b: string; p_season_no: number }
        Returns: number
      }
      pm_player_base_transfer_value_gel: {
        Args: { p_ovr: number }
        Returns: number
      }
      pm_player_career_end_age: { Args: { p_talent: number }; Returns: number }
      pm_player_compute_tac: {
        Args: {
          p_card_stats: Json
          p_normalized_name: string
          p_ovr: number
          p_position: string
        }
        Returns: number
      }
      pm_player_current_transfer_value_gel: {
        Args: { p_ovr_base: number; p_ovr_current: number }
        Returns: number
      }
      pm_player_dev_completion_age: {
        Args: { p_position: string; p_team_id: string }
        Returns: number
      }
      pm_player_overall_from_stats: {
        Args: { p_card_stats: Json; p_fallback?: number; p_position: string }
        Returns: number
      }
      pm_player_ovr_growth_cap: { Args: { p_talent: number }; Returns: number }
      pm_player_seed_card_stats: {
        Args: { p_position: string; p_target_ovr: number }
        Returns: Json
      }
      pm_player_stat_labels: { Args: { p_position: string }; Returns: string[] }
      pm_player_talent_class: { Args: { p_talent: number }; Returns: string }
      pm_player_talent_class_age_offset: {
        Args: { p_talent: number }
        Returns: number
      }
      pm_player_training_focus: {
        Args: { p_position: string }
        Returns: string[]
      }
      pm_position_fit: {
        Args: { p_natural: string; p_slot: string }
        Returns: number
      }
      pm_process_career_ends: {
        Args: { p_days?: number; p_team_id: string }
        Returns: Json
      }
      pm_reset_season_rows: {
        Args: { p_season_no: number; p_team_id: string }
        Returns: undefined
      }
      pm_respond_transfer_offer: {
        Args: {
          p_action: string
          p_counter_amount?: number
          p_offer_id: string
          p_team_id: string
        }
        Returns: Json
      }
      pm_retire_legacy_market_players: { Args: never; Returns: number }
      pm_run_city_action: {
        Args: { p_action: string; p_sprite_key: string; p_team_id: string }
        Returns: Json
      }
      pm_run_city_action_full: {
        Args: {
          p_action: string
          p_action_reward_bonus_pct: number
          p_advance_days: number
          p_season_reward_bonus_pct: number
          p_sprite_key: string
          p_team_id: string
          p_training_affected: boolean
          p_training_xp_pct: number
          p_user_id: string
          p_xp_base: number
        }
        Returns: Json
      }
      pm_save_lineup_formation: {
        Args: { p_formation: string; p_slots: Json; p_team_id: string }
        Returns: Json
      }
      pm_save_lineup_order: {
        Args: { p_lineup: Json; p_team_id: string }
        Returns: Json
      }
      pm_save_match_settings: {
        Args: {
          p_defensive_line: string
          p_focus_side: string
          p_tactical_style: string
          p_team_id: string
          p_tempo: string
        }
        Returns: Json
      }
      pm_save_ticket_price: {
        Args: { p_team_id: string; p_ticket_price: number }
        Returns: Json
      }
      pm_secondary_positions: { Args: { p_pos: string }; Returns: string[] }
      pm_sell_player: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: Json
      }
      pm_set_team_privacy: {
        Args: {
          p_hide_squad: boolean
          p_hide_transfers: boolean
          p_hide_wallet: boolean
          p_team_id: string
          p_user_id: string
        }
        Returns: Json
      }
      pm_settle_transfer: {
        Args: {
          p_buyer_team_id: string
          p_listing_id: string
          p_price: number
          p_via: string
        }
        Returns: Json
      }
      pm_sign_academy_player: {
        Args: { p_cost: number; p_player: Json; p_team_id: string }
        Returns: Json
      }
      pm_sign_academy_prospect: {
        Args: { p_prospect_id: string; p_team_id: string }
        Returns: Json
      }
      pm_simulate_league_round: { Args: { p_team_id: string }; Returns: Json }
      pm_stadium_capacity: { Args: { p_level: number }; Returns: number }
      pm_staff_hire_cost: { Args: { p_role_key: string }; Returns: number }
      pm_staff_max_level_for_division: {
        Args: { p_division_id: number }
        Returns: number
      }
      pm_staff_upgrade_cost: {
        Args: { p_current_level: number; p_role_key: string }
        Returns: number
      }
      pm_swap_squad_players: {
        Args: {
          p_active_id: number
          p_team_id: string
          p_unassigned_id: number
        }
        Returns: Json
      }
      pm_team_match_count: { Args: { p_team_id: string }; Returns: number }
      pm_team_match_profile: { Args: { p_team_id: string }; Returns: Json }
      pm_toggle_market_shortlist: {
        Args: { p_player_key: string; p_team_id: string }
        Returns: Json
      }
      pm_train_player: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: Json
      }
      pm_training_capacity: { Args: { p_team_id: string }; Returns: number }
      pm_transfer_floor: { Args: { p_player_id: string }; Returns: number }
      pm_unlist_player: {
        Args: { p_listing_id: string; p_team_id: string }
        Returns: undefined
      }
      pm_unlock_secondary_position: {
        Args: {
          p_player_id: string
          p_target_position: string
          p_team_id: string
        }
        Returns: Json
      }
      pm_upgrade_staff: {
        Args: { p_role_key: string; p_team_id: string }
        Returns: {
          level: number
          role_key: string
        }[]
      }
      process_referral_coop: { Args: { p_user: string }; Returns: undefined }
      process_referral_qualification: {
        Args: { p_referred: string }
        Returns: boolean
      }
      purchase_shop_item: { Args: { p_id: string }; Returns: undefined }
      purchase_shop_item_as: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: Json
      }
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number }
        Returns: boolean
      }
      rate_limits_gc: { Args: never; Returns: number }
      rls_auto_enable: { Args: never; Returns: undefined }
      toggle_post_like: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: boolean
      }
      toggle_post_like_as: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: boolean
      }
      unequip_category: { Args: { p_cat: string }; Returns: undefined }
      unequip_category_as: {
        Args: { p_category: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      article_status: "draft" | "published" | "archived"
      clan_request_status: "pending" | "accepted" | "rejected"
      clan_role: "leader" | "officer" | "member" | "co_leader" | "manager"
      clan_status: "open" | "invite_only" | "closed"
      lfg_response_status: "pending" | "accepted" | "rejected"
      lfg_status: "open" | "filled" | "closed"
      match_status:
        | "pending"
        | "ready"
        | "live"
        | "reported"
        | "confirmed"
        | "disputed"
      notification_type:
        | "lfg_response"
        | "lfg_accepted"
        | "forum_reply"
        | "news_comment"
        | "tournament_checkin"
        | "tournament_match"
        | "system"
        | "referral"
        | "follow"
        | "post_comment"
      tournament_format: "single_elim" | "double_elim" | "round_robin"
      tournament_status:
        | "draft"
        | "open"
        | "checkin"
        | "live"
        | "completed"
        | "cancelled"
      user_role:
        | "user"
        | "moderator"
        | "organizer"
        | "streamer"
        | "esports"
        | "admin"
        | "journalist"
      wallet_tx_type:
        | "daily_bonus"
        | "admin_grant"
        | "event_reward"
        | "spend"
        | "refund"
        | "referral"
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
      article_status: ["draft", "published", "archived"],
      clan_request_status: ["pending", "accepted", "rejected"],
      clan_role: ["leader", "officer", "member", "co_leader", "manager"],
      clan_status: ["open", "invite_only", "closed"],
      lfg_response_status: ["pending", "accepted", "rejected"],
      lfg_status: ["open", "filled", "closed"],
      match_status: [
        "pending",
        "ready",
        "live",
        "reported",
        "confirmed",
        "disputed",
      ],
      notification_type: [
        "lfg_response",
        "lfg_accepted",
        "forum_reply",
        "news_comment",
        "tournament_checkin",
        "tournament_match",
        "system",
        "referral",
        "follow",
        "post_comment",
      ],
      tournament_format: ["single_elim", "double_elim", "round_robin"],
      tournament_status: [
        "draft",
        "open",
        "checkin",
        "live",
        "completed",
        "cancelled",
      ],
      user_role: [
        "user",
        "moderator",
        "organizer",
        "streamer",
        "esports",
        "admin",
        "journalist",
      ],
      wallet_tx_type: [
        "daily_bonus",
        "admin_grant",
        "event_reward",
        "spend",
        "refund",
        "referral",
      ],
    },
  },
} as const
