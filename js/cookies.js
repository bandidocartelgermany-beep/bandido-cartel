(function () {
  const STORAGE_KEY = "bandido_cookie_settings_v1";
  const OPEN_BUTTON_ID = "cookie-settings-open";

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    } catch (error) {
      return null;
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function hasConsent() {
    return !!getSettings();
  }

  function createCookieUi() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="cookie-fab-wrap">
        <button id="${OPEN_BUTTON_ID}" class="cookie-fab" type="button" aria-label="Cookie Einstellungen öffnen">
          Cookie Einstellungen
        </button>
      </div>

      <div id="cookie-overlay" class="cookie-overlay hidden"></div>

      <div id="cookie-banner" class="cookie-banner hidden" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
        <div class="cookie-banner-inner">
          <div class="cookie-banner-text">
            <p class="cookie-eyebrow">Datenschutz</p>
            <h3 id="cookie-title">Diese Website verwendet Cookies</h3>
            <p>
              Wir nutzen notwendige Cookies für den Betrieb der Website. Optionale Cookies helfen uns,
              den Shop zu verbessern und Inhalte besser auf Besucher abzustimmen.
            </p>
            <p class="cookie-link-row">
              <a href="datenschutz.html">Zur Datenschutzerklärung</a>
            </p>
          </div>

          <div class="cookie-options">
            <label class="cookie-option required">
              <span>
                <strong>Notwendige Cookies</strong>
                <small>Immer aktiv für Warenkorb, Sicherheit und Seitengrundfunktionen.</small>
              </span>
              <input type="checkbox" checked disabled />
            </label>

            <label class="cookie-option">
              <span>
                <strong>Statistik</strong>
                <small>Hilft uns zu verstehen, welche Seiten und Produkte besonders gefragt sind.</small>
              </span>
              <input id="cookie-analytics" type="checkbox" />
            </label>

            <label class="cookie-option">
              <span>
                <strong>Marketing</strong>
                <small>Erlaubt personalisierte Hinweise, Kampagnen und Umsatzoptimierung.</small>
              </span>
              <input id="cookie-marketing" type="checkbox" />
            </label>
          </div>

          <div class="cookie-actions">
            <button id="cookie-accept-all" class="cookie-btn primary" type="button">Alle akzeptieren</button>
            <button id="cookie-save-selection" class="cookie-btn secondary" type="button">Auswahl speichern</button>
            <button id="cookie-necessary-only" class="cookie-btn ghost" type="button">Nur notwendige</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  function openBanner() {
    const banner = document.getElementById("cookie-banner");
    const overlay = document.getElementById("cookie-overlay");
    if (!banner || !overlay) return;

    banner.classList.remove("hidden");
    overlay.classList.remove("hidden");
    document.body.classList.add("cookie-lock");
  }

  function closeBanner() {
    const banner = document.getElementById("cookie-banner");
    const overlay = document.getElementById("cookie-overlay");
    if (!banner || !overlay) return;

    banner.classList.add("hidden");
    overlay.classList.add("hidden");
    document.body.classList.remove("cookie-lock");
  }

  function applyStoredValuesToInputs() {
    const settings = getSettings();
    const analyticsEl = document.getElementById("cookie-analytics");
    const marketingEl = document.getElementById("cookie-marketing");

    if (!analyticsEl || !marketingEl || !settings) return;

    analyticsEl.checked = !!settings.analytics;
    marketingEl.checked = !!settings.marketing;
  }

  function persistAndClose(settings) {
    const finalSettings = {
      necessary: true,
      analytics: !!settings.analytics,
      marketing: !!settings.marketing,
      savedAt: new Date().toISOString()
    };

    saveSettings(finalSettings);
    window.dispatchEvent(new CustomEvent("bandido:cookies-updated", { detail: finalSettings }));
    closeBanner();
  }

  function bindEvents() {
    const openBtn = document.getElementById(OPEN_BUTTON_ID);
    const overlay = document.getElementById("cookie-overlay");
    const acceptAllBtn = document.getElementById("cookie-accept-all");
    const saveSelectionBtn = document.getElementById("cookie-save-selection");
    const necessaryOnlyBtn = document.getElementById("cookie-necessary-only");
    const analyticsEl = document.getElementById("cookie-analytics");
    const marketingEl = document.getElementById("cookie-marketing");

    if (openBtn) {
      openBtn.addEventListener("click", openBanner);
    }

    if (overlay) {
      overlay.addEventListener("click", closeBanner);
    }

    if (acceptAllBtn) {
      acceptAllBtn.addEventListener("click", () => {
        if (analyticsEl) analyticsEl.checked = true;
        if (marketingEl) marketingEl.checked = true;

        persistAndClose({
          analytics: true,
          marketing: true
        });
      });
    }

    if (saveSelectionBtn) {
      saveSelectionBtn.addEventListener("click", () => {
        persistAndClose({
          analytics: analyticsEl?.checked,
          marketing: marketingEl?.checked
        });
      });
    }

    if (necessaryOnlyBtn) {
      necessaryOnlyBtn.addEventListener("click", () => {
        if (analyticsEl) analyticsEl.checked = false;
        if (marketingEl) marketingEl.checked = false;

        persistAndClose({
          analytics: false,
          marketing: false
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    createCookieUi();
    bindEvents();
    applyStoredValuesToInputs();

    if (!hasConsent()) {
      setTimeout(openBanner, 500);
    }
  });
})();