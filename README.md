# Bandido & Cartel – Premium Grooming Shop

Ein vollständiger Onlineshop für Bandido & Cartel Grooming-Produkte, gebaut mit Node.js und Express.

## Features

- **Produktshop** mit Kategorien: Bartöl, Wax, Pomade, Aftershave, Haarpflege, Styling, Zubehör
- **Warenkorb** mit localStorage-Persistenz
- **Checkout** mit Stripe-Zahlungsabwicklung
- **Bestellverfolgung** für Kunden
- **KI-Chatbot** (OpenAI) für Produktberatung
- **Admin-Bereich** für Bestell- und Kundenverwaltung
- **Kundenseitige Formulare**: Kontakt, Reklamation, Rückgabe, Stornierung
- **FAQ-Seite** mit häufig gestellten Fragen
- **Responsive Design** für alle Geräte

## Voraussetzungen

- Node.js >= 18
- Ein [Stripe](https://stripe.com)-Konto (für Zahlungen)
- Ein [OpenAI](https://openai.com)-API-Key (optional, für den Chatbot)

## Installation

```bash
# 1. Repository klonen
git clone https://github.com/bandidocartelgermany-beep/bandido-cartel.git
cd bandido-cartel

# 2. Abhängigkeiten installieren
npm install

# 3. Umgebungsvariablen einrichten
cp .env.example .env
# .env öffnen und Stripe-Key sowie OpenAI-Key eintragen

# 4. Server starten
npm start
```

Der Shop ist dann unter `http://localhost:3000` erreichbar.

## Umgebungsvariablen (`.env`)

| Variable           | Beschreibung                              | Pflicht |
|--------------------|-------------------------------------------|---------|
| `STRIPE_SECRET_KEY`| Stripe Secret Key (aus dem Dashboard)     | Ja      |
| `OPENAI_API_KEY`   | OpenAI API Key für den Chatbot            | Nein    |
| `BASE_URL`         | Öffentliche URL des Shops                 | Ja      |
| `PORT`             | Port des Servers (Standard: 3000)         | Nein    |

## Projektstruktur

```
bandido-cartel/
├── public/           # Statische Frontend-Dateien (HTML, CSS, JS, Bilder)
│   ├── index.html    # Startseite
│   ├── shop.html     # Shop-Übersicht
│   ├── product.html  # Produktdetailseite
│   ├── cart.html     # Warenkorb
│   ├── checkout.html # Kasse
│   ├── success.html  # Bestellbestätigung
│   ├── admin/        # Admin-Bereich
│   ├── images/       # Produktbilder
│   └── products.json # Produktdaten (öffentlich)
├── data/             # Backend-Datendateien (nicht öffentlich zugänglich)
│   ├── products.json # Produktdaten
│   ├── orders.json   # Bestellungen (runtime, in .gitignore)
│   ├── faq.json      # FAQ-Einträge
│   ├── coupons.json  # Gutscheine
│   ├── settings.json # Shop-Einstellungen
│   └── reviews.json  # Bewertungen
├── js/               # Zusätzliche Frontend-JS-Dateien
├── server.js         # Express-Server (Backend)
├── package.json      # Node.js-Abhängigkeiten
├── .env.example      # Beispiel für Umgebungsvariablen
└── README.md         # Diese Datei
```

## API-Endpunkte

| Methode | Pfad                              | Beschreibung                        |
|---------|-----------------------------------|-------------------------------------|
| POST    | `/api/create-checkout-session`    | Stripe-Checkout-Session erstellen   |
| GET     | `/api/checkout-session/:id`       | Checkout-Session abrufen            |
| POST    | `/api/order`                      | Bestellung speichern                |
| GET     | `/api/orders`                     | Alle Bestellungen abrufen           |
| POST    | `/api/order-status`               | Bestellstatus für Kunden            |
| POST    | `/api/orders/mark-paid`           | Bestellung als bezahlt markieren    |
| POST    | `/api/contact`                    | Kontaktanfrage speichern            |
| POST    | `/api/complaints`                 | Reklamation speichern               |
| POST    | `/api/returns`                    | Rückgabeanfrage speichern           |
| POST    | `/api/cancellations`              | Stornierungsanfrage speichern       |
| POST    | `/api/leads`                      | Lead speichern                      |
| POST    | `/api/chatbot`                    | KI-Chatbot-Anfrage                  |
| GET     | `/api/health`                     | Health-Check                        |
| GET     | `/api/admin/*`                    | Admin-APIs                          |

## Kontakt

- **Shop**: Bandido & Cartel
- **E-Mail**: bandido.cartel.germany@gmail.com
- **WhatsApp**: +49 1521 6220396
- **Telefon**: +49 1515 5612176
