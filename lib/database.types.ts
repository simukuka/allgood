/**
 * TypeScript types for the AllGood Supabase schema.
 * Shaped to satisfy @supabase/supabase-js v2 generic constraints.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          country: string | null;
          currency: string;
          rafiki_wallet_address_id: string | null;
          dob: string | null;
          id_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          country?: string | null;
          currency?: string;
          rafiki_wallet_address_id?: string | null;
          dob?: string | null;
          id_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          country?: string | null;
          currency?: string;
          rafiki_wallet_address_id?: string | null;
          dob?: string | null;
          id_type?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          currency: string;
          account_type: "checking" | "savings";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          currency?: string;
          account_type?: "checking" | "savings";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          currency?: string;
          account_type?: "checking" | "savings";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string | null;
          recipient_email: string | null;
          recipient_phone: string | null;
          recipient_name: string;
          amount: number;
          currency: string;
          converted_amount: number | null;
          converted_currency: string | null;
          exchange_rate: number | null;
          fee: number;
          status: "pending" | "completed" | "failed" | "cancelled";
          type: "send" | "receive" | "request";
          note: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id?: string | null;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          recipient_name: string;
          amount: number;
          currency?: string;
          converted_amount?: number | null;
          converted_currency?: string | null;
          exchange_rate?: number | null;
          fee?: number;
          status?: "pending" | "completed" | "failed" | "cancelled";
          type: "send" | "receive" | "request";
          note?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: "pending" | "completed" | "failed" | "cancelled";
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_sender_id_fkey";
            columns: ["sender_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_name: string;
          contact_email: string | null;
          contact_phone: string | null;
          country_code: string | null;
          flag_emoji: string | null;
          is_favorite: boolean;
          last_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_name: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          country_code?: string | null;
          flag_emoji?: string | null;
          is_favorite?: boolean;
          last_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          contact_name?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          country_code?: string | null;
          flag_emoji?: string | null;
          is_favorite?: boolean;
          last_sent_at?: string | null;
        };
        Relationships: [];
      };
      scheduled_transfers: {
        Row: {
          id: string;
          user_id: string;
          recipient_email: string | null;
          recipient_phone: string | null;
          recipient_name: string;
          amount: number;
          currency: string;
          frequency: "once" | "weekly" | "biweekly" | "monthly";
          next_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          recipient_name: string;
          amount: number;
          currency?: string;
          frequency: "once" | "weekly" | "biweekly" | "monthly";
          next_date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          recipient_email?: string | null;
          recipient_phone?: string | null;
          recipient_name?: string;
          amount?: number;
          currency?: string;
          frequency?: "once" | "weekly" | "biweekly" | "monthly";
          next_date?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      deduct_balance: {
        Args: { p_user_id: string; p_amount: number };
        Returns: undefined;
      };
      add_balance: {
        Args: { p_user_id: string; p_amount: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases
export type Profile             = Database["public"]["Tables"]["profiles"]["Row"];
export type Account             = Database["public"]["Tables"]["accounts"]["Row"];
export type Transaction         = Database["public"]["Tables"]["transactions"]["Row"];
export type Contact             = Database["public"]["Tables"]["contacts"]["Row"];
export type ScheduledTransfer   = Database["public"]["Tables"]["scheduled_transfers"]["Row"];
