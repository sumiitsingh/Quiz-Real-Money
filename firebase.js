// ========================================
// SUPABASE CONFIGURATION
// ========================================

const SUPABASE_URL = "https://gbvrucjgemkrefvnrqkq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_PhaUBMkmyZI-aiOXhhBrOQ_ReYLf2B1";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);