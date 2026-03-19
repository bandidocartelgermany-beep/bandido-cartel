(function () {
  const CHAT_STORAGE_KEY = "bandido_chat_messages_v1";
  const LEAD_STORAGE_KEY = "bandido_lead_sent_v1";

  const DEFAULT_WELCOME = {
    role: "assistant",
    text:
      "Willkommen bei Bandido & Cartel. Ich helfe dir bei Produkten, Versand, Rückgabe und Empfehlungen. Wenn du willst, finde ich dir auch direkt das passende Produkt."
  };

  function readMessages() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
      return Array.isArray(parsed) && parsed.length ? parsed : [DEFAULT_WELCOME];
    } catch (error) {
      return [DEFAULT_WELCOME];
    }
  }

  function saveMessages(messages) {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
  }

  function hasLeadBeenSent() {
    return localStorage.getItem(LEAD_STORAGE_KEY) === "true";
  }

  function markLeadSent() {
    localStorage.setItem(LEAD_STORAGE_KEY, "true");
  }

  function createChatbotUi() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <button id="lead-chatbot-toggle" class="lead-chatbot-toggle" type="button" aria-label="Chatbot öffnen">
        KI Hilfe
      </button>

      <section id="lead-chatbot-window" class="lead-chatbot-window" aria-label="KI Chatbot">
        <div class="lead-chatbot-header">
          <div>
            <p class="lead-chatbot-kicker">Bandido & Cartel</p>
            <h3>KI Shop-Beratung</h3>
          </div>
          <button id="lead-chatbot-close" class="lead-chatbot-close" type="button" aria-label="Chat schließen">×</button>
        </div>

        <div id="lead-chatbot-messages" class="lead-chatbot-messages"></div>

        <form id="lead-chatbot-form" class="lead-chatbot-form">
          <input
            id="lead-chatbot-input"
            class="lead-chatbot-input"
            type="text"
            placeholder="Frage zu Produkten, Versand oder Rückgabe stellen ..."
            autocomplete="off"
          />
          <button class="lead-chatbot-send" type="submit">Senden</button>
        </form>

        <div id="lead-capture-box" class="lead-capture-box hidden">
          <p class="lead-capture-title">Angebot oder Beratung anfordern</p>
          <form id="lead-capture-form" class="lead-capture-form">
            <input id="lead-name" type="text" placeholder="Name" />
            <input id="lead-contact" type="text" placeholder="E-Mail oder WhatsApp" />
            <textarea id="lead-notes" placeholder="Wofür interessierst du dich?"></textarea>
            <button type="submit" class="lead-capture-submit">Kontakt speichern</button>
          </form>
        </div>
      </section>
    `;
    document.body.appendChild(wrapper);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMessages() {
    const messagesEl = document.getElementById("lead-chatbot-messages");
    if (!messagesEl) return;

    const messages = readMessages();

    messagesEl.innerHTML = messages
      .map((msg) => {
        const roleClass = msg.role === "user" ? "user" : "assistant";
        return `
          <div class="lead-chatbot-message ${roleClass}">
            <div class="lead-chatbot-bubble">${escapeHtml(msg.text)}</div>
          </div>
        `;
      })
      .join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function pushMessage(role, text) {
    const messages = readMessages();
    messages.push({ role, text });
    saveMessages(messages);
    renderMessages();
  }

  function setLoading(isLoading) {
    const formEl = document.getElementById("lead-chatbot-form");
    const inputEl = document.getElementById("lead-chatbot-input");
    const sendBtn = formEl?.querySelector("button[type='submit']");

    if (inputEl) inputEl.disabled = isLoading;
    if (sendBtn) sendBtn.disabled = isLoading;
    if (sendBtn) sendBtn.textContent = isLoading ? "..." : "Senden";
  }

  function maybeShowLeadCapture(userText, aiText) {
    if (hasLeadBeenSent()) return;

    const triggerWords = [
      "empfehl",
      "beratung",
      "interesse",
      "angebot",
      "bestellung",
      "pomade",
      "wax",
      "bart",
      "haarpflege",
      "styling"
    ];

    const content = `${userText} ${aiText}`.toLowerCase();
    const shouldOpen = triggerWords.some((word) => content.includes(word));

    const leadBox = document.getElementById("lead-capture-box");
    if (leadBox && shouldOpen) {
      leadBox.classList.remove("hidden");
    }
  }

  async function sendMessageToServer(text) {
    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        page: window.location.pathname,
        cookies: JSON.parse(localStorage.getItem("bandido_cookie_settings_v1") || "null")
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Chatbot Fehler");
    }

    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const inputEl = document.getElementById("lead-chatbot-input");
    if (!inputEl) return;

    const text = inputEl.value.trim();
    if (!text) return;

    pushMessage("user", text);
    inputEl.value = "";
    setLoading(true);

    try {
      const data = await sendMessageToServer(text);
      const reply = data.reply || "Entschuldige, ich konnte gerade keine Antwort erzeugen.";
      pushMessage("assistant", reply);
      maybeShowLeadCapture(text, reply);
    } catch (error) {
      pushMessage(
        "assistant",
        "Gerade gibt es ein technisches Problem. Du kannst uns auch direkt per WhatsApp oder telefonisch kontaktieren."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLeadSubmit(event) {
    event.preventDefault();

    const nameEl = document.getElementById("lead-name");
    const contactEl = document.getElementById("lead-contact");
    const notesEl = document.getElementById("lead-notes");

    const payload = {
      name: nameEl?.value?.trim() || "",
      contact: contactEl?.value?.trim() || "",
      notes: notesEl?.value?.trim() || "",
      source: "chatbot",
      page: window.location.pathname,
      createdAt: new Date().toISOString()
    };

    if (!payload.contact) {
      pushMessage("assistant", "Bitte gib mindestens eine E-Mail-Adresse oder WhatsApp-Nummer an.");
      return;
    }

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Lead konnte nicht gespeichert werden.");
      }

      markLeadSent();
      pushMessage(
        "assistant",
        "Danke. Deine Anfrage wurde gespeichert. Wir können dich für Beratung oder Produktempfehlungen kontaktieren."
      );

      const leadBox = document.getElementById("lead-capture-box");
      if (leadBox) leadBox.classList.add("hidden");

      if (nameEl) nameEl.value = "";
      if (contactEl) contactEl.value = "";
      if (notesEl) notesEl.value = "";
    } catch (error) {
      pushMessage(
        "assistant",
        "Die Anfrage konnte gerade nicht gespeichert werden. Bitte nutze alternativ WhatsApp oder Telefon."
      );
    }
  }

  function bindEvents() {
    const toggleBtn = document.getElementById("lead-chatbot-toggle");
    const closeBtn = document.getElementById("lead-chatbot-close");
    const windowEl = document.getElementById("lead-chatbot-window");
    const formEl = document.getElementById("lead-chatbot-form");
    const leadFormEl = document.getElementById("lead-capture-form");

    if (toggleBtn && windowEl) {
      toggleBtn.addEventListener("click", () => {
        windowEl.classList.toggle("open");
      });
    }

    if (closeBtn && windowEl) {
      closeBtn.addEventListener("click", () => {
        windowEl.classList.remove("open");
      });
    }

    if (formEl) {
      formEl.addEventListener("submit", handleSubmit);
    }

    if (leadFormEl) {
      leadFormEl.addEventListener("submit", handleLeadSubmit);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    createChatbotUi();
    renderMessages();
    bindEvents();
  });
})();