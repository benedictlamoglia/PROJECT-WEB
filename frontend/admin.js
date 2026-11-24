const API_URL = "/api/enrollments";
const LOGIN_URL = "/api/admin/login";
const TOKEN_KEY = "campuspass_admin_token";

const elements = {
  loginView: document.querySelector("#admin-login-view"),
  dashboardView: document.querySelector("#admin-dashboard-view"),
  loginForm: document.querySelector("#admin-login-form"),
  loginButton: document.querySelector("#login-button"),
  loginError: document.querySelector("#login-error"),
  username: document.querySelector("#admin-username"),
  password: document.querySelector("#admin-password"),
  logoutButton: document.querySelector("#logout-button"),
  status: document.querySelector("#admin-status"),
  error: document.querySelector("#admin-error"),
  empty: document.querySelector("#admin-empty"),
  tableWrap: document.querySelector("#admin-table-wrap"),
  tableBody: document.querySelector("#enrollment-table-body"),
  refreshButton: document.querySelector("#refresh-button"),
  statTotal: document.querySelector("#stat-total"),
  statChecked: document.querySelector("#stat-checked"),
  statPending: document.querySelector("#stat-pending"),
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function showLogin(message = "") {
  elements.dashboardView.hidden = true;
  elements.loginView.hidden = false;
  elements.logoutButton.hidden = true;
  if (message) {
    elements.loginError.textContent = message;
    elements.loginError.hidden = false;
  }
}

function showDashboard() {
  elements.loginView.hidden = true;
  elements.dashboardView.hidden = false;
  elements.logoutButton.hidden = false;
}

function showLoginError(message) {
  elements.loginError.textContent = message;
  elements.loginError.hidden = false;
}

function clearLoginError() {
  elements.loginError.textContent = "";
  elements.loginError.hidden = true;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatVisitDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "—";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function fullName(item) {
  return [item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ") || "—";
}

function educationLabel(item) {
  if (item.educationLevel === "Senior High School") {
    return [item.educationLevel, item.gradeLevel, item.strand].filter(Boolean).join(" · ");
  }
  if (item.educationLevel === "College") {
    return [item.educationLevel, item.program].filter(Boolean).join(" · ");
  }
  return item.educationLevel || "—";
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function clearError() {
  elements.error.textContent = "";
  elements.error.hidden = true;
}

function setLoading(loading) {
  elements.refreshButton.disabled = loading;
  elements.refreshButton.textContent = loading ? "Refreshing…" : "Refresh";
}

function updateStats(enrollments) {
  const total = enrollments.length;
  const checked = enrollments.filter((item) => item.checked).length;
  elements.statTotal.textContent = String(total);
  elements.statChecked.textContent = String(checked);
  elements.statPending.textContent = String(total - checked);
}

function createCell(content, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (content instanceof Node) {
    td.append(content);
  } else {
    td.textContent = content ?? "—";
  }
  return td;
}

function createContactCell(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-contact";
  const email = document.createElement("div");
  email.textContent = item.email || "—";
  const mobile = document.createElement("div");
  mobile.className = "admin-muted";
  mobile.textContent = item.mobile || "—";
  wrapper.append(email, mobile);
  return wrapper;
}

function createStatusBadge(checked) {
  const badge = document.createElement("span");
  badge.className = `admin-badge ${checked ? "is-checked" : "is-pending"}`;
  badge.textContent = checked ? "Checked" : "Pending";
  return badge;
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    setToken("");
    throw new Error("UNAUTHORIZED");
  }
  return response;
}

async function toggleChecked(item, button) {
  clearError();
  button.disabled = true;
  const nextValue = !item.checked;
  try {
    const response = await authFetch(`${API_URL}/${encodeURIComponent(item.referenceCode)}/check`, {
      method: "PATCH",
      body: JSON.stringify({ checked: nextValue }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Could not update enrollment status.");
    }
    await loadEnrollments();
  } catch (error) {
    console.error("Failed to update enrollment:", error);
    if (error.message === "UNAUTHORIZED") {
      showLogin("Your session expired. Please sign in again.");
      return;
    }
    showError(error.message || "Could not update enrollment status. Please try again.");
    button.disabled = false;
  }
}

function renderEnrollments(enrollments) {
  updateStats(enrollments);
  elements.tableBody.replaceChildren();

  if (!enrollments.length) {
    elements.empty.hidden = false;
    elements.tableWrap.hidden = true;
    elements.status.textContent = "No enrollment requests have been submitted yet.";
    return;
  }

  elements.empty.hidden = true;
  elements.tableWrap.hidden = false;
  elements.status.textContent = `Showing ${enrollments.length} enrollment request${enrollments.length === 1 ? "" : "s"}.`;

  for (const item of enrollments) {
    const tr = document.createElement("tr");
    if (item.checked) tr.classList.add("is-checked-row");

    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.className = `admin-action ${item.checked ? "is-secondary" : ""}`;
    actionButton.textContent = item.checked ? "Mark pending" : "Mark checked";
    actionButton.addEventListener("click", () => toggleChecked(item, actionButton));

    tr.append(
      createCell(createStatusBadge(item.checked), "admin-status-cell"),
      createCell(item.referenceCode || "—", "admin-ref"),
      createCell(formatDateTime(item.dateReceived)),
      createCell(fullName(item), "admin-name"),
      createCell(createContactCell(item)),
      createCell(educationLabel(item)),
      createCell(item.studentType || "—"),
      createCell(`${formatVisitDate(item.visitDate)} · ${item.timeSlot || "—"}`),
      createCell(item.notes || "None", "admin-notes"),
      createCell(actionButton, "admin-action-cell")
    );

    elements.tableBody.append(tr);
  }
}

async function loadEnrollments() {
  clearError();
  setLoading(true);
  try {
    const response = await authFetch(API_URL);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to load enrollment requests.");
    }
    showDashboard();
    renderEnrollments(Array.isArray(result.enrollments) ? result.enrollments : []);
  } catch (error) {
    console.error("Failed to load enrollments:", error);
    if (error.message === "UNAUTHORIZED") {
      showLogin(getToken() ? "Your session expired. Please sign in again." : "");
      return;
    }
    showDashboard();
    elements.empty.hidden = true;
    elements.tableWrap.hidden = true;
    elements.status.textContent = "Unable to load enrollment requests.";
    showError(error.message || "Could not load student enrollment data. Please check the server/database connection and try again.");
    updateStats([]);
  } finally {
    setLoading(false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearLoginError();

  const username = elements.username.value.trim();
  const password = elements.password.value;
  if (!username || !password) {
    showLoginError("Enter your admin username and password.");
    return;
  }

  elements.loginButton.disabled = true;
  elements.loginButton.textContent = "Signing in…";

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Login failed.");
    }

    setToken(result.token);
    elements.password.value = "";
    showDashboard();
    await loadEnrollments();
  } catch (error) {
    console.error("Admin login failed:", error);
    showLoginError(error.message || "Could not sign in. Please try again.");
  } finally {
    elements.loginButton.disabled = false;
    elements.loginButton.innerHTML = 'Sign in <span aria-hidden="true">↗</span>';
  }
}

function logout() {
  setToken("");
  clearError();
  clearLoginError();
  elements.password.value = "";
  elements.tableBody.replaceChildren();
  elements.empty.hidden = true;
  elements.tableWrap.hidden = true;
  elements.status.textContent = "Loading enrollment requests…";
  updateStats([]);
  showLogin();
}

elements.loginForm.addEventListener("submit", handleLogin);
elements.refreshButton.addEventListener("click", loadEnrollments);
elements.logoutButton.addEventListener("click", logout);

if (getToken()) {
  loadEnrollments();
} else {
  showLogin();
}
