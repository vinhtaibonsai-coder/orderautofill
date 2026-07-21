// admin-dashboard/supabase-config.js
// Cấu hình dự án Supabase cho Web Admin Dashboard
const SUPABASE_CONFIG = {
  url: 'https://xlgovgynbsahuykyjzcx.supabase.co',
  anonKey: 'sb_publishable_i7Ox-gsXTnPbP_AghSxb4Q_w6-5vbMg'
};

if (typeof globalThis !== 'undefined') {
  globalThis.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
