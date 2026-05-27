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

const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");
const openLoginModalButton = document.getElementById("openLoginModal");
const openSignupModalButton = document.getElementById("openSignupModal");

function openModal(modal) {
  modal.classList.add("is-open");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
}

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

// Slideshow
let slideIndex = 1;
showSlides(slideIndex);

// Next/previous controls
function plusSlides(n) {
  showSlides(slideIndex += n);
}

// Thumbnail image controls
function currentSlide(n) {
  showSlides(slideIndex = n);
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  let dots = document.getElementsByClassName("dot");

  if (n > slides.length) {slideIndex = 1}

  if (n < 1) {slideIndex = slides.length}

  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }

  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }

  slides[slideIndex-1].style.display = "block";
  dots[slideIndex-1].className += " active";
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

  slider.querySelectorAll("[data-trade-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      showTradeSlide(tradeSlideIndex + Number(button.dataset.tradeDirection));
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

document.querySelectorAll(".prediction-card").forEach((predictionCard, marketIndex) => {
  const predictionButtons = predictionCard.querySelectorAll(".prediction-buttons button");
  const cardFooter = predictionCard.querySelector("footer");

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
        marketIndex,
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
const coinStorageKey = "htlPredictCoins";
const coinDailyStorageKey = "htlPredictLastDailyBonus";
const marketVoteStorageKey = "htlPredictMarketVotes";
const voteHistoryStorageKey = "htlPredictVoteHistory";
let selectedMarketTopic = "all";
let selectedMarketStatus = "all";
let selectedSearchTerm = "";
let toastTimeout;

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
    coinBalance += 10;
    localStorage.setItem(coinDailyStorageKey, todayKey);
    setCoinBalance(coinBalance);
    showVoteToast("Daily Bonus: 10 Coins erhalten!");
    return;
  }

  setCoinBalance(coinBalance);
}

addDailyCoins();
initPredictionVotes();
renderVoteHistory();
filterPredictionCards();

if (searchInput) {
  searchInput.closest("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  searchInput.addEventListener("input", () => {
    selectedSearchTerm = searchInput.value.trim().toLowerCase();
    filterPredictionCards();
  });
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

function getMarketVotes(predictionCard, marketIndex) {
  const storedVotes = getStoredMarketVotes();
  return storedVotes[marketIndex] || getDefaultMarketVotes(predictionCard);
}

function saveMarketVotes(marketIndex, votes) {
  const storedVotes = getStoredMarketVotes();
  storedVotes[marketIndex] = votes;
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

function addPredictionVote(predictionCard, marketIndex, selectedOutcome, selectedStake) {
  const votes = getMarketVotes(predictionCard, marketIndex);
  votes[selectedOutcome] += selectedStake;
  saveMarketVotes(marketIndex, votes);
  renderMarketVotes(predictionCard, votes);
}

function initPredictionVotes() {
  document.querySelectorAll(".prediction-card").forEach((predictionCard, marketIndex) => {
    renderMarketVotes(predictionCard, getMarketVotes(predictionCard, marketIndex));
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
