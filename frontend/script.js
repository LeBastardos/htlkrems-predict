const button = document.getElementById("ChangeModeButton");
const modeIcon = document.getElementById("modeIcon");
const themeStorageKey = "htlPredictTheme";

function updateThemeButton(theme) {
  const isDarkMode = theme === "dark";

  if (modeIcon) {
    modeIcon.textContent = isDarkMode ? "☀" : "☾";
  }

  button.setAttribute("aria-label", isDarkMode ? "Light Mode aktivieren" : "Dark Mode aktivieren");
  button.setAttribute("title", isDarkMode ? "Light Mode aktivieren" : "Dark Mode aktivieren");
}

const savedTheme = localStorage.getItem(themeStorageKey);

if (savedTheme === "dark" || savedTheme === "light") {
  document.documentElement.setAttribute("data-bs-theme", savedTheme);
}

updateThemeButton(document.documentElement.getAttribute("data-bs-theme"));

button.addEventListener("click", () => {
    const html = document.documentElement;

    if (html.getAttribute("data-bs-theme") === "dark") {
        html.setAttribute("data-bs-theme", "light");
        localStorage.setItem(themeStorageKey, "light");
        updateThemeButton("light");

    } else {
        html.setAttribute("data-bs-theme", "dark");
        localStorage.setItem(themeStorageKey, "dark");
        updateThemeButton("dark");

        // button.classList.remove("btn-outline-dark");
        // button.classList.add("btn-outline-light");
    }
});

const modeButton = document.getElementById("ChangeModeButton");
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");
const openLoginModalButton = document.getElementById("openLoginModal");
const openSignupModalButton = document.getElementById("openSignupModal");
const refreshMarketsButton = document.getElementById("refreshMarketsButton");
const apiStatus = document.getElementById("apiStatus");
const liveMarketsList = document.getElementById("liveMarketsList");
const marketFeedList = document.getElementById("marketFeedList");
const authUserName = document.getElementById("authUserName");
const profileLink = document.getElementById("profileLink");
const adminLink = document.getElementById("adminLink");
const logoutButton = document.getElementById("logoutButton");
const microsoftLoginButton = document.getElementById("microsoftLoginButton");
const authCallbackStatus = document.getElementById("authCallbackStatus");
const profilePage = document.getElementById("profilePage");
const marketPage = document.getElementById("marketPage");
const betPage = document.getElementById("betPage");
const adminPage = document.getElementById("adminPage");

let slideIndex = 1;
let reconnectTimer = null;
let marketSocket = null;
let lastMarkets = [];

const authTokenKey = "htlkrems_auth_token";
const authUserKey = "htlkrems_auth_user";

function setApiStatus(text, tone = "ok") {
  if (!apiStatus) {
    return;
  }

  apiStatus.textContent = text;
  apiStatus.classList.toggle("is-warn", tone !== "ok");
}

function getAuthToken() {
  return localStorage.getItem(authTokenKey);
}

function getStoredUser() {
  const raw = localStorage.getItem(authUserKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setAuthState(token, user) {
  localStorage.setItem(authTokenKey, token);
  localStorage.setItem(authUserKey, JSON.stringify(user));
  updateAuthUi();
}

function clearAuthState() {
  localStorage.removeItem(authTokenKey);
  localStorage.removeItem(authUserKey);
  updateAuthUi();
}

function updateAuthUi() {
  const user = getStoredUser();
  const token = getAuthToken();
  const isLoggedIn = Boolean(token && user);
  const isAdmin = Boolean(user && user.role === "admin");

  if (authUserName) {
    authUserName.textContent = isLoggedIn ? (user.name || user.email || "Signed in") : "";
  }

  if (profileLink) {
    profileLink.classList.toggle("d-none", !isLoggedIn);
  }

  if (adminLink) {
    adminLink.classList.toggle("d-none", !isLoggedIn || !isAdmin);
  }

  if (logoutButton) {
    logoutButton.classList.toggle("d-none", !isLoggedIn);
  }

  if (openLoginModalButton) {
    openLoginModalButton.classList.toggle("d-none", isLoggedIn);
  }
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });
  return response;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function buildSafeNextPath(state) {
  if (!state) {
    return "index.html";
  }
  try {
    const target = new URL(state, window.location.origin);
    if (target.origin === window.location.origin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    // ignore invalid state
  }
  return "index.html";
}

function openModal(modal) {
  modal.classList.add("is-open");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function getMarketLabel(market, index) {
  return market?.title || `Market ${index + 1}`;
}

function getMarketDescription(market) {
  return market?.description || "Live data from the backend will appear here once markets are created.";
}

function getMarketProgress(market, maxPool) {
  if (!maxPool) {
    return 0;
  }

  return Math.max(6, Math.min(100, Math.round((Number(market.current_pool || 0) / maxPool) * 100)));
}

function showSlides(n) {
  const slides = document.getElementsByClassName("mySlides");
  const dots = document.getElementsByClassName("dot");

  if (!slides.length) {
    return;
  }

  if (n > slides.length) {
    slideIndex = 1;
  }

  if (n < 1) {
    slideIndex = slides.length;
  }

  for (let i = 0; i < slides.length; i += 1) {
    slides[i].style.display = "none";
  }

  for (let i = 0; i < dots.length; i += 1) {
    dots[i].className = dots[i].className.replace(" active", "");
  }

  if (slides[slideIndex - 1]) {
    slides[slideIndex - 1].style.display = "block";
  }

  if (dots[slideIndex - 1]) {
    dots[slideIndex - 1].className += " active";
  }
}

function plusSlides(n) {
  showSlides((slideIndex += n));
}

function currentSlide(n) {
  showSlides((slideIndex = n));
}

window.plusSlides = plusSlides;
window.currentSlide = currentSlide;

function buildMarketRows(markets) {
  const sortedMarkets = [...markets].sort((left, right) => Number(right.current_pool || 0) - Number(left.current_pool || 0));
  const topPool = Number(sortedMarkets[0]?.current_pool || 0);
  const adminHint = adminLink && !adminLink.classList.contains("d-none")
    ? ' <a href="admin.html">Create one in Admin</a>'
    : "";

  if (liveMarketsList) {
    liveMarketsList.innerHTML = sortedMarkets.length
      ? sortedMarkets.map((market, index) => `
          <li>
            <span>${index + 1}. <a href="market.html?id=${market.id}">${getMarketLabel(market, index)}</a></span>
            <strong>${formatNumber(market.current_pool)} Coins</strong>
          </li>
        `).join("")
      : `<li><span>No active markets yet.${adminHint}</span><strong>0</strong></li>`;
  }

  if (marketFeedList) {
    marketFeedList.innerHTML = sortedMarkets.length
      ? sortedMarkets.slice(0, 4).map((market) => `
          <li>
            <span>${market.status || "OPEN"} · ${getMarketLabel(market, 0)}</span>
            <div class="trade-progress"><span style="width: ${getMarketProgress(market, topPool)}%"></span></div>
          </li>
        `).join("")
      : '<li><span>Waiting for backend data</span><div class="trade-progress"><span style="width: 12%"></span></div></li>';
  }
}

function updateStatsWithMarkets(markets) {
  const cards = document.querySelectorAll(".stat-card");
  let totalVolume = 0;

  markets.forEach((market) => {
    totalVolume += Number(market.current_pool || 0);
  });

  cards.forEach((card) => {
    const title = card.querySelector("p")?.textContent?.trim();
    const strong = card.querySelector("strong");

    if (!title || !strong) {
      return;
    }

    if (title === "Active Trades") {
      strong.textContent = String(markets.length);
    }

    if (title === "Total Volume") {
      strong.textContent = formatNumber(totalVolume);
    }
  });
}

function updateSlidesWithMarkets(markets) {
  const slides = document.querySelectorAll(".mySlides");
  const dots = document.querySelectorAll(".dot");

  if (!markets.length) {
    slides.forEach((slide) => {
      slide.style.display = "none";
    });

    if (slides[0]) {
      const title = slides[0].querySelector(".graph-title");
      const description = slides[0].querySelector(".graph-description p");
      const latestVotes = slides[0].querySelectorAll(".latest-votes p");
      const numberText = slides[0].querySelector(".numbertext");

      if (title) {
        title.textContent = "No live markets yet";
      }
      if (description) {
        description.textContent = "As soon as an admin creates a market, the live feed will appear here.";
      }
      if (latestVotes[0]) {
        latestVotes[0].textContent = "Pool: 0 Coins";
      }
      if (latestVotes[1]) {
        latestVotes[1].textContent = "Odds: 0% yes / 0% no";
      }
      if (numberText) {
        numberText.textContent = "1 / 1";
      }
      slides[0].style.display = "block";
    }

    if (dots[0]) {
      dots.forEach((dot, index) => {
        dot.style.display = index < slides.length ? "inline-block" : "none";
      });
    }

    showSlides(1);
    return;
  }

  const visibleMarkets = markets.slice(0, slides.length);

  slides.forEach((slide, index) => {
    const market = visibleMarkets[index];

    if (!market) {
      slide.style.display = "none";
      return;
    }

    const title = slide.querySelector(".graph-title");
    const description = slide.querySelector(".graph-description p");
    const latestVotes = slide.querySelectorAll(".latest-votes p");
    const numberText = slide.querySelector(".numbertext");

    slide.style.display = "none";

    if (title) {
      title.textContent = market.title;
    }

    if (description) {
      description.textContent = market.description || "No description provided yet.";
    }

    if (latestVotes[0]) {
      latestVotes[0].textContent = `Pool: ${formatNumber(market.current_pool)} Coins`;
    }

    if (latestVotes[1]) {
      latestVotes[1].textContent = `Odds: ${(Number(market.odds_yes || 0) * 100).toFixed(0)}% yes / ${(Number(market.odds_no || 0) * 100).toFixed(0)}% no`;
    }

    if (numberText) {
      numberText.textContent = `${index + 1} / ${visibleMarkets.length}`;
    }
  });

  dots.forEach((dot, index) => {
    dot.style.display = index < visibleMarkets.length ? "inline-block" : "none";
    dot.className = dot.className.replace(" active", "");
  });

  slideIndex = Math.min(slideIndex, visibleMarkets.length) || 1;
  showSlides(slideIndex);
}

async function fetchActiveMarkets() {
  try {
    const response = await fetch(`${apiBase}/api/v1/markets/active`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Error fetching markets", error);
    setApiStatus("Backend offline", "warn");
    return [];
  }
}

async function fetchHealth() {
  try {
    const response = await fetch(`${apiBase}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function refreshDashboard() {
  const markets = await fetchActiveMarkets();
  lastMarkets = markets;

  updateStatsWithMarkets(markets);
  buildMarketRows(markets);
  updateSlidesWithMarkets(markets);

  if (markets.length) {
    setApiStatus(`Backend live · ${markets.length} markets`, "ok");
  }
}

function connectMarketSocket() {
  if (marketSocket && (marketSocket.readyState === WebSocket.OPEN || marketSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  marketSocket = new WebSocket(`${wsBase}/api/v1/ws/updates`);

  marketSocket.addEventListener("open", () => {
    setApiStatus("Live updates connected", "ok");
  });

  marketSocket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "market.update") {
        refreshDashboard();
      }
    } catch {
      // Ignore non-JSON messages.
    }
  });

  marketSocket.addEventListener("close", () => {
    setApiStatus("Live updates reconnecting", "warn");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = window.setTimeout(connectMarketSocket, 5000);
  });

  marketSocket.addEventListener("error", () => {
    setApiStatus("Live updates unavailable", "warn");
  });
}

async function handleAuthCallback() {
  if (!authCallbackStatus) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (!code) {
    authCallbackStatus.textContent = "Missing Microsoft authorization code.";
    return;
  }

  authCallbackStatus.textContent = "Completing sign-in...";
  try {
    const response = await fetch(`${apiBase}/api/v1/auth/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/auth/callback` }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      authCallbackStatus.textContent = `Login failed (${response.status}): ${errorText || "Unknown error"}`;
      return;
    }

    const payload = await response.json();
    setAuthState(payload.access_token, payload.user);
    authCallbackStatus.textContent = "Login complete. Redirecting...";
    window.location.href = buildSafeNextPath(state);
  } catch (error) {
    console.error("Auth callback error", error);
    authCallbackStatus.textContent = "Login failed. Please try again.";
  }
}

async function loadProfilePage() {
  const profileStatus = document.getElementById("profileStatus");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileRole = document.getElementById("profileRole");
  const profileBalance = document.getElementById("profileBalance");
  const profileBetsList = document.getElementById("profileBetsList");
  const claimDailyButton = document.getElementById("claimDailyButton");
  const claimDailyStatus = document.getElementById("claimDailyStatus");

  if (!getAuthToken()) {
    if (profileStatus) {
      profileStatus.textContent = "Please sign in to view your profile.";
      profileStatus.classList.add("is-warn");
    }

    async function loadAdminPage() {
      const adminStatus = document.getElementById("adminStatus");
      const adminMarketsList = document.getElementById("adminMarketsList");
      const adminCreateForm = document.getElementById("adminCreateMarketForm");
      const adminResolveForm = document.getElementById("adminResolveMarketForm");
      const adminDeleteForm = document.getElementById("adminDeleteMarketForm");
      const adminFormStatus = document.getElementById("adminFormStatus");

      const setAdminStatus = (text, tone = "ok") => {
        if (!adminStatus) {
          return;
        }
        adminStatus.textContent = text;
        adminStatus.classList.toggle("is-warn", tone !== "ok");
      };

      const renderMarkets = (markets) => {
        if (!adminMarketsList) {
          return;
        }
        if (!markets.length) {
          adminMarketsList.innerHTML = "<li>No active markets yet.</li>";
          return;
        }
        adminMarketsList.innerHTML = markets.map((market) => `
          <li>
            <div>
              <strong>#${market.id} · ${market.title}</strong>
              <small>${market.status || "OPEN"} · Ends ${formatDate(market.end_date)}</small>
            </div>
            <span>${formatNumber(market.current_pool)} Coins</span>
          </li>
        `).join("");
      };

      if (!getAuthToken()) {
        setAdminStatus("Sign in to access the admin panel.", "warn");
        return;
      }

      try {
        const userResponse = await apiFetch("/api/v1/user/me");
        if (!userResponse.ok) {
          throw new Error(`User check failed (${userResponse.status})`);
        }
        const user = await userResponse.json();
        if (user.role !== "admin") {
          setAdminStatus("Admin access required.", "warn");
          return;
        }
      } catch (error) {
        console.error("Admin access check failed", error);
        setAdminStatus("Unable to verify admin access.", "warn");
        return;
      }

      setAdminStatus("Admin access confirmed.");

      try {
        const marketsResponse = await apiFetch("/api/v1/markets/active");
        if (!marketsResponse.ok) {
          throw new Error(`Market list failed (${marketsResponse.status})`);
        }
        const markets = await marketsResponse.json();
        renderMarkets(markets);
      } catch (error) {
        console.error("Market list failed", error);
        setAdminStatus("Could not load active markets.", "warn");
      }

      if (adminCreateForm) {
        adminCreateForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const title = adminCreateForm.querySelector("input[name=title]")?.value?.trim();
          const description = adminCreateForm.querySelector("textarea[name=description]")?.value?.trim() || null;
          const endDateValue = adminCreateForm.querySelector("input[name=end_date]")?.value;
          const oddsYes = Number(adminCreateForm.querySelector("input[name=odds_yes]")?.value || 0.5);
          const oddsNo = Number(adminCreateForm.querySelector("input[name=odds_no]")?.value || 0.5);

          if (!title || !endDateValue) {
            if (adminFormStatus) {
              adminFormStatus.textContent = "Please provide a title and end date.";
            }
            return;
          }

          const endDate = new Date(endDateValue);
          if (Number.isNaN(endDate.getTime())) {
            if (adminFormStatus) {
              adminFormStatus.textContent = "Please provide a valid end date.";
            }
            return;
          }

          if (adminFormStatus) {
            adminFormStatus.textContent = "Creating market...";
          }

          try {
            const response = await apiFetch("/api/v1/markets/admin/create", {
              method: "POST",
              body: JSON.stringify({
                title,
                description,
                end_date: endDate.toISOString(),
                initial_odds_yes: oddsYes,
                initial_odds_no: oddsNo,
              }),
            });
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || `Create failed (${response.status})`);
            }
            if (adminFormStatus) {
              adminFormStatus.textContent = "Market created.";
            }
            adminCreateForm.reset();
            const marketsResponse = await apiFetch("/api/v1/markets/active");
            if (marketsResponse.ok) {
              renderMarkets(await marketsResponse.json());
            }
          } catch (error) {
            console.error("Market create failed", error);
            if (adminFormStatus) {
              adminFormStatus.textContent = `Create failed: ${error.message}`;
            }
          }
        });
      }

      if (adminResolveForm) {
        adminResolveForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const marketId = Number(adminResolveForm.querySelector("input[name=market_id]")?.value || 0);
          const outcomeValue = adminResolveForm.querySelector("select[name=outcome]")?.value;
          const adminNote = adminResolveForm.querySelector("input[name=admin_note]")?.value?.trim() || null;

          if (!marketId || !outcomeValue) {
            if (adminFormStatus) {
              adminFormStatus.textContent = "Provide a market ID and outcome.";
            }
            return;
          }

          if (adminFormStatus) {
            adminFormStatus.textContent = "Resolving market...";
          }

          try {
            const response = await apiFetch(`/api/v1/markets/admin/resolve?market_id=${marketId}`, {
              method: "POST",
              body: JSON.stringify({
                outcome: outcomeValue === "yes",
                admin_note: adminNote,
              }),
            });
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || `Resolve failed (${response.status})`);
            }
            if (adminFormStatus) {
              adminFormStatus.textContent = "Market resolved.";
            }
            adminResolveForm.reset();
            const marketsResponse = await apiFetch("/api/v1/markets/active");
            if (marketsResponse.ok) {
              renderMarkets(await marketsResponse.json());
            }
          } catch (error) {
            console.error("Market resolve failed", error);
            if (adminFormStatus) {
              adminFormStatus.textContent = `Resolve failed: ${error.message}`;
            }
          }
        });
      }

      if (adminDeleteForm) {
        adminDeleteForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const marketId = Number(adminDeleteForm.querySelector("input[name=market_id]")?.value || 0);
          const reason = adminDeleteForm.querySelector("input[name=reason]")?.value?.trim();
          const confirm = adminDeleteForm.querySelector("input[name=confirm_delete]")?.checked;

          if (!marketId || !reason) {
            if (adminFormStatus) {
              adminFormStatus.textContent = "Provide a market ID and reason.";
            }
            return;
          }

          if (!confirm) {
            if (adminFormStatus) {
              adminFormStatus.textContent = "Please confirm deletion.";
            }
            return;
          }

          if (adminFormStatus) {
            adminFormStatus.textContent = "Deleting market...";
          }

          try {
            const response = await apiFetch(`/api/v1/markets/admin/markets/${marketId}`, {
              method: "DELETE",
              body: JSON.stringify({
                reason,
                confirm_delete: true,
              }),
            });
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || `Delete failed (${response.status})`);
            }
            if (adminFormStatus) {
              adminFormStatus.textContent = "Market deleted.";
            }
            adminDeleteForm.reset();
            const marketsResponse = await apiFetch("/api/v1/markets/active");
            if (marketsResponse.ok) {
              renderMarkets(await marketsResponse.json());
            }
          } catch (error) {
            console.error("Market delete failed", error);
            if (adminFormStatus) {
              adminFormStatus.textContent = `Delete failed: ${error.message}`;
            }
          }
        });
      }
    }
    return;
  }

  if (profileStatus) {
    profileStatus.textContent = "Loading profile...";
  }

  try {
    const [userResponse, balanceResponse, betsResponse] = await Promise.all([
      apiFetch("/api/v1/user/me"),
      apiFetch("/api/v1/wallet/me"),
      apiFetch("/api/v1/bet/me"),
    ]);

    if (!userResponse.ok) {
      throw new Error(`Profile request failed (${userResponse.status})`);
    }

    const user = await userResponse.json();
    const balancePayload = balanceResponse.ok ? await balanceResponse.json() : null;
    const betsPayload = betsResponse.ok ? await betsResponse.json() : [];

    if (profileName) {
      profileName.textContent = user.name || user.username || "-";
    }
    if (profileEmail) {
      profileEmail.textContent = user.email || "-";
    }
    if (profileRole) {
      profileRole.textContent = user.role || "user";
    }
    if (profileBalance) {
      profileBalance.textContent = balancePayload ? `${formatNumber(balancePayload.balance)} Coins` : "-";
    }

    if (profileBetsList) {
      profileBetsList.innerHTML = betsPayload.length
        ? betsPayload.map((bet) => `
            <li>
              <div>
                <strong>${bet.market_title || `Market ${bet.market_id}`}</strong>
                <small>${bet.choice ? "Yes" : "No"} · ${formatNumber(bet.amount)} Coins</small>
              </div>
              <a href="bet.html?id=${bet.id}">Details</a>
            </li>
          `).join("")
        : '<li>No bets yet. Browse <a href="index.html#live-markets">live markets</a> to place your first bet.</li>';
    }

    if (profileStatus) {
      profileStatus.textContent = "Profile loaded.";
      profileStatus.classList.remove("is-warn");
    }
  } catch (error) {
    console.error("Profile load failed", error);
    if (profileStatus) {
      profileStatus.textContent = "Could not load your profile.";
      profileStatus.classList.add("is-warn");
    }
  }

  if (claimDailyButton) {
    claimDailyButton.addEventListener("click", async () => {
      claimDailyButton.disabled = true;
      if (claimDailyStatus) {
        claimDailyStatus.textContent = "Claiming daily bonus...";
      }
      try {
        const response = await apiFetch("/api/v1/wallet/me/claim-daily", { method: "POST" });
        if (!response.ok) {
          throw new Error(`Daily claim failed (${response.status})`);
        }
        const payload = await response.json();
        if (profileBalance) {
          profileBalance.textContent = `${formatNumber(payload.new_balance)} Coins`;
        }
        if (claimDailyStatus) {
          claimDailyStatus.textContent = "Daily bonus claimed.";
        }
      } catch (error) {
        console.error("Daily claim failed", error);
        if (claimDailyStatus) {
          claimDailyStatus.textContent = "Daily claim failed.";
        }
      } finally {
        claimDailyButton.disabled = false;
      }
    });
  }
}

async function loadMarketPage() {
  const marketId = getQueryParam("id");
  const marketTitle = document.getElementById("marketTitle");
  const marketDescription = document.getElementById("marketDescription");
  const marketStatus = document.getElementById("marketStatus");
  const marketEndDate = document.getElementById("marketEndDate");
  const marketPool = document.getElementById("marketPool");
  const marketOddsYes = document.getElementById("marketOddsYes");
  const marketOddsNo = document.getElementById("marketOddsNo");
  const placeBetForm = document.getElementById("placeBetForm");
  const betFormStatus = document.getElementById("betFormStatus");
  const betFormSubmit = document.getElementById("betFormSubmit");
  let marketIsOpen = true;

  if (!marketId) {
    if (marketTitle) {
      marketTitle.textContent = "Market not found.";
    }
    return;
  }

  try {
    const response = await fetch(`${apiBase}/api/v1/markets/${marketId}`);
    if (!response.ok) {
      throw new Error(`Market load failed (${response.status})`);
    }
    const market = await response.json();
    if (marketTitle) {
      marketTitle.textContent = market.title;
    }
    if (marketDescription) {
      marketDescription.textContent = market.description || "No description provided yet.";
    }
    if (marketStatus) {
      marketStatus.textContent = market.status || "OPEN";
    }
    if (marketEndDate) {
      marketEndDate.textContent = formatDate(market.end_date);
    }
    if (marketPool) {
      marketPool.textContent = `${formatNumber(market.current_pool)} Coins`;
    }
    if (marketOddsYes) {
      marketOddsYes.textContent = `${(Number(market.odds_yes || 0) * 100).toFixed(0)}%`;
    }
    if (marketOddsNo) {
      marketOddsNo.textContent = `${(Number(market.odds_no || 0) * 100).toFixed(0)}%`;
    }

    marketIsOpen = !market.status || market.status === "OPEN";
    if (placeBetForm && betFormSubmit && !marketIsOpen) {
      betFormSubmit.disabled = true;
      if (betFormStatus) {
        betFormStatus.textContent = `Market is ${market.status.toLowerCase()}. Betting is closed.`;
      }
    }
  } catch (error) {
    console.error("Market load failed", error);
    if (marketTitle) {
      marketTitle.textContent = "Unable to load market.";
    }
  }

  if (placeBetForm) {
    if (!marketIsOpen && betFormSubmit) {
      betFormSubmit.disabled = true;
      return;
    }
    if (!getAuthToken()) {
      if (betFormStatus) {
        betFormStatus.textContent = "Please sign in with Microsoft to place a bet.";
      }
      if (betFormSubmit) {
        betFormSubmit.disabled = true;
      }
      return;
    }

    placeBetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (betFormStatus) {
        betFormStatus.textContent = "Placing bet...";
      }
      if (betFormSubmit) {
        betFormSubmit.disabled = true;
      }

      const choiceValue = placeBetForm.querySelector("select[name=choice]")?.value;
      const amountValue = Number(placeBetForm.querySelector("input[name=amount]")?.value || 0);
      const choice = choiceValue === "yes";

      try {
        const response = await apiFetch("/api/v1/bet/place", {
          method: "POST",
          body: JSON.stringify({
            market_id: Number(marketId),
            amount: amountValue,
            choice,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Bet failed (${response.status})`);
        }

        const bet = await response.json();
        if (betFormStatus) {
          betFormStatus.innerHTML = `Bet placed! <a href="bet.html?id=${bet.id}">View bet details</a>`;
        }
      } catch (error) {
        console.error("Bet placement failed", error);
        if (betFormStatus) {
          betFormStatus.textContent = `Bet failed: ${error.message}`;
        }
      } finally {
        if (betFormSubmit) {
          betFormSubmit.disabled = false;
        }
      }
    });
  }
}

async function loadBetPage() {
  const betId = getQueryParam("id");
  const betTitle = document.getElementById("betTitle");
  const betMarketLink = document.getElementById("betMarketLink");
  const betChoice = document.getElementById("betChoice");
  const betAmount = document.getElementById("betAmount");
  const betStatus = document.getElementById("betStatus");
  const betCreated = document.getElementById("betCreated");
  const betOdds = document.getElementById("betOdds");
  const betMarketStatus = document.getElementById("betMarketStatus");
  const betMarketEnd = document.getElementById("betMarketEnd");
  const betError = document.getElementById("betError");

  if (!betId) {
    if (betTitle) {
      betTitle.textContent = "Bet not found.";
    }
    return;
  }

  if (!getAuthToken()) {
    if (betError) {
      betError.textContent = "Please sign in to view bet details.";
    }
    return;
  }

  try {
    const response = await apiFetch(`/api/v1/bet/${betId}`);
    if (!response.ok) {
      throw new Error(`Bet load failed (${response.status})`);
    }
    const bet = await response.json();
    if (betTitle) {
      betTitle.textContent = bet.market_title || `Market ${bet.market_id}`;
    }
    if (betMarketLink) {
      betMarketLink.href = `market.html?id=${bet.market_id}`;
      betMarketLink.textContent = "View market";
    }
    if (betChoice) {
      betChoice.textContent = bet.choice ? "Yes" : "No";
    }
    if (betAmount) {
      betAmount.textContent = `${formatNumber(bet.amount)} Coins`;
    }
    if (betStatus) {
      betStatus.textContent = bet.status || "placed";
    }
    if (betCreated) {
      betCreated.textContent = formatDate(bet.created_at);
    }
    if (betOdds) {
      betOdds.textContent = `Yes ${(Number(bet.odds_yes || 0) * 100).toFixed(0)}% · No ${(Number(bet.odds_no || 0) * 100).toFixed(0)}%`;
    }
    if (betMarketStatus) {
      betMarketStatus.textContent = bet.market_status || "-";
    }
    if (betMarketEnd) {
      betMarketEnd.textContent = formatDate(bet.market_end_date);
    }
  } catch (error) {
    console.error("Bet load failed", error);
    if (betError) {
      betError.textContent = "Unable to load bet details.";
    }
  }
}

if (modeButton) {
  modeButton.addEventListener("click", () => {
    const html = document.documentElement;

    if (html.getAttribute("data-bs-theme") === "dark") {
      html.setAttribute("data-bs-theme", "light");
      modeButton.textContent = "Dark Mode";
    } else {
      html.setAttribute("data-bs-theme", "dark");
      modeButton.textContent = "Light Mode";
    }
  });
}

if (openLoginModalButton && loginModal) {
  openLoginModalButton.addEventListener("click", () => {
    openModal(loginModal);
  });
}

if (openSignupModalButton && signupModal) {
  openSignupModalButton.addEventListener("click", () => {
    openModal(signupModal);
  });
}

document.querySelectorAll("[data-close-modal]").forEach((closeButton) => {
  closeButton.addEventListener("click", () => {
    const modal = document.getElementById(closeButton.dataset.closeModal);
    closeModal(modal);
  });
});

window.addEventListener("click", (event) => {
  if (event.target.classList.contains("auth-modal")) {
    closeModal(event.target);
  }
});

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    clearAuthState();
    window.location.href = "index.html";
  });
}

if (microsoftLoginButton) {
  microsoftLoginButton.addEventListener("click", () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const nextPath = `${window.location.pathname}${window.location.search}`;
    window.location.href = `${apiBase}/api/v1/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}&next=${encodeURIComponent(nextPath)}`;
  });
}

document.querySelectorAll("[data-trade-slider]").forEach((slider) => {
  let tradeSlideIndex = 0;
  const tradeSlides = slider.querySelectorAll(".trade-slide");

  function showTradeSlide(index) {
    tradeSlideIndex = (index + tradeSlides.length) % tradeSlides.length;

    tradeSlides.forEach((tradeSlide, slideNumber) => {
      tradeSlide.classList.toggle("is-active", slideNumber === tradeSlideIndex);
    });
  }

  slider.querySelectorAll("[data-trade-direction]").forEach((tradeButton) => {
    tradeButton.addEventListener("click", () => {
      showTradeSlide(tradeSlideIndex + Number(tradeButton.dataset.tradeDirection));
    });
  });
});


document.querySelectorAll(".market-tabs button").forEach((marketTab) => {
  marketTab.addEventListener("click", () => {
    document.querySelectorAll(".market-tabs button").forEach((button) => {
      button.classList.remove("is-selected");
    });

    marketTab.classList.add("is-selected");
    selectedMarketStatus = marketTab.dataset.marketStatus;
    filterPredictionCards();
  });
});

document.querySelectorAll(".market-topic-row span").forEach((topicChip) => {
  topicChip.addEventListener("click", () => {
    document.querySelectorAll(".market-topic-row span").forEach((chip) => {
      chip.classList.remove("is-selected");
    });

    topicChip.classList.add("is-selected");
    selectedMarketTopic = topicChip.dataset.marketTopic;
    filterPredictionCards();
  });
});

function bindPredictionCardEvents() {
  document.querySelectorAll(".prediction-card").forEach((predictionCard, marketIndex) => {
    const predictionButtons = predictionCard.querySelectorAll(".prediction-buttons button");
    const cardFooter = predictionCard.querySelector("footer");
    const marketKey = predictionCard.dataset.marketId || String(marketIndex);

  predictionButtons.forEach((predictionButton) => {
    predictionButton.addEventListener("click", () => {
      const currentCoins = getCoinBalance();
      const selectedStake = getSelectedStake();

      if (currentCoins < selectedStake) {
        showVoteToast(`Du brauchst ${selectedStake} Coins. Morgen gibt es wieder 10.`);
        return;
      }

      setCoinBalance(currentCoins - selectedStake);
      addPredictionVote(
        predictionCard,
        marketKey,
        predictionButton.classList.contains("buy-yes") ? "yes" : "no",
        selectedStake
      );

      predictionButtons.forEach((button) => {
        button.classList.remove("is-selected");
      });

      predictionButton.classList.add("is-selected");

      if (cardFooter) {
        const selectedText = predictionButton.classList.contains("buy-yes") ? "Ja ausgewaehlt" : "Nein ausgewaehlt";
        cardFooter.lastElementChild.textContent = selectedText;
      }

      saveVoteHistory(predictionCard, predictionButton, selectedStake);
      renderVoteHistory();
      showVoteToast(`Danke fuer die Abstimmung! ${selectedStake} Coins eingesetzt.`);
    });
  });
  });
}

const marketActionButton = document.querySelector(".market-action");

if (marketActionButton) {
  marketActionButton.addEventListener("click", () => {
    document.querySelector(".dashboard-main").scrollIntoView({ behavior: "smooth" });
  });
}

const coinBalanceElement = document.getElementById("coinBalance");
const voteToast = document.getElementById("voteToast");
const searchInput = document.getElementById("search");
const coinStakeSelect = document.getElementById("coinStake");
const myVotesList = document.getElementById("myVotesList");
const marketEmptyState = document.getElementById("marketEmptyState");
const marketCardGrid = document.getElementById("marketCardGrid");
const coinStorageKey = "htlPredictCoins";
const coinDailyStorageKey = "htlPredictLastDailyBonus";
const marketVoteStorageKey = "htlPredictMarketVotes";
const voteHistoryStorageKey = "htlPredictVoteHistory";
let selectedMarketTopic = "all";
let selectedMarketStatus = "all";
let selectedSearchTerm = "";
let toastTimeout;

const mockMarkets = [
  {
    id: 1,
    title: "Gibt es in der 3BHIT einen Nachtest?",
    category: "Tests",
    topic: "tests",
    statuses: ["trend", "live", "liquid"],
    icon: "Test",
    iconClass: "",
    yesVotes: 62,
    noVotes: 38,
    volume: "24h Vol. 12.4K",
    stateLabel: "Live"
  },
  {
    id: 2,
    title: "Schafft die Klasse einen Schnitt unter 2,5?",
    category: "Noten",
    topic: "noten",
    statuses: ["live", "ending"],
    icon: "HTL",
    iconClass: "prediction-icon-green",
    yesVotes: 29,
    noVotes: 71,
    volume: "Vol. 8.9K",
    stateLabel: "Endet Freitag"
  },
  {
    id: 3,
    title: "Kommt der Brandy puenktlich?",
    category: "Lehrer",
    topic: "lehrer",
    statuses: ["trend", "ending"],
    icon: "Lehrer",
    iconClass: "prediction-icon-orange",
    yesVotes: 41,
    noVotes: 59,
    volume: "Vol. 5.1K",
    stateLabel: "Bald endend"
  },
  {
    id: 4,
    title: "Kommt diese Woche noch ein Klassenvorschlag?",
    category: "Schueler",
    topic: "schueler",
    statuses: ["new", "live"],
    icon: "3B",
    iconClass: "prediction-icon-purple",
    yesVotes: 55,
    noVotes: 45,
    volume: "Vol. 2.7K",
    stateLabel: "Neu"
  },
  {
    id: 5,
    title: "Nutzen mehr als 50% der Klasse KI fuer die Hausuebung?",
    category: "KI",
    topic: "ki",
    statuses: ["trend", "new"],
    icon: "KI",
    iconClass: "prediction-icon-blue",
    yesVotes: 68,
    noVotes: 32,
    volume: "Vol. 6.2K",
    stateLabel: "Trend"
  },
  {
    id: 6,
    title: "Faellt am Freitag eine Stunde aus?",
    category: "Stundenplan",
    topic: "stundenplan",
    statuses: ["live", "liquid"],
    icon: "Plan",
    iconClass: "prediction-icon-red",
    yesVotes: 47,
    noVotes: 53,
    volume: "Vol. 10.1K",
    stateLabel: "Live"
  }
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCoinBalance() {
  return Number(localStorage.getItem(coinStorageKey)) || 0;
}

function setCoinBalance(balance) {
  localStorage.setItem(coinStorageKey, String(balance));

  if (coinBalanceElement) {
    coinBalanceElement.textContent = balance;
  }
}

function getSelectedStake() {
  return Number(coinStakeSelect?.value) || 1;
}

function showVoteToast(message) {
  if (!voteToast) {
    return;
  }

  voteToast.textContent = message;
  voteToast.classList.add("is-visible");
  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    voteToast.classList.remove("is-visible");
  }, 2200);
}

function addDailyCoins() {
  const todayKey = getTodayKey();
  const lastDailyBonus = localStorage.getItem(coinDailyStorageKey);
  let coinBalance = getCoinBalance();

  if (lastDailyBonus !== todayKey) {
    coinBalance += 20; // hier geändert
    localStorage.setItem(coinDailyStorageKey, todayKey);
    setCoinBalance(coinBalance);
    showVoteToast("Daily Bonus: 20 Coins erhalten!"); // hier geändert
    return;
  }

  setCoinBalance(coinBalance);
}

addDailyCoins();
loadMarkets().then((markets) => {
  renderMarkets(markets);
  bindPredictionCardEvents();
  initPredictionVotes();
  filterPredictionCards();
});
renderVoteHistory();

if (searchInput) {
  searchInput.closest("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  searchInput.addEventListener("input", () => {
    selectedSearchTerm = searchInput.value.trim().toLowerCase();
    filterPredictionCards();
  });
}

async function loadMarkets() {
  return mockMarkets;
}

function renderMarkets(markets) {
  if (!marketCardGrid) {
    return;
  }

  marketCardGrid.innerHTML = markets.map((market) => {
    const iconClasses = ["prediction-icon", market.iconClass].filter(Boolean).join(" ");

    return `
      <article class="prediction-card" data-market-id="${market.id}" data-market-topic="${market.topic}" data-market-status="${market.statuses.join(" ")}">
        <div class="prediction-card-top">
          <div class="${iconClasses}">${market.icon}</div>
          <div>
            <p>${market.category}</p>
            <h2>${market.title}</h2>
          </div>
        </div>
        <div class="prediction-outcomes">
          <div>
            <span>Ja</span>
            <strong>${market.yesVotes}%</strong>
          </div>
          <div>
            <span>Nein</span>
            <strong>${market.noVotes}%</strong>
          </div>
        </div>
        <div class="prediction-buttons">
          <button type="button" class="buy-yes">Ja kaufen</button>
          <button type="button" class="buy-no">Nein kaufen</button>
        </div>
        <footer>
          <span>${market.volume}</span>
          <span>${market.stateLabel}</span>
        </footer>
      </article>
    `;
  }).join("");
}

function getStoredMarketVotes() {
  try {
    return JSON.parse(localStorage.getItem(marketVoteStorageKey)) || {};
  } catch (error) {
    return {};
  }
}

function getDefaultMarketVotes(predictionCard) {
  const percentages = predictionCard.querySelectorAll(".prediction-outcomes strong");
  const yesVotes = Number.parseInt(percentages[0]?.textContent, 10) || 50;
  const noVotes = Number.parseInt(percentages[1]?.textContent, 10) || 50;

  return {
    yes: yesVotes,
    no: noVotes
  };
}

function getMarketVotes(predictionCard, marketKey) {
  const storedVotes = getStoredMarketVotes();
  return storedVotes[marketKey] || getDefaultMarketVotes(predictionCard);
}

function saveMarketVotes(marketKey, votes) {
  const storedVotes = getStoredMarketVotes();
  storedVotes[marketKey] = votes;
  localStorage.setItem(marketVoteStorageKey, JSON.stringify(storedVotes));
}

function renderMarketVotes(predictionCard, votes) {
  const outcomeLabels = predictionCard.querySelectorAll(".prediction-outcomes span");
  const outcomePercentages = predictionCard.querySelectorAll(".prediction-outcomes strong");
  const totalVotes = Math.max(votes.yes + votes.no, 1);
  const yesPercentage = Math.round((votes.yes / totalVotes) * 100);
  const noPercentage = 100 - yesPercentage;

  if (outcomeLabels[0]) {
    outcomeLabels[0].textContent = `Ja (${votes.yes} Votes)`;
  }

  if (outcomeLabels[1]) {
    outcomeLabels[1].textContent = `Nein (${votes.no} Votes)`;
  }

  if (outcomePercentages[0]) {
    outcomePercentages[0].textContent = `${yesPercentage}%`;
  }

  if (outcomePercentages[1]) {
    outcomePercentages[1].textContent = `${noPercentage}%`;
  }
}

function addPredictionVote(predictionCard, marketKey, selectedOutcome, selectedStake) {
  const votes = getMarketVotes(predictionCard, marketKey);
  votes[selectedOutcome] += selectedStake;
  saveMarketVotes(marketKey, votes);
  renderMarketVotes(predictionCard, votes);

  // update user streak and top stats after casting a vote
  try {
    updateUserStreak(selectedOutcome);
  } catch (err) {
    // ignore if function not yet available
    console.warn('updateUserStreak not available', err);
  }

  try {
    updateTopStats();
  } catch (err) {
    console.warn('updateTopStats not available', err);
  }
}

function initPredictionVotes() {
  document.querySelectorAll(".prediction-card").forEach((predictionCard, marketIndex) => {
    const marketKey = predictionCard.dataset.marketId || String(marketIndex);
    renderMarketVotes(predictionCard, getMarketVotes(predictionCard, marketKey));
  });
}

function filterPredictionCards() {
  let visibleCards = 0;

  document.querySelectorAll(".prediction-card").forEach((predictionCard) => {
    const cardTopic = predictionCard.dataset.marketTopic;
    const cardStatuses = predictionCard.dataset.marketStatus?.split(" ") || [];
    const cardText = predictionCard.textContent.toLowerCase();
    const matchesTopic = selectedMarketTopic === "all" || cardTopic === selectedMarketTopic;
    const matchesStatus = selectedMarketStatus === "all" || cardStatuses.includes(selectedMarketStatus);
    const matchesSearch = selectedSearchTerm === "" || cardText.includes(selectedSearchTerm);
    const shouldShowCard = matchesTopic && matchesStatus && matchesSearch;

    predictionCard.classList.toggle("is-hidden", !shouldShowCard);

    if (shouldShowCard) {
      visibleCards += 1;
    }
  });

  if (marketEmptyState) {
    marketEmptyState.classList.toggle("is-visible", visibleCards === 0);
  }
}

function getVoteHistory() {
  try {
    return JSON.parse(localStorage.getItem(voteHistoryStorageKey)) || [];
  } catch (error) {
    return [];
  }
}

function saveVoteHistory(predictionCard, predictionButton, selectedStake) {
  const voteHistory = getVoteHistory();
  const marketTitle = predictionCard.querySelector("h2")?.textContent || "Unbekannter Market";
  const selectedOutcome = predictionButton.classList.contains("buy-yes") ? "Ja" : "Nein";

  voteHistory.unshift({
    title: marketTitle,
    outcome: selectedOutcome,
    stake: selectedStake,
    date: new Date().toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  localStorage.setItem(voteHistoryStorageKey, JSON.stringify(voteHistory.slice(0, 6)));
}

function renderVoteHistory() {
  const voteHistory = getVoteHistory();

  if (!myVotesList) {
    return;
  }

  if (voteHistory.length === 0) {
    myVotesList.innerHTML = "<li>Noch keine Votes vorhanden.</li>";
    return;
  }

  myVotesList.innerHTML = voteHistory.map((vote) => (
    `<li><strong>${vote.outcome}</strong><span>${vote.stake} Coins</span><span>${vote.title}</span><span>${vote.date}</span></li>`
  )).join("");
}


// --- Top-stats / streak helpers ---
function computeTotalVotes() {
  const stored = getStoredMarketVotes();
  let total = 0;

  // Add votes from defined mockMarkets (use defaults when no stored entry)
  mockMarkets.forEach((m) => {
    const k = String(m.id);
    const v = stored[k] || { yes: m.yesVotes, no: m.noVotes };
    total += (Number(v.yes) + Number(v.no));
  });

  // Include any stored markets not present in mockMarkets
  Object.keys(stored).forEach((k) => {
    if (!mockMarkets.find((m) => String(m.id) === k)) {
      const v = stored[k];
      total += (Number(v.yes) + Number(v.no));
    }
  });

  return total;
}

function computeActiveTrades() {
  return mockMarkets.filter((m) => Array.isArray(m.statuses) && m.statuses.includes("live")).length;
}

function updateTopStats() {
  const totalVotesEl = document.getElementById('totalVotesValue');
  const activeTradesEl = document.getElementById('activeTradesValue');
  const bestStreakEl = document.getElementById('bestStreakValue');
  const totalVolumeEl = document.getElementById('totalVolumeValue');

  const totalVotes = computeTotalVotes();

  if (totalVotesEl) totalVotesEl.textContent = totalVotes.toLocaleString();
  if (activeTradesEl) activeTradesEl.textContent = computeActiveTrades();
  if (bestStreakEl) bestStreakEl.textContent = String(Number(localStorage.getItem('htlPredictBestStreak') || 0));
  if (totalVolumeEl) totalVolumeEl.textContent = totalVotes.toLocaleString();
}

function updateUserStreak(selectedOutcome) {
  if (!selectedOutcome) return;

  const last = localStorage.getItem('htlPredictLastOutcome');
  let current = Number(localStorage.getItem('htlPredictCurrentStreak') || 0);
  let best = Number(localStorage.getItem('htlPredictBestStreak') || 0);

  if (last && last === selectedOutcome) {
    current += 1;
  } else {
    current = 1;
  }

  if (current > best) best = current;

  localStorage.setItem('htlPredictLastOutcome', selectedOutcome);
  localStorage.setItem('htlPredictCurrentStreak', String(current));
  localStorage.setItem('htlPredictBestStreak', String(best));
}

// initialize top stats on load
try {
  updateTopStats();
} catch (err) {
  // ignore if DOM not ready
}

