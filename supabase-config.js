/* ==========================================================================
   SUPABASE-CONFIG.JS
   Initializes the Supabase JS client using your production keys.
   ========================================================================== */

const SUPABASE_URL = "https://vzayikzkldwbkvqlfmau.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cs3nlY9w6q5sbv8n8H1ndA_y-v15Mai";

let sb = null;

function initSupabase() {
  if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb;
  }
  return null;
}

function chsSupabaseReady() {
  return sb !== null;
}

// Auto-initialize as soon as the library loads
if (typeof supabase !== "undefined") {
  initSupabase();
}

/* ==========================================================================
   FILE UPLOADS
   Every "picture" / "document" field in the admin dashboard uploads a real
   file straight from the admin's device into this Supabase Storage bucket,
   instead of asking for a hosted URL. Create this bucket once in your
   Supabase project (Storage -> New bucket -> name it exactly as below ->
   toggle "Public bucket" on) and the dashboard will handle the rest.
   ========================================================================== */
const CHS_STORAGE_BUCKET = "site-media";

/**
 * Upload a File object (from an <input type="file"> chosen on the admin's
 * own device) into Supabase Storage and return its public URL.
 * @param {File} file      The file the admin picked from their device.
 * @param {string} folder  Sub-folder inside the bucket, e.g. "gallery".
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
async function chsUploadFile(file, folder = "uploads") {
  if (!file) return { url: null, error: new Error("No file selected") };
  if (!chsSupabaseReady()) return { url: null, error: new Error("Supabase not configured") };

  const cleanExt = (file.name.split(".").pop() || "file").toLowerCase().replace(/[^a-z0-9]/g, "");
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${cleanExt ? "." + cleanExt : ""}`;
  const path = `${folder}/${uniqueName}`;

  const { error: uploadError } = await sb.storage
    .from(CHS_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { url: null, error: uploadError };

  const { data } = sb.storage.from(CHS_STORAGE_BUCKET).getPublicUrl(path);
  return { url: data ? data.publicUrl : null, error: null };
}
