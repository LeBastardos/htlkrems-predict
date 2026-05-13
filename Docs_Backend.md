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
│       └── market.py
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
| `/wette/place` | **POST** | Jakob | Artorius (Math) | Platziert einen Tipp. **Input:** `market_id`, `amount`, `choice`. **Logik:** Prüft Guthaben, zieht Coins ab, erstellt Wette. |
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
| `/api/v1/ws/updates` | **WebSocket** | Backend | Alle Clients | Sendet bei jeder Wettabgabe die neuen Quoten an alle Browser ("Broadcast"). |

## Hinweise zum aktuellen Implementierungsstand
- Einige Endpoints (z. B. `wette` und `wallet`) sind als In‑Memory Platzhalter implementiert, damit Frontend-Entwicklung und Integration möglich sind. Diese müssen für Produktion auf DB‑Transaktionen migriert werden.
- `market`-Modelle wurden auf `SQLModel` umgestellt; `backend/app/db/models.py` importiert die Tabelle.

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

## Endpoints (aktuell)

Hinweis: API hat den Prefix `/api/v1` (z. B. `/api/v1/markets/active`). Einige Endpoints sind derzeit Platzhalter‑Implementierungen (In‑Memory) und sollten für Produktion noch auf DB‑Transaktionen migriert werden.

### 👤 Auth & User (Robin)

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/auth/callback` | POST | Microsoft OAuth Callback → Tauscht Code für JWT (Platzhalter/zu implementieren) |
| `/api/v1/user/me` | GET | Profil des angemeldeten Users (Name, Email, Balance, Role) |
| `/api/v1/user/me/settings` | PATCH | Nutzer‑Einstellungen (z. B. Opt‑out) |

---

### 🧮 Wallet & Bets (Artorius)

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/bet/place` | POST | Platziert eine Wette: prüft Balance, zieht Coins ab, erstellt Bet (aktuell In‑Memory) |
| `/api/v1/wallet/balance/{user_id}` | GET | Liefert aktuellen Kontostand (`{ "user_id":..., "balance": ... }`) |
| `/api/v1/wallet/claim-daily/{user_id}` | POST | Beansprucht Daily Bonus (aktuell ohne Rate‑Limit) |
| `/api/v1/wallet/history/{user_id}` | GET | Transaktions‑History (Platzhalter, aktuell leer) |

Wichtig: In einer produktiven Implementierung muss `place` atomar erfolgen: prüfe Balance → ziehe ab → schreibe Bet + Transaction.

---

### 🌐 Markets & Admin (Leonhard)

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/markets/active` | GET | Liste aller offenen Märkte mit aktuellen Quoten |
| `/api/v1/markets/{market_id}/history` | GET | Quoten‑Historie eines Marktes |
| `/api/v1/markets/admin/create` | POST | Admin: neuen Markt anlegen |
| `/api/v1/markets/admin/resolve` | POST | Admin: Markt auflösen (Input: outcome) → Payouts berechnen |
| `/api/v1/markets/admin/{market_id}` | DELETE | Admin: Markt löschen (nur wenn noch keine Einsätze) |

---

### 📡 Echtzeit / WebSocket

| Endpunkt | Typ | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/ws/updates` | WebSocket | Server → Clients: Broadcasts bei Markt‑Änderungen / neuen Einsätzen. Verwende `backend/app/api/websocket.py:notify_market_update` zum Senden. |

---

### 📋 Daten‑Modelle (Kurzreferenz)

1) User (Kurzform)

```json
{
  "id": "string (UUID)",
  "name": "string",
  "email": "string",
  "balance": 1000.0,
  "role": "user | trustee | admin",
  "opt_out": false
}
```

2) Market (Kurzform)

```json
{
  "id": 101,
  "title": "Gewinnt die 3BHIT?",
  "description": "Sportfest Finale",
  "current_pool": 5000.0,
  "odds": { "yes": 1.5, "no": 2.8 },
  "status": "OPEN | CLOSED | RESOLVED",
  "end_date": "2026-06-15T12:00:00"
}
```

3) Bet/Prediction (Kurzform)

```json
{
  "id": 5001,
  "user_id": "uuid-123",
  "market_id": 101,
  "amount": 200.0,
  "choice": "yes|no",
  "timestamp": "2026-04-24T14:30:00"
}
```

Hinweis: Für Wallet‑APIs sind `BalanceResponse` und `Transaction`‑Schemas empfohlen (soll ich anlegen?).