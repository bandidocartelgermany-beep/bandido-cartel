async function loadPartial(targetSelector, partialUrl) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  try {
    const res = await fetch(partialUrl, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${partialUrl}`);
    target.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
    // Fallback-Hinweis (nur falls Laden fehlschlägt)
    target.innerHTML = "";
  }
}

function setupMenu() {
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("menu-close");
  const overlay = document.getElementById("menu-overlay");
  const menu = document.getElementById("side-menu");

  // Wenn Header noch nicht geladen ist, gibt es diese Elemente nicht
  if (!toggleBtn || !closeBtn || !overlay || !menu) return;

  const openMenu = () => {
    menu.classList.add("is-open");
    overlay.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    toggleBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  };

  const closeMenu = () => {
    menu.classList.remove("is-open");
    overlay.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    toggleBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  toggleBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

function updateCartCount() {
  // Optional: simple localStorage cart
  // Erwartet: [{ id, qty }, ...]
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const count = cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

  const cartCountEl = document.querySelector(".cart-count");
  if (cartCountEl) cartCountEl.textContent = String(count);
}

async function init() {
  // Header laden
  await loadPartial("#siteHeader", "partials/header.html");

  // Danach erst Menu-Events setzen (weil Elemente erst jetzt im DOM sind)
  setupMenu();

  // Optional: Cart count
  updateCartCount();
}

document.addEventListener("DOMContentLoaded", init);