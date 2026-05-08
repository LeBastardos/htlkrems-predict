Hier ist definiert, wer die verantwortung für welche files hat. Das heißt nicht, dass nur diese person darin arbeiten darf, aber diese person ist dafür verantwortlich dass in der datei alles funktioniert.

backend/
├── app/
│   ├── main.py                 >> Leonhard (Zentraler Einstiegspunkt)
│   ├── __init__.py
│   │
│   ├── core/                   >> ROBIN (Bereich A)
│   │   ├── config.py           (Config & Env)
│   │   ├── auth.py             (MSAL & JWT)
│   │   └── security.py         (Passwort-Hashing)
│   │
│   ├── db/                     >> ROBIN (Bereich A)
│   │   ├── session.py          (Datenbank-Verbindung)
│   │   ├── models.py           (SQLAlchemy Tabellen)
│   │   └── base.py             (Migrations-Sammelpunkt)
│   │
│   ├── services/               >> ARTORIUS & LEONHARD
│   │   ├── wallet.py           >> Artorius (Bereich B: Coin-Logik)
│   │   ├── calculator.py       >> Artorius (Bereich B: Quoten-Mathe)
│   │   └── market_service.py   >> Leonhard (Bereich C: Admin-Aktionen)
│   │
│   ├── api/                    >> LEONHARD (Bereich C / Koordination)
│   │   ├── router.py           (Zentrales Routing)
│   │   ├── websocket.py        (Real-Time Broadcast)
│   │   └── endpoints/
│   │       ├── auth.py         >> Robin (Login Logik)
│   │       ├── users.py        >> Robin (Profil Logik)
│   │       └── markets.py      >> Leonhard & Artorius (Wetten & Märkte)
│   │
│   └── schemas/                >> ALLE (Datenvalidierung)
│       ├── user.py             >> Robin
│       ├── bet.py              >> Artorius
│       └── prediction.py       >> Artorius
│
├── tests/                      >> Alle (Jeder testet seinen Bereich)
├── logs/                       >> System
├── docker-compose.yml          >> Robin / Leonhard (Infrastruktur)
├── init.sql                    >> Robin (DB-Setup)
├── requirements.txt            >> Alle (Library Management)
└── .env                        >> Alle (Secrets & Keys)