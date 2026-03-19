const categorySectionsEl = document.getElementById("shop-category-sections");
const categoryOverviewEl = document.getElementById("category-overview");
const categoryNavScrollEl = document.getElementById("shop-category-nav-scroll");
const cartCountEls = document.querySelectorAll(".cart-count");

const CATEGORY_ORDER = [
  "Bartöl",
  "Wax",
  "Pomade",
  "Aftershave",
  "Haarpflege",
  "Styling",
  "Zubehör"
];

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

function normalizeCategory(category) {
  const value = String(category || "").trim().toLowerCase();

  if (value === "bartoel" || value === "bartöl") return "Bartöl";
  if (value === "wax") return "Wax";
  if (value === "pomade") return "Pomade";
  if (value === "aftershave") return "Aftershave";
  if (value === "haarpflege") return "Haarpflege";
  if (value === "styling") return "Styling";
  if (value === "zubehoer" || value === "zubehör") return "Zubehör";

  return String(category || "Sonstiges").trim() || "Sonstiges";
}

function getProductUrl(product) {
  if (product.url) return product.url;
  if (product.href) return product.href;
  if (product.link) return product.link;

  if (product.slug) {
    return `product.html?slug=${encodeURIComponent(product.slug)}`;
  }

  const nameSlug = slugify(product.name || product.title || "produkt");
  return `product.html?slug=${encodeURIComponent(nameSlug)}`;
}

function getProductImage(product) {
  return (
    product.image ||
    product.images?.[0] ||
    product.thumbnail ||
    "images/placeholder-product.jpg"
  );
}

function getProductName(product) {
  return product.name || product.title || "Produkt";
}

function getProductDescription(product) {
  return product.shortDescription || product.description || product.text || "";
}

function getProductSize(product) {
  return product.size || product.volume || product.variant || "";
}

function getProductPrice(product) {
  return product.price || product.salePrice || product.regularPrice || 0;
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

function getBadgeClassName(badge) {
  const value = String(badge || "").trim().toLowerCase();

  if (value === "neu") return "badge-new";
  if (value === "bestseller") return "badge-bestseller";
  if (value === "beliebt") return "badge-popular";
  if (value === "premium") return "badge-premium";

  return "badge-default";
}

function sortCategories(categories) {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.localeCompare(b, "de");
  });
}

function createEmptyCategoryMap() {
  const groupedProducts = {};

  CATEGORY_ORDER.forEach((category) => {
    groupedProducts[category] = [];
  });

  return groupedProducts;
}

function renderCategoryNav(groupedProducts) {
  const categories = sortCategories(Object.keys(groupedProducts));

  if (!categories.length) {
    categoryNavScrollEl.innerHTML = "";
    return;
  }

  categoryNavScrollEl.innerHTML = categories
    .map((category, index) => {
      const anchor = `category-${slugify(category)}`;
      const count = groupedProducts[category].length;

      return `
        <a
          href="#${anchor}"
          class="shop-category-nav-link${index === 0 ? " active" : ""}"
          data-category-link="${anchor}"
        >
          <span class="shop-category-nav-name">${escapeHtml(category)}</span>
          <span class="shop-category-nav-count">${count}</span>
        </a>
      `;
    })
    .join("");
}

function renderCategoryOverview(groupedProducts) {
  const categories = sortCategories(Object.keys(groupedProducts));

  categoryOverviewEl.innerHTML = categories
    .map((category) => {
      const anchor = `category-${slugify(category)}`;
      const count = groupedProducts[category].length;

      return `
        <a class="category-overview-card" href="#${anchor}">
          <span class="category-overview-title">${escapeHtml(category)}</span>
          <span class="category-overview-count">
            ${count > 0 ? `${count} Produkt${count === 1 ? "" : "e"}` : "Produkte folgen"}
          </span>
        </a>
      `;
    })
    .join("");
}

function createPlaceholderCards(category) {
  return `
    <article class="product-card premium-product-card placeholder-product-card">
      <div class="product-card-media">
        <div class="product-card-image-wrap placeholder-image-wrap">
          <div class="placeholder-image-label">${escapeHtml(category)}</div>
        </div>
      </div>

      <div class="product-card-body">
        <div class="product-card-top">
          <h3 class="product-card-title">Produkte folgen</h3>
          <span class="product-card-size">Bald verfügbar</span>
        </div>

        <p class="product-card-description">
          Diese Kategorie ist bereits vorbereitet. Die finalen Produkte pflegen wir zum Schluss ein.
        </p>

        <div class="product-card-bottom">
          <span class="product-card-price">Demnächst</span>
          <span class="product-card-button placeholder-product-button">Vorbereitet</span>
        </div>
      </div>
    </article>

    <article class="product-card premium-product-card placeholder-product-card">
      <div class="product-card-media">
        <div class="product-card-image-wrap placeholder-image-wrap">
          <div class="placeholder-image-label">${escapeHtml(category)}</div>
        </div>
      </div>

      <div class="product-card-body">
        <div class="product-card-top">
          <h3 class="product-card-title">Kategorie-Vorlage</h3>
          <span class="product-card-size">Shop-System bereit</span>
        </div>

        <p class="product-card-description">
          Layout, Navigation und Kategorie-Struktur stehen schon. Später kommen hier deine echten Artikel hinein.
        </p>

        <div class="product-card-bottom">
          <span class="product-card-price">Demnächst</span>
          <span class="product-card-button placeholder-product-button">Bereit</span>
        </div>
      </div>
    </article>
  `;
}

function renderProductsByCategory(products) {
  if (!categorySectionsEl || !categoryOverviewEl || !categoryNavScrollEl) {
    return;
  }

  const groupedProducts = createEmptyCategoryMap();

  if (Array.isArray(products) && products.length > 0) {
    products.forEach((product) => {
      const category = normalizeCategory(product.category);

      if (!groupedProducts[category]) {
        groupedProducts[category] = [];
      }

      groupedProducts[category].push(product);
    });
  }

  renderCategoryNav(groupedProducts);
  renderCategoryOverview(groupedProducts);

  const categories = sortCategories(Object.keys(groupedProducts));

  categorySectionsEl.innerHTML = categories
    .map((category) => {
      const anchor = `category-${slugify(category)}`;
      const categoryProducts = groupedProducts[category];
      const hasProducts = categoryProducts.length > 0;

      const cardsHtml = hasProducts
        ? categoryProducts
            .map((product) => {
              const name = getProductName(product);
              const description = getProductDescription(product);
              const image = getProductImage(product);
              const size = getProductSize(product);
              const price = getProductPrice(product);
              const url = getProductUrl(product);
              const badges = getProductBadges(product);

              const badgesHtml = badges.length
                ? `
                  <div class="product-card-badges">
                    ${badges
                      .map((badge) => {
                        return `
                          <span class="product-badge ${getBadgeClassName(badge)}">
                            ${escapeHtml(badge)}
                          </span>
                        `;
                      })
                      .join("")}
                  </div>
                `
                : "";

              return `
                <article class="product-card premium-product-card">
                  <div class="product-card-media">
                    <a href="${escapeHtml(url)}" class="product-card-image-wrap">
                      <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(name)}"
                        class="product-card-image"
                        loading="lazy"
                      />
                    </a>

                    ${badgesHtml}

                    <div class="product-card-overlay">
                      <a href="${escapeHtml(url)}" class="product-card-overlay-button">
                        Produkt ansehen
                      </a>
                    </div>
                  </div>

                  <div class="product-card-body">
                    <div class="product-card-top">
                      <h3 class="product-card-title">
                        <a href="${escapeHtml(url)}">${escapeHtml(name)}</a>
                      </h3>
                      ${size ? `<span class="product-card-size">${escapeHtml(size)}</span>` : ""}
                    </div>

                    ${
                      description
                        ? `<p class="product-card-description">${escapeHtml(description)}</p>`
                        : ""
                    }

                    <div class="product-card-bottom">
                      <span class="product-card-price">${formatPrice(price)}</span>
                      <a href="${escapeHtml(url)}" class="product-card-button">Ansehen</a>
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")
        : createPlaceholderCards(category);

      return `
        <section class="shop-category-block" id="${anchor}" data-category-section="${anchor}">
          <div class="shop-category-head">
            <div>
              <p class="shop-category-kicker">Kategorie</p>
              <h2>${escapeHtml(category)}</h2>
            </div>
            <span class="shop-category-count">
              ${
                hasProducts
                  ? `${categoryProducts.length} Produkt${categoryProducts.length === 1 ? "" : "e"}`
                  : "Produkte folgen"
              }
            </span>
          </div>

          <div class="products-grid shop-products-grid">
            ${cardsHtml}
          </div>
        </section>
      `;
    })
    .join("");

  setupCategoryNavBehavior();
}

function setActiveCategoryLink(sectionId) {
  const navLinks = document.querySelectorAll(".shop-category-nav-link");

  navLinks.forEach((link) => {
    const isActive = link.dataset.categoryLink === sectionId;
    link.classList.toggle("active", isActive);
  });
}

function scrollToCategory(targetId) {
  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  const headerOffset = 170;
  const targetPosition = targetEl.getBoundingClientRect().top + window.scrollY - headerOffset;

  window.scrollTo({
    top: targetPosition,
    behavior: "smooth"
  });
}

let categoryScrollHandlerAttached = false;

function setupCategoryNavBehavior() {
  const sections = document.querySelectorAll("[data-category-section]");

  if (categoryNavScrollEl) {
    categoryNavScrollEl.addEventListener("click", (event) => {
      const link = event.target.closest(".shop-category-nav-link");
      if (!link) return;

      event.preventDefault();
      const targetId = link.dataset.categoryLink;
      setActiveCategoryLink(targetId);
      scrollToCategory(targetId);
    });
  }

  function updateActiveCategoryOnScroll() {
    let currentSectionId = null;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 220) {
        currentSectionId = section.dataset.categorySection;
      }
    });

    if (!currentSectionId && sections.length) {
      currentSectionId = sections[0].dataset.categorySection;
    }

    if (currentSectionId) {
      setActiveCategoryLink(currentSectionId);
    }
  }

  if (!categoryScrollHandlerAttached) {
    window.addEventListener("scroll", updateActiveCategoryOnScroll, { passive: true });
    categoryScrollHandlerAttached = true;
  }

  updateActiveCategoryOnScroll();
}

async function loadProducts() {
  try {
    const response = await fetch("products.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("products.json nicht gefunden");
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      renderProductsByCategory([]);
      return;
    }

    renderProductsByCategory(products);
  } catch (error) {
    renderProductsByCategory([]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  loadProducts();
});