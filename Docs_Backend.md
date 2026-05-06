# Projektstruktur:

backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI Startpunkt & App-Konfiguration
│   ├── core/                   # Bereich A: Zentrale Config & Sicherheit
│   │   ├── config.py           # Umgebungsvariablen (.env Laden)
│   │   ├── auth.py             # MSAL Logik & JWT Generierung
│   │   └── security.py         # Passwort/Token Utilities
│   ├── db/                     # Bereich A: Datenbank-Ebene
│   │   ├── session.py          # MySQL Verbindung & Engine
│   │   ├── models.py           # SQLAlchemy Tabellen (User, Bet, Prediction)
│   │   └── base.py             # Sammelpunkt für Alembic/Migrations
│   ├── services/               # Bereich B: Business Logic & Mathe
│   │   ├── wallet.py           # Coin-Logik (Atomic Updates, Balance)
│   │   ├── calculator.py       # Quoten-Berechnung & Payout-Logik
│   │   └── market_service.py   # Logik für Markterstellung/-abschluss
│   ├── api/                    # Bereich C: REST Endpoints
│   │   ├── router.py           # Zentraler Router-Sammelpunkt
│   │   ├── endpoints/
│   │   │   ├── auth.py         # Login/Callback Routen
│   │   │   ├── users.py        # Profil & Balance
│   │   │   └── markets.py      # Wetten erstellen & abgeben
│   │   └── websocket.py        # Bereich C: Real-Time Broadcast
│   └── schemas/                # Daten-Validierung (Pydantic Models)
│       ├── user.py
│       ├── bet.py
│       └── prediction.py
├── tests/                      # Test-Skripte
├── logs/                       # Zentrales Logging Verzeichnis
├── docker-compose.yml          # Docker Setup (MySQL & Backend)
├── init.sql                    # Datenbank Initialisierung
├── requirements.txt            # Python Libraries
└── .env                        # Secrets (MS Client ID, DB Passwords)
└── .env.example                # Template for .env



# Endpoints


### 👤 Bereich A: Authentifizierung & Profile (Verantwortlich: Robin)

| Endpunkt | Methode | Sender | Empfänger | Beschreibung |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/callback` | **POST** | Jakob (Frontend) | Robin (Auth) | Tauscht den Microsoft-Code gegen ein JWT-Token ein. Prüft `@htl-krems.ac.at`. |
| `/user/me` | **GET** | Jakob | Robin (DB) | Gibt das Profil des angemeldeten Users zurück (Name, Coins, Rolle). |
| `/user/me/settings` | **PATCH** | Jakob | Robin (DB) | Ändert Einstellungen, z. B. den Opt-Out Status (`allow_as_subject`). |
| `/admin/users` | **GET** | Admin-Panel | Robin (DB) | Liste aller registrierten User für die Verwaltung (nur Admins). |

---

### 🧮 Bereich B: Wallet & Mathe (Verantwortlich: Artorius)

| Endpunkt | Methode | Sender | Empfänger | Beschreibung |
| :--- | :--- | :--- | :--- | :--- |
| `/bet/place` | **POST** | Jakob | Artorius (Math) | Platziert einen Tipp. **Input:** `market_id`, `amount`, `choice`. **Logik:** Prüft Guthaben, zieht Coins ab, erstellt Wette. |
| `/wallet/history` | **GET** | Jakob | Artorius (DB) | Zeigt alle vergangenen Transaktionen (Gewinne, Verluste, Daily Claims). |
| `/wallet/claim-daily` | **POST** | Jakob | Artorius (Math) | Schüttet einmal pro Tag Gratis-Coins aus (Bonus-System). |

---

### 🌐 Bereich C: Märkte & Admin (Verantwortlich: Leonhard)

| Endpunkt | Methode | Sender | Empfänger | Beschreibung |
| :--- | :--- | :--- | :--- | :--- |
| `/markets/active` | **GET** | Jakob | Leonhard (API) | Gibt alle derzeit wettbaren Ereignisse inklusive aktueller Quoten zurück. |
| `/markets/{id}/history` | **GET** | Jakob | Leonhard (API) | Liefert Daten für den Quotenverlauf-Graphen im Frontend. |
| `/admin/create` | **POST** | Admin-Panel | Leonhard (API) | Erstellt eine neue Wette. **Input:** Titel, Beschreibung, End-Datum. |
| `/admin/resolve` | **POST** | Admin-Panel | Artorius/Leonhard | Schließt eine Wette ab. **Input:** `outcome` (Ja/Nein). **Trigger:** Berechnet Gewinne und zahlt aus. |
| `/admin/markets/{id}` | **DELETE** | Admin-Panel | Leonhard (API) | Löscht eine fehlerhafte Wette (bevor Einsätze getätigt wurden). |

---

### 📡 Echtzeit-Kommunikation (Optionaler Bonus)

| Endpunkt | Typ | Sender | Empfänger | Beschreibung |
| :--- | :--- | :--- | :--- | :--- |
| `/ws/updates` | **WebSocket** | Backend | Alle Clients | Sendet bei jeder Wettabgabe die neuen Quoten an alle Browser ("Broadcast"). |

---

### 📋 Dokumentation der Daten-Strukturen (Daten-Modelle)

Damit ihr wisst, wie die JSON-Pakete aussehen müssen, hier die wichtigsten 3 Objekte:

#### 1. User Objekt
```json
{
  "id": "string (UUID)",
  "name": "string",
  "email": "string",
  "balance": 1000,
  "role": "user | trustee | admin",
  "opt_out": false
}
```

#### 2. Market Objekt (Wette)
```json
{
  "id": 101,
  "title": "Gewinnt die 3BHIT?",
  "description": "Sportfest Finale",
  "total_pool": 5000,
  "odds": { "yes": 1.5, "no": 2.8 },
  "status": "open | closed | resolved",
  "ends_at": "2026-06-15T12:00:00"
}
```

#### 3. Prediction Objekt (Einsatz)
```json
{
  "id": 5001,
  "user_id": "uuid-123",
  "market_id": 101,
  "amount": 200,
  "choice": "yes",
  "timestamp": "2026-04-24T14:30:00"
}
```