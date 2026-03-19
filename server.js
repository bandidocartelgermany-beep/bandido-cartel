const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const stripe = STRIPE_SECRET_KEY ? require("stripe")(STRIPE_SECRET_KEY) : null;

/*
================================
MIDDLEWARE
================================
*/

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

function respondWithError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

/*
================================
PUBLIC ORDNER AUSLIEFERN
================================
*/

app.use(express.static(path.join(__dirname, "public")));
app.use("/data", express.static(path.join(__dirname, "data")));

/*
================================
DATENPFADE
================================
*/

const dataDir = path.join(__dirname, "data");
const ordersFile = path.join(dataDir, "orders.json");
const leadsFile = path.join(dataDir, "leads.json");
const complaintsFile = path.join(dataDir, "complaints.json");
const returnsFile = path.join(dataDir, "returns.json");
const cancellationsFile = path.join(dataDir, "cancellations.json");
const contactsFile = path.join(dataDir, "contacts.json");

const publicProductsFile = path.join(__dirname, "public", "products.json");
const dataProductsFile = path.join(dataDir, "products.json");

/*
================================
HILFSFUNKTIONEN
================================
*/

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const files = [
    ordersFile,
    leadsFile,
    complaintsFile,
    returnsFile,
    cancellationsFile,
    contactsFile
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf8");
    }
  }
}

function readJsonFile(filePath, fallbackValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || JSON.stringify(fallbackValue));
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function readOrders() {
  ensureDataFiles();
  return readJsonFile(ordersFile, []);
}

function writeOrders(orders) {
  ensureDataFiles();
  writeJsonFile(ordersFile, orders);
}

function readLeads() {
  ensureDataFiles();
  return readJsonFile(leadsFile, []);
}

function writeLeads(leads) {
  ensureDataFiles();
  writeJsonFile(leadsFile, leads);
}

function readComplaints() {
  ensureDataFiles();
  return readJsonFile(complaintsFile, []);
}

function writeComplaints(complaints) {
  ensureDataFiles();
  writeJsonFile(complaintsFile, complaints);
}

function readReturns() {
  ensureDataFiles();
  return readJsonFile(returnsFile, []);
}

function writeReturns(returns) {
  ensureDataFiles();
  writeJsonFile(returnsFile, returns);
}

function readCancellations() {
  ensureDataFiles();
  return readJsonFile(cancellationsFile, []);
}

function writeCancellations(cancellations) {
  ensureDataFiles();
  writeJsonFile(cancellationsFile, cancellations);
}

function readContacts() {
  ensureDataFiles();
  return readJsonFile(contactsFile, []);
}

function writeContacts(contacts) {
  ensureDataFiles();
  writeJsonFile(contactsFile, contacts);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function sanitizeText(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizePrice(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeQuantity(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function calculateShipping(subtotal) {
  if (subtotal <= 0) return 0;
  if (subtotal >= 20) return 0;
  return 6.19;
}

function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BC-${year}-${random}`;
}

function createLineItems(items, shipping) {
  const safeItems = Array.isArray(items) ? items : [];

  const productLineItems = safeItems
    .filter((item) => normalizePrice(item.price) > 0 && normalizeQuantity(item.quantity) > 0)
    .map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: normalizeText(item.name) || "Produkt"
        },
        unit_amount: Math.round(normalizePrice(item.price) * 100)
      },
      quantity: normalizeQuantity(item.quantity)
    }));

  if (shipping > 0) {
    productLineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: "Versand"
        },
        unit_amount: Math.round(shipping * 100)
      },
      quantity: 1
    });
  }

  return productLineItems;
}

function validateCheckoutPayload(body) {
  const customer = body?.customer || {};
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!items.length) {
    return "Der Warenkorb ist leer.";
  }

  const requiredFields = [
    "email",
    "firstName",
    "lastName",
    "street",
    "zip",
    "city",
    "country"
  ];

  for (const field of requiredFields) {
    if (!normalizeText(customer[field])) {
      return "Bitte fülle alle Pflichtfelder vollständig aus.";
    }
  }

  if (!normalizeText(customer.email).includes("@")) {
    return "Bitte gib eine gültige E-Mail-Adresse ein.";
  }

  const validItems = items.every((item) => {
    return (
      normalizeText(item.slug) &&
      normalizeText(item.name) &&
      normalizePrice(item.price) > 0 &&
      normalizeQuantity(item.quantity) > 0
    );
  });

  if (!validItems) {
    return "Mindestens ein Produkt im Warenkorb ist ungültig.";
  }

  return "";
}

function getProducts() {
  const publicProducts = readJsonFile(publicProductsFile, null);
  if (Array.isArray(publicProducts)) {
    return publicProducts;
  }

  const dataProducts = readJsonFile(dataProductsFile, null);
  if (Array.isArray(dataProducts)) {
    return dataProducts;
  }

  console.warn("Keine Produktdaten gefunden (public/products.json und data/products.json fehlen oder sind ungültig).\n");
  return [];
}

function getProductSummaryForAi(limit = 30) {
  const products = getProducts();

  if (!products.length) {
    return "Keine bestätigten Produktdaten in products.json gefunden.";
  }

  return products
    .slice(0, limit)
    .map((product) => {
      const name = sanitizeText(product.name || product.title || "Produkt", 120);
      const category = sanitizeText(product.category || "Unbekannt", 60);
      const price = normalizePrice(
        product.price || product.salePrice || product.regularPrice || 0
      );
      const size = sanitizeText(product.size || product.volume || product.variant || "", 60);
      const description = sanitizeText(
        product.shortDescription || product.description || product.text || "",
        220
      );

      return `- ${name} | Kategorie: ${category} | Preis: ${price.toFixed(2)} EUR${
        size ? ` | Größe: ${size}` : ""
      }${description ? ` | Beschreibung: ${description}` : ""}`;
    })
    .join("\n");
}

function callOpenAIResponsesApi({ systemPrompt, userMessage }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "gpt-5.4",
      store: false,
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    const request = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/responses",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      },
      (response) => {
        let rawData = "";

        response.on("data", (chunk) => {
          rawData += chunk;
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(rawData || "{}");

            if (response.statusCode < 200 || response.statusCode >= 300) {
              return reject(new Error(data?.error?.message || "OpenAI API Fehler"));
            }

            let reply = "";

            if (typeof data.output_text === "string" && data.output_text.trim()) {
              reply = data.output_text.trim();
            } else if (Array.isArray(data.output)) {
              const textParts = [];

              for (const item of data.output) {
                if (!Array.isArray(item?.content)) continue;

                for (const contentItem of item.content) {
                  if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
                    textParts.push(contentItem.text.trim());
                  }
                }
              }

              reply = textParts.join("\n\n").trim();
            }

            resolve(reply || "Ich konnte gerade keine passende Antwort erzeugen.");
          } catch (error) {
            reject(new Error("Fehler beim Verarbeiten der KI-Antwort"));
          }
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.write(payload);
    request.end();
  });
}

function buildNormalizedOrderFromCheckout(body) {
  const customer = body?.customer || {};
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  const normalizedItems = rawItems
    .filter((item) => {
      return (
        normalizeText(item.slug) &&
        normalizeText(item.name) &&
        normalizePrice(item.price) > 0 &&
        normalizeQuantity(item.quantity) > 0
      );
    })
    .map((item) => ({
      slug: normalizeText(item.slug),
      name: normalizeText(item.name) || "Produkt",
      price: normalizePrice(item.price),
      quantity: normalizeQuantity(item.quantity),
      image: normalizeText(item.image),
      size: normalizeText(item.size)
    }));

  const subtotal = normalizedItems.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  return {
    id: String(Date.now()),
    orderNumber: generateOrderNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    firstName: normalizeText(customer.firstName),
    lastName: normalizeText(customer.lastName),
    email: normalizeText(customer.email),
    phone: normalizeText(customer.phone),

    street: normalizeText(customer.street),
    zip: normalizeText(customer.zip),
    city: normalizeText(customer.city),
    country: normalizeText(customer.country || "Deutschland"),

    items: normalizedItems,

    subtotal,
    shipping,
    total,

    paymentMethod: "stripe",
    paymentStatus: "pending",
    status: "offen",
    notes: normalizeText(customer.notes),
    adminNote: "",

    trackingNumber: "",
    trackingUrl: "",

    stripeSessionId: "",
    confirmationEmailSent: false,
    confirmationEmailSentAt: null,
    shippedEmailSent: false,
    shippedEmailSentAt: null
  };
}

function sortNewestFirst(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime() || 0;
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime() || 0;
    return bTime - aTime;
  });
}

function patchCollectionItem(req, res, config) {
  try {
    const id = normalizeText(req.params?.id);
    const status = normalizeText(req.body?.status);
    const hasAdminNote = Object.prototype.hasOwnProperty.call(req.body || {}, "adminNote");
    const adminNote = hasAdminNote
      ? sanitizeText(req.body?.adminNote, 3000)
      : undefined;

    if (!id) {
      return res.status(400).json({
        error: "ID fehlt."
      });
    }

    const items = config.readFn();
    const index = items.findIndex((item) => String(item.id) === String(id));

    if (index === -1) {
      return res.status(404).json({
        error: "Eintrag nicht gefunden."
      });
    }

    const currentItem = items[index];

    items[index] = {
      ...currentItem,
      status:
        status && config.allowedStatuses.includes(status)
          ? status
          : currentItem.status,
      adminNote: adminNote !== undefined ? adminNote : currentItem.adminNote || "",
      updatedAt: new Date().toISOString()
    };

    config.writeFn(items);

    return res.json(items[index]);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Admin-Eintrags:", error);

    return res.status(500).json({
      error: "Eintrag konnte nicht aktualisiert werden."
    });
  }
}

/*
================================
BESTELLUNG SPEICHERN
================================
*/

app.post("/api/order", (req, res) => {
  try {
    const order = {
      ...req.body,
      id: String(req.body?.id || Date.now()),
      createdAt: req.body?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminNote: sanitizeText(req.body?.adminNote, 3000),
      status: normalizeText(req.body?.status || "offen")
    };

    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);

    res.json({
      success: true,
      message: "Bestellung gespeichert"
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Bestellung:", error);

    res.status(500).json({
      success: false,
      message: "Fehler beim Speichern der Bestellung"
    });
  }
});

/*
================================
BESTELLSTATUS FÜR KUNDENBEREICH
================================
*/

app.post("/api/order-status", (req, res) => {
  try {
    const orderNumber = normalizeText(req.body?.orderNumber);
    const email = normalizeText(req.body?.email).toLowerCase();

    if (!orderNumber || !email) {
      return res.status(400).json({
        success: false,
        message: "Bestellnummer und E-Mail sind erforderlich."
      });
    }

    const orders = readOrders();

    const order = orders.find((item) => {
      return (
        normalizeText(item.orderNumber).toLowerCase() === orderNumber.toLowerCase() &&
        normalizeText(item.email).toLowerCase() === email
      );
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Bestellung nicht gefunden."
      });
    }

    let customerStatus = "offen";

    if (
      ["shipped", "versendet", "completed", "abgeschlossen"].includes(
        normalizeText(order.status).toLowerCase()
      )
    ) {
      customerStatus = "versendet";
    } else if (
      ["paid", "bezahlt", "open", "offen", "pending"].includes(
        normalizeText(order.status).toLowerCase()
      )
    ) {
      customerStatus = "offen";
    }

    return res.json({
      success: true,
      status: customerStatus,
      name: `${normalizeText(order.firstName)} ${normalizeText(order.lastName)}`.trim(),
      date: order.createdAt || new Date().toISOString(),
      total: normalizePrice(order.total).toFixed(2),
      trackingNumber: normalizeText(order.trackingNumber),
      trackingUrl: normalizeText(order.trackingUrl)
    });
  } catch (error) {
    console.error("Fehler beim Abrufen des Bestellstatus:", error);

    return res.status(500).json({
      success: false,
      message: "Bestellstatus konnte nicht geladen werden."
    });
  }
});

/*
================================
BESTELLUNG ALS BEZAHLT MARKIEREN
================================
*/

app.post("/api/orders/mark-paid", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe ist nicht konfiguriert."
      });
    }

    const sessionId = normalizeText(req.body?.sessionId);

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID fehlt."
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({
        error: "Diese Zahlung ist noch nicht als bezahlt bestätigt."
      });
    }

    const orders = readOrders();
    const orderIndex = orders.findIndex((order) => order.stripeSessionId === sessionId);

    if (orderIndex === -1) {
      return res.status(404).json({
        error: "Passende Bestellung wurde nicht gefunden."
      });
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      updatedAt: new Date().toISOString(),
      paymentStatus: "paid",
      status: "bezahlt"
    };

    writeOrders(orders);

    return res.json({
      success: true,
      message: "Bestellung wurde als bezahlt markiert."
    });
  } catch (error) {
    console.error("Fehler beim Markieren der Bestellung als bezahlt:", error);

    return res.status(500).json({
      error: "Bestellung konnte nicht aktualisiert werden."
    });
  }
});

/*
================================
LEADS SPEICHERN
================================
*/

app.post("/api/leads", (req, res) => {
  try {
    const lead = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: sanitizeText(req.body?.name, 120),
      contact: sanitizeText(req.body?.contact, 180),
      notes: sanitizeText(req.body?.notes, 1000),
      source: sanitizeText(req.body?.source || "website", 60),
      page: sanitizeText(req.body?.page || "", 200),
      adminNote: "",
      status: "neu"
    };

    if (!lead.contact) {
      return res.status(400).json({
        error: "Bitte gib mindestens eine E-Mail-Adresse oder Telefonnummer an."
      });
    }

    const leads = readLeads();
    leads.unshift(lead);
    writeLeads(leads);

    return res.json({
      success: true,
      message: "Lead gespeichert"
    });
  } catch (error) {
    console.error("Fehler beim Speichern des Leads:", error);

    return res.status(500).json({
      error: "Lead konnte nicht gespeichert werden."
    });
  }
});

/*
================================
KONTAKTANFRAGE SPEICHERN
================================
*/

app.post("/api/contact", (req, res) => {
  try {
    const contact = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: "kontakt",
      firstName: sanitizeText(req.body?.firstName, 120),
      lastName: sanitizeText(req.body?.lastName, 120),
      fullName: sanitizeText(
        `${normalizeText(req.body?.firstName)} ${normalizeText(req.body?.lastName)}`.trim(),
        160
      ),
      name: sanitizeText(req.body?.name, 160),
      email: sanitizeText(req.body?.email, 180),
      phone: sanitizeText(req.body?.phone, 80),
      subject: sanitizeText(req.body?.subject, 180),
      message: sanitizeText(req.body?.message, 3000),
      source: sanitizeText(req.body?.source || "website", 60),
      page: sanitizeText(req.body?.page || "", 200),
      status: "neu",
      adminNote: ""
    };

    const hasName =
      contact.fullName ||
      contact.name ||
      normalizeText(req.body?.firstName) ||
      normalizeText(req.body?.lastName);

    if (!hasName || !contact.email || !contact.subject || !contact.message) {
      return res.status(400).json({
        success: false,
        error: "Bitte fülle alle Pflichtfelder aus."
      });
    }

    const contacts = readContacts();
    contacts.unshift(contact);
    writeContacts(contacts);

    return res.json({
      success: true,
      message: "Kontaktanfrage gespeichert."
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Kontaktanfrage:", error);

    return res.status(500).json({
      success: false,
      error: "Kontaktanfrage konnte nicht gespeichert werden."
    });
  }
});

/*
================================
REKLAMATION SPEICHERN
================================
*/

app.post("/api/complaints", (req, res) => {
  try {
    const complaint = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: "reklamation",
      orderNumber: sanitizeText(req.body?.orderNumber, 120),
      email: sanitizeText(req.body?.email, 180),
      firstName: sanitizeText(req.body?.firstName, 120),
      lastName: sanitizeText(req.body?.lastName, 120),
      reason: sanitizeText(req.body?.reason, 120),
      message: sanitizeText(req.body?.message, 3000),
      source: sanitizeText(req.body?.source || "website", 60),
      status: "neu",
      adminNote: ""
    };

    if (!complaint.orderNumber || !complaint.email || !complaint.reason || !complaint.message) {
      return res.status(400).json({
        success: false,
        error: "Bitte fülle alle Pflichtfelder aus."
      });
    }

    const complaints = readComplaints();
    complaints.unshift(complaint);
    writeComplaints(complaints);

    return res.json({
      success: true,
      message: "Reklamation gespeichert."
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Reklamation:", error);

    return res.status(500).json({
      success: false,
      error: "Reklamation konnte nicht gespeichert werden."
    });
  }
});

/*
================================
ALLE REKLAMATIONEN
================================
*/

app.get("/api/complaints", (req, res) => {
  try {
    const complaints = readComplaints();
    res.json(sortNewestFirst(complaints));
  } catch (error) {
    res.json([]);
  }
});

/*
================================
RÜCKGABEANFRAGE SPEICHERN
================================
*/

app.post("/api/returns", (req, res) => {
  try {
    const returnRequest = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: "rueckgabe",
      orderNumber: sanitizeText(req.body?.orderNumber, 120),
      email: sanitizeText(req.body?.email, 180),
      firstName: sanitizeText(req.body?.firstName, 120),
      lastName: sanitizeText(req.body?.lastName, 120),
      reason: sanitizeText(req.body?.reason, 120),
      message: sanitizeText(req.body?.message, 3000),
      source: sanitizeText(req.body?.source || "website", 60),
      status: "neu",
      adminNote: ""
    };

    if (
      !returnRequest.orderNumber ||
      !returnRequest.email ||
      !returnRequest.reason ||
      !returnRequest.message
    ) {
      return res.status(400).json({
        success: false,
        error: "Bitte fülle alle Pflichtfelder aus."
      });
    }

    const returns = readReturns();
    returns.unshift(returnRequest);
    writeReturns(returns);

    return res.json({
      success: true,
      message: "Rückgabeanfrage gespeichert."
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Rückgabeanfrage:", error);

    return res.status(500).json({
      success: false,
      error: "Rückgabeanfrage konnte nicht gespeichert werden."
    });
  }
});

/*
================================
ALLE RÜCKGABEANFRAGEN
================================
*/

app.get("/api/returns", (req, res) => {
  try {
    const returns = readReturns();
    res.json(sortNewestFirst(returns));
  } catch (error) {
    res.json([]);
  }
});

/*
================================
STORNIERUNGSANFRAGE SPEICHERN
================================
*/

app.post("/api/cancellations", (req, res) => {
  try {
    const cancellation = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: "stornierung",
      orderNumber: sanitizeText(req.body?.orderNumber, 120),
      email: sanitizeText(req.body?.email, 180),
      firstName: sanitizeText(req.body?.firstName, 120),
      lastName: sanitizeText(req.body?.lastName, 120),
      reason: sanitizeText(req.body?.reason, 120),
      message: sanitizeText(req.body?.message, 3000),
      source: sanitizeText(req.body?.source || "website", 60),
      status: "neu",
      adminNote: ""
    };

    if (
      !cancellation.orderNumber ||
      !cancellation.email ||
      !cancellation.reason ||
      !cancellation.message
    ) {
      return res.status(400).json({
        success: false,
        error: "Bitte fülle alle Pflichtfelder aus."
      });
    }

    const cancellations = readCancellations();
    cancellations.unshift(cancellation);
    writeCancellations(cancellations);

    return res.json({
      success: true,
      message: "Stornierungsanfrage gespeichert."
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Stornierungsanfrage:", error);

    return res.status(500).json({
      success: false,
      error: "Stornierungsanfrage konnte nicht gespeichert werden."
    });
  }
});

/*
================================
ALLE STORNIERUNGSANFRAGEN
================================
*/

app.get("/api/cancellations", (req, res) => {
  try {
    const cancellations = readCancellations();
    res.json(sortNewestFirst(cancellations));
  } catch (error) {
    res.json([]);
  }
});

/*
================================
ALLE KONTAKTANFRAGEN
================================
*/

app.get("/api/contacts", (req, res) => {
  try {
    const contacts = readContacts();
    res.json(sortNewestFirst(contacts));
  } catch (error) {
    res.json([]);
  }
});

/*
================================
KI CHATBOT
================================
*/

app.post("/api/chatbot", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY fehlt in der .env Datei."
      });
    }

    const userMessage = sanitizeText(req.body?.message, 2000);
    const currentPage = sanitizeText(req.body?.page, 200);
    const cookieSettings = req.body?.cookies || {};

    if (!userMessage) {
      return res.status(400).json({
        error: "Nachricht fehlt."
      });
    }

    const productsSummary = getProductSummaryForAi(40);

    const systemPrompt = `
Du bist der KI-Verkaufsassistent von Bandido & Cartel.

Deine Aufgaben:
- freundlich, hochwertig, klar und verkaufsstark antworten
- passende Produkte empfehlen, wenn sie in den bestätigten Produktdaten vorkommen
- keine Produkte erfinden
- bei Unsicherheit lieber ehrlich bleiben
- in kurzen, gut lesbaren Sätzen antworten
- den Nutzer Richtung Kauf, Produktempfehlung oder Kontakt führen, aber nicht aufdringlich
- bei Rückfragen zu Versand, Rückgabe, Widerruf und Kontakt korrekt antworten
- bei Kaufinteresse gern passende Zusatzprodukte oder passende Kategorien empfehlen
- bei starker Kaufabsicht sanft auf Bestellung, Shopseite oder Kontakt hinweisen
- wenn Kontakt sinnvoll ist, auf WhatsApp, Telefon oder E-Mail verweisen

Wichtige Shopdaten:
- Shopname: Bandido & Cartel
- Ansprechpartner Website: Jeremy Pongratz
- Impressum/Inhaber: Mandy Weigand
- E-Mail: bandido.cartel.germany@gmail.com
- WhatsApp: +49 1521 6220396
- Telefon: +49 1515 5612176
- Versandland: Deutschland
- Bearbeitungszeit: maximal 2 Werktage
- Lieferzeit: 3 bis 5 Werktage
- Rückgabe: ungeöffnete Produkte in Originalverpackung
- beschädigte Ware ohne Kundenverschulden: Gutschrift statt normaler Rückgabe
- Widerruf: 14 Tage ohne Angabe von Gründen

Aktuelle Seite:
${currentPage || "unbekannt"}

Cookie-Einstellungen:
${JSON.stringify(cookieSettings)}

Bestätigte Produktdaten:
${productsSummary}

Wichtige Regeln:
- Keine Rechtsberatung geben.
- Keine Heilversprechen oder medizinischen Aussagen erfinden.
- Keine Lagerbestände behaupten, wenn sie nicht bestätigt sind.
- Wenn konkrete Produktdaten fehlen, offen sagen, dass man die genaue Variante kurz prüfen sollte.
- Schreibe auf Deutsch.
- Maximal ungefähr 120 Wörter, außer der Nutzer fragt ausdrücklich nach mehr Details.
`.trim();

    const reply = await callOpenAIResponsesApi({
      systemPrompt,
      userMessage
    });

    return res.json({ reply });
  } catch (error) {
    console.error("Fehler im KI-Chatbot:", error);

    return res.status(500).json({
      error: "Die KI-Antwort konnte gerade nicht erzeugt werden."
    });
  }
});

/*
================================
STRIPE CHECKOUT SESSION ERSTELLEN
================================
*/

async function handleCreateCheckoutSession(req, res) {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe ist nicht konfiguriert. Bitte STRIPE_SECRET_KEY in der .env setzen."
      });
    }

    const validationError = validateCheckoutPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const order = buildNormalizedOrderFromCheckout(req.body);

    if (!order.items.length) {
      return res.status(400).json({
        error: "Es konnten keine gültigen Produkte verarbeitet werden."
      });
    }

    const lineItems = createLineItems(order.items, order.shipping);

    if (!lineItems.length) {
      return res.status(400).json({
        error: "Es konnten keine gültigen Zahlungspositionen erstellt werden."
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel.html`,
      customer_email: order.email,
      billing_address_collection: "required",
      client_reference_id: order.orderNumber,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        firstName: order.firstName,
        lastName: order.lastName,
        email: order.email,
        phone: order.phone,
        street: order.street,
        zip: order.zip,
        city: order.city,
        country: order.country,
        notes: order.notes,
        subtotal: order.subtotal.toFixed(2),
        shipping: order.shipping.toFixed(2),
        total: order.total.toFixed(2)
      }
    });

    const orders = readOrders();
    orders.unshift({
      ...order,
      stripeSessionId: session.id
    });
    writeOrders(orders);

    return res.json({
      url: session.url
    });
  } catch (error) {
    console.error("Fehler beim Erstellen der Stripe Checkout Session:", error);

    return res.status(500).json({
      error: "Checkout konnte nicht gestartet werden."
    });
  }
}

app.post("/api/create-checkout-session", handleCreateCheckoutSession);
app.post("/create-checkout-session", handleCreateCheckoutSession);

/*
================================
CHECKOUT SESSION LESEN
================================
*/

app.get("/api/checkout-session/:sessionId", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe ist nicht konfiguriert."
      });
    }

    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
      expand: ["line_items"]
    });

    return res.json({
      id: session.id,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      orderNumber: session.client_reference_id || "",
      metadata: session.metadata || {},
      amount_total: session.amount_total || 0,
      currency: session.currency || "eur",
      line_items: session.line_items?.data || []
    });
  } catch (error) {
    console.error("Fehler beim Laden der Checkout Session:", error);

    return res.status(500).json({
      error: "Checkout Session konnte nicht geladen werden."
    });
  }
});

/*
================================
ALLE BESTELLUNGEN
================================
*/

app.get("/api/orders", (req, res) => {
  try {
    const orders = readOrders();
    res.json(sortNewestFirst(orders));
  } catch (error) {
    console.error("Fehler beim Abrufen der Bestellungen:", error);
    res.status(500).json({ success: false, error: "Bestellungen konnten nicht geladen werden." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Service ist verfügbar", uptime: process.uptime() });
});

/*
================================
ALLE LEADS
================================
*/

app.get("/api/leads", (req, res) => {
  try {
    const leads = readLeads();
    res.json(sortNewestFirst(leads));
  } catch (error) {
    res.json([]);
  }
});

/*
================================
ADMIN API
================================
*/

app.get("/api/admin/orders", (req, res) => {
  try {
    const orders = readOrders();
    return res.json(sortNewestFirst(orders));
  } catch (error) {
    return res.json([]);
  }
});

app.patch("/api/admin/orders/:id", (req, res) => {
  return patchCollectionItem(req, res, {
    readFn: readOrders,
    writeFn: writeOrders,
    allowedStatuses: ["offen", "bezahlt", "versendet", "abgeschlossen", "storniert"]
  });
});

app.get("/api/admin/reklamationen", (req, res) => {
  try {
    const complaints = readComplaints();
    return res.json(sortNewestFirst(complaints));
  } catch (error) {
    return res.json([]);
  }
});

app.patch("/api/admin/reklamationen/:id", (req, res) => {
  return patchCollectionItem(req, res, {
    readFn: readComplaints,
    writeFn: writeComplaints,
    allowedStatuses: ["neu", "in Bearbeitung", "gelöst", "abgelehnt"]
  });
});

app.get("/api/admin/rueckgaben", (req, res) => {
  try {
    const returns = readReturns();
    return res.json(sortNewestFirst(returns));
  } catch (error) {
    return res.json([]);
  }
});

app.patch("/api/admin/rueckgaben/:id", (req, res) => {
  return patchCollectionItem(req, res, {
    readFn: readReturns,
    writeFn: writeReturns,
    allowedStatuses: ["neu", "geprüft", "genehmigt", "abgeschlossen", "abgelehnt"]
  });
});

app.get("/api/admin/stornierungen", (req, res) => {
  try {
    const cancellations = readCancellations();
    return res.json(sortNewestFirst(cancellations));
  } catch (error) {
    return res.json([]);
  }
});

app.patch("/api/admin/stornierungen/:id", (req, res) => {
  return patchCollectionItem(req, res, {
    readFn: readCancellations,
    writeFn: writeCancellations,
    allowedStatuses: ["neu", "bestätigt", "abgelehnt", "erledigt"]
  });
});

app.get("/api/admin/kontakte", (req, res) => {
  try {
    const contacts = readContacts();
    return res.json(sortNewestFirst(contacts));
  } catch (error) {
    return res.json([]);
  }
});

app.patch("/api/admin/kontakte/:id", (req, res) => {
  return patchCollectionItem(req, res, {
    readFn: readContacts,
    writeFn: writeContacts,
    allowedStatuses: ["neu", "beantwortet", "abgeschlossen"]
  });
});

/*
================================
SEO PRODUKT URLS
================================
*/

app.get("/produkt/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

/*
================================
404 FALLBACK
================================
*/

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

/*
================================
SERVER STARTEN
================================
*/

ensureDataFiles();

app.listen(PORT, () => {
  console.log("Server läuft auf:");
  console.log(BASE_URL);
});