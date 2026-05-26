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

let slideIndex = 1;
let reconnectTimer = null;
let marketSocket = null;
let lastMarkets = [];

function setApiStatus(text, tone = "ok") {
  if (!apiStatus) {
    return;
  }

  apiStatus.textContent = text;
  apiStatus.classList.toggle("is-warn", tone !== "ok");
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

  if (liveMarketsList) {
    liveMarketsList.innerHTML = sortedMarkets.length
      ? sortedMarkets.map((market, index) => `
          <li>
            <span>${index + 1}. ${getMarketLabel(market, index)}</span>
            <strong>${formatNumber(market.current_pool)} Coins</strong>
          </li>
        `).join("")
      : '<li><span>No active markets yet</span><strong>0</strong></li>';
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

openLoginModalButton.addEventListener("click", () => {
  openModal(loginModal);
});

openSignupModalButton.addEventListener("click", () => {
  openModal(signupModal);
});

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
  setApiStatus("Connecting to backend...");

  if (await fetchHealth()) {
    setApiStatus("Backend online", "ok");
  } else {
    setApiStatus("Backend offline", "warn");
  }

  await refreshDashboard();
  connectMarketSocket();

  setInterval(refreshDashboard, 30000);
});
