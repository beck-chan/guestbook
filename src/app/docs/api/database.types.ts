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
      admin_allowlist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          is_read: boolean
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          is_read?: boolean
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          is_read?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      guestbook_rate_limits: {
        Row: {
          expire: number | null
          key: string
          points: number
        }
        Insert: {
          expire?: number | null
          key: string
          points?: number
        }
        Update: {
          expire?: number | null
          key?: string
          points?: number
        }
        Relationships: []
      }
      guestbook_settings: {
        Row: {
          accent_font: string
          accent_font_size: string
          capture_email: boolean
          comment_length: number
          custom_theme: string
          id: number
          main_font: string
          main_font_size: string
          marquee: boolean
          page_size: number
          placeholder: string
          profanity_allow_list: string
          rate_limit_count: number
          rate_limit_daily: number
          rate_limit_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          accent_font?: string
          accent_font_size?: string
          capture_email?: boolean
          comment_length?: number
          custom_theme?: string
          id: number
          main_font?: string
          main_font_size?: string
          marquee?: boolean
          page_size?: number
          placeholder?: string
          profanity_allow_list?: string
          rate_limit_count?: number
          rate_limit_daily?: number
          rate_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Update: {
          accent_font?: string
          accent_font_size?: string
          capture_email?: boolean
          comment_length?: number
          custom_theme?: string
          id?: number
          main_font?: string
          main_font_size?: string
          marquee?: boolean
          page_size?: number
          placeholder?: string
          profanity_allow_list?: string
          rate_limit_count?: number
          rate_limit_daily?: number
          rate_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      poem_hearts: {
        Row: {
          created_at: string
          id: string
          poem_id: string
          visitor_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          poem_id: string
          visitor_key: string
        }
        Update: {
          created_at?: string
          id?: string
          poem_id?: string
          visitor_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      comments_public: {
        Row: {
          body: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      poem_heart_counts: {
        Row: {
          heart_count: number | null
          poem_id: string | null
        }
        Relationships: []
      }
      poem_heart_total: {
        Row: {
          total_hearts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_admin_role: { Args: never; Returns: boolean }
      hook_before_user_created: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      poem_heart_state: {
        Args: { p_poem_id: string; p_visitor_key: string }
        Returns: Json
      }
      toggle_poem_heart: {
        Args: { p_poem_id: string; p_visitor_key: string }
        Returns: Json
      }
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
    Enums: {},
  },
} as const
