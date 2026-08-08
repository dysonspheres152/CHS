/* ==========================================================================
   ADMIN-AUTH.JS
   Thin wrapper around Supabase Authentication for the admin area.
   Uses email + password sign-in ("Email" provider). To create admin
   accounts: Supabase Dashboard -> Authentication -> Users -> Add user.
   ========================================================================== */

/** Sign in with email/password. Returns { data, error }. */
async function chsAdminSignIn(email, password) {
  if (!chsSupabaseReady()) return { data: null, error: new Error("Supabase not configured") };
  return await sb.auth.signInWithPassword({ email, password });
}

/** Sign the current admin out and send them back to the login page. */
async function chsAdminSignOut(redirectTo = "login.html") {
  if (chsSupabaseReady()) await sb.auth.signOut();
  window.location.href = redirectTo;
}

/** Resolve the current session (or null if signed out / not configured). */
async function chsAdminGetSession() {
  if (!chsSupabaseReady()) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Call on dashboard.html: bounce to login if there's no active session. */
async function chsAdminRequireLogin(loginPage = "login.html") {
  const session = await chsAdminGetSession();
  if (!session) {
    window.location.href = loginPage;
    return null;
  }
  return session;
}

/** Call on login.html: if already signed in, skip straight to the dashboard. */
async function chsAdminRedirectIfLoggedIn(dashboardPage = "dashboard.html") {
  const session = await chsAdminGetSession();
  if (session) window.location.href = dashboardPage;
}
