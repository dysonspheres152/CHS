/* ==========================================================================
   ADMIN-DASHBOARD.JS
   Drives dashboard.html: sidebar navigation, stat counters, and CRUD
   (Create / Read / Update / Delete) for every content type managed by
   the school admin. Relies on the generic chsFetchAll / chsInsert /
   chsUpdate / chsDelete helpers defined in ../js/data.js.
   ========================================================================== */

/* ---------------------------------------------------------------------
   1. PANEL DEFINITIONS
   One entry per sidebar item. `crud` panels are built generically by
   renderCrudPanel(); "home", "admissions", "contact_messages" and
   "settings" have their own bespoke handling further down.
--------------------------------------------------------------------- */
const PANELS = [
  { key: "home", label: "Home Content", icon: "🏠" },
  { key: "admissions", label: "Admissions", icon: "🎓" },
  { key: "events", label: "Events & News", icon: "🗓️" },
  { key: "past_papers", label: "Past Papers", icon: "📝" },
  { key: "constitution_files", label: "Constitution", icon: "📄" },
  { key: "gallery", label: "Gallery", icon: "🖼️" },
  { key: "contact_messages", label: "Contact Messages", icon: "✉️" },
  { key: "staff", label: "Staff", icon: "🧑‍🏫" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

// Config for every table that uses the generic list + add/edit modal flow.
const CRUD_CONFIGS = {
  events: {
    table: "events",
    tbody: "events_tbody",
    columns: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "event_date", label: "Event Date", type: "date", required: true },
      { key: "location", label: "Location", type: "text" },
      { key: "image_url", label: "Event Image", type: "file", kind: "image", accept: "image/*", folder: "events" },
    ],
    listColumns: ["title", "event_date", "location"],
  },
  news: {
    table: "news",
    tbody: "news_tbody",
    columns: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "body", label: "Body", type: "textarea", required: true },
      { key: "image_url", label: "News Image", type: "file", kind: "image", accept: "image/*", folder: "news" },
      { key: "published_at", label: "Published Date", type: "date" },
    ],
    listColumns: ["title", "category", "published_at"],
  },
  past_papers: {
    table: "past_papers",
    tbody: "past_papers_tbody",
    columns: [
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "level", label: "Level", type: "select", options: ["S.1", "S.2", "S.3", "S.4", "S.5", "S.6"], required: true },
      { key: "term", label: "Term", type: "select", options: ["Term 1", "Term 2", "Term 3"] },
      { key: "year", label: "Year", type: "number", required: true },
      { key: "file_url", label: "Paper File (PDF)", type: "file", kind: "document", accept: ".pdf,application/pdf", folder: "past_papers", required: true },
    ],
    listColumns: ["subject", "level", "term", "year"],
  },
  constitution_files: {
    table: "constitution_files",
    tbody: "constitution_files_tbody",
    columns: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "file_url", label: "Document File (PDF)", type: "file", kind: "document", accept: ".pdf,application/pdf", folder: "constitution_files", required: true },
    ],
    listColumns: ["title", "description"],
  },
  gallery: {
    table: "gallery",
    tbody: "gallery_tbody",
    columns: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Category", type: "select", options: ["Academics", "Sports", "Culture", "Events", "Campus"] },
      { key: "image_url", label: "Photo", type: "file", kind: "image", accept: "image/*", folder: "gallery", required: true },
    ],
    listColumns: ["title", "category"],
  },
  staff: {
    table: "staff",
    tbody: "staff_tbody",
    columns: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "role", label: "Role / Title", type: "text", required: true },
      { key: "department", label: "Department", type: "text" },
      { key: "bio", label: "Short Bio", type: "textarea" },
      { key: "photo_url", label: "Staff Photo", type: "file", kind: "image", accept: "image/*", folder: "staff" },
    ],
    listColumns: ["name", "role", "department"],
  },
};

let currentEditId = null;
let currentEditTable = null;

/* ---------------------------------------------------------------------
   2. AUTH GUARD + BOOTSTRAP
--------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const session = await chsAdminRequireLogin("login.html");
  if (!session) return; // requireLogin already redirected to login.html

  document.getElementById("whoAmI").textContent = `Signed in as ${session.user.email}`;

  buildSidebar();
  wireModal();
  wireHomeContentForm();
  loadStats();
  loadAllPanels();
  wireRealtimeNotifications();
  wireNotificationsBell();
  loadNotifications();

  document.getElementById("logoutBtn").addEventListener("click", () => chsAdminSignOut("login.html"));
  document.getElementById("mobileToggle").addEventListener("click", () =>
    document.getElementById("adminSidebar").classList.toggle("open")
  );

  document.querySelectorAll("[data-add]").forEach((btn) =>
    btn.addEventListener("click", () => openCrudModal(btn.dataset.add))
  );
});

/* ---------------------------------------------------------------------
   3. SIDEBAR NAVIGATION
--------------------------------------------------------------------- */
function buildSidebar() {
  const nav = document.getElementById("adminNav");
  nav.innerHTML = PANELS.map(
    (p, i) => `<button data-panel-btn="${p.key}" class="${i === 0 ? "active" : ""}">${p.icon} ${p.label}</button>`
  ).join("");

  nav.querySelectorAll("[data-panel-btn]").forEach((btn) =>
    btn.addEventListener("click", () => showPanel(btn.dataset.panelBtn))
  );
}

function showPanel(key) {
  document.querySelectorAll(".admin-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === key));
  document.querySelectorAll("[data-panel-btn]").forEach((b) => b.classList.toggle("active", b.dataset.panelBtn === key));
  const panelDef = PANELS.find((p) => p.key === key);
  document.getElementById("panelTitle").textContent = panelDef ? panelDef.label : "Dashboard";
  document.getElementById("adminSidebar").classList.remove("open");
  clearNavBadge(key);
}

/* ---------------------------------------------------------------------
   3b. LIVE NOTIFICATIONS
   Listens on Supabase Realtime so the moment a visitor submits the public
   Admissions form (or the Contact form), this dashboard is told about it
   immediately — no page refresh needed.
--------------------------------------------------------------------- */
function wireRealtimeNotifications() {
  if (!chsSupabaseReady() || typeof sb.channel !== "function") return;

  sb.channel("admin-live-notifications")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "admissions" }, (payload) => {
      const name = (payload.new && payload.new.student_name) || "A student";
      showToast(`🎓 New admission application from ${name}!`);
      loadAdmissions();
      loadStats();
      bumpNavBadge("admissions");
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages" }, (payload) => {
      const name = (payload.new && payload.new.name) || "A visitor";
      showToast(`✉️ New contact message from ${name}!`);
      loadContactMessages();
      loadStats();
      bumpNavBadge("contact_messages");
    })
    // The rows above still drive the existing toast + nav badge behaviour.
    // This channel additionally listens on the new "notifications" table
    // (populated server-side by DB triggers — see the SQL migration) so the
    // bell dropdown updates immediately too, without duplicating the
    // insert logic here.
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
      loadNotifications();
    })
    .subscribe();
}

/* ---------------------------------------------------------------------
   3c. NOTIFICATIONS BELL  (persisted feed — table populated by DB triggers
       in the SQL migration whenever an admission/contact message/staff
       row is inserted). Complements wireRealtimeNotifications() above,
       which handles the live toast + per-panel nav badge.
--------------------------------------------------------------------- */
function wireNotificationsBell() {
  const bell = document.getElementById("notifBell");
  const panel = document.getElementById("notifPanel");
  if (!bell || !panel) return; // markup not present on this page — skip quietly

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (panel.classList.contains("open") && !panel.contains(e.target) && e.target !== bell) {
      panel.classList.remove("open");
    }
  });

  const markAllBtn = document.getElementById("notifMarkAll");
  if (markAllBtn) markAllBtn.addEventListener("click", markAllNotificationsRead);
}

async function loadNotifications() {
  const countEl = document.getElementById("notifCount");
  const listEl = document.getElementById("notifList");
  if (!listEl) return; // markup not present on this page — skip quietly

  const { data, error } = await chsFetchAll("notifications", { limit: 20 });
  const rows = data || [];

  if (error) {
    listEl.innerHTML = `<div class="notif-empty">Could not load notifications.</div>`;
    return;
  }

  const unreadCount = rows.filter((r) => !r.is_read).length;
  if (countEl) {
    countEl.textContent = String(unreadCount);
    countEl.classList.toggle("show", unreadCount > 0);
  }

  if (!rows.length) {
    listEl.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
    return;
  }

  listEl.innerHTML = rows
    .map(
      (n) => `
      <div class="notif-item ${n.is_read ? "" : "unread"}" data-notif-id="${n.id}">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        ${n.message ? `<div class="notif-msg">${escapeHtml(n.message)}</div>` : ""}
        <div class="notif-time">${n.created_at ? new Date(n.created_at).toLocaleString("en-GB") : ""}</div>
      </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-notif-id]").forEach((el) =>
    el.addEventListener("click", () => markNotificationRead(el.dataset.notifId))
  );
}

async function markNotificationRead(id) {
  await chsUpdate("notifications", id, { is_read: true });
  loadNotifications();
}

async function markAllNotificationsRead() {
  const { data } = await chsFetchAll("notifications");
  const unread = (data || []).filter((r) => !r.is_read);
  await Promise.all(unread.map((r) => chsUpdate("notifications", r.id, { is_read: true })));
  loadNotifications();
}

function bumpNavBadge(panelKey) {
  const activePanel = document.querySelector(".admin-panel.active");
  if (activePanel && activePanel.dataset.panel === panelKey) return; // admin is already looking at it
  const btn = document.querySelector(`[data-panel-btn="${panelKey}"]`);
  if (!btn) return;
  let badge = btn.querySelector(".nav-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "nav-badge";
    btn.appendChild(badge);
  }
  badge.textContent = String((parseInt(badge.textContent, 10) || 0) + 1);
  badge.classList.add("show");
}

function clearNavBadge(panelKey) {
  const btn = document.querySelector(`[data-panel-btn="${panelKey}"]`);
  const badge = btn && btn.querySelector(".nav-badge");
  if (badge) {
    badge.textContent = "0";
    badge.classList.remove("show");
  }
}

/* ---------------------------------------------------------------------
   4. TOP STAT COUNTERS
--------------------------------------------------------------------- */
async function loadStats() {
  const counts = await Promise.all([
    countRows("news"),
    countRows("events"),
    countRows("contact_messages"),
    countRows("admissions"),
  ]);
  document.getElementById("statNewsN").textContent = counts[0];
  document.getElementById("statEventsN").textContent = counts[1];
  document.getElementById("statMsgN").textContent = counts[2];
  document.getElementById("statAdmN").textContent = counts[3];
}

async function countRows(table) {
  const { data } = await chsFetchAll(table);
  return data ? data.length : 0;
}

/* ---------------------------------------------------------------------
   5. GENERIC CRUD PANELS (events, news, past_papers, constitution_files,
      gallery, staff)
--------------------------------------------------------------------- */
function loadAllPanels() {
  Object.keys(CRUD_CONFIGS).forEach((key) => renderCrudTable(key));
  loadAdmissions();
  loadContactMessages();
  loadSettingsTable();
  loadHomeContentForm();
}

async function renderCrudTable(configKey) {
  const cfg = CRUD_CONFIGS[configKey];
  const tbody = document.getElementById(cfg.tbody);
  const { data, error } = await chsFetchAll(cfg.table);
  const rows = data || [];

  if (error) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cfg.listColumns.length + 1}">Could not load data: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cfg.listColumns.length + 1}">No records yet. Click "Add" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const cells = cfg.listColumns.map((c) => `<td>${escapeHtml(String(row[c] ?? ""))}</td>`).join("");
      return `<tr>
        ${cells}
        <td class="row-actions">
          <button class="edit-btn" data-edit="${configKey}" data-id="${row.id}">Edit</button>
          <button class="delete-btn" data-delete="${configKey}" data-id="${row.id}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openCrudModal(btn.dataset.edit, btn.dataset.id, rows))
  );
  tbody.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.delete, btn.dataset.id))
  );
}

function wireModal() {
  document.getElementById("crudModalClose").addEventListener("click", closeCrudModal);
  document.getElementById("crudModal").addEventListener("click", (e) => {
    if (e.target.id === "crudModal") closeCrudModal();
  });
  document.getElementById("viewModalClose").addEventListener("click", () =>
    document.getElementById("viewModal").classList.remove("open")
  );
  document.getElementById("viewModal").addEventListener("click", (e) => {
    if (e.target.id === "viewModal") document.getElementById("viewModal").classList.remove("open");
  });
}

async function openCrudModal(configKey, id = null, cachedRows = null) {
  const cfg = CRUD_CONFIGS[configKey];
  if (!cfg) return; // settings handled separately below
  currentEditId = id;
  currentEditTable = configKey;

  let existing = null;
  if (id) {
    const rows = cachedRows || (await chsFetchAll(cfg.table)).data || [];
    existing = rows.find((r) => String(r.id) === String(id));
  }

  document.getElementById("crudModalTitle").textContent = id ? `Edit ${cfg.table.replace("_", " ")}` : `Add ${cfg.table.replace("_", " ")}`;

  const form = document.getElementById("crudForm");
  form.innerHTML =
    cfg.columns
      .map((col) => {
        const value = existing ? existing[col.key] ?? "" : "";
        if (col.type === "textarea") {
          return `<div class="form-field"><label>${col.label}</label><textarea name="${col.key}" rows="3" ${col.required ? "required" : ""}>${escapeHtml(value)}</textarea></div>`;
        }
        if (col.type === "select") {
          const opts = col.options.map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("");
          return `<div class="form-field"><label>${col.label}</label><select name="${col.key}" ${col.required ? "required" : ""}><option value="">Select…</option>${opts}</select></div>`;
        }
        if (col.type === "file") {
          const preview = value
            ? col.kind === "image"
              ? `<div class="file-current"><img src="${escapeHtml(value)}" alt=""><span>Current photo — choose a new file below to replace it.</span></div>`
              : `<div class="file-current"><a href="${escapeHtml(value)}" target="_blank" rel="noopener">📄 View current file</a><span>Choose a new file below to replace it.</span></div>`
            : "";
          return `<div class="form-field file-field">
            <label>${col.label}</label>
            ${preview}
            <input type="file" name="${col.key}" accept="${col.accept || ""}" ${col.required && !value ? "required" : ""}>
            <input type="hidden" name="${col.key}__existing" value="${escapeHtml(value)}">
            <p class="form-note">Upload directly from your device${col.kind === "document" ? " (PDF)" : " (JPG or PNG)"} — no link needed.</p>
          </div>`;
        }
        return `<div class="form-field"><label>${col.label}</label><input type="${col.type}" name="${col.key}" value="${escapeHtml(value)}" ${col.required ? "required" : ""}></div>`;
      })
      .join("") + `<div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelCrud">Cancel</button><button type="submit" class="btn btn-navy">${id ? "Save Changes" : "Add"}</button></div>`;

  document.getElementById("cancelCrud").addEventListener("click", closeCrudModal);
  form.onsubmit = handleCrudSubmit;

  document.getElementById("crudModal").classList.add("open");
}

function closeCrudModal() {
  document.getElementById("crudModal").classList.remove("open");
  currentEditId = null;
  currentEditTable = null;
}

async function handleCrudSubmit(e) {
  e.preventDefault();
  const cfg = CRUD_CONFIGS[currentEditTable];
  const form = e.target;
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;

  const payload = {};
  for (const col of cfg.columns) {
    if (col.type === "file") {
      const fileInput = form[col.key];
      const existingField = form[col.key + "__existing"];
      const existingUrl = existingField ? existingField.value : "";
      const file = fileInput && fileInput.files && fileInput.files[0];

      if (file) {
        showToast(`Uploading ${col.label}…`);
        const { url, error: uploadError } = await chsUploadFile(file, col.folder || cfg.table);
        if (uploadError) {
          showToast("Upload failed: " + uploadError.message, true);
          submitBtn.disabled = false;
          return;
        }
        payload[col.key] = url;
      } else {
        payload[col.key] = existingUrl || "";
      }
      continue;
    }
    let val = form[col.key] ? form[col.key].value : "";
    if (col.type === "number") val = val === "" ? null : Number(val);
    payload[col.key] = val;
  }

  const { error } = currentEditId
    ? await chsUpdate(cfg.table, currentEditId, payload)
    : await chsInsert(cfg.table, payload);
  submitBtn.disabled = false;

  if (error) {
    showToast("Something went wrong: " + error.message, true);
    return;
  }
  showToast(currentEditId ? "Changes saved." : "Item added.");
  closeCrudModal();
  renderCrudTable(currentEditTable);
  loadStats();
}

async function handleDelete(configKey, id) {
  const cfg = CRUD_CONFIGS[configKey];
  if (!confirm("Delete this record? This cannot be undone.")) return;

  const { error } = await chsDelete(cfg.table, id);
  if (error) {
    showToast("Could not delete: " + error.message, true);
    return;
  }
  showToast("Record deleted.");
  renderCrudTable(configKey);
  loadStats();
}

/* ---------------------------------------------------------------------
   6. ADMISSIONS  (read + status update + delete; no "add" — these come
      from the public Admissions page form)
--------------------------------------------------------------------- */
async function loadAdmissions() {
  const tbody = document.getElementById("admissionsTbody");
  const { data, error } = await chsFetchAll("admissions");
  const rows = data || [];

  if (error) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Could not load applications: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No applications submitted yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.student_name || "")}</td>
      <td>${escapeHtml(r.class_applying || "")}</td>
      <td>${escapeHtml(r.phone || "")}</td>
      <td><span class="status-pill status-${r.status || "pending"}">${r.status || "pending"}</span></td>
      <td>${r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—"}</td>
      <td class="row-actions">
        <button class="edit-btn" data-view-adm="${r.id}">View</button>
        <button class="delete-btn" data-del-adm="${r.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("[data-view-adm]").forEach((btn) =>
    btn.addEventListener("click", () => viewAdmission(rows.find((r) => String(r.id) === btn.dataset.viewAdm)))
  );
  tbody.querySelectorAll("[data-del-adm]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this application?")) return;
      await chsDelete("admissions", btn.dataset.delAdm);
      showToast("Application deleted.");
      loadAdmissions();
      loadStats();
    })
  );
}

function viewAdmission(r) {
  if (!r) return;
  document.getElementById("viewModalTitle").textContent = "Admission Application";
  document.getElementById("viewModalBody").innerHTML = `
    <div class="form-field"><label>Student Name</label><p>${escapeHtml(r.student_name || "")}</p></div>
    <div class="form-field"><label>Parent / Guardian</label><p>${escapeHtml(r.parent_name || "")}</p></div>
    <div class="form-field"><label>Phone</label><p>${escapeHtml(r.phone || "")}</p></div>
    <div class="form-field"><label>Email</label><p>${escapeHtml(r.email || "")}</p></div>
    <div class="form-field"><label>Class Applying For</label><p>${escapeHtml(r.class_applying || "")}</p></div>
    <div class="form-field"><label>Previous School</label><p>${escapeHtml(r.previous_school || "—")}</p></div>
    <div class="form-field"><label>Additional Information</label><p>${escapeHtml(r.message || "—")}</p></div>
    <div class="form-field">
      <label>Status</label>
      <select id="admStatusSelect">
        ${["pending", "reviewed", "accepted", "rejected"].map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>
    <div class="modal-actions"><button class="btn btn-navy" id="admStatusSave">Update Status</button></div>`;

  document.getElementById("admStatusSave").addEventListener("click", async () => {
    const newStatus = document.getElementById("admStatusSelect").value;
    const { error } = await chsUpdate("admissions", r.id, { status: newStatus });
    if (error) return showToast("Could not update status.", true);
    showToast("Status updated.");
    document.getElementById("viewModal").classList.remove("open");
    loadAdmissions();
  });

  document.getElementById("viewModal").classList.add("open");
}

/* ---------------------------------------------------------------------
   7. CONTACT MESSAGES  (read + status update + delete)
--------------------------------------------------------------------- */
async function loadContactMessages() {
  const tbody = document.getElementById("contact_messages_tbody");
  const { data, error } = await chsFetchAll("contact_messages");
  const rows = data || [];

  if (error) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Could not load messages: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No messages yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.name || "")}</td>
      <td>${escapeHtml(r.subject || "")}</td>
      <td><span class="status-pill status-${r.status || "new"}">${r.status || "new"}</span></td>
      <td>${r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—"}</td>
      <td class="row-actions">
        <button class="edit-btn" data-view-msg="${r.id}">View</button>
        <button class="delete-btn" data-del-msg="${r.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("[data-view-msg]").forEach((btn) =>
    btn.addEventListener("click", () => viewMessage(rows.find((r) => String(r.id) === btn.dataset.viewMsg)))
  );
  tbody.querySelectorAll("[data-del-msg]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this message?")) return;
      await chsDelete("contact_messages", btn.dataset.delMsg);
      showToast("Message deleted.");
      loadContactMessages();
      loadStats();
    })
  );
}

function viewMessage(r) {
  if (!r) return;
  document.getElementById("viewModalTitle").textContent = "Contact Message";
  document.getElementById("viewModalBody").innerHTML = `
    <div class="form-field"><label>Name</label><p>${escapeHtml(r.name || "")}</p></div>
    <div class="form-field"><label>Email</label><p>${escapeHtml(r.email || "")}</p></div>
    <div class="form-field"><label>Subject</label><p>${escapeHtml(r.subject || "")}</p></div>
    <div class="form-field"><label>Message</label><p>${escapeHtml(r.message || "")}</p></div>
    <div class="form-field">
      <label>Status</label>
      <select id="msgStatusSelect">
        ${["new", "read", "resolved"].map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>
    <div class="modal-actions"><button class="btn btn-navy" id="msgStatusSave">Update Status</button></div>`;

  document.getElementById("msgStatusSave").addEventListener("click", async () => {
    const newStatus = document.getElementById("msgStatusSelect").value;
    const { error } = await chsUpdate("contact_messages", r.id, { status: newStatus });
    if (error) return showToast("Could not update status.", true);
    showToast("Status updated.");
    document.getElementById("viewModal").classList.remove("open");
    loadContactMessages();
  });

  document.getElementById("viewModal").classList.add("open");
}

/* ---------------------------------------------------------------------
   8. SETTINGS  (generic key/value CRUD)
--------------------------------------------------------------------- */
async function loadSettingsTable() {
  const tbody = document.getElementById("settings_tbody");
  const { data, error } = await chsFetchAll("settings");
  const rows = data || [];

  if (error) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="3">Could not load settings: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${escapeHtml(r.key)}</td><td>${escapeHtml(String(r.value))}</td>
      <td class="row-actions">
        <button class="edit-btn" data-edit-setting="${r.id}">Edit</button>
        <button class="delete-btn" data-del-setting="${r.id}">Delete</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr class="empty-row"><td colspan="3">No settings yet. Click "Add Setting" to create one.</td></tr>`;

  tbody.querySelectorAll("[data-edit-setting]").forEach((btn) =>
    btn.addEventListener("click", () => openSettingModal(rows.find((r) => String(r.id) === btn.dataset.editSetting)))
  );
  tbody.querySelectorAll("[data-del-setting]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this setting?")) return;
      await chsDelete("settings", btn.dataset.delSetting);
      showToast("Setting deleted.");
      loadSettingsTable();
    })
  );

  // Wire the "+ Add Setting" button once (guarded so it's not bound twice).
  const addBtn = document.querySelector('[data-add="settings"]');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = "true";
    addBtn.addEventListener("click", () => openSettingModal(null));
  }
}

function openSettingModal(existing) {
  document.getElementById("crudModalTitle").textContent = existing ? "Edit Setting" : "Add Setting";
  const form = document.getElementById("crudForm");
  form.innerHTML = `
    <div class="form-field"><label>Key</label><input type="text" name="key" value="${existing ? escapeHtml(existing.key) : ""}" required ${existing ? "readonly" : ""}></div>
    <div class="form-field"><label>Value</label><input type="text" name="value" value="${existing ? escapeHtml(String(existing.value)) : ""}" required></div>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelCrud">Cancel</button><button type="submit" class="btn btn-navy">${existing ? "Save Changes" : "Add"}</button></div>`;
  document.getElementById("cancelCrud").addEventListener("click", closeCrudModal);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const payload = { key: form.key.value.trim(), value: form.value.value.trim() };
    const { error } = existing ? await chsUpdate("settings", existing.id, { value: payload.value }) : await chsInsert("settings", payload);
    if (error) return showToast("Error: " + error.message, true);
    showToast(existing ? "Setting updated." : "Setting added.");
    closeCrudModal();
    loadSettingsTable();
  };

  document.getElementById("crudModal").classList.add("open");
}

/* ---------------------------------------------------------------------
   9. HOME CONTENT  (fixed-key form saved into the settings table)
--------------------------------------------------------------------- */
async function loadHomeContentForm() {
  const map = await chsApplySettings(); // also reused here to fetch the map
  document.getElementById("hc_students").value = map.students_count || "";
  document.getElementById("hc_staff").value = map.staff_count || "";
  document.getElementById("hc_pass").value = map.pass_rate || "";
  document.getElementById("hc_founded").value = map.founded_year || "";
}

function wireHomeContentForm() {
  document.getElementById("homeContentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = { students_count: "hc_students", staff_count: "hc_staff", pass_rate: "hc_pass", founded_year: "hc_founded" };
    for (const [key, inputId] of Object.entries(fields)) {
      const value = document.getElementById(inputId).value;
      await chsUpsertSetting(key, value);
    }
    showToast("Home content saved.");
  });
}

/** Insert a settings row if the key doesn't exist yet, otherwise update it. */
async function chsUpsertSetting(key, value) {
  const { data } = await sb.from("settings").select("id").eq("key", key).maybeSingle();
  if (data) {
    await sb.from("settings").update({ value }).eq("id", data.id);
  } else {
    await sb.from("settings").insert({ key, value });
  }
}

/* ---------------------------------------------------------------------
   10. HELPERS
--------------------------------------------------------------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message, isError = false) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}
