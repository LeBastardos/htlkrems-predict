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


## Endpoints (aktuell)

Hinweis: API hat den Prefix `/api/v1` (z. B. `/api/v1/markets/active`). Einige Endpoints sind derzeit Platzhalter‑Implementierungen (In‑Memory) und sollten für Produktion noch auf DB‑Transaktionen migriert werden.

### 👤 Auth & User (Robin)

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/auth/login` | GET | Startet Microsoft OAuth (Redirect zur Microsoft Login-Seite) |
| `/api/v1/auth/callback` | POST | Microsoft OAuth Callback → Tauscht Code für JWT (Platzhalter/zu implementieren) |
| `/api/v1/user/me` | GET | Profil des angemeldeten Users (Name, Email, Balance, Role) |
| `/api/v1/user/me/settings` | PATCH | Nutzer‑Einstellungen (z. B. Opt‑out) |

---

### 🧮 Wallet & Bets (Artorius)

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/bet/place` | POST | Platziert eine Wette: prüft Balance, zieht Coins ab, erstellt Bet (aktuell In‑Memory) |
| `/api/v1/bet/me` | GET | Listet die eigenen Wetten des angemeldeten Users |
| `/api/v1/bet/{bet_id}` | GET | Detailansicht einer Wette (nur Besitzer/Admin) |
| `/api/v1/wallet/balance/{user_id}` | GET | Liefert aktuellen Kontostand (`{ "user_id":..., "balance": ... }`) |
| `/api/v1/wallet/me` | GET | Liefert den Kontostand des angemeldeten Users |
| `/api/v1/wallet/claim-daily/{user_id}` | POST | Beansprucht Daily Bonus (aktuell ohne Rate‑Limit) |
| `/api/v1/wallet/me/claim-daily` | POST | Daily Bonus für den angemeldeten User |
| `/api/v1/wallet/history/{user_id}` | GET | Transaktions‑History (Platzhalter, aktuell leer) |
| `/api/v1/wallet/me/history` | GET | Transaktions‑History des angemeldeten Users |

Wichtig: In einer produktiven Implementierung muss `place` atomar erfolgen: prüfe Balance → ziehe ab → schreibe Bet + Transaction.

---

### 🌐 Markets & Admin (Leonhard)

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `/api/v1/markets/active` | GET | Liste aller offenen Märkte mit aktuellen Quoten |
| `/api/v1/markets/{market_id}` | GET | Details zu einem bestimmten Markt |
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
