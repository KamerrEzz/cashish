import type { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Admin = SupabaseClient<Database>;

export type ToolCtx = {
  userId: string;
  db: () => Admin;
};

export type CashishToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
  execute: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<unknown>;
};
