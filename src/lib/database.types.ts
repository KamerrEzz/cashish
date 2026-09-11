export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AccountType = "cash" | "checking" | "savings" | "credit_card";
type TransactionType = "expense" | "income" | "transfer";
type StatementStatus = "open" | "closed" | "paid";
type SubscriptionFrequency = "weekly" | "monthly" | "yearly";
type ReminderEventType =
  | "statement_close"
  | "payment_due"
  | "subscription_charge"
  | "cashflow_shortfall";
type ReminderChannel = "in_app" | "email";
type ReminderStatus = "pending" | "sent" | "dismissed";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          currency: string;
          balance_cents: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: AccountType;
          currency?: string;
          balance_cents?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          currency?: string;
          balance_cents?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_card_profiles: {
        Row: {
          account_id: string;
          user_id: string;
          credit_limit_cents: number;
          statement_close_day: number;
          payment_due_day: number;
          minimum_payment_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          user_id: string;
          credit_limit_cents: number;
          statement_close_day: number;
          payment_due_day: number;
          minimum_payment_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          user_id?: string;
          credit_limit_cents?: number;
          statement_close_day?: number;
          payment_due_day?: number;
          minimum_payment_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_card_profiles_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      statement_periods: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          opens_on: string;
          closes_on: string;
          due_on: string;
          opening_balance_cents: number;
          closing_balance_cents: number | null;
          minimum_payment_cents: number;
          status: StatementStatus;
          closed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          opens_on: string;
          closes_on: string;
          due_on: string;
          opening_balance_cents?: number;
          closing_balance_cents?: number | null;
          minimum_payment_cents?: number;
          status?: StatementStatus;
          closed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          opens_on?: string;
          closes_on?: string;
          due_on?: string;
          opening_balance_cents?: number;
          closing_balance_cents?: number | null;
          minimum_payment_cents?: number;
          status?: StatementStatus;
          closed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "statement_periods_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          type: TransactionType;
          amount_cents: number;
          currency: string;
          merchant: string | null;
          description: string | null;
          category: string | null;
          occurred_on: string;
          statement_period_id: string | null;
          transfer_id: string | null;
          subscription_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          type: TransactionType;
          amount_cents: number;
          currency?: string;
          merchant?: string | null;
          description?: string | null;
          category?: string | null;
          occurred_on?: string;
          statement_period_id?: string | null;
          transfer_id?: string | null;
          subscription_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          type?: TransactionType;
          amount_cents?: number;
          currency?: string;
          merchant?: string | null;
          description?: string | null;
          category?: string | null;
          occurred_on?: string;
          statement_period_id?: string | null;
          transfer_id?: string | null;
          subscription_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      transfers: {
        Row: {
          id: string;
          user_id: string;
          from_account_id: string;
          to_account_id: string;
          amount_cents: number;
          currency: string;
          occurred_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_account_id: string;
          to_account_id: string;
          amount_cents: number;
          currency?: string;
          occurred_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_account_id?: string;
          to_account_id?: string;
          amount_cents?: number;
          currency?: string;
          occurred_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          name: string;
          merchant: string;
          amount_cents: number;
          currency: string;
          frequency: SubscriptionFrequency;
          next_billing_on: string;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          name: string;
          merchant: string;
          amount_cents: number;
          currency?: string;
          frequency?: SubscriptionFrequency;
          next_billing_on: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          name?: string;
          merchant?: string;
          amount_cents?: number;
          currency?: string;
          frequency?: SubscriptionFrequency;
          next_billing_on?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          event_type: ReminderEventType;
          channel: ReminderChannel;
          title: string;
          body: string;
          due_on: string;
          related_account_id: string | null;
          related_subscription_id: string | null;
          related_statement_id: string | null;
          dedupe_key: string;
          status: ReminderStatus;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: ReminderEventType;
          channel: ReminderChannel;
          title: string;
          body: string;
          due_on: string;
          related_account_id?: string | null;
          related_subscription_id?: string | null;
          related_statement_id?: string | null;
          dedupe_key: string;
          status?: ReminderStatus;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: ReminderEventType;
          channel?: ReminderChannel;
          title?: string;
          body?: string;
          due_on?: string;
          related_account_id?: string | null;
          related_subscription_id?: string | null;
          related_statement_id?: string | null;
          dedupe_key?: string;
          status?: ReminderStatus;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_api_keys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_ai_credentials: {
        Row: {
          user_id: string;
          ciphertext: string;
          last4: string;
          provider: string;
          base_url: string;
          chat_model: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          ciphertext: string;
          last4: string;
          provider?: string;
          base_url: string;
          chat_model: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          ciphertext?: string;
          last4?: string;
          provider?: string;
          base_url?: string;
          chat_model?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_ai_credentials_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          tool_calls: Json | null;
          tool_call_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content?: string;
          tool_calls?: Json | null;
          tool_call_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          tool_calls?: Json | null;
          tool_call_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage_events: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          model: string | null;
          prompt_tokens: number;
          completion_tokens: number;
          estimated_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind?: string;
          model?: string | null;
          prompt_tokens?: number;
          completion_tokens?: number;
          estimated_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          model?: string | null;
          prompt_tokens?: number;
          completion_tokens?: number;
          estimated_usd?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_linked_transfer: {
        Args: {
          p_from_account_id: string;
          p_to_account_id: string;
          p_amount_cents: number;
          p_occurred_on: string;
          p_note?: string | null;
        };
        Returns: string;
      };
      close_statement_period: {
        Args: {
          p_account_id: string;
          p_minimum_payment_cents?: number | null;
        };
        Returns: string;
      };
      mcp_resolve_api_key: {
        Args: { p_key_hash: string };
        Returns: { user_id: string; key_id: string }[];
      };
      save_own_ai_credential: {
        Args: {
          p_provider: string;
          p_base_url: string;
          p_chat_model: string;
          p_ciphertext: string | null;
          p_last4: string | null;
        };
        Returns: undefined;
      };
      own_ai_credential_meta: {
        Args: Record<string, never>;
        Returns: {
          last4: string;
          updated_at: string;
          provider: string;
          base_url: string;
          chat_model: string;
        }[];
      };
      own_ai_credential_cipher: {
        Args: Record<string, never>;
        Returns: string;
      };
      delete_own_ai_credential: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      account_type: AccountType;
      transaction_type: TransactionType;
      statement_status: StatementStatus;
      subscription_frequency: SubscriptionFrequency;
      reminder_event_type: ReminderEventType;
      reminder_channel: ReminderChannel;
      reminder_status: ReminderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type CreditCardProfile =
  Database["public"]["Tables"]["credit_card_profiles"]["Row"];
export type StatementPeriod =
  Database["public"]["Tables"]["statement_periods"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
