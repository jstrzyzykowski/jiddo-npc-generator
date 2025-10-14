import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseClient = createClient<Database>(supabaseUrl, supabasePublishableKey);
