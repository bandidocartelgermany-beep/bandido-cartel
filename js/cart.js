const cartItemsEl = document.getElementById("cart-items");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartShippingEl = document.getElementById("cart-shipping");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEls = document.querySelectorAll(".cart-count");
const freeShippingNoteEl = document.getElementById("cart-free-shipping-note");

const FREE_SHIPPING_THRESHOLD = 20;
const SHIPPING_COST = 6.19;

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("bandido_cart")) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("bandido_cart", JSON.stringify(cart));
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

function renderFreeShippingNote(subtotal) {
  if (!freeShippingNoteEl) return;

  if (subtotal <= 0) {
    freeShippingNoteEl.innerHTML = "";
    return;
  }

  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    freeShippingNoteEl.innerHTML = `
      <div class="cart-free-shipping-note success">
        <strong>Versandfrei freigeschaltet.</strong>
        <span>Deine Bestellung wird kostenlos versendet.</span>
      </div>
    `;
    return;
  }

  const missing = FREE_SHIPPING_THRESHOLD - subtotal;

  freeShippingNoteEl.innerHTML = `
    <div class="cart-free-shipping-note">
      <strong>Nur noch ${formatPrice(missing)} bis zum kostenlosen Versand.</strong>
      <span>Ab ${formatPrice(FREE_SHIPPING_THRESHOLD)} ist deine Lieferung versandfrei.</span>
    </div>
  `;
}

function createCartItemImage(item) {
  if (item.image) {
    return `
      <img
        src="${escapeHtml(item.image)}"
        alt="${escapeHtml(item.name || "Produkt")}"
        class="cart-item-image"
        loading="lazy"
      />
    `;
  }

  return `
    <div class="cart-item-image-placeholder">
      <span>Produkt</span>
    </div>
  `;
}

function renderEmptyCart() {
  cartItemsEl.innerHTML = `
    <div class="empty-state premium-empty-state">
      <div class="premium-empty-icon">🛒</div>
      <h3>Dein Warenkorb ist leer</h3>
      <p>
        Lege zuerst Produkte in den Warenkorb, damit du hier deine Auswahl
        prüfen und anschließend zur Kasse gehen kannst.
      </p>
      <a href="shop.html" class="btn btn-primary">Zum Shop</a>
    </div>
  `;

  cartSubtotalEl.textContent = formatPrice(0);
  cartShippingEl.textContent = formatPrice(0);
  cartTotalEl.textContent = formatPrice(0);

  renderFreeShippingNote(0);
  updateCartCount();
}

function renderCart() {
  const cart = getCart();

  if (!cart.length) {
    renderEmptyCart();
    return;
  }

  let subtotal = 0;

  cartItemsEl.innerHTML = cart
    .map((item) => {
      const itemPrice = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      const itemTotal = itemPrice * quantity;
      subtotal += itemTotal;

      return `
        <article class="cart-item premium-cart-item">
          <div class="cart-item-left">
            ${createCartItemImage(item)}
          </div>

          <div class="cart-item-center">
            <div class="cart-item-topline">
              <h3>${escapeHtml(item.name || "Produkt")}</h3>
              ${item.size ? `<span class="cart-item-size">${escapeHtml(item.size)}</span>` : ""}
            </div>

            <p class="cart-item-single-price">
              Einzelpreis: ${formatPrice(itemPrice)}
            </p>

            <div class="cart-item-mobile-total">
              Gesamt: <strong>${formatPrice(itemTotal)}</strong>
            </div>
          </div>

          <div class="cart-item-right">
            <div class="cart-qty-controls">
              <button
                class="qty-btn"
                type="button"
                data-action="decrease"
                data-slug="${escapeHtml(item.slug || "")}"
                aria-label="Menge verringern"
              >
                −
              </button>

              <span class="cart-qty-value">${quantity}</span>

              <button
                class="qty-btn"
                type="button"
                data-action="increase"
                data-slug="${escapeHtml(item.slug || "")}"
                aria-label="Menge erhöhen"
              >
                +
              </button>
            </div>

            <p class="cart-item-total">${formatPrice(itemTotal)}</p>

            <button
              class="remove-btn"
              type="button"
              data-slug="${escapeHtml(item.slug || "")}"
            >
              Entfernen
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  cartSubtotalEl.textContent = formatPrice(subtotal);
  cartShippingEl.textContent = formatPrice(shipping);
  cartTotalEl.textContent = formatPrice(total);

  renderFreeShippingNote(subtotal);
  bindCartActions();
  updateCartCount();
}

function changeQuantity(slug, mode) {
  const cart = getCart();
  const item = cart.find((entry) => entry.slug === slug);

  if (!item) return;

  if (mode === "increase") {
    item.quantity = Number(item.quantity || 0) + 1;
  }

  if (mode === "decrease") {
    item.quantity = Number(item.quantity || 0) - 1;
  }

  const cleanedCart = cart.filter((entry) => Number(entry.quantity) > 0);
  saveCart(cleanedCart);
  renderCart();
}

function removeItem(slug) {
  const cart = getCart().filter((item) => item.slug !== slug);
  saveCart(cart);
  renderCart();
}

function bindCartActions() {
  if (!cartItemsEl) return;

  cartItemsEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-slug]");
    if (!button) return;

    const slug = button.dataset.slug;

    if (button.dataset.action === "increase") {
      changeQuantity(slug, "increase");
      return;
    }

    if (button.dataset.action === "decrease") {
      changeQuantity(slug, "decrease");
      return;
    }

    if (button.classList.contains("remove-btn")) {
      removeItem(slug);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});