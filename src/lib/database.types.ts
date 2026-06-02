// AUTO-GENERATED from the live Supabase schema (rpmzlkjqyncusbptzics).
// Do not edit by hand. Regenerate with the Supabase MCP generate_typescript_types
// tool (or: supabase gen types typescript) after schema changes.

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
      clan_members: {
        Row: {
          clan_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["clan_role"]
          user_id: string
        }
        Insert: {
          clan_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["clan_role"]
          user_id: string
        }
        Update: {
          clan_id?: string
          id?: string
          joined_at?: string
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
      clans: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          level: number
          name: string
          slug: string
          status: Database["public"]["Enums"]["clan_status"]
          tag: string
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          level?: number
          name: string
          slug: string
          status?: Database["public"]["Enums"]["clan_status"]
          tag: string
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          level?: number
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["clan_status"]
          tag?: string
          updated_at?: string
          xp?: number
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
          id: string
          title: string
          description: string | null
          challenge_type: string
          xp_reward: number
          target_count: number
          active_date: string
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          challenge_type?: string
          xp_reward?: number
          target_count?: number
          active_date: string
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          challenge_type?: string
          xp_reward?: number
          target_count?: number
          active_date?: string
          is_active?: boolean
          created_at?: string | null
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
          main_game_slug: string | null
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
          main_game_slug?: string | null
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
          main_game_slug?: string | null
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
      user_challenge_progress: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          progress: number
          completed: boolean
          claimed: boolean
          claimed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          progress?: number
          completed?: boolean
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          progress?: number
          completed?: boolean
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_user_id_profiles_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_progress_challenge_id_daily_challenges_id_fk"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
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
      award_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      claim_daily_bonus: { Args: never; Returns: undefined }
      claim_daily_bonus_as: { Args: { p_user_id: string }; Returns: Json }
      equip_item: { Args: { p_id: string }; Returns: undefined }
      equip_item_as: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: Json
      }
      expire_old_lfg_posts: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
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
      purchase_shop_item: { Args: { p_id: string }; Returns: undefined }
      purchase_shop_item_as: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: Json
      }
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
      clan_role: "leader" | "officer" | "member"
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
      clan_role: ["leader", "officer", "member"],
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
      ],
    },
  },
} as const
