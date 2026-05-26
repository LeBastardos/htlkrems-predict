-- 1. Tabelle für Benutzer
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 1000.00,
    role VARCHAR(20) NOT NULL,
    CONSTRAINT check_user_role CHECK (role IN ('user', 'trustee', 'admin'))
);

-- 2. Tabelle für Märkte
CREATE TABLE IF NOT EXISTS markets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    winning_outcome_id INT NULL
);

-- 3. Tabelle für Optionen
CREATE TABLE IF NOT EXISTS outcomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    current_price DECIMAL(5, 2) DEFAULT 0.50,
    FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
);

-- Foreign Key für Gewinner-Outcome
ALTER TABLE markets 
ADD CONSTRAINT fk_winning_outcome 
FOREIGN KEY (winning_outcome_id) REFERENCES outcomes(id) ON DELETE SET NULL;

-- 4. Tabelle für Anteile, die User besitzen
CREATE TABLE IF NOT EXISTS user_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    outcome_id INT NOT NULL,
    quantity INT DEFAULT 0,
    UNIQUE KEY unique_user_outcome (user_id, outcome_id), -- Verhindert doppelte Einträge für denselben User + Outcome
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outcome_id) REFERENCES outcomes(id) ON DELETE CASCADE
);

-- 5. Optionale Transaktionshistorie
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    outcome_id INT NOT NULL,
    type VARCHAR(10) NOT NULL,
    quantity INT NOT NULL,
    price_per_share DECIMAL(5, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_tx_type CHECK (type IN ('BUY', 'SELL')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outcome_id) REFERENCES outcomes(id) ON DELETE CASCADE
);