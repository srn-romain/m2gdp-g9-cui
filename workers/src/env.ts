export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  SUPABASE_URL?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  ALLOWED_ORIGINS?: string;
}
