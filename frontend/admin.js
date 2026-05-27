const adminLoginPanel = document.getElementById("adminLoginPanel");
const adminDashboard = document.getElementById("adminDashboard");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminLogoutButton = document.getElementById("adminLogoutButton");
const adminModeButton = document.getElementById("AdminModeButton");
const adminModeIcon = document.getElementById("adminModeIcon");
const resetLocalStorageButton = document.getElementById("resetLocalStorageButton");
const adminUserSearch = document.getElementById("adminUserSearch");
const adminUserList = document.getElementById("adminUserList");
const adminActionMessage = document.getElementById("adminActionMessage");

const adminSessionKey = "htlPredictAdminLoggedIn";
const themeStorageKey = "htlPredictTheme";
const usersStorageKey = "htlPredictUsers";

const demoUsers = [
  { username: "leo", status: "active", kicked: false, passwordReset: "" },
  { username: "max", status: "active", kicked: false, passwordReset: "" },
  { username: "sara", status: "active", kicked: false, passwordReset: "" },
  { username: "testuser", status: "active", kicked: false, passwordReset: "" }
];

function updateAdminThemeButton(theme) {
  const isDarkMode = theme === "dark";

  adminModeIcon.textContent = isDarkMode ? "☀" : "☾";
  adminModeButton.setAttribute("aria-label", isDarkMode ? "Light Mode aktivieren" : "Dark Mode aktivieren");
  adminModeButton.setAttribute("title", isDarkMode ? "Light Mode aktivieren" : "Dark Mode aktivieren");
}

const savedTheme = localStorage.getItem(themeStorageKey);

if (savedTheme === "dark" || savedTheme === "light") {
  document.documentElement.setAttribute("data-bs-theme", savedTheme);
}

updateAdminThemeButton(document.documentElement.getAttribute("data-bs-theme"));

adminModeButton.addEventListener("click", () => {
  const html = document.documentElement;
  const nextTheme = html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";

  html.setAttribute("data-bs-theme", nextTheme);
  localStorage.setItem(themeStorageKey, nextTheme);
  updateAdminThemeButton(nextTheme);
});

function getUsers() {
  const storedUsers = localStorage.getItem(usersStorageKey);

  if (!storedUsers) {
    localStorage.setItem(usersStorageKey, JSON.stringify(demoUsers));
    return demoUsers;
  }

  try {
    return JSON.parse(storedUsers);
  } catch (error) {
    localStorage.setItem(usersStorageKey, JSON.stringify(demoUsers));
    return demoUsers;
  }
}

function saveUsers(users) {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
}

function showAdminDashboard() {
  adminLoginPanel.classList.add("is-hidden");
  adminDashboard.classList.remove("is-hidden");
  renderUsers();
}

function showAdminLogin() {
  adminDashboard.classList.add("is-hidden");
  adminLoginPanel.classList.remove("is-hidden");
}

function showActionMessage(message) {
  adminActionMessage.textContent = message;
}

function renderUsers() {
  const searchTerm = adminUserSearch.value.trim().toLowerCase();
  const users = getUsers().filter((user) => user.username.toLowerCase().includes(searchTerm));

  if (users.length === 0) {
    adminUserList.innerHTML = "<li>Keine Benutzer gefunden.</li>";
    return;
  }

  adminUserList.innerHTML = users.map((user) => `
    <li>
      <div>
        <strong>${user.username}</strong>
        <span>${user.status === "banned" ? "Gesperrt" : "Aktiv"}${user.kicked ? " | Gekickt" : ""}</span>
        ${user.passwordReset ? `<small>Neues Passwort: ${user.passwordReset}</small>` : ""}
      </div>
      <div class="admin-user-actions">
        <button type="button" data-action="kick" data-username="${user.username}">Kicken</button>
        <button type="button" data-action="ban" data-username="${user.username}">Sperren</button>
        <button type="button" data-action="unban" data-username="${user.username}">Entsperren</button>
        <button type="button" data-action="reset-password" data-username="${user.username}">Passwort resetten</button>
      </div>
    </li>
  `).join("");
}

function updateUser(username, updater) {
  const users = getUsers().map((user) => {
    if (user.username !== username) {
      return user;
    }

    return updater(user);
  });

  saveUsers(users);
  renderUsers();
}

function createTemporaryPassword() {
  return `Reset${Math.floor(1000 + Math.random() * 9000)}`;
}

if (sessionStorage.getItem(adminSessionKey) === "true") {
  showAdminDashboard();
}

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = document.getElementById("adminUsername").value;
  const password = document.getElementById("adminPassword").value;

  if (username === "admin" && password === "admin") {
    sessionStorage.setItem(adminSessionKey, "true");
    adminLoginMessage.textContent = "";
    showAdminDashboard();
    return;
  }

  adminLoginMessage.textContent = "Falscher Benutzer oder falsches Passwort.";
});

adminLogoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(adminSessionKey);
  showAdminLogin();
});

resetLocalStorageButton.addEventListener("click", () => {
  localStorage.clear();
  localStorage.setItem(usersStorageKey, JSON.stringify(demoUsers));
  renderUsers();
  showActionMessage("LocalStorage wurde geloescht.");
});

adminUserSearch.addEventListener("input", renderUsers);

adminUserList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");

  if (!actionButton) {
    return;
  }

  const username = actionButton.dataset.username;
  const action = actionButton.dataset.action;

  if (action === "kick") {
    updateUser(username, (user) => ({ ...user, kicked: true }));
    showActionMessage(`${username} wurde gekickt.`);
  }

  if (action === "ban") {
    updateUser(username, (user) => ({ ...user, status: "banned" }));
    showActionMessage(`${username} wurde gesperrt.`);
  }

  if (action === "unban") {
    updateUser(username, (user) => ({ ...user, status: "active", kicked: false }));
    showActionMessage(`${username} wurde entsperrt.`);
  }

  if (action === "reset-password") {
    const temporaryPassword = createTemporaryPassword();
    updateUser(username, (user) => ({ ...user, passwordReset: temporaryPassword }));
    showActionMessage(`Passwort fuer ${username} wurde zurueckgesetzt.`);
  }
});
