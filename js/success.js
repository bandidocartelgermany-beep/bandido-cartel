const successOrderDetails = document.getElementById("success-order-details");
const cartCountEls = document.querySelectorAll(".cart-count");

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("bandido_cart")) || [];
  } catch (error) {
    return [];
  }
}

function updateCartCount() {
  const cart = getCart();
  const totalQuantity = cart.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0);
  }, 0);

  cartCountEls.forEach((el) => {
    el.textContent = totalQuantity;
  });
}

function clearCart() {
  localStorage.removeItem("bandido_cart");
  updateCartCount();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session_id");
}

function formatPriceFromCents(valueInCents, currency = "eur") {
  const value = Number(valueInCents || 0) / 100;

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase()
  }).format(value);
}

function renderSuccess(session) {
  const metadata = session.metadata || {};
  const customerName = [metadata.firstName, metadata.lastName].filter(Boolean).join(" ");
  const addressLine = [metadata.street, metadata.zip, metadata.city].filter(Boolean).join(", ");

  const lineItemsHtml = Array.isArray(session.line_items) && session.line_items.length
    ? session.line_items
        .map((item) => {
          const description = item.description || "Produkt";
          const quantity = Number(item.quantity || 0);
          const amountTotal = Number(item.amount_total || 0);

          return `
            <div class="checkout-item premium-checkout-item">
              <div class="checkout-item-left">
                <strong>${escapeHtml(description)}</strong>
                <span>${quantity} × Position</span>
              </div>
              <div class="checkout-item-right">
                ${formatPriceFromCents(amountTotal, session.currency)}
              </div>
            </div>
          `;
        })
        .join("")
    : `
      <div class="success-info-card">
        <p>Die Positionsdaten werden vorbereitet.</p>
      </div>
    `;

  successOrderDetails.innerHTML = `
    <div class="success-info-grid">
      <div class="success-info-card">
        <h2>Bestellnummer</h2>
        <p>${escapeHtml(session.orderNumber || metadata.orderNumber || "Wird vorbereitet")}</p>
      </div>

      <div class="success-info-card">
        <h2>Zahlungsstatus</h2>
        <p>${session.payment_status === "paid" ? "Bezahlt" : "In Prüfung"}</p>
      </div>

      <div class="success-info-card">
        <h2>E-Mail</h2>
        <p>${escapeHtml(session.customer_email || metadata.email || "-")}</p>
      </div>

      <div class="success-info-card">
        <h2>Gesamtbetrag</h2>
        <p>${formatPriceFromCents(session.amount_total, session.currency)}</p>
      </div>
    </div>

    <div class="success-summary-box">
      <h2>Lieferdaten</h2>
      <p><strong>Name:</strong> ${escapeHtml(customerName || "-")}</p>
      <p><strong>Adresse:</strong> ${escapeHtml(addressLine || "-")}</p>
      <p><strong>Land:</strong> ${escapeHtml(metadata.country || "-")}</p>
    </div>

    <div class="success-summary-box">
      <h2>Bestellübersicht</h2>
      <div class="checkout-items">
        ${lineItemsHtml}
      </div>
    </div>
  `;
}

async function markOrderAsPaid(sessionId) {
  const response = await fetch("/api/orders/mark-paid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Bestellung konnte nicht aktualisiert werden.");
  }

  return data;
}

async function initSuccessPage() {
  updateCartCount();

  const sessionId = getSessionIdFromUrl();

  if (!sessionId) {
    successOrderDetails.innerHTML = `
      <div class="empty-state premium-empty-state">
        <h2>Keine Bestellinformationen gefunden</h2>
        <p>Es wurde keine Stripe Session übergeben.</p>
        <a href="/shop.html" class="btn btn-primary">Zum Shop</a>
      </div>
    `;
    return;
  }

  try {
    const sessionResponse = await fetch(`/api/checkout-session/${encodeURIComponent(sessionId)}`);
    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      throw new Error(sessionData.error || "Checkout Session konnte nicht geladen werden.");
    }

    renderSuccess(sessionData);

    const alreadyUpdatedKey = `bandido_order_paid_${sessionId}`;
    const alreadyUpdated = sessionStorage.getItem(alreadyUpdatedKey);

    if (!alreadyUpdated) {
      await markOrderAsPaid(sessionId);
      sessionStorage.setItem(alreadyUpdatedKey, "true");
    }

    clearCart();
  } catch (error) {
    successOrderDetails.innerHTML = `
      <div class="empty-state premium-empty-state">
        <h2>Bestellung erfolgreich, aber Details fehlen</h2>
        <p>${escapeHtml(error.message || "Die Bestelldetails konnten nicht vollständig geladen werden.")}</p>
        <a href="/shop.html" class="btn btn-primary">Zum Shop</a>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initSuccessPage);