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

🏗️ Block A: Infrastruktur & Sicherheit

Paket 1: Identity & Auth Service (Azure AD)

    Aufgabe: Integration des Microsoft-Logins (OpenID Connect).

    Details: Token-Validierung implementieren, User beim ersten Login in der eigenen MySQL-DB anlegen.

    Ziel: Ein UserService, der dem Rest der App sagt, wer gerade eingeloggt ist und welche Rolle (Admin, Trusted, User) er hat.

Paket 2: Database Access Layer (DAL) & Logging

    Aufgabe: Das Grundgerüst der Datenbank und der Zugriff darauf.

    Details: Entity Framework Core (oder Dapper) Setup. Erstellen der Repositories für Users, Bets und Markets.

    Ziel: Ein zentrales AuditLog, das jede Kontobewegung mitschreibt (Sicherheit gegen Manipulation).

💰 Block B: Die "Money" Logik (Das Herzstück)

Paket 3: Wallet & Coin Engine

    Aufgabe: Verwaltung der Kontostände.

    Details: Funktionen für AddCoins, SubtractCoins und den DailyClaim.

    Wichtig: Implementierung von Datenbank-Transaktionen, damit bei einem Server-Fehler während einer Wette keine Coins "verpuffen".

Paket 4: Prediction & Calculation Engine

    Aufgabe: Die Mathematik hinter den Wetten.

    Details: Logik zur Berechnung der aktuellen Quoten basierend auf dem Gesamt-Pool. Formel zur Gewinnverteilung (Totalisator-Prinzip) entwickeln, wenn eine Wette aufgelöst wird.

    Ziel: Ein Service, der nach Abschluss einer Wette automatisch die Gewinne an alle Sieger ausschüttet.

🎮 Block C: Markt-Management & Real-Time

Paket 5: Market Life-Cycle Management

    Aufgabe: Erstellung und Ablaufsteuerung von Wetten.

    Details: CRUD-Funktionen für Wetten. Logik für das Ablaufdatum (Check: "Ist die Wette noch offen?").

    Feature: System für wiederkehrende Wetten (z.B. ein Background-Task, der jeden Montag die "Leberkas-Wette" neu klont).

Paket 6: Real-Time Communication Hub (SignalR)

    Aufgabe: Live-Updates ohne Browser-Refresh.

    Details: Ein SignalR-Hub, der jedes Mal, wenn eine Wette platziert wird, die neuen Quoten an alle verbundenen Clients pusht.

    Ziel: Das "Live-Gefühl". Wenn Artorius 1000 Coins setzt, sieht Jakob sofort den Balken im Frontend wandern.









## WICHTIG UMSETZUNG

Mergen:
    Experimental: (zum ersten Mergen und Testen)
    Main: nur bei Absprache Mergen.

Commit:
    Vorgefertigt:

    
