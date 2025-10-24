export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      npc_keyword_phrases: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          keyword_id: string;
          npc_id: string;
          phrase: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          keyword_id: string;
          npc_id: string;
          phrase: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          keyword_id?: string;
          npc_id?: string;
          phrase?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "npc_keyword_phrases_keyword_fkey";
            columns: ["keyword_id", "npc_id"];
            isOneToOne: false;
            referencedRelation: "npc_keywords";
            referencedColumns: ["id", "npc_id"];
          },
        ];
      };
      npc_keywords: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          npc_id: string;
          response: string;
          sort_index: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          npc_id: string;
          response: string;
          sort_index?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          npc_id?: string;
          response?: string;
          sort_index?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "npc_keywords_npc_id_fkey";
            columns: ["npc_id"];
            isOneToOne: false;
            referencedRelation: "npcs";
            referencedColumns: ["id"];
          },
        ];
      };
      npc_shop_items: {
        Row: {
          charges: number;
          container_item_id: number | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          item_id: number;
          list_type: Database["public"]["Enums"]["npc_shop_item_list_type"];
          name: string;
          npc_id: string;
          price: number;
          real_name: string | null;
          subtype: number;
          updated_at: string;
        };
        Insert: {
          charges?: number;
          container_item_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          item_id: number;
          list_type: Database["public"]["Enums"]["npc_shop_item_list_type"];
          name: string;
          npc_id: string;
          price: number;
          real_name?: string | null;
          subtype?: number;
          updated_at?: string;
        };
        Update: {
          charges?: number;
          container_item_id?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          item_id?: number;
          list_type?: Database["public"]["Enums"]["npc_shop_item_list_type"];
          name?: string;
          npc_id?: string;
          price?: number;
          real_name?: string | null;
          subtype?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "npc_shop_items_npc_id_fkey";
            columns: ["npc_id"];
            isOneToOne: false;
            referencedRelation: "npcs";
            referencedColumns: ["id"];
          },
        ];
      };
      npcs: {
        Row: {
          client_request_id: string;
          content_size_bytes: number;
          created_at: string;
          decline_message: string;
          deleted_at: string | null;
          generation_job_error: Json | null;
          generation_job_id: string | null;
          generation_job_started_at: string | null;
          generation_job_status: Database["public"]["Enums"]["generation_job_status"] | null;
          farewell_message: string;
          first_published_at: string | null;
          floor_change: boolean;
          focus_enabled: boolean;
          greet_message: string;
          health_max: number;
          health_now: number;
          id: string;
          implementation_type: Database["public"]["Enums"]["npc_implementation_type"];
          keywords_enabled: boolean;
          look_addons: number | null;
          look_body: number | null;
          look_feet: number | null;
          look_head: number | null;
          look_item_id: number | null;
          look_legs: number | null;
          look_mount: number | null;
          look_type: Database["public"]["Enums"]["npc_look_type"];
          look_type_id: number | null;
          name: string;
          no_shop_message: string;
          on_close_shop_message: string;
          owner_id: string;
          published_at: string | null;
          script: string;
          shop_enabled: boolean;
          shop_message_buy: string | null;
          shop_message_sell: string | null;
          shop_mode: Database["public"]["Enums"]["npc_shop_mode"];
          status: Database["public"]["Enums"]["npc_status"];
          system: Database["public"]["Enums"]["npc_system"];
          travel_enabled: boolean;
          updated_at: string;
          voice_enabled: boolean;
          walk_interval: number;
        };
        Insert: {
          client_request_id: string;
          content_size_bytes?: number;
          created_at?: string;
          decline_message: string;
          deleted_at?: string | null;
          generation_job_error?: Json | null;
          generation_job_id?: string | null;
          generation_job_started_at?: string | null;
          generation_job_status?: Database["public"]["Enums"]["generation_job_status"] | null;
          farewell_message: string;
          first_published_at?: string | null;
          floor_change?: boolean;
          focus_enabled?: boolean;
          greet_message: string;
          health_max: number;
          health_now: number;
          id?: string;
          implementation_type?: Database["public"]["Enums"]["npc_implementation_type"];
          keywords_enabled?: boolean;
          look_addons?: number | null;
          look_body?: number | null;
          look_feet?: number | null;
          look_head?: number | null;
          look_item_id?: number | null;
          look_legs?: number | null;
          look_mount?: number | null;
          look_type: Database["public"]["Enums"]["npc_look_type"];
          look_type_id?: number | null;
          name: string;
          no_shop_message: string;
          on_close_shop_message: string;
          owner_id: string;
          published_at?: string | null;
          script?: string;
          shop_enabled?: boolean;
          shop_message_buy?: string | null;
          shop_message_sell?: string | null;
          shop_mode?: Database["public"]["Enums"]["npc_shop_mode"];
          status?: Database["public"]["Enums"]["npc_status"];
          system?: Database["public"]["Enums"]["npc_system"];
          travel_enabled?: boolean;
          updated_at?: string;
          voice_enabled?: boolean;
          walk_interval: number;
        };
        Update: {
          client_request_id?: string;
          content_size_bytes?: number;
          created_at?: string;
          decline_message?: string;
          deleted_at?: string | null;
          generation_job_error?: Json | null;
          generation_job_id?: string | null;
          generation_job_started_at?: string | null;
          generation_job_status?: Database["public"]["Enums"]["generation_job_status"] | null;
          farewell_message?: string;
          first_published_at?: string | null;
          floor_change?: boolean;
          focus_enabled?: boolean;
          greet_message?: string;
          health_max?: number;
          health_now?: number;
          id?: string;
          implementation_type?: Database["public"]["Enums"]["npc_implementation_type"];
          keywords_enabled?: boolean;
          look_addons?: number | null;
          look_body?: number | null;
          look_feet?: number | null;
          look_head?: number | null;
          look_item_id?: number | null;
          look_legs?: number | null;
          look_mount?: number | null;
          look_type?: Database["public"]["Enums"]["npc_look_type"];
          look_type_id?: number | null;
          name?: string;
          no_shop_message?: string;
          on_close_shop_message?: string;
          owner_id?: string;
          published_at?: string | null;
          script?: string;
          shop_enabled?: boolean;
          shop_message_buy?: string | null;
          shop_message_sell?: string | null;
          shop_mode?: Database["public"]["Enums"]["npc_shop_mode"];
          status?: Database["public"]["Enums"]["npc_status"];
          system?: Database["public"]["Enums"]["npc_system"];
          travel_enabled?: boolean;
          updated_at?: string;
          voice_enabled?: boolean;
          walk_interval?: number;
        };
        Relationships: [
          {
            foreignKeyName: "npcs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      telemetry_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json | null;
          npc_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          npc_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          npc_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "telemetry_events_npc_id_fkey";
            columns: ["npc_id"];
            isOneToOne: false;
            referencedRelation: "npcs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "telemetry_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      generation_job_status: "queued" | "processing" | "succeeded" | "failed";
      npc_implementation_type: "xml";
      npc_look_type: "player" | "monster" | "item";
      npc_shop_item_list_type: "buy" | "sell";
      npc_shop_mode: "trade_window" | "talk_mode";
      npc_status: "draft" | "published";
      npc_system: "jiddo_tfs_1_5";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      npc_implementation_type: ["xml"],
      npc_look_type: ["player", "monster", "item"],
      npc_shop_item_list_type: ["buy", "sell"],
      npc_shop_mode: ["trade_window", "talk_mode"],
      npc_status: ["draft", "published"],
      npc_system: ["jiddo_tfs_1_5"],
      generation_job_status: ["queued", "processing", "succeeded", "failed"],
    },
  },
} as const;
