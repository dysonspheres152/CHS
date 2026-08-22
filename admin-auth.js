/* ==========================================================================
   ADMIN-AUTH.JS
   Supabase Auth session handling for the admin dashboard. Two things live
   here:
     1. chsAdminRequireLogin(redirectTo) — called at the top of
        dashboard.html. Checks for a real, live Supabase session; if there
        isn't one, redirects to the login page instead of just hiding the
        dashboard with CSS.
     2. chsAdminSignOut(redirectTo) — used by the Log Out button.
   login.html calls chsAdminSignIn() directly.
   Depends on sb (from supabase-config.js) — load this file AFTER
   supabase-config.js on every page that uses it.
   ========================================================================== */

/**
 * Guard for dashboard.html. Resolves with the active session, or redirects
 * to the login page and resolves with null if there isn't one.
 * @param {string} redirectTo  Login page to send unauthenticated visitors to.
 */
async function chsAdminRequireLogin(redirectTo = "login.html") {
  if (!chsSupabaseReady()) {
    console.error("Supabase client not initialized — check supabase-config.js");
    window.location.href = redirectTo;
    return null;
  }

  const { data, error } = await sb.auth.getSession();
  if (error || !data || !data.session) {
    window.location.href = redirectTo;
    return null;
  }

  // Keep the dashboard in sync if the session is revoked or expires while
  // the admin has the tab open (e.g. signed out in another tab).
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") window.location.href = redirectTo;
  });

  return data.session;
}

/**
 * Sign in with email + password. Returns { session, error }.
 * Used by login.html's form handler.
 */
async function chsAdminSignIn(email, password) {
  if (!chsSupabaseReady()) return { session: null, error: new Error("Supabase not configured") };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { session: data ? data.session : null, error };
}

/**
 * Sign out and redirect to the login page.
 */
async function chsAdminSignOut(redirectTo = "login.html") {
  if (chsSupabaseReady()) await sb.auth.signOut();
  window.location.href = redirectTo;
}
