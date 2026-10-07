export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  FIREBASE_AUTH_EMULATOR?: string;
  ALLOWED_ORIGINS?: string;
}
