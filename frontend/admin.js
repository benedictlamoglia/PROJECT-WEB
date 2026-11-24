const API_URL = "/api/enrollments";

const elements = {
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

async function toggleChecked(item, button) {
  clearError();
  button.disabled = true;
  const nextValue = !item.checked;
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(item.referenceCode)}/check`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: nextValue }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Could not update enrollment status.");
    }
    await loadEnrollments();
  } catch (error) {
    console.error("Failed to update enrollment:", error);
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
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to load enrollment requests.");
    }
    renderEnrollments(Array.isArray(result.enrollments) ? result.enrollments : []);
  } catch (error) {
    console.error("Failed to load enrollments:", error);
    elements.empty.hidden = true;
    elements.tableWrap.hidden = true;
    elements.status.textContent = "Unable to load enrollment requests.";
    showError("Could not load student enrollment data. Make sure the server is running and try again.");
    updateStats([]);
  } finally {
    setLoading(false);
  }
}

elements.refreshButton.addEventListener("click", loadEnrollments);
loadEnrollments();
