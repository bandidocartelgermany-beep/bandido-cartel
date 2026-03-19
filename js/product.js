const productDetailEl = document.getElementById("product-detail");
const cartCountEls = document.querySelectorAll(".cart-count");

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
  const number = Number(value || 0);
  return number.toLocaleString("de-DE", {
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getUrlSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "";
}

function normalizeCategory(category) {
  const value = String(category || "").trim().toLowerCase();

  if (value === "bartoel" || value === "bartöl") return "Bartöl";
  if (value === "wax") return "Wax";
  if (value === "pomade") return "Pomade";
  if (value === "aftershave") return "Aftershave";
  if (value === "haarpflege") return "Haarpflege";
  if (value === "styling") return "Styling";
  if (value === "zubehoer" || value === "zubehör") return "Zubehör";

  return String(category || "Produkt").trim() || "Produkt";
}

function getProductSlug(product) {
  if (product.slug) return String(product.slug);
  return slugify(product.name || product.title || "produkt");
}

function getProductName(product) {
  return product.name || product.title || "Produkt";
}

function getProductDescription(product) {
  return (
    product.description ||
    product.shortDescription ||
    "Dieses Produkt wird in Kürze vollständig ergänzt."
  );
}

function getProductPrice(product) {
  return product.price || product.salePrice || product.regularPrice || 0;
}

function getProductSize(product) {
  return product.size || product.volume || product.variant || "";
}

function getProductImageList(product) {
  if (Array.isArray(product.images) && product.images.length) {
    return product.images;
  }

  if (product.image) {
    return [product.image];
  }

  return [];
}

function getProductBadges(product) {
  if (Array.isArray(product.badges) && product.badges.length) {
    return product.badges.slice(0, 3);
  }

  const badges = [];

  if (product.isNew) badges.push("Neu");
  if (product.isBestSeller) badges.push("Bestseller");
  if (product.isPopular) badges.push("Beliebt");
  if (product.isPremium) badges.push("Premium");

  return badges.slice(0, 3);
}

function renderBadges(badges) {
  if (!badges.length) return "";

  return `
    <div class="product-detail-badges">
      ${badges
        .map((badge) => `<span class="product-detail-badge">${escapeHtml(badge)}</span>`)
        .join("")}
    </div>
  `;
}

function createFallbackProduct(slug) {
  const category = "Produkt";

  return {
    slug: slug || "produkt",
    name: "Produktansicht vorbereitet",
    category,
    price: 0,
    size: "Details folgen",
    description:
      "Diese Produktseite ist bereits vollständig vorbereitet. Sobald wir am Ende die echten Produkte einpflegen, erscheinen hier automatisch Bilder, Preis, Beschreibung und Warenkorb-Funktion.",
    images: [],
    badges: ["Vorbereitet", "Premium"]
  };
}

function addToCart(product) {
  const cart = getCart();

  const existingItem = cart.find((item) => item.slug === product.slug);

  if (existingItem) {
    existingItem.quantity = Number(existingItem.quantity || 0) + 1;
  } else {
    cart.push({
      slug: product.slug,
      name: product.name,
      price: Number(product.price || 0),
      image: product.image || "",
      size: product.size || "",
      quantity: 1
    });
  }

  saveCart(cart);
  updateCartCount();
}

function renderProduct(product) {
  const name = getProductName(product);
  const description = getProductDescription(product);
  const price = getProductPrice(product);
  const size = getProductSize(product);
  const category = normalizeCategory(product.category);
  const images = getProductImageList(product);
  const mainImage = images[0] || "";
  const badges = getProductBadges(product);
  const hasRealPrice = Number(price) > 0;
  const hasRealImage = Boolean(mainImage);

  document.title = `${name} | Bandido & Cartel`;

  productDetailEl.innerHTML = `
    <div class="product-breadcrumbs">
      <a href="index.html">Startseite</a>
      <span>/</span>
      <a href="shop.html">Shop</a>
      <span>/</span>
      <span>${escapeHtml(category)}</span>
    </div>

    <article class="product-detail premium-product-detail">
      <div class="product-detail-grid premium-product-detail-grid">
        <div class="product-gallery-box">
          ${
            hasRealImage
              ? `
                <div class="product-main-image-wrap">
                  <img
                    src="${escapeHtml(mainImage)}"
                    alt="${escapeHtml(name)}"
                    class="product-detail-image product-main-image"
                    id="product-main-image"
                  />
                </div>

                ${
                  images.length > 1
                    ? `
                      <div class="product-thumbs" id="product-thumbs">
                        ${images
                          .map((image, index) => {
                            return `
                              <button
                                type="button"
                                class="product-thumb-button${index === 0 ? " active" : ""}"
                                data-image="${escapeHtml(image)}"
                              >
                                <img src="${escapeHtml(image)}" alt="${escapeHtml(name)} Ansicht ${index + 1}" />
                              </button>
                            `;
                          })
                          .join("")}
                      </div>
                    `
                    : ""
                }
              `
              : `
                <div class="product-detail-image-placeholder premium-product-placeholder">
                  <div class="premium-product-placeholder-inner">
                    <span class="premium-product-placeholder-title">Produktbild folgt</span>
                    <span class="premium-product-placeholder-text">
                      Diese Produktseite ist bereits vorbereitet.
                    </span>
                  </div>
                </div>
              `
          }
        </div>

        <div class="product-detail-content premium-product-detail-content">
          <p class="product-detail-kicker">${escapeHtml(category)}</p>
          <h1>${escapeHtml(name)}</h1>

          ${renderBadges(badges)}

          <p class="product-detail-price premium-product-price">
            ${hasRealPrice ? formatPrice(price) : "Preis folgt"}
          </p>

          ${
            size
              ? `<div class="product-detail-size-box">Inhalt / Variante: <strong>${escapeHtml(size)}</strong></div>`
              : ""
          }

          <div class="product-detail-info-card">
            <p class="product-detail-description">${escapeHtml(description)}</p>
          </div>

          <div class="product-detail-actions premium-product-actions">
            <button class="btn btn-primary" id="add-to-cart-btn" type="button">
              In den Warenkorb
            </button>
            <a href="shop.html" class="btn btn-secondary">Zurück zum Shop</a>
          </div>

          <div class="product-detail-note">
            <p>
              Hochwertige Produktdarstellung, vorbereitet für Bilder, Varianten,
              Beschreibung, Preis und Warenkorb.
            </p>
          </div>
        </div>
      </div>
    </article>
  `;

  const addToCartBtn = document.getElementById("add-to-cart-btn");

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      addToCart({
        slug: product.slug || slugify(name),
        name,
        price: Number(price || 0),
        image: mainImage,
        size
      });

      const originalText = addToCartBtn.textContent;
      addToCartBtn.textContent = "Hinzugefügt";
      addToCartBtn.disabled = true;

      setTimeout(() => {
        addToCartBtn.textContent = originalText;
        addToCartBtn.disabled = false;
      }, 1200);
    });
  }

  setupGallery();
}

function setupGallery() {
  const mainImageEl = document.getElementById("product-main-image");
  const thumbButtons = document.querySelectorAll(".product-thumb-button");

  if (!mainImageEl || !thumbButtons.length) return;

  thumbButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const image = button.dataset.image;
      if (!image) return;

      mainImageEl.src = image;

      thumbButtons.forEach((thumb) => thumb.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

async function loadProduct() {
  const urlSlug = getUrlSlug();

  try {
    const response = await fetch("products.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("products.json nicht gefunden");
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      renderProduct(createFallbackProduct(urlSlug));
      return;
    }

    const matchedProduct = products.find((product) => {
      return getProductSlug(product) === urlSlug;
    });

    if (!matchedProduct) {
      renderProduct(createFallbackProduct(urlSlug));
      return;
    }

    renderProduct({
      ...matchedProduct,
      slug: getProductSlug(matchedProduct)
    });
  } catch (error) {
    renderProduct(createFallbackProduct(urlSlug));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  loadProduct();
});