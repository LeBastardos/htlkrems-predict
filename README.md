# htlkrems-predict
a mini polymarket for HTL krems

# Poly Market Aufgaben 

 

 

## Jakob: Blazer Front End:  

Start seite 

Einzelansicht (Wettansicht)

Sign Up / Login Fenster 

Admin Fenster: Erstellen / Wetten auflösen Fenster 

 
## LOGIK
  

Coins: (1 Aufgabe)

LOGIK: Coin System, Daily Free Coins, MYSQL gespecheiert 

LOGIK: Wetten, Coins Setzten, aus dem wallet raus 

LOGIK: prediction auszahlung, gewinn berechnen, coins rausnhemen und speichern im acc 

 
Wette: (1 Aufgabe)

LOGIK: neue Wette erstellen 

LOGIK: Wetten % setzten 

LOGIK: wetten Ablaufs Datum 

LOGIK: wiederkehrende Wetten 


## User Management 

User Verwaltung:  (1ne große Aufgabe)

Rollen: Admin (User verwaltungs Fenster, controlle über user), Thrusted: Darf erstellen und auflösen 




Microsoft Login : Azure AD: ?! (1ne Aufgabe)

 

## Optional
 

Ideen: 

(mini live chat) 

(wett log) 

(leader Board) 

## Arbeitspakete (Blöcke):

👤 Bereich A: Auth & Infrastructure

AP 1: Authentication & User Management (OAuth2)

    Technik: FastAPI/Flask mit MSAL Python (Microsoft Authentication Library).

    Details: Integration des Microsoft Logins. Wenn der User zurückkommt, prüfst du die @htlkrems.at Domain.

    Aufgabe: User-Profil in der DB anlegen/laden und ein JWT (JSON Web Token) für das Frontend generieren, damit Jakob weiß, wer eingeloggt ist.

AP 2: Database Layer & Logging (ORM)

    Technik: MySQL

    Details: Erstellen der Tabellen-Modelle (User, Bet, Prediction).

    Optional: Einen zentralen Logger bauen, der jede Wett-Aktion speichert. Das ist eure "Versicherung", falls jemand behauptet, seine Coins seien verschwunden.


🧮 Bereich B: Business Logic & Mathe

AP 3: Coin & Wallet Engine (DB Seitig)

    Technik: Python-Logik mit DB-Transactions.

    Details: Endpoints für GET /balance und POST /claim-daily.

    Wichtig: Eine "Atomic Update" Funktion schreiben. Wenn ein User eine Wette platziert, muss in einer Transaktion geprüft werden: Guthaben >= Einsatz -> Abzug Guthaben -> Eintrag Wette.

AP 4: Prediction & Payout Logic

    Technik: Python Math / NumPy.

    Details: Die Kern-Logik: Wie verändern sich die Quoten (Odds), wenn X Coins auf "Ja" gesetzt werden?

    Aufgabe: Die Auszahlungsfunktion. Wenn ein Admin die Wette auf "Ja" setzt, muss das Skript berechnen: Gewinn=Pool der GewinnerGesamtpool​×Einsatz.


🌐 Bereich C: API & Real-Time

AP 5: Market & Admin API

    Technik: REST API Endpoints.

    Details: Alles, was im Frontend angezeigt werden muss. GET /markets/active, POST /markets/create (nur für Admins/Trusted).

    Aufgabe: Validierung der Inputs (z.B. verhindern, dass ein Enddatum in der Vergangenheit liegt).

AP 6 (Optional): Real-Time Updates (WebSockets)

    Technik: Flask-SocketIO oder FastAPI WebSockets.

    Details: Sobald die Logik eine Wette verarbeitet hat, musst du ein Event an alle Clients "broadcasten".

    Ziel: Das Frontend bekommt sofort ein Signal {"type": "update", "market_id": 1, "new_odds": 0.75} und kann die Anzeige live ändern, ohne dass die Seite neu geladen wird.









## WICHTIG UMSETZUNG

Mergen:
    Experimental: (zum ersten Mergen und Testen)
    Main: nur bei Absprache Mergen.

Commit:
    Vorgefertigt:

    THEMA/NUMMERIERUNG

    BERREICH/Thema/1.1
