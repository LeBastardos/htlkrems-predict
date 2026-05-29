const apiBase = window.location.origin && window.location.origin !== "null" ? window.location.origin : "http://localhost:8000";
const wsBase = apiBase.replace(/^http/, "ws");

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
  const isAdminOrTrustee = Boolean(user && (user.role === "admin" || user.role === "trustee"));

  if (authUserName) {
    authUserName.textContent = isLoggedIn ? (user.name || user.email || "Signed in") : "";
  }

  if (profileLink) {
    profileLink.classList.toggle("d-none", !isLoggedIn);
  }

  if (adminLink) {
    adminLink.classList.toggle("d-none", !isLoggedIn || !isAdminOrTrustee);
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
      // make title a link to the market detail page
      title.innerHTML = "";
      const a = document.createElement("a");
      a.href = `market.html?id=${market.id}`;
      a.textContent = market.title || `Market ${index + 1}`;
      a.style.color = "inherit";
      a.style.textDecoration = "none";
      title.appendChild(a);
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

    // Fetch and render market history on the slide's canvas (async, non-blocking)
    const canvas = slide.querySelector(".market-history-canvas");
    if (canvas) {
      (async () => {
        try {
          const resp = await fetch(`${apiBase}/api/v1/markets/${market.id}/history`);
          let history = [];
          if (resp.ok) {
            const payload = await resp.json();
            history = payload.history || [];
          } else {
            console.warn(`History fetch failed (${resp.status}) for market ${market.id}`);
          }

          // If no history returned, fall back to a short synthetic series using current odds
          if (!history || !history.length) {
            const now = new Date();
            history = [
              { timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), odds_yes: market.odds_yes || 0, odds_no: market.odds_no || 0 },
              { timestamp: now.toISOString(), odds_yes: market.odds_yes || 0, odds_no: market.odds_no || 0 },
            ];
          }

          drawMarketHistoryOnCanvas(canvas, history || []);
        } catch (err) {
          console.warn("Failed to load market history", err);
          // fallback to synthetic flat line
          const now = new Date();
          drawMarketHistoryOnCanvas(canvas, [
            { timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), odds_yes: market.odds_yes || 0, odds_no: market.odds_no || 0 },
            { timestamp: now.toISOString(), odds_yes: market.odds_yes || 0, odds_no: market.odds_no || 0 },
          ]);
        }

        // Fetch and show recent bets for this market inside the slide's latest-votes area
        try {
          const votesResp = await fetch(`${apiBase}/api/v1/markets/${market.id}/bets`);
          const latestContainer = slide.querySelector(".latest-votes");
          if (latestContainer) {
            let html = `<h2>Letzte Votes</h2>`;
            html += `<p>Pool: ${formatNumber(market.current_pool)} Coins</p>`;
            html += `<p>Odds: ${(Number(market.odds_yes || 0) * 100).toFixed(0)}% yes / ${(Number(market.odds_no || 0) * 100).toFixed(0)}% no</p>`;

            if (votesResp.ok) {
              const votes = await votesResp.json();
              if (votes && votes.length) {
                const maxShown = 4;
                const shown = votes.slice(0, maxShown);
                html += `<ul class="recent-bets-list">${shown.map((v) => `<li><strong>${v.user || 'Anon'}</strong> · ${v.choice} · ${formatNumber(v.amount)} Coins · <small>${formatDate(v.created_at)}</small></li>`).join("")}</ul>`;
                if (votes.length > maxShown) {
                  html += `<a class="more-votes-link" href="market.html?id=${market.id}">View all votes</a>`;
                }
              } else {
                html += `<ul class="recent-bets-list"><li>No recent votes</li></ul>`;
              }
            } else {
              html += `<ul class="recent-bets-list"><li>Could not load recent votes</li></ul>`;
            }

            latestContainer.innerHTML = html;
          }
        } catch (err) {
          console.warn("Failed to load recent bets", err);
        }
      })();
    }
  });

  dots.forEach((dot, index) => {
    dot.style.display = index < visibleMarkets.length ? "inline-block" : "none";
    dot.className = dot.className.replace(" active", "");
  });

  slideIndex = Math.min(slideIndex, visibleMarkets.length) || 1;
  showSlides(slideIndex);
}

// Draw a simple odds history line chart into a canvas element.
function drawMarketHistoryOnCanvas(canvas, history) {
  try {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(1, rect.width || canvas.clientWidth || 300);
    const cssHeight = Math.max(1, rect.height || canvas.clientHeight || 140);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const margin = 12;
    const drawAreaWidth = cssWidth - margin * 2;
    const drawAreaHeight = cssHeight - margin * 2;

    if (!history || !history.length) {
      ctx.fillStyle = "#6c757d";
      ctx.font = "14px sans-serif";
      ctx.fillText("No history yet", margin, cssHeight / 2);
      return;
    }

    // Prepare time/value arrays
    const times = history.map((p) => new Date(p.timestamp).getTime());
    const yes = history.map((p) => Number(p.odds_yes || 0));
    const no = history.map((p) => Number(p.odds_no || 0));
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const xFor = (t) => {
      if (maxT === minT) return margin + drawAreaWidth / 2;
      return margin + ((t - minT) / (maxT - minT)) * drawAreaWidth;
    };

    const yFor = (v) => {
      const vv = clamp(v, 0, 1);
      return margin + (1 - vv) * drawAreaHeight;
    };

    // light grid
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = margin + (i / 4) * drawAreaHeight;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + drawAreaWidth, y);
      ctx.stroke();
    }

    // Build x/y points for the 'yes' series (eckig - gerade Linien)
    const xPoints = times.map((t) => xFor(t));
    const yPoints = yes.map((v) => yFor(v));

    // Simple straight Path2D using line segments (no smoothing)
    const linePath = new Path2D();
    linePath.moveTo(xPoints[0], yPoints[0]);
    for (let i = 1; i < xPoints.length; i += 1) {
      linePath.lineTo(xPoints[i], yPoints[i]);
    }

    // Improved fills: stronger, full-width polygons (no smoothing)
    const greenGrad = ctx.createLinearGradient(0, margin, 0, margin + drawAreaHeight);
    greenGrad.addColorStop(0, "rgba(2,117,60,0.30)");
    greenGrad.addColorStop(1, "rgba(2,117,60,0.06)");
    const redGrad = ctx.createLinearGradient(0, margin, 0, margin + drawAreaHeight);
    redGrad.addColorStop(0, "rgba(185,30,40,0.30)");
    redGrad.addColorStop(1, "rgba(185,30,40,0.06)");

    // Area fills: construct non-self-intersecting polygons by combining the top/bottom edges
    // with the line points in reverse order. Draw green first, then red on top.
    const n = xPoints.length;
    if (n >= 1) {
      // Area below (green): left-bottom -> right-bottom -> line (last->first) -> close
      try {
        const areaBelow = new Path2D();
        areaBelow.moveTo(margin, margin + drawAreaHeight);
        areaBelow.lineTo(margin + drawAreaWidth, margin + drawAreaHeight);
        areaBelow.lineTo(xPoints[n - 1], yPoints[n - 1]);
        for (let i = n - 2; i >= 0; i -= 1) {
          areaBelow.lineTo(xPoints[i], yPoints[i]);
        }
        areaBelow.closePath();
        ctx.fillStyle = greenGrad;
        ctx.fill(areaBelow);
      } catch (e) {
        // fallback manual path
        ctx.fillStyle = greenGrad;
        ctx.beginPath();
        ctx.moveTo(margin, margin + drawAreaHeight);
        ctx.lineTo(margin + drawAreaWidth, margin + drawAreaHeight);
        for (let i = n - 1; i >= 0; i -= 1) ctx.lineTo(xPoints[i], yPoints[i]);
        ctx.closePath();
        ctx.fill();
      }

      // Area above (red): left-top -> right-top -> line (last->first) -> close
      try {
        const areaAbove = new Path2D();
        areaAbove.moveTo(margin, margin);
        areaAbove.lineTo(margin + drawAreaWidth, margin);
        areaAbove.lineTo(xPoints[n - 1], yPoints[n - 1]);
        for (let i = n - 2; i >= 0; i -= 1) {
          areaAbove.lineTo(xPoints[i], yPoints[i]);
        }
        areaAbove.closePath();
        ctx.fillStyle = redGrad;
        ctx.fill(areaAbove);
      } catch (e) {
        ctx.fillStyle = redGrad;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin + drawAreaWidth, margin);
        for (let i = n - 1; i >= 0; i -= 1) ctx.lineTo(xPoints[i], yPoints[i]);
        ctx.closePath();
        ctx.fill();
      }
    }

    // subtle grid lines for structure
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = margin + (i / 4) * drawAreaHeight;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + drawAreaWidth, y);
      ctx.stroke();
    }

    // Draw crisp black eckige line on top
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2.5;
    ctx.stroke(linePath);

    // last point marker (black with thin white border)
    const lx = xPoints[xPoints.length - 1];
    const ly = yPoints[yPoints.length - 1];
    ctx.beginPath();
    ctx.fillStyle = "#000";
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // draw current values text (Yes/No) in the left-bottom corner, colored
    const lastYes = Math.round((yes[yes.length - 1] || 0) * 100);
    const lastNo = Math.round((no[no.length - 1] || 0) * 100);
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "bottom";
    const textX = margin + 6;
    const textYNo = margin + drawAreaHeight - 6; // bottom padding
    const textYYes = textYNo - 16; // stacked above

    ctx.fillStyle = "#198754"; // green for Yes
    ctx.fillText(`Yes ${lastYes}%`, textX, textYYes);
    ctx.fillStyle = "#dc3545"; // red for No
    ctx.fillText(`No ${lastNo}%`, textX, textYNo);
  } catch (e) {
    // drawing must not break page
    // eslint-disable-next-line no-console
    console.warn("drawMarketHistoryOnCanvas failed", e);
  }
}

// Redraw canvases on resize (debounced)
let _resizeTimer = null;
window.addEventListener("resize", () => {
  if (_resizeTimer) clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    try {
      updateSlidesWithMarkets(lastMarkets);
    } catch (e) {
      // ignore
    }
  }, 200);
});

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

  const host = window.location.hostname || 'localhost';
  const candidateUrls = [
    `${wsBase}/api/v1/ws/updates`,
    `ws://${host}:8000/api/v1/ws/updates`,
  ];

  let attempt = 0;

  function tryOpen() {
    const url = candidateUrls[attempt];
    try {
      marketSocket = new WebSocket(url);
    } catch (e) {
      // sync failure, try fallback
      if (attempt < candidateUrls.length - 1) {
        attempt += 1;
        setTimeout(tryOpen, 300);
        return;
      }
      setApiStatus("Live updates unavailable", "warn");
      return;
    }

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

    marketSocket.addEventListener("error", () => {
      // try next candidate if available
      try {
        marketSocket.close();
      } catch {}
      if (attempt < candidateUrls.length - 1) {
        attempt += 1;
        setTimeout(tryOpen, 500);
        return;
      }
      setApiStatus("Live updates unavailable", "warn");
    });

    marketSocket.addEventListener("close", () => {
      if (attempt < candidateUrls.length - 1) {
        attempt += 1;
        setTimeout(tryOpen, 500);
        return;
      }
      setApiStatus("Live updates reconnecting", "warn");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = window.setTimeout(() => {
        attempt = 0;
        tryOpen();
      }, 5000);
    });
  }

  tryOpen();
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
      // show only the 5 most recent bets, allow user to expand to see all
      const maxShown = 5;
      if (!betsPayload.length) {
        profileBetsList.innerHTML = '<li>No bets yet. Browse <a href="index.html#live-markets">live markets</a> to place your first bet.</li>';
      } else {
        const shown = betsPayload.slice(0, maxShown);
        profileBetsList.innerHTML = shown.map((bet) => `
            <li>
              <div>
                <strong>${bet.market_title || `Market ${bet.market_id}`}</strong>
                <small>${bet.choice ? "Yes" : "No"} · ${formatNumber(bet.amount)} Coins</small>
              </div>
              <a href="bet.html?id=${bet.id}">Details</a>
            </li>
          `).join("");

        const showMoreBtn = document.getElementById("showMoreBets");
        if (betsPayload.length > maxShown) {
          showMoreBtn.classList.remove("d-none");
          showMoreBtn.textContent = `Show ${betsPayload.length - maxShown} more`;
          showMoreBtn.onclick = () => {
            profileBetsList.innerHTML = betsPayload.map((bet) => `
                <li>
                  <div>
                    <strong>${bet.market_title || `Market ${bet.market_id}`}</strong>
                    <small>${bet.choice ? "Yes" : "No"} · ${formatNumber(bet.amount)} Coins</small>
                  </div>
                  <a href="bet.html?id=${bet.id}">Details</a>
                </li>
              `).join("");
            showMoreBtn.classList.add("d-none");
          };
        } else {
          showMoreBtn.classList.add("d-none");
        }
      }
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

    // Load notifications for the current user (if notifications UI present)
    try {
      const notifListEl = document.getElementById("notificationsList");
      if (notifListEl) {
        const notifResp = await apiFetch("/api/v1/user/me/notifications");
        const notifs = notifResp.ok ? await notifResp.json() : [];
        if (!notifs || !notifs.length) {
          notifListEl.innerHTML = '<li>No notifications</li>';
        } else {
          notifListEl.innerHTML = notifs.map((n) => `
              <li class="${n.is_read ? 'notification-read' : 'notification-unread'}">
                <div>
                  <div class="notification-message">${n.message || ''}</div>
                  <div class="notification-meta"><small>${formatDate(n.created_at)}</small></div>
                </div>
                ${n.is_read ? '' : `<button class="btn btn-sm btn-link mark-read-btn" data-id="${n.id}">Mark read</button>`}
              </li>
            `).join("");

          // Wire mark-as-read buttons
          document.querySelectorAll('.mark-read-btn').forEach((btn) => {
            btn.addEventListener('click', async (ev) => {
              const id = btn.dataset.id;
              try {
                const r = await apiFetch(`/api/v1/user/me/notifications/${id}/read`, { method: 'POST' });
                if (!r.ok) throw new Error('Mark read failed');
                btn.remove();
                const li = btn.closest('li');
                if (li) li.classList.remove('notification-unread');
              } catch (err) {
                console.error('Mark notification read failed', err);
              }
            });
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications', err);
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

    // draw the market history on the detail page canvas if present
    try {
      const canvas = document.getElementById("marketHistoryCanvas");
      if (canvas) {
        const resp = await fetch(`${apiBase}/api/v1/markets/${marketId}/history`);
        if (resp.ok) {
          const payload = await resp.json();
          drawMarketHistoryOnCanvas(canvas, payload.history || []);
        } else {
          drawMarketHistoryOnCanvas(canvas, []);
        }
      }
    } catch (err) {
      console.warn("Failed to draw market canvas", err);
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

async function loadAdminPage() {
  const adminStatus = document.getElementById("adminStatus");
  const adminMarketsList = document.getElementById("adminMarketsList");
  const adminCreateForm = document.getElementById("adminCreateMarketForm");
  const adminResolveForm = document.getElementById("adminResolveMarketForm");
  const adminDeleteForm = document.getElementById("adminDeleteMarketForm");
  const adminRecurringForm = document.getElementById("adminCreateRecurringForm");
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

  let isAdmin = false;
  let isTrustee = false;
  let isAdminOrTrustee = false;
  try {
    const userResponse = await apiFetch("/api/v1/user/me");
    if (!userResponse.ok) {
      throw new Error(`User check failed (${userResponse.status})`);
    }
    const user = await userResponse.json();
    if (user.role !== "admin" && user.role !== "trustee") {
      setAdminStatus("Admin or trustee access required.", "warn");
      return;
    }
    isAdmin = user.role === "admin";
    isTrustee = user.role === "trustee";
    isAdminOrTrustee = isAdmin || isTrustee;
  } catch (error) {
    console.error("Admin access check failed", error);
    setAdminStatus("Unable to verify admin access.", "warn");
    return;
  }

  setAdminStatus(isAdmin ? "Admin access confirmed." : "Trustee access confirmed.");

  // If user is a trustee (not full admin), hide creation/deletion UI
  if (!isAdmin) {
    try {
      if (adminCreateForm) {
        const sec = adminCreateForm.closest('.market-card');
        if (sec) sec.style.display = 'none';
      }
      if (adminDeleteForm) {
        const sec2 = adminDeleteForm.closest('.market-card');
        if (sec2) sec2.style.display = 'none';
      }
      if (adminRecurringForm) {
        const sec3 = adminRecurringForm.closest('.market-card');
        if (sec3) sec3.style.display = 'none';
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    const marketsResponse = await apiFetch(isAdminOrTrustee ? "/api/v1/markets/admin/list" : "/api/v1/markets/active");
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
        const marketsResponse = await apiFetch(isAdminOrTrustee ? "/api/v1/markets/admin/list" : "/api/v1/markets/active");
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
        const marketsResponse = await apiFetch(isAdminOrTrustee ? "/api/v1/markets/admin/list" : "/api/v1/markets/active");
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
        const marketsResponse = await apiFetch(isAdminOrTrustee ? "/api/v1/markets/admin/list" : "/api/v1/markets/active");
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

  // wire recurring schedule creation (admin only)
  if (adminRecurringForm) {
    adminRecurringForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (adminFormStatus) adminFormStatus.textContent = "Creating recurring schedule...";

      const title = adminRecurringForm.querySelector("input[name=title]")?.value?.trim();
      const description = adminRecurringForm.querySelector("textarea[name=description]")?.value?.trim() || null;
      const frequency = adminRecurringForm.querySelector("select[name=frequency]")?.value || 'daily';
      const interval = Number(adminRecurringForm.querySelector("input[name=interval]")?.value || 1);
      const durationUnits = Number(adminRecurringForm.querySelector("input[name=duration_units]")?.value || 1);
      const occurrencesVal = adminRecurringForm.querySelector("input[name=occurrences]")?.value;
      const occurrences = occurrencesVal ? Number(occurrencesVal) : null;
      const startDelay = Number(adminRecurringForm.querySelector("input[name=start_delay_minutes]")?.value || 0);
      const oddsYes = Number(adminRecurringForm.querySelector("input[name=initial_odds_yes]")?.value || 0.5);
      const oddsNo = Number(adminRecurringForm.querySelector("input[name=initial_odds_no]")?.value || 0.5);
      const onlyWeekdays = Boolean(adminRecurringForm.querySelector("input[name=only_weekdays]")?.checked);
      const excludeHolidays = Boolean(adminRecurringForm.querySelector("input[name=exclude_holidays]")?.checked);
      const holidayDates = adminRecurringForm.querySelector("input[name=holiday_dates]")?.value?.trim() || null;
      const startTime = adminRecurringForm.querySelector("input[name=start_time]")?.value || null;
      const durationMinutesVal = adminRecurringForm.querySelector("input[name=duration_minutes]")?.value;
      const durationMinutes = durationMinutesVal ? Number(durationMinutesVal) : null;

      const durationOk = (durationMinutes && durationMinutes > 0) || (durationUnits && durationUnits > 0);

      if (!title || interval < 1 || !durationOk) {
        if (adminFormStatus) adminFormStatus.textContent = "Provide title, interval and duration.";
        return;
      }

      try {
        const response = await apiFetch("/api/v1/markets/admin/recurring/schedule", {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            frequency,
            interval,
            duration_units: durationUnits,
            only_weekdays: onlyWeekdays,
            exclude_holidays: excludeHolidays,
            holiday_dates: holidayDates,
            start_time: startTime,
            duration_minutes: durationMinutes,
            occurrences,
            start_delay_minutes: startDelay,
            initial_odds_yes: oddsYes,
            initial_odds_no: oddsNo,
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Create failed (${response.status})`);
        }
        if (adminFormStatus) adminFormStatus.textContent = "Recurring schedule saved.";
        adminRecurringForm.reset();
      } catch (err) {
        console.error("Recurring schedule create failed", err);
        if (adminFormStatus) adminFormStatus.textContent = `Create failed: ${err.message}`;
      }
    });
  }

  // wire user admin button
  const openUserAdmin = document.getElementById("openUserAdmin");
  if (openUserAdmin) {
    openUserAdmin.addEventListener("click", () => {
      window.location.href = "user_admin.html";
    });
  }
}


async function loadUserAdminPage() {
  const status = document.getElementById("userAdminStatus");
  const list = document.getElementById("userList");
  const formStatus = document.getElementById("userAdminFormStatus");

  const setStatus = (t, tone = "ok") => {
    if (!status) return;
    status.textContent = t;
    status.classList.toggle("is-warn", tone !== "ok");
  };

  if (!getAuthToken()) {
    setStatus("Sign in to view users", "warn");
    return;
  }

  try {
    const resp = await apiFetch('/api/v1/user/me');
    if (!resp.ok) throw new Error('Not authenticated');
    const me = await resp.json();
    if (me.role !== 'admin') {
      setStatus('Admin required', 'warn');
      return;
    }
    setStatus('Loading users...');

    const searchInput = document.getElementById('userSearch');
    const q = searchInput?.value?.trim();
    const usersResp = await apiFetch(`/api/v1/user/all${q ? '?q=' + encodeURIComponent(q) : ''}`);
    if (!usersResp.ok) throw new Error('Could not load users');
    const users = await usersResp.json();
    if (!list) return;
    if (!users.length) {
      list.innerHTML = '<li>No users found</li>';
      return;
    }
    list.innerHTML = users.map((u) => `
      <li>
        <div>
          <strong>${u.name || u.username || u.email}</strong>
          <small>${u.email || ''}</small>
        </div>
        <div>
          <select data-user-id="${u.id}" class="form-select form-select-sm user-role-select">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
            <option value="trustee" ${u.role === 'trustee' ? 'selected' : ''}>trustee</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </div>
      </li>
    `).join('');

    // wire selects
    document.querySelectorAll('.user-role-select').forEach((sel) => {
      sel.addEventListener('change', async (ev) => {
        const s = ev.target;
        const uid = Number(s.dataset.userId);
        const newRole = s.value;
        try {
          const r = await apiFetch(`/api/v1/user/${uid}/role`, { method: 'POST', body: JSON.stringify({ role: newRole }) });
          if (!r.ok) throw new Error('Role update failed');
          if (formStatus) formStatus.textContent = 'Role updated';
        } catch (e) {
          if (formStatus) formStatus.textContent = 'Update failed';
          console.error('Role update failed', e);
        }
      });
    });

    // wire search button
    const searchBtn = document.getElementById('userSearchBtn');
    if (searchBtn) {
      searchBtn.onclick = async () => {
        await loadUserAdminPage();
      };
    }

    setStatus('Users loaded');
  } catch (e) {
    console.error('User admin load failed', e);
    setStatus('Could not load users', 'warn');
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

if (refreshMarketsButton) {
  refreshMarketsButton.addEventListener("click", () => {
    refreshDashboard();
  });
}

window.addEventListener("load", async () => {
  updateAuthUi();

  if (authCallbackStatus) {
    await handleAuthCallback();
    return;
  }

  if (profilePage) {
    await loadProfilePage();
  }

  if (marketPage) {
    await loadMarketPage();
  }

  if (betPage) {
    await loadBetPage();
  }

  if (adminPage) {
    if (typeof loadAdminPage === "function") {
      await loadAdminPage();
    } else {
      console.warn("loadAdminPage is not defined; skipping admin initialization.");
    }
  }
  // recurring handler attached inside loadAdminPage

  // Initialize user admin page if present
  if (document.getElementById("userAdminPage")) {
    try {
      await loadUserAdminPage();
    } catch (e) {
      console.warn("Failed to init user admin page", e);
    }
  }

  const hasDashboard = Boolean(apiStatus || liveMarketsList || marketFeedList);
  if (hasDashboard) {
    setApiStatus("Connecting to backend...");

    if (await fetchHealth()) {
      setApiStatus("Backend online", "ok");
    } else {
      setApiStatus("Backend offline", "warn");
    }

    await refreshDashboard();
    connectMarketSocket();

    setInterval(refreshDashboard, 30000);
  }
});
