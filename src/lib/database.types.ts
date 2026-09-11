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
type ProjectMemberRole = "owner" | "member" | "viewer";
type ImportRowStatus =
  | "pending"
  | "review"
  | "applied"
  | "rejected"
  | "duplicate";
type ReceiptStatus =
  | "uploaded"
  | "parsing"
  | "ready"
  | "failed"
  | "applied";
type ImportBatchStatus = "review" | "applied" | "cancelled";
type PlannedFrequency = SubscriptionFrequency;

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
          onboarding_completed_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
          created_at?: string;
          onboarding_completed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
          created_at?: string;
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: ProjectMemberRole;
          created_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: ProjectMemberRole;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          user_id?: string;
          role?: ProjectMemberRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_invites: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          role: ProjectMemberRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          role?: ProjectMemberRole;
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          email?: string;
          role?: ProjectMemberRole;
          token?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
          {
            foreignKeyName: "accounts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_card_profiles: {
        Row: {
          account_id: string;
          user_id: string;
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
          project_id: string;
          account_id: string;
          type: TransactionType;
          amount_cents: number;
          currency: string;
          merchant: string | null;
          merchant_key: string | null;
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
          project_id: string;
          account_id: string;
          type: TransactionType;
          amount_cents: number;
          currency?: string;
          merchant?: string | null;
          merchant_key?: string | null;
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
          project_id?: string;
          account_id?: string;
          type?: TransactionType;
          amount_cents?: number;
          currency?: string;
          merchant?: string | null;
          merchant_key?: string | null;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
      receipts: {
        Row: {
          id: string;
          project_id: string;
          uploaded_by: string;
          storage_path: string;
          mime: string;
          status: ReceiptStatus;
          parsed: Json | null;
          error: string | null;
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          uploaded_by: string;
          storage_path: string;
          mime: string;
          status?: ReceiptStatus;
          parsed?: Json | null;
          error?: string | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          uploaded_by?: string;
          storage_path?: string;
          mime?: string;
          status?: ReceiptStatus;
          parsed?: Json | null;
          error?: string | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      import_batches: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          source_filename: string;
          source_format: "csv" | "ofx";
          account_id: string | null;
          status: ImportBatchStatus;
          row_count: number;
          applied_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          source_filename: string;
          source_format: "csv" | "ofx";
          account_id?: string | null;
          status?: ImportBatchStatus;
          row_count?: number;
          applied_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          source_filename?: string;
          source_format?: "csv" | "ofx";
          account_id?: string | null;
          status?: ImportBatchStatus;
          row_count?: number;
          applied_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      import_rows: {
        Row: {
          id: string;
          batch_id: string;
          project_id: string;
          status: ImportRowStatus;
          occurred_on: string;
          amount_cents: number;
          type: TransactionType;
          merchant: string | null;
          description: string | null;
          category: string | null;
          fingerprint: string;
          raw: Json;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          project_id: string;
          status?: ImportRowStatus;
          occurred_on: string;
          amount_cents: number;
          type: TransactionType;
          merchant?: string | null;
          description?: string | null;
          category?: string | null;
          fingerprint: string;
          raw?: Json;
          transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          project_id?: string;
          status?: ImportRowStatus;
          occurred_on?: string;
          amount_cents?: number;
          type?: TransactionType;
          merchant?: string | null;
          description?: string | null;
          category?: string | null;
          fingerprint?: string;
          raw?: Json;
          transaction_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      planned_inflows: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          label: string;
          amount_cents: number;
          currency: string;
          next_on: string;
          frequency: PlannedFrequency;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          label: string;
          amount_cents: number;
          currency?: string;
          next_on: string;
          frequency?: PlannedFrequency;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          label?: string;
          amount_cents?: number;
          currency?: string;
          next_on?: string;
          frequency?: PlannedFrequency;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_inflows_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      installment_plans: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          account_id: string;
          transaction_id: string | null;
          label: string;
          total_cents: number;
          installment_cents: number;
          months_total: number;
          months_remaining: number;
          next_due_on: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          account_id: string;
          transaction_id?: string | null;
          label: string;
          total_cents: number;
          installment_cents: number;
          months_total: number;
          months_remaining: number;
          next_due_on: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          account_id?: string;
          transaction_id?: string | null;
          label?: string;
          total_cents?: number;
          installment_cents?: number;
          months_total?: number;
          months_remaining?: number;
          next_due_on?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "installment_plans_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          category: string | null;
          monthly_limit_cents: number;
          currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          category?: string | null;
          monthly_limit_cents: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          category?: string | null;
          monthly_limit_cents?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
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
          project_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
        Returns: { user_id: string; key_id: string; project_id: string }[];
      };
      is_project_member: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      is_project_owner: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      is_project_writer: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      apply_import_rows: {
        Args: {
          p_batch_id: string;
          p_account_id: string;
          p_row_ids?: string[] | null;
        };
        Returns: number;
      };
      create_project: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      accept_project_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      preview_project_invite: {
        Args: { p_token: string };
        Returns: {
          project_id: string;
          project_name: string;
          email: string;
          role: ProjectMemberRole;
          expires_at: string;
          accepted_at: string | null;
        }[];
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
      project_member_role: ProjectMemberRole;
      receipt_status: ReceiptStatus;
      import_row_status: ImportRowStatus;
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
export type ImportBatch = Database["public"]["Tables"]["import_batches"]["Row"];
export type ImportRow = Database["public"]["Tables"]["import_rows"]["Row"];
export type PlannedInflow =
  Database["public"]["Tables"]["planned_inflows"]["Row"];
export type InstallmentPlan =
  Database["public"]["Tables"]["installment_plans"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type PushSubscription =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type ProjectMemberRoleDb = Database["public"]["Enums"]["project_member_role"];
export type ImportRowStatusDb = Database["public"]["Enums"]["import_row_status"];
