const ADMIN_CONFIG = {
  orders: {
    key: "orders",
    label: "Bestellungen",
    subtitle: "Übersicht aller Bestellungen mit Status, Kundendaten und Schnellaktionen.",
    endpoint: "/api/admin/orders",
    updateEndpoint: (id) => `/api/admin/orders/${encodeURIComponent(id)}`,
    statuses: ["offen", "bezahlt", "versendet", "abgeschlossen", "storniert"],
    emptyTitle: "Keine Bestellungen gefunden",
    emptyText: "Aktuell sind keine Bestellungen vorhanden oder es passt kein Eintrag zu deiner Suche."
  },
  reklamationen: {
    key: "reklamationen",
    label: "Reklamationen",
    subtitle: "Alle Reklamationen mit Bearbeitungsstatus und Kundendetails.",
    endpoint: "/api/admin/reklamationen",
    updateEndpoint: (id) => `/api/admin/reklamationen/${encodeURIComponent(id)}`,
    statuses: ["neu", "in Bearbeitung", "gelöst", "abgelehnt"],
    emptyTitle: "Keine Reklamationen gefunden",
    emptyText: "Aktuell sind keine Reklamationen vorhanden oder es passt kein Eintrag zu deiner Suche."
  },
  rueckgaben: {
    key: "rueckgaben",
    label: "Rückgaben",
    subtitle: "Rückgabeanfragen prüfen, sortieren und intern dokumentieren.",
    endpoint: "/api/admin/rueckgaben",
    updateEndpoint: (id) => `/api/admin/rueckgaben/${encodeURIComponent(id)}`,
    statuses: ["neu", "geprüft", "genehmigt", "abgeschlossen", "abgelehnt"],
    emptyTitle: "Keine Rückgaben gefunden",
    emptyText: "Aktuell sind keine Rückgabeanfragen vorhanden oder es passt kein Eintrag zu deiner Suche."
  },
  stornierungen: {
    key: "stornierungen",
    label: "Stornierungen",
    subtitle: "Stornierungsanfragen zentral verwalten und intern nachverfolgen.",
    endpoint: "/api/admin/stornierungen",
    updateEndpoint: (id) => `/api/admin/stornierungen/${encodeURIComponent(id)}`,
    statuses: ["neu", "bestätigt", "abgelehnt", "erledigt"],
    emptyTitle: "Keine Stornierungen gefunden",
    emptyText: "Aktuell sind keine Stornierungsanfragen vorhanden oder es passt kein Eintrag zu deiner Suche."
  },
  kontakte: {
    key: "kontakte",
    label: "Kontakt",
    subtitle: "Kontaktanfragen, Nachrichten und Rückfragen an einem Ort.",
    endpoint: "/api/admin/kontakte",
    updateEndpoint: (id) => `/api/admin/kontakte/${encodeURIComponent(id)}`,
    statuses: ["neu", "beantwortet", "abgeschlossen"],
    emptyTitle: "Keine Kontaktanfragen gefunden",
    emptyText: "Aktuell sind keine Kontaktanfragen vorhanden oder es passt kein Eintrag zu deiner Suche."
  }
};

const PRIORITY_STATUS_ORDER = {
  neu: 0,
  offen: 0,
  "in bearbeitung": 1,
  bearbeitung: 1,
  bezahlt: 1,
  geprüft: 1,
  geprueft: 1,
  bestätigt: 1,
  bestaetigt: 1,
  beantwortet: 1,
  versendet: 2,
  genehmigt: 2,
  gelöst: 2,
  geloest: 2,
  erledigt: 2,
  abgeschlossen: 3,
  abgelehnt: 4,
  storniert: 4
};

const state = {
  activeSection: "orders",
  data: {
    orders: [],
    reklamationen: [],
    rueckgaben: [],
    stornierungen: [],
    kontakte: []
  },
  search: "",
  statusFilter: "all",
  sort: "newest",
  selectedItemId: null,
  isLoading: false
};

const elements = {
  navButtons: [],
  sectionTitle: null,
  sectionSubtitle: null,
  list: null,
  empty: null,
  search: null,
  statusFilter: null,
  sort: null,
  loading: null,
  refreshBtn: null,
  detailCard: null,
  detailTitle: null,
  detailSubtitle: null,
  detailGrid: null,
  detailStatusSelect: null,
  detailNote: null,
  detailSaveBtn: null,
  detailCloseBtn: null,
  summary: {
    orders: null,
    reklamationen: null,
    rueckgaben: null,
    stornierungen: null,
    kontakte: null
  },
  navCounts: {
    orders: null,
    reklamationen: null,
    rueckgaben: null,
    stornierungen: null,
    kontakte: null
  }
};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  initializeAdmin();
});

function cacheElements() {
  elements.navButtons = Array.from(document.querySelectorAll(".admin-nav-btn"));
  elements.sectionTitle = document.getElementById("admin-section-title");
  elements.sectionSubtitle = document.getElementById("admin-section-subtitle");
  elements.list = document.getElementById("admin-list");
  elements.empty = document.getElementById("admin-empty");
  elements.search = document.getElementById("admin-search");
  elements.statusFilter = document.getElementById("admin-status-filter");
  elements.sort = document.getElementById("admin-sort");
  elements.loading = document.getElementById("admin-loading");
  elements.refreshBtn = document.getElementById("admin-refresh-btn");
  elements.detailCard = document.getElementById("admin-detail-card");
  elements.detailTitle = document.getElementById("detail-title");
  elements.detailSubtitle = document.getElementById("detail-subtitle");
  elements.detailGrid = document.getElementById("admin-detail-grid");
  elements.detailStatusSelect = document.getElementById("detail-status-select");
  elements.detailNote = document.getElementById("detail-note");
  elements.detailSaveBtn = document.getElementById("detail-save-btn");
  elements.detailCloseBtn = document.getElementById("detail-close-btn");

  elements.summary.orders = document.getElementById("summary-orders");
  elements.summary.reklamationen = document.getElementById("summary-reklamationen");
  elements.summary.rueckgaben = document.getElementById("summary-rueckgaben");
  elements.summary.stornierungen = document.getElementById("summary-stornierungen");
  elements.summary.kontakte = document.getElementById("summary-kontakte");

  elements.navCounts.orders = document.getElementById("nav-count-orders");
  elements.navCounts.reklamationen = document.getElementById("nav-count-reklamationen");
  elements.navCounts.rueckgaben = document.getElementById("nav-count-rueckgaben");
  elements.navCounts.stornierungen = document.getElementById("nav-count-stornierungen");
  elements.navCounts.kontakte = document.getElementById("nav-count-kontakte");
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;
      if (!section || !ADMIN_CONFIG[section]) return;

      state.activeSection = section;
      state.selectedItemId = null;
      state.search = "";
      state.statusFilter = "all";
      state.sort = "newest";

      elements.search.value = "";
      elements.sort.value = "newest";

      closeDetailCard();
      syncNavState();
      renderSectionHeader();
      renderStatusOptions();
      renderList();
    });
  });

  elements.search.addEventListener("input", (event) => {
    state.search = String(event.target.value || "").trim().toLowerCase();
    renderList();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.statusFilter = event.target.value || "all";
    renderList();
  });

  elements.sort.addEventListener("change", (event) => {
    state.sort = event.target.value || "newest";
    renderList();
  });

  elements.refreshBtn.addEventListener("click", async () => {
    await loadAllData();
  });

  elements.detailCloseBtn.addEventListener("click", () => {
    closeDetailCard();
  });

  elements.detailSaveBtn.addEventListener("click", async () => {
    await saveSelectedItem();
  });
}

async function initializeAdmin() {
  syncNavState();
  renderSectionHeader();
  renderStatusOptions();
  await loadAllData();
}

async function loadAllData() {
  setLoading(true);

  const sections = Object.keys(ADMIN_CONFIG);

  await Promise.all(
    sections.map(async (sectionKey) => {
      const config = ADMIN_CONFIG[sectionKey];

      try {
        const response = await fetch(config.endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Laden von ${sectionKey}`);
        }

        const result = await response.json();
        state.data[sectionKey] = normalizeCollection(result, sectionKey);
      } catch (error) {
        console.error(`Fehler beim Laden von ${sectionKey}:`, error);
        state.data[sectionKey] = [];
      }
    })
  );

  updateSummaryCounts();
  renderSectionHeader();
  renderStatusOptions();
  renderList();
  refreshOpenDetailIfNeeded();
  setLoading(false);
}

function normalizeCollection(result, sectionKey) {
  if (Array.isArray(result)) {
    return result.map((item) => normalizeItem(item, sectionKey));
  }

  if (result && Array.isArray(result.items)) {
    return result.items.map((item) => normalizeItem(item, sectionKey));
  }

  return [];
}

function normalizeItem(item, sectionKey) {
  const normalized = { ...(item || {}) };

  normalized.id =
    item?.id ||
    item?._id ||
    item?.requestId ||
    item?.orderNumber ||
    `${sectionKey}-${Math.random().toString(36).slice(2, 10)}`;

  normalized.status = String(item?.status || getDefaultStatus(sectionKey)).trim();
  normalized.adminNote = String(item?.adminNote || item?.note || "").trim();

  return normalized;
}

function getDefaultStatus(sectionKey) {
  const config = ADMIN_CONFIG[sectionKey];
  return config?.statuses?.[0] || "neu";
}

function syncNavState() {
  elements.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === state.activeSection);
  });
}

function renderSectionHeader() {
  const config = ADMIN_CONFIG[state.activeSection];
  elements.sectionTitle.textContent = config.label;
  elements.sectionSubtitle.textContent = config.subtitle;

  const searchPlaceholders = {
    orders: "Suchen nach Bestellnummer, Name, E-Mail, Telefonnummer ...",
    reklamationen: "Suchen nach Name, E-Mail, Bestellnummer, Reklamationsgrund ...",
    rueckgaben: "Suchen nach Name, E-Mail, Bestellnummer, Rückgabegrund ...",
    stornierungen: "Suchen nach Name, E-Mail, Bestellnummer, Stornierungsgrund ...",
    kontakte: "Suchen nach Name, E-Mail, Betreff, Nachricht ..."
  };

  elements.search.placeholder = searchPlaceholders[state.activeSection] || "Suchen ...";
}

function renderStatusOptions() {
  const config = ADMIN_CONFIG[state.activeSection];
  const statuses = config.statuses || [];
  const currentValue = state.statusFilter;

  elements.statusFilter.innerHTML = `<option value="all">Alle Status</option>`;

  statuses.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    elements.statusFilter.appendChild(option);
  });

  if (statuses.includes(currentValue)) {
    elements.statusFilter.value = currentValue;
  } else {
    state.statusFilter = "all";
    elements.statusFilter.value = "all";
  }
}

function updateSummaryCounts() {
  Object.keys(ADMIN_CONFIG).forEach((sectionKey) => {
    const count = Array.isArray(state.data[sectionKey]) ? state.data[sectionKey].length : 0;

    if (elements.summary[sectionKey]) {
      elements.summary[sectionKey].textContent = String(count);
    }

    if (elements.navCounts[sectionKey]) {
      elements.navCounts[sectionKey].textContent = String(count);
    }
  });
}

function renderList() {
  const config = ADMIN_CONFIG[state.activeSection];
  const items = getFilteredItems();

  elements.list.innerHTML = "";

  if (!items.length) {
    elements.empty.style.display = "block";
    elements.empty.innerHTML = `
      <h3>${escapeHtml(config.emptyTitle)}</h3>
      <p>${escapeHtml(config.emptyText)}</p>
    `;
    return;
  }

  elements.empty.style.display = "none";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "admin-item";
    card.innerHTML = createItemCardHtml(item, state.activeSection);

    card.addEventListener("dblclick", () => {
      openDetailCard(item.id);
    });

    const detailBtn = card.querySelector("[data-action='details']");
    if (detailBtn) {
      detailBtn.addEventListener("click", () => {
        openDetailCard(item.id);
      });
    }

    const quickStatusSelect = card.querySelector("[data-action='quick-status']");
    if (quickStatusSelect) {
      quickStatusSelect.addEventListener("change", async (event) => {
        const newStatus = event.target.value;
        await updateItemStatusOnly(item.id, newStatus);
      });
    }

    elements.list.appendChild(card);
  });
}

function getFilteredItems() {
  const items = Array.isArray(state.data[state.activeSection])
    ? [...state.data[state.activeSection]]
    : [];

  const filtered = items.filter((item) => {
    const matchesStatus =
      state.statusFilter === "all" ||
      normalizeStatusValue(item.status) === normalizeStatusValue(state.statusFilter);

    const haystack = buildSearchText(item);
    const matchesSearch = !state.search || haystack.includes(state.search);

    return matchesStatus && matchesSearch;
  });

  filtered.sort((a, b) => {
    const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;

    const aTime = getItemTimestamp(a);
    const bTime = getItemTimestamp(b);

    if (state.sort === "oldest") {
      return aTime - bTime;
    }

    return bTime - aTime;
  });

  return filtered;
}

function buildSearchText(item) {
  const values = [
    item.id,
    item.orderNumber,
    item.firstName,
    item.lastName,
    item.name,
    item.fullName,
    item.email,
    item.phone,
    item.subject,
    item.reason,
    item.message,
    item.notes,
    item.adminNote,
    item.city,
    item.zip,
    item.status,
    item.paymentStatus,
    item.paymentMethod
  ];

  return values
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");
}

function getItemTimestamp(item) {
  const raw =
    item.updatedAt ||
    item.createdAt ||
    item.date ||
    item.timestamp ||
    item.submittedAt ||
    item.requestDate;

  if (!raw) return 0;

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getStatusPriority(status) {
  const normalized = normalizeStatusValue(status);
  return PRIORITY_STATUS_ORDER[normalized] ?? 9;
}

function createItemCardHtml(item, sectionKey) {
  const config = ADMIN_CONFIG[sectionKey];
  const title = getItemTitle(item, sectionKey);
  const subtitle = getItemSubtitle(item, sectionKey);
  const meta = getItemMeta(item, sectionKey);
  const statusClass = getStatusClass(item.status);

  return `
    <div class="admin-item-top">
      <div>
        <h3 class="admin-item-title">${escapeHtml(title)}</h3>
        <p class="admin-item-subtitle">${escapeHtml(subtitle)}</p>
      </div>

      <span class="admin-status ${statusClass}">
        ${escapeHtml(item.status || getDefaultStatus(sectionKey))}
      </span>
    </div>

    <div class="admin-item-meta">
      ${meta
        .map(
          (entry) => `
            <div class="admin-meta-box">
              <span class="admin-meta-label">${escapeHtml(entry.label)}</span>
              <span class="admin-meta-value">${escapeHtml(entry.value)}</span>
            </div>
          `
        )
        .join("")}
    </div>

    <div class="admin-item-actions">
      <div class="admin-inline-actions">
        <button class="admin-btn" type="button" data-action="details">Details</button>
      </div>

      <div class="admin-inline-actions">
        <select class="admin-select" data-action="quick-status">
          ${config.statuses
            .map(
              (status) => `
                <option value="${escapeHtmlAttr(status)}" ${
                  normalizeStatusValue(item.status) === normalizeStatusValue(status) ? "selected" : ""
                }>
                  ${escapeHtml(status)}
                </option>
              `
            )
            .join("")}
        </select>
      </div>
    </div>
  `;
}

function getItemTitle(item, sectionKey) {
  if (sectionKey === "orders") {
    return item.orderNumber ? `Bestellung ${item.orderNumber}` : `Bestellung ${item.id}`;
  }

  if (sectionKey === "kontakte") {
    return item.subject || `Kontaktanfrage ${item.id}`;
  }

  const labelMap = {
    reklamationen: "Reklamation",
    rueckgaben: "Rückgabe",
    stornierungen: "Stornierung"
  };

  return `${labelMap[sectionKey] || "Eintrag"} ${item.orderNumber || item.id}`;
}

function getItemSubtitle(item) {
  const customerName =
    item.fullName ||
    item.name ||
    [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
    "Unbekannter Kunde";

  return `${customerName}${item.email ? ` • ${item.email}` : ""}`;
}

function getItemMeta(item, sectionKey) {
  if (sectionKey === "orders") {
    return [
      {
        label: "Gesamt",
        value: formatPrice(item.total)
      },
      {
        label: "Zahlung",
        value: item.paymentStatus || item.paymentMethod || "-"
      },
      {
        label: "Lieferort",
        value: [item.zip, item.city].filter(Boolean).join(" ") || "-"
      }
    ];
  }

  if (sectionKey === "kontakte") {
    return [
      {
        label: "Absender",
        value:
          item.fullName ||
          item.name ||
          [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
          "-"
      },
      {
        label: "Betreff",
        value: item.subject || "-"
      },
      {
        label: "Eingang",
        value: formatDate(item.createdAt || item.date || item.submittedAt || item.timestamp)
      }
    ];
  }

  return [
    {
      label: "Bestellnummer",
      value: item.orderNumber || "-"
    },
    {
      label: "Grund",
      value: item.reason || item.subject || "-"
    },
    {
      label: "Eingang",
      value: formatDate(item.createdAt || item.date || item.submittedAt || item.timestamp)
    }
  ];
}

function openDetailCard(itemId) {
  const item = findItemById(state.activeSection, itemId);
  if (!item) return;

  state.selectedItemId = itemId;

  const config = ADMIN_CONFIG[state.activeSection];
  elements.detailTitle.textContent = getItemTitle(item, state.activeSection);
  elements.detailSubtitle.textContent = getItemSubtitle(item, state.activeSection);
  elements.detailGrid.innerHTML = getDetailBoxesHtml(item, state.activeSection);

  elements.detailStatusSelect.innerHTML = config.statuses
    .map(
      (status) => `
        <option value="${escapeHtmlAttr(status)}" ${
          normalizeStatusValue(item.status) === normalizeStatusValue(status) ? "selected" : ""
        }>
          ${escapeHtml(status)}
        </option>
      `
    )
    .join("");

  elements.detailNote.value = item.adminNote || "";
  elements.detailCard.classList.add("open");
  elements.detailCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getDetailBoxesHtml(item, sectionKey) {
  const customerName =
    item.fullName ||
    item.name ||
    [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
    "-";

  const boxes = [
    createDetailBox("ID", item.id || "-"),
    createDetailBox("Status", item.status || "-"),
    createDetailBox("Name", customerName),
    createDetailBox("E-Mail", item.email || "-"),
    createDetailBox("Telefon", item.phone || "-"),
    createDetailBox(
      sectionKey === "orders" ? "Bestellt am" : "Eingegangen am",
      formatDate(item.createdAt || item.date || item.submittedAt || item.timestamp)
    )
  ];

  if (sectionKey === "orders") {
    boxes.push(createDetailBox("Bestellnummer", item.orderNumber || "-"));
    boxes.push(createDetailBox("Gesamtbetrag", formatPrice(item.total)));
    boxes.push(createDetailBox("Zahlungsmethode", item.paymentMethod || "-"));
    boxes.push(createDetailBox("Zahlungsstatus", item.paymentStatus || "-"));
    boxes.push(
      createDetailBox(
        "Lieferadresse",
        [
          [item.street, item.houseNumber].filter(Boolean).join(" ").trim(),
          [item.zip, item.city].filter(Boolean).join(" ").trim(),
          item.country
        ]
          .filter(Boolean)
          .join("\n"),
        true
      )
    );

    const itemLines = Array.isArray(item.items)
      ? item.items
          .map((product) => {
            const name = product?.name || "Produkt";
            const quantity = Number(product?.quantity || 1);
            const price = formatPrice(product?.price);
            const size = product?.size ? ` • ${product.size}` : "";
            return `${name} × ${quantity}${size}${price !== "-" ? ` • ${price}` : ""}`;
          })
          .join("\n")
      : "-";

    boxes.push(createDetailBox("Produkte", itemLines, true));

    if (item.notes) {
      boxes.push(createDetailBox("Kundennotiz", item.notes, true));
    }
  } else if (sectionKey === "kontakte") {
    boxes.push(createDetailBox("Betreff", item.subject || "-"));
    boxes.push(createDetailBox("Nachricht", item.message || item.notes || "-", true));
  } else {
    boxes.push(createDetailBox("Bestellnummer", item.orderNumber || "-"));
    boxes.push(createDetailBox("Grund", item.reason || item.subject || "-"));
    boxes.push(createDetailBox("Beschreibung", item.message || item.description || item.notes || "-", true));
  }

  if (item.trackingNumber || item.trackingUrl) {
    boxes.push(createDetailBox("Trackingnummer", item.trackingNumber || "-"));
    boxes.push(createDetailBox("Tracking-Link", item.trackingUrl || "-", true));
  }

  return boxes.join("");
}

function createDetailBox(label, value, allowMultiline = false) {
  const content = allowMultiline
    ? sanitizeBasicHtml(String(value || "-"))
    : escapeHtml(String(value || "-"));

  return `
    <div class="admin-detail-box">
      <strong>${escapeHtml(label)}</strong>
      <div>${content}</div>
    </div>
  `;
}

function closeDetailCard() {
  state.selectedItemId = null;
  elements.detailCard.classList.remove("open");
}

function findItemById(sectionKey, itemId) {
  const items = state.data[sectionKey] || [];
  return items.find((entry) => String(entry.id) === String(itemId)) || null;
}

async function updateItemStatusOnly(itemId, newStatus) {
  const item = findItemById(state.activeSection, itemId);
  if (!item) return;

  await saveItemUpdate(state.activeSection, item.id, {
    status: newStatus,
    adminNote: item.adminNote || ""
  });
}

async function saveSelectedItem() {
  if (!state.selectedItemId) return;

  const item = findItemById(state.activeSection, state.selectedItemId);
  if (!item) return;

  const newStatus = elements.detailStatusSelect.value || item.status;
  const adminNote = String(elements.detailNote.value || "").trim();

  await saveItemUpdate(state.activeSection, item.id, {
    status: newStatus,
    adminNote
  });
}

async function saveItemUpdate(sectionKey, itemId, payload) {
  const config = ADMIN_CONFIG[sectionKey];
  if (!config) return;

  const saveButton = elements.detailSaveBtn;
  const originalText = saveButton.textContent;

  try {
    saveButton.textContent = "Speichert...";
    saveButton.disabled = true;

    const response = await fetch(config.updateEndpoint(itemId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Speichern fehlgeschlagen");
    }

    const result = await response.json();
    const updatedItem = normalizeItem(result?.item || {}, sectionKey);

    const list = state.data[sectionKey] || [];
    const index = list.findIndex((entry) => String(entry.id) === String(itemId));

    if (index >= 0) {
      state.data[sectionKey][index] = {
        ...state.data[sectionKey][index],
        ...updatedItem,
        status: payload.status,
        adminNote: payload.adminNote,
        updatedAt: new Date().toISOString()
      };
    }

    updateSummaryCounts();
    renderList();

    if (state.selectedItemId === itemId) {
      state.selectedItemId = itemId;
      openDetailCard(itemId);
    }
  } catch (error) {
    console.error("Fehler beim Speichern:", error);
    alert("Die Änderung konnte nicht gespeichert werden. Bitte prüfe die server.js-Routen.");
  } finally {
    saveButton.textContent = originalText;
    saveButton.disabled = false;
  }
}

function refreshOpenDetailIfNeeded() {
  if (!state.selectedItemId) return;

  const item = findItemById(state.activeSection, state.selectedItemId);
  if (!item) {
    closeDetailCard();
    return;
  }

  openDetailCard(state.selectedItemId);
}

function setLoading(isLoading) {
  state.isLoading = Boolean(isLoading);
  elements.loading.classList.toggle("show", state.isLoading);
  elements.refreshBtn.disabled = state.isLoading;
  elements.refreshBtn.textContent = state.isLoading ? "Lädt..." : "Aktualisieren";
}

function getStatusClass(status) {
  const value = normalizeStatusValue(status);

  if (["neu", "offen"].includes(value)) return "status-neu";

  if (
    ["in bearbeitung", "bearbeitung", "bezahlt", "geprüft", "geprueft", "bestätigt", "bestaetigt", "beantwortet"].includes(
      value
    )
  ) {
    return "status-bearbeitung";
  }

  if (["gelöst", "geloest", "genehmigt", "versendet", "erledigt", "abgeschlossen"].includes(value)) {
    return "status-geloest";
  }

  if (["abgelehnt", "storniert"].includes(value)) {
    return "status-abgelehnt";
  }

  return "status-offen";
}

function normalizeStatusValue(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/\s+/g, " ")
    .replace(/-/g, " ");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(number);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function sanitizeBasicHtml(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}