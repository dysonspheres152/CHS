/* ==========================================================================
   DATA.JS
   Direct Supabase integration: generic CRUD helpers used everywhere, plus
   the public-facing render functions that pull live content from Supabase
   into every page (home, about, events, gallery, past papers, constitution,
   admissions, contact). Every table here matches exactly what the admin
   dashboard (admin-dashboard.js) reads and writes — there is no mock or
   placeholder data anywhere in this file.
   ========================================================================== */

/** Escape user-supplied text before injecting into innerHTML. */
function chsEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

/** READ: fetch rows from a table, newest first by default. */
async function chsFetchAll(table, { orderBy = "created_at", ascending = false, limit = null } = {}) {
  if (!chsSupabaseReady()) {
    console.error("Supabase client is not initialized.");
    return { data: [], error: new Error("Supabase connection failed.") };
  }
  let query = sb.from(table).select("*").order(orderBy, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) console.error(`chsFetchAll(${table}) failed:`, error.message);
  return { data: data || [], error };
}

/** CREATE: insert a new row into a table. */
async function chsInsert(table, payload) {
  if (!chsSupabaseReady()) return { data: null, error: new Error("Supabase not initialized") };
  const { data, error } = await sb.from(table).insert([payload]).select();
  return { data, error };
}

/** UPDATE: update an existing row by ID. */
async function chsUpdate(table, id, payload) {
  if (!chsSupabaseReady()) return { data: null, error: new Error("Supabase not initialized") };
  const { data, error } = await sb.from(table).update(payload).eq("id", id).select();
  return { data, error };
}

/** DELETE: delete a row by ID. */
async function chsDelete(table, id) {
  if (!chsSupabaseReady()) return { data: null, error: new Error("Supabase not initialized") };
  const { error } = await sb.from(table).delete().eq("id", id);
  return { error };
}

/* ---------------------------------------------------------------------
   PUBLIC RENDER HANDLERS
   Every function below is safe to call even before any rows exist — each
   renders a friendly empty state instead of leaving skeleton loaders up.
--------------------------------------------------------------------- */

/** Pull dynamic settings (phone, email, stats, address) into elements with
 *  data-setting="key" (text) and data-setting-target="key" (animated counters).
 *  Returns the key/value map so callers (e.g. the admin Home Content form)
 *  can reuse the same fetch. */
async function chsApplySettings() {
  const { data } = await chsFetchAll("settings");
  const map = {};
  (data || []).forEach((row) => { map[row.key] = row.value; });

  document.querySelectorAll("[data-setting]").forEach((el) => {
    const key = el.getAttribute("data-setting");
    if (map[key] !== undefined) el.textContent = map[key];
  });

  document.querySelectorAll("[data-setting-target]").forEach((el) => {
    const key = el.getAttribute("data-setting-target");
    if (map[key] === undefined) return;
    el.textContent = map[key];
    // If this element (or a sibling counter with the same key) drives an
    // animated counter strip, sync its data-target too so the two never drift.
    if (el.hasAttribute("data-target")) el.setAttribute("data-target", map[key]);
  });

  return map;
}

/** Render upcoming events (from the "events" table) into a card grid. */
async function chsRenderEvents(containerId, { limit = null } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const { data } = await chsFetchAll("events", { orderBy: "event_date", ascending: true });
  const today = new Date().toISOString().slice(0, 10);
  let events = (data || []).filter((e) => !e.event_date || e.event_date >= today);
  if (limit) events = events.slice(0, limit);

  if (!events.length) {
    container.innerHTML = `<div class="empty-state"><p>No upcoming events posted yet.</p></div>`;
    return events;
  }

  container.innerHTML = events
    .map(
      (e) => `
        <div class="card event-card reveal">
          ${e.image_url ? `<div class="card-media"><img src="${chsEscapeHtml(e.image_url)}" alt="${chsEscapeHtml(e.title)}" loading="lazy"></div>` : ""}
          <div class="card-body">
            <span class="card-tag">Event</span>
            <h3>${chsEscapeHtml(e.title)}</h3>
            <p class="event-date">📅 ${e.event_date ? new Date(e.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "TBA"}${e.location ? ` · ${chsEscapeHtml(e.location)}` : ""}</p>
            <p>${chsEscapeHtml(e.description || "")}</p>
          </div>
        </div>`
    )
    .join("");

  if (window.CHS && window.CHS.initScrollReveal) window.CHS.initScrollReveal();
  return events;
}

/** Render news posts (from the "news" table) into a card grid. */
async function chsRenderNews(containerId, { limit = null } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const { data } = await chsFetchAll("news", { orderBy: "created_at", ascending: false });
  let news = data || [];
  if (limit) news = news.slice(0, limit);

  if (!news.length) {
    container.innerHTML = `<div class="empty-state"><p>No news items posted yet.</p></div>`;
    return news;
  }

  container.innerHTML = news
    .map(
      (n) => `
        <div class="card reveal">
          ${n.image_url ? `<div class="card-media"><img src="${chsEscapeHtml(n.image_url)}" alt="${chsEscapeHtml(n.title)}" loading="lazy"></div>` : ""}
          <div class="card-body">
            <span class="card-tag">${chsEscapeHtml(n.category || "News")}</span>
            <h3>${chsEscapeHtml(n.title)}</h3>
            <p style="color:var(--gray); font-size:.85rem; margin-bottom:8px;">${new Date(n.published_at || n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p>${chsEscapeHtml(n.body || "")}</p>
          </div>
        </div>`
    )
    .join("");

  if (window.CHS && window.CHS.initScrollReveal) window.CHS.initScrollReveal();
  return news;
}

/** Render staff/leadership cards (from the "staff" table). Used on about.html. */
async function chsRenderStaff(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const { data } = await chsFetchAll("staff", { orderBy: "created_at", ascending: true });
  const staff = data || [];

  if (!staff.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p>Staff profiles will appear here soon.</p></div>`;
    return staff;
  }

  container.innerHTML = staff
    .map(
      (s, i) => `
        <div class="card reveal" style="--i:${i % 8}"><div class="card-body" style="text-align:center;">
          <div class="card-media" style="width:96px; height:96px; border-radius:50%; margin:0 auto 14px; overflow:hidden;">
            ${s.photo_url ? `<img src="${chsEscapeHtml(s.photo_url)}" alt="${chsEscapeHtml(s.name)}" style="width:100%; height:100%; object-fit:cover;">` : `<div class="icon-tile" style="width:100%; height:100%;">🧑‍🏫</div>`}
          </div>
          <h3 style="font-size:1rem;">${chsEscapeHtml(s.name)}</h3>
          <p style="color:var(--blue); font-weight:600; font-size:.85rem; margin-bottom:4px;">${chsEscapeHtml(s.role)}</p>
          ${s.department ? `<p style="color:var(--gray); font-size:.8rem;">${chsEscapeHtml(s.department)}</p>` : ""}
          ${s.bio ? `<p style="margin-top:8px; font-size:.85rem;">${chsEscapeHtml(s.bio)}</p>` : ""}
        </div></div>`
    )
    .join("");

  if (window.CHS && window.CHS.initScrollReveal) window.CHS.initScrollReveal();
  return staff;
}

/** Render governing documents (from the "constitution_files" table). */
async function chsRenderConstitution(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const { data } = await chsFetchAll("constitution_files", { orderBy: "created_at", ascending: true });
  const files = data || [];

  if (!files.length) {
    container.innerHTML = `<div class="empty-state"><p>Governing documents will be published here soon.</p></div>`;
    return files;
  }

  container.innerHTML = files
    .map(
      (f) => `
        <div class="card" style="padding:0;"><div class="card-body">
          <div class="icon-tile">📄</div>
          <h3>${chsEscapeHtml(f.title)}</h3>
          <p>${chsEscapeHtml(f.description || "")}</p>
          <a class="btn btn-ghost btn-sm" style="margin-top:10px;" href="${chsEscapeHtml(f.file_url)}" target="_blank" rel="noopener">Download PDF</a>
        </div></div>`
    )
    .join("");

  return files;
}

/** Render the past-papers table body (from the "past_papers" table).
 *  Returns the full row array so past-papers.html can filter client-side. */
async function chsRenderPastPapers(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  const { data } = await chsFetchAll("past_papers", { orderBy: "year", ascending: false });
  const papers = data || [];

  if (!tbody) return papers;

  if (!papers.length) {
    tbody.innerHTML = "";
    const noMsg = document.getElementById("noPapersMsg");
    if (noMsg) noMsg.style.display = "block";
    return papers;
  }

  tbody.innerHTML = papers
    .map(
      (p) => `
        <tr>
          <td>${chsEscapeHtml(p.subject)}</td><td>${chsEscapeHtml(p.level)}</td><td>${chsEscapeHtml(p.term || "—")}</td><td>${chsEscapeHtml(p.year)}</td>
          <td><a class="btn btn-ghost btn-sm" href="${chsEscapeHtml(p.file_url)}" target="_blank" rel="noopener">Download</a></td>
        </tr>`
    )
    .join("");

  return papers;
}

/** Submit Contact Form */
async function chsSubmitContactForm(formEl, feedback) {
  const payload = {
    name: formEl.name.value.trim(),
    email: formEl.email.value.trim(),
    subject: formEl.subject ? formEl.subject.value.trim() : "General Inquiry",
    message: formEl.message.value.trim(),
    status: "new",
  };

  const { error } = await chsInsert("contact_messages", payload);
  if (error) {
    chsShowFormFeedback(feedback, "error", "Could not send message. Please check your connection and try again.");
    return;
  }
  chsShowFormFeedback(feedback, "success", "Message sent! Thank you for reaching out.");
  formEl.reset();
}

/** Submit Admissions Application Form */
async function chsSubmitAdmissionForm(formEl, feedback) {
  const payload = {
    student_name: formEl.student_name.value.trim(),
    parent_name: formEl.parent_name.value.trim(),
    phone: formEl.phone.value.trim(),
    email: formEl.email.value.trim(),
    class_applying: formEl.class_applying.value,
    previous_school: formEl.previous_school.value.trim(),
    message: formEl.message.value.trim(),
    status: "pending",
  };

  const { error } = await chsInsert("admissions", payload);
  if (error) {
    chsShowFormFeedback(feedback, "error", "Could not submit application. Please check your connection and try again.");
    return;
  }
  chsShowFormFeedback(feedback, "success", "Application submitted! We will contact you soon.");
  formEl.reset();
}

function chsShowFormFeedback(feedback, type, message) {
  if (!feedback) return;
  const successEl = feedback.querySelector(".form-success");
  const errorEl = feedback.querySelector(".form-error");
  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  const target = type === "success" ? successEl : errorEl;
  if (target) {
    target.textContent = message;
    target.style.display = "block";
  }
}
