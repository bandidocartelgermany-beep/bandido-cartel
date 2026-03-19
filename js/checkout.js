const checkoutForm = document.getElementById("checkout-form");
const checkoutItemsEl = document.getElementById("checkout-items");
const checkoutSubtotalEl = document.getElementById("checkout-subtotal");
const checkoutShippingEl = document.getElementById("checkout-shipping");
const checkoutTotalEl = document.getElementById("checkout-total");
const checkoutMessageEl = document.getElementById("checkout-message");
const checkoutSubmitBtn = document.getElementById("checkout-submit-btn");
const cartCountEls = document.querySelectorAll(".cart-count");

const FREE_SHIPPING_THRESHOLD = 20;
const SHIPPING_COST = 6.19;

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

function formatPrice(value) {
  return Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function calculateShipping(subtotal) {
  if (subtotal <= 0) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_COST;
}

function getSubtotal(cart) {
  return cart.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0);
  }, 0);
}

function showMessage(message, isError = false) {
  if (!checkoutMessageEl) return;

  checkoutMessageEl.textContent = message;
  checkoutMessageEl.className = `checkout-message ${isError ? "error-message" : "success-message"}`;
}

function clearMessage() {
  if (!checkoutMessageEl) return;
  checkoutMessageEl.textContent = "";
  checkoutMessageEl.className = "checkout-message";
}

function renderEmptyCheckout() {
  checkoutItemsEl.innerHTML = `
    <div class="empty-state premium-empty-state">
      <div class="premium-empty-icon">🛒</div>
      <h3>Dein Warenkorb ist leer</h3>
      <p>Lege zuerst Produkte in den Warenkorb, bevor du zur Kasse gehst.</p>
      <a href="shop.html" class="btn btn-primary">Zum Shop</a>
    </div>
  `;

  checkoutSubtotalEl.textContent = formatPrice(0);
  checkoutShippingEl.textContent = formatPrice(0);
  checkoutTotalEl.textContent = formatPrice(0);

  if (checkoutSubmitBtn) {
    checkoutSubmitBtn.disabled = true;
    checkoutSubmitBtn.textContent = "Warenkorb leer";
  }
}

function renderCheckoutSummary() {
  const cart = getCart();

  if (!cart.length) {
    renderEmptyCheckout();
    updateCartCount();
    return;
  }

  const subtotal = getSubtotal(cart);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  checkoutItemsEl.innerHTML = cart
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const itemTotal = quantity * price;

      return `
        <div class="checkout-item premium-checkout-item">
          <div class="checkout-item-left">
            <strong>${escapeHtml(item.name || "Produkt")}</strong>
            <span>
              ${quantity} × ${formatPrice(price)}
              ${item.size ? ` · ${escapeHtml(item.size)}` : ""}
            </span>
          </div>

          <div class="checkout-item-right">
            ${formatPrice(itemTotal)}
          </div>
        </div>
      `;
    })
    .join("");

  checkoutSubtotalEl.textContent = formatPrice(subtotal);
  checkoutShippingEl.textContent = formatPrice(shipping);
  checkoutTotalEl.textContent = formatPrice(total);

  updateCartCount();
}

function getFormData() {
  const formData = new FormData(checkoutForm);

  return {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    street: String(formData.get("street") || "").trim(),
    zip: String(formData.get("zip") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    country: String(formData.get("country") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    termsAccepted: Boolean(formData.get("termsAccepted")),
    privacyAccepted: Boolean(formData.get("privacyAccepted"))
  };
}

function validateCheckoutForm(data, cart) {
  if (!cart.length) {
    return "Dein Warenkorb ist leer.";
  }

  if (!data.firstName) return "Bitte gib deinen Vornamen ein.";
  if (!data.lastName) return "Bitte gib deinen Nachnamen ein.";
  if (!data.email) return "Bitte gib deine E-Mail-Adresse ein.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (!data.street) return "Bitte gib deine Straße und Hausnummer ein.";
  if (!data.zip) return "Bitte gib deine Postleitzahl ein.";
  if (!data.city) return "Bitte gib deinen Ort ein.";
  if (!data.country) return "Bitte gib dein Land ein.";
  if (!data.termsAccepted) return "Bitte stimme den AGB und dem Widerruf zu.";
  if (!data.privacyAccepted) return "Bitte stimme der Datenschutzerklärung zu.";

  return "";
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();
  clearMessage();

  const cart = getCart();
  const data = getFormData();
  const validationError = validateCheckoutForm(data, cart);

  if (validationError) {
    showMessage(validationError, true);
    return;
  }

  const subtotal = getSubtotal(cart);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  const payload = {
    customer: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      notes: data.notes
    },
    items: cart.map((item) => ({
      slug: item.slug || "",
      name: item.name || "Produkt",
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      image: item.image || "",
      size: item.size || ""
    })),
    subtotal,
    shipping,
    total
  };

  try {
    checkoutSubmitBtn.disabled = true;
    checkoutSubmitBtn.textContent = "Weiterleitung...";

    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Die Zahlung konnte nicht gestartet werden.");
    }

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    throw new Error("Keine Weiterleitungs-URL vom Server erhalten.");
  } catch (error) {
    console.error(error);
    showMessage(
      error.message || "Beim Starten der Zahlung ist ein Fehler aufgetreten.",
      true
    );
    checkoutSubmitBtn.disabled = false;
    checkoutSubmitBtn.textContent = "Sicher zur Zahlung";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutSummary();
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", handleCheckoutSubmit);
  }
});