/**
 * HTL Krems Predict — Frontend Logic
 * Verbindet sich mit dem FastAPI-Backend unter /api/v1
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api/v1";

// ─── State ────────────────────────────────────────────────────────────────────
let authToken = localStorage.getItem("authToken") || null;
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
let activeMarkets = [];
let currentMarketForBet = null;
let currentMarketForResolve = null;
let wsConnection = null;

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }
    const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!resp.ok) {
        const body = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(body.detail || resp.statusText);
    }
    return resp.status === 204 ? null : resp.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function login(email, name) {
    const params = new URLSearchParams({ email });
    if (name) params.append("name", name);
    const data = await apiFetch(`/auth/dev-login?${params}`, { method: "POST" });
    authToken = data.access_token;
    currentUser = data.user;
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    onLoginSuccess();
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    onLogout();
}

function onLoginSuccess() {
    document.getElementById("authButtons").style.display = "none";
    document.getElementById("userArea").style.display = "";
    document.getElementById("userNameLabel").textContent = currentUser.name;
    updateBalanceDisplay(currentUser.balance);

    if (currentUser.role === "admin" || currentUser.role === "trustee") {
        document.getElementById("navAdmin").style.display = "";
        document.getElementById("openCreateMarketBtn").style.display = "";
    }

    closeAllModals();
    loadUserData();
    loadLeaderboard();
    connectWebSocket();
}

function onLogout() {
    document.getElementById("authButtons").style.display = "";
    document.getElementById("userArea").style.display = "none";
    document.getElementById("navAdmin").style.display = "none";
    document.getElementById("openCreateMarketBtn").style.display = "none";
    document.getElementById("statBalance").textContent = "–";
    document.getElementById("statMyBets").textContent = "–";
    document.getElementById("statRank").textContent = "–";
    document.getElementById("myBetsList").innerHTML = "<li class='text-muted small'>Einloggen um Wetten zu sehen</li>";
    if (wsConnection) wsConnection.close();
}

function updateBalanceDisplay(balance) {
    const fmt = Math.floor(balance).toLocaleString("de-AT");
    document.getElementById("balanceBadge").textContent = `${fmt} Coins`;
    document.getElementById("statBalance").textContent = `${fmt} Coins`;
}

async function claimDailyBonus() {
    const btn = document.getElementById("claimDailyBtn");
    btn.disabled = true;
    try {
        const data = await apiFetch("/wallet/claim-daily", { method: "POST" });
        currentUser.balance = data.new_balance;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        updateBalanceDisplay(data.new_balance);
        showToast(`✅ +${data.coins_added} Coins täglicher Bonus!`, "success");
    } catch (err) {
        showToast(`⏰ ${err.message}`, "warning");
    } finally {
        btn.disabled = false;
    }
}

async function loadUserData() {
    if (!authToken) return;
    try {
        const profile = await apiFetch("/user/me");
        currentUser = { ...currentUser, ...profile };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        updateBalanceDisplay(currentUser.balance);

        const bets = await apiFetch("/user/me/bets");
        document.getElementById("statMyBets").textContent = bets.length;
        renderMyBets(bets);
    } catch (_) { /* ignore */ }
}

// ─── Markets ──────────────────────────────────────────────────────────────────
async function loadMarkets() {
    const el = document.getElementById("marketsList");
    el.innerHTML = `<div class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2"></div>Wird geladen…</div>`;
    try {
        activeMarkets = await apiFetch("/markets/active");
        document.getElementById("statActiveMarkets").textContent = activeMarkets.length;
        renderMarketsList(activeMarkets);
    } catch (err) {
        el.innerHTML = `<div class="alert alert-warning">Fehler: ${err.message}</div>`;
    }
}

function renderMarketsList(markets) {
    const el = document.getElementById("marketsList");
    const searchVal = document.getElementById("search").value.toLowerCase();
    const filtered = markets.filter(m =>
        m.title.toLowerCase().includes(searchVal) ||
        (m.description || "").toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        el.innerHTML = `<div class="text-center py-4 text-muted">
            ${markets.length === 0 ? "Noch keine aktiven Märkte." : "Keine Märkte für diese Suche."}
        </div>`;
        return;
    }

    el.innerHTML = filtered.map(m => `
        <div class="market-card" data-market-id="${m.id}" onclick="openMarketDetail(${m.id})">
            <div class="market-card-header">
                <span class="fw-semibold">${escapeHtml(m.title)}</span>
                <span class="badge bg-${m.status === 'OPEN' ? 'success' : 'secondary'}">${m.status}</span>
            </div>
            <div class="market-card-body">
                <div class="odds-bar">
                    <div class="odds-yes-bar" style="width: ${(m.odds_yes * 100).toFixed(0)}%">
                        Ja ${(m.odds_yes * 100).toFixed(1)}%
                    </div>
                    <div class="odds-no-bar" style="width: ${(m.odds_no * 100).toFixed(0)}%">
                        Nein ${(m.odds_no * 100).toFixed(1)}%
                    </div>
                </div>
                <div class="d-flex justify-content-between text-muted small mt-1">
                    <span>Pool: ${Math.floor(m.current_pool).toLocaleString("de-AT")} Coins</span>
                    <span>Endet: ${formatDate(m.end_date)}</span>
                </div>
            </div>
        </div>
    `).join("");
}

function openMarketDetail(marketId) {
    const market = activeMarkets.find(m => m.id === marketId);
    if (!market) return;

    document.getElementById("marketsList").style.display = "none";
    document.getElementById("marketDetail").style.display = "";

    document.getElementById("detailTitle").textContent = market.title;
    document.getElementById("detailDesc").textContent = market.description || "";
    document.getElementById("detailOddsYes").textContent = `${(market.odds_yes * 100).toFixed(1)}%`;
    document.getElementById("detailOddsNo").textContent = `${(market.odds_no * 100).toFixed(1)}%`;
    document.getElementById("detailPoolYes").textContent = `Pool: ${Math.floor(market.pool_yes).toLocaleString("de-AT")} Coins`;
    document.getElementById("detailPoolNo").textContent = `Pool: ${Math.floor(market.pool_no).toLocaleString("de-AT")} Coins`;
    document.getElementById("detailPool").textContent = `${Math.floor(market.current_pool).toLocaleString("de-AT")}`;
    document.getElementById("detailEndDate").textContent = `Endet: ${formatDate(market.end_date)}`;

    const statusBadge = document.getElementById("detailStatus");
    statusBadge.textContent = market.status;
    statusBadge.className = `badge bg-${market.status === "OPEN" ? "success" : "secondary"}`;

    const betArea = document.getElementById("detailBetArea");
    const resolveBtn = document.getElementById("detailResolveBtn");
    if (market.status === "OPEN") {
        betArea.style.display = "";
        if (currentUser && (currentUser.role === "admin" || currentUser.role === "trustee")) {
            resolveBtn.style.display = "";
            resolveBtn.onclick = () => openResolveModal(market);
        } else {
            resolveBtn.style.display = "none";
        }
    } else {
        betArea.style.display = "none";
    }

    document.getElementById("detailBetYesBtn").onclick = () => openBetModal(market, true);
    document.getElementById("detailBetNoBtn").onclick = () => openBetModal(market, false);
    document.getElementById("marketsSubtitle").textContent = market.title;
}

function backToMarkets() {
    document.getElementById("marketsList").style.display = "";
    document.getElementById("marketDetail").style.display = "none";
    document.getElementById("marketsSubtitle").textContent = "Wähle einen Markt aus";
}

// ─── Bet Modal ────────────────────────────────────────────────────────────────
function openBetModal(market, choice) {
    if (!currentUser) {
        openModal("loginModal");
        return;
    }
    currentMarketForBet = { market, choice };
    document.getElementById("betModalTitle").textContent = `Wette: ${choice ? "Ja" : "Nein"} — ${market.title}`;
    document.getElementById("betMarketDesc").textContent = market.description || "";
    document.getElementById("betOddsYesVal").textContent = `${(market.odds_yes * 100).toFixed(1)}%`;
    document.getElementById("betOddsNoVal").textContent = `${(market.odds_no * 100).toFixed(1)}%`;
    document.getElementById("betError").classList.add("d-none");
    document.getElementById("betSuccess").classList.add("d-none");
    document.getElementById("betAmount").value = "50";

    document.getElementById("betYesBtn").onclick = () => submitBet(true);
    document.getElementById("betNoBtn").onclick = () => submitBet(false);

    openModal("betModal");
}

async function submitBet(choice) {
    if (!currentMarketForBet) return;
    const amount = parseFloat(document.getElementById("betAmount").value);
    if (isNaN(amount) || amount <= 0) {
        showInModal("betError", "Bitte einen gültigen Betrag eingeben.");
        return;
    }

    const errEl = document.getElementById("betError");
    const sucEl = document.getElementById("betSuccess");
    errEl.classList.add("d-none");
    sucEl.classList.add("d-none");

    try {
        await apiFetch("/bet/place", {
            method: "POST",
            body: JSON.stringify({
                market_id: currentMarketForBet.market.id,
                amount,
                choice,
            }),
        });
        const choiceLabel = choice ? "Ja" : "Nein";
        sucEl.textContent = `✅ Wette platziert: ${amount} Coins auf "${choiceLabel}"!`;
        sucEl.classList.remove("d-none");

        // Refresh balance and markets
        await loadUserData();
        await loadMarkets();
        setTimeout(() => closeModal("betModal"), 1500);
    } catch (err) {
        showInModal("betError", err.message);
    }
}

// ─── Create Market ────────────────────────────────────────────────────────────
async function createMarket() {
    const title = document.getElementById("marketTitle").value.trim();
    const desc = document.getElementById("marketDesc").value.trim();
    const endDate = document.getElementById("marketEndDate").value;

    const errEl = document.getElementById("createMarketError");
    const sucEl = document.getElementById("createMarketSuccess");
    errEl.classList.add("d-none");
    sucEl.classList.add("d-none");

    if (!title || !endDate) {
        showInModal("createMarketError", "Titel und Enddatum sind Pflichtfelder.");
        return;
    }

    try {
        await apiFetch("/markets/admin/create", {
            method: "POST",
            body: JSON.stringify({
                title,
                description: desc || null,
                end_date: new Date(endDate).toISOString(),
            }),
        });
        sucEl.textContent = "✅ Markt erfolgreich erstellt!";
        sucEl.classList.remove("d-none");
        document.getElementById("marketTitle").value = "";
        document.getElementById("marketDesc").value = "";
        document.getElementById("marketEndDate").value = "";
        await loadMarkets();
        setTimeout(() => closeModal("createMarketModal"), 1500);
    } catch (err) {
        showInModal("createMarketError", err.message);
    }
}

// ─── Resolve Market ───────────────────────────────────────────────────────────
function openResolveModal(market) {
    currentMarketForResolve = market;
    document.getElementById("resolveMarketTitle").textContent = market.title;
    document.getElementById("resolveError").classList.add("d-none");
    document.getElementById("resolveSuccess").classList.add("d-none");

    document.getElementById("resolveYesBtn").onclick = () => submitResolve(true);
    document.getElementById("resolveNoBtn").onclick = () => submitResolve(false);

    openModal("resolveModal");
}

async function submitResolve(outcome) {
    if (!currentMarketForResolve) return;
    const errEl = document.getElementById("resolveError");
    const sucEl = document.getElementById("resolveSuccess");
    errEl.classList.add("d-none");
    sucEl.classList.add("d-none");

    try {
        const result = await apiFetch("/markets/admin/resolve", {
            method: "POST",
            body: JSON.stringify({
                market_id: currentMarketForResolve.id,
                outcome,
            }),
        });
        sucEl.textContent = `✅ Markt aufgelöst! Ausgezahlt: ${result.total_paid_out} Coins an ${result.winning_bets} Gewinner.`;
        sucEl.classList.remove("d-none");
        await loadMarkets();
        await loadUserData();
        setTimeout(() => closeModal("resolveModal"), 2000);
    } catch (err) {
        showInModal("resolveError", err.message);
    }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
async function loadLeaderboard() {
    try {
        const users = await apiFetch("/user/leaderboard");
        const listEl = document.getElementById("rankingList");
        listEl.innerHTML = users.map((u, i) => `
            <li>
                <span>${i + 1}. ${escapeHtml(u.name)}</span>
                <strong>${Math.floor(u.balance).toLocaleString("de-AT")} Coins</strong>
            </li>
        `).join("");

        if (currentUser) {
            const rank = users.findIndex(u => u.id === currentUser.id);
            document.getElementById("statRank").textContent = rank >= 0 ? `#${rank + 1}` : "?";
        }
    } catch (_) { /* ignore */ }
}

function renderMyBets(bets) {
    const el = document.getElementById("myBetsList");
    if (!bets || bets.length === 0) {
        el.innerHTML = "<li class='text-muted small'>Noch keine Wetten</li>";
        return;
    }
    // Show last 5
    const recent = bets.slice(-5).reverse();
    el.innerHTML = recent.map(b => {
        const market = activeMarkets.find(m => m.id === b.market_id);
        const title = market ? market.title : `Markt #${b.market_id}`;
        const choiceLabel = b.choice ? "Ja" : "Nein";
        const statusColor = b.status === "won" ? "success" : b.status === "lost" ? "danger" : "secondary";
        return `
            <li>
                <span class="small">${escapeHtml(title.substring(0, 30))}</span>
                <span class="badge bg-${statusColor}">${b.amount} C — ${choiceLabel}</span>
                <div class="trade-progress mt-1">
                    <span style="width: ${b.choice ? 80 : 20}%"></span>
                </div>
            </li>
        `;
    }).join("");
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
function connectWebSocket() {
    if (wsConnection) return;
    const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws/updates";
    try {
        wsConnection = new WebSocket(wsUrl);
        wsConnection.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "market.update") {
                // Update the local market odds
                const market = activeMarkets.find(m => m.id === msg.market_id);
                if (market && msg.odds) {
                    market.odds_yes = msg.odds.yes;
                    market.odds_no = msg.odds.no;
                    renderMarketsList(activeMarkets);
                }
            }
        };
        wsConnection.onerror = () => { wsConnection = null; };
        wsConnection.onclose = () => { wsConnection = null; };
    } catch (_) { /* WS not critical */ }
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add("is-open");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("is-open");
}

function closeAllModals() {
    document.querySelectorAll(".auth-modal.is-open").forEach(m => m.classList.remove("is-open"));
}

function showInModal(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.remove("d-none");
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = "info") {
    const id = "toast_" + Date.now();
    const bg = type === "success" ? "bg-success" : type === "warning" ? "bg-warning text-dark" : "bg-info";
    const html = `<div id="${id}" class="toast align-items-center text-white ${bg} border-0 position-fixed bottom-0 end-0 m-3 show" role="alert">
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="document.getElementById('${id}').remove()"></button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    setTimeout(() => document.getElementById(id)?.remove(), 4000);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(iso) {
    return new Date(iso).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Dark Mode ────────────────────────────────────────────────────────────────
const darkModeBtn = document.getElementById("ChangeModeButton");
darkModeBtn.addEventListener("click", () => {
    const html = document.documentElement;
    if (html.getAttribute("data-bs-theme") === "dark") {
        html.setAttribute("data-bs-theme", "light");
        darkModeBtn.textContent = "🌙";
    } else {
        html.setAttribute("data-bs-theme", "dark");
        darkModeBtn.textContent = "☀️";
    }
});

// ─── Event Listeners ─────────────────────────────────────────────────────────
document.getElementById("openLoginModal").addEventListener("click", () => openModal("loginModal"));
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("claimDailyBtn").addEventListener("click", claimDailyBonus);
document.getElementById("refreshMarketsBtn").addEventListener("click", loadMarkets);
document.getElementById("backToMarketsBtn").addEventListener("click", backToMarkets);
document.getElementById("openCreateMarketBtn").addEventListener("click", () => openModal("createMarketModal"));
document.getElementById("createMarketBtn").addEventListener("click", createMarket);
document.getElementById("loginSubmitBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const name = document.getElementById("loginName").value.trim();
    const errEl = document.getElementById("loginError");
    errEl.classList.add("d-none");
    try {
        await login(email, name);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove("d-none");
    }
});

document.getElementById("search").addEventListener("input", () => renderMarketsList(activeMarkets));

// Close modals on X button or backdrop click
document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
});
window.addEventListener("click", (e) => {
    if (e.target.classList.contains("auth-modal")) closeModal(e.target.id);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
    await loadMarkets();
    await loadLeaderboard();
    if (authToken && currentUser) {
        onLoginSuccess();
    }
})();
