import { createClient } from "@supabase/supabase-js";
import { assertHttpsInProduction } from "@/utils/requireHttpsInProd";

const supabaseUrl = assertHttpsInProduction(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "",
  "VITE_SUPABASE_URL",
);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
