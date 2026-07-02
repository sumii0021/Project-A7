let appState = {
  accounts: [],
  activeSession: null,
};

let chartInstance = null;
let isSignupMode = false;

document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseFromStorage();
  checkExistingSessionOnBoot();
  initAuthHandlers();
  initNavigation();
  initModalHandlers();
  initFormHandlers();
  initSearchAndFilters();
  initThemeToggle();

  if (typeof Chart === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = () => {
      if (appState.activeSession) updateUI();
    };
    document.head.appendChild(script);
  }
});

function loadDatabaseFromStorage() {
  const database = localStorage.getItem("fintrack_db");
  if (database) {
    try {
      appState.accounts = JSON.parse(database);
    } catch (e) {
      console.error(
        "Critical Parse Error: Reindexing runtime instance framework.",
      );
      appState.accounts = [];
    }
  }
}

function saveDatabaseToStorage() {
  localStorage.setItem("fintrack_db", JSON.stringify(appState.accounts));
}

function checkExistingSessionOnBoot() {
  const activeUserEmail = localStorage.getItem("fintrack_session_email");
  if (activeUserEmail) {
    const account = appState.accounts.find(
      (acc) => acc.email === activeUserEmail,
    );
    if (account) {
      appState.activeSession = account;
      displayAppWorkspace();
      return;
    }
  }
  displayAuthScreen();
}

function initAuthHandlers() {
  const authForm = document.getElementById("authForm");
  const authContainer = document.getElementById("auth-container");

  isSignupMode = true;

  authContainer.addEventListener("click", (e) => {
    if (e.target && e.target.id === "authToggleLink") {
      e.preventDefault();

      isSignupMode = !isSignupMode;

      const subtitle = document.getElementById("auth-subtitle");
      const submitBtn = document.getElementById("authSubmitBtn");
      const toggleLink = document.getElementById("authToggleLink");
      const toggleMessage = document.getElementById("authToggleMessage");
      const nameField = document.getElementById("authName");
      const nameGroup = document.getElementById("nameGroup");

      if (isSignupMode) {
        subtitle.textContent =
          "Create an account";
        submitBtn.textContent = "Create Account";

        toggleMessage.firstChild.textContent = "Already have an account? ";
        toggleLink.textContent = "Sign In";

        nameGroup.style.display = "flex";
        nameField.required = true;
      } else {
        subtitle.textContent = "Sign in to your account";
        submitBtn.textContent = "Sign In";

        toggleMessage.firstChild.textContent = "New to FinTrack Pro? ";
        toggleLink.textContent = "Create an account";

        nameGroup.style.display = "none";
        nameField.required = false;
        nameField.value = "";
      }
    }
  });

  authForm.onsubmit = (e) => {
    e.preventDefault();
    const email = document
      .getElementById("authEmail")
      .value.trim()
      .toLowerCase();
    const password = document.getElementById("authPassword").value;

    if (isSignupMode) {
      const name =
        document.getElementById("authName").value.trim() || "User Node";

      if (appState.accounts.some((acc) => acc.email === email)) {
        alert("This email address is already registered.");
        return;
      }

      const newAccount = {
        email: email,
        password: password,
        profile: { name: name, currency: "$", darkMode: true },
        transactions: [],
      };

      appState.accounts.push(newAccount);
      saveDatabaseToStorage();

      appState.activeSession = newAccount;
      localStorage.setItem("fintrack_session_email", email);

      alert("Account created successfully!");
      displayAppWorkspace();
    } else {
      const account = appState.accounts.find(
        (acc) => acc.email === email && acc.password === password,
      );
      if (!account) {
        alert("Invalid credentials. Access Denied.");
        return;
      }

      appState.activeSession = account;
      localStorage.setItem("fintrack_session_email", email);
      displayAppWorkspace();
    }
  };

  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("fintrack_session_email");
    appState.activeSession = null;
    displayAuthScreen();
  };
}
function displayAuthScreen() {
  document.getElementById("app-container").style.display = "none";
  document.getElementById("auth-container").style.display = "flex";
  document.getElementById("authForm").reset();
}

function displayAppWorkspace() {
  document.getElementById("auth-container").style.display = "none";
  document.getElementById("app-container").style.display = "flex";

  applySystemTheme(appState.activeSession.profile.darkMode);
  updateUI();
}

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-menu .nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      const targetView = item.getAttribute("data-target");
      document
        .querySelectorAll(".view-section")
        .forEach((view) => view.classList.remove("active"));
      document.getElementById(targetView).classList.add("active");

      if (targetView === "settings-view") {
        document.getElementById("settingName").value =
          appState.activeSession.profile.name;
        document.getElementById("settingCurrency").value =
          appState.activeSession.profile.currency;
      }
    });
  });
}

function initModalHandlers() {
  const modal = document.getElementById("transactionModal");
  const openBtn = document.getElementById("openAddModalBtn");
  const closeBtn = document.querySelector(".close-modal");

  openBtn.onclick = () => {
    document.getElementById("transactionForm").reset();
    document.getElementById("txId").value = "";
    document.getElementById("modalTitle").textContent = "Add Transaction";
    document.getElementById("txDate").value = new Date()
      .toISOString()
      .split("T")[0];
    modal.style.display = "flex";
  };

  closeBtn.onclick = () => (modal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
}

function initFormHandlers() {
  document.getElementById("transactionForm").onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById("txId").value;
    const txData = {
      id: id ? parseInt(id) : Date.now(),
      type: document.getElementById("txType").value,
      description: document.getElementById("txDescription").value.trim(),
      amount: Math.abs(parseFloat(document.getElementById("txAmount").value)),
      date: document.getElementById("txDate").value,
      category: document.getElementById("txCategory").value,
    };

    if (id) {
      const index = appState.activeSession.transactions.findIndex(
        (t) => t.id === txData.id,
      );
      if (index !== -1) appState.activeSession.transactions[index] = txData;
    } else {
      appState.activeSession.transactions.unshift(txData);
    }

    saveDatabaseToStorage();
    updateUI();
    document.getElementById("transactionModal").style.display = "none";
  };

  document.getElementById("settingsForm").onsubmit = (e) => {
    e.preventDefault();
    appState.activeSession.profile.name = document
      .getElementById("settingName")
      .value.trim();
    appState.activeSession.profile.currency =
      document.getElementById("settingCurrency").value;
    saveDatabaseToStorage();
    updateUI();
    alert("Configuration properties altered.");
  };

  document.getElementById("resetDataBtn").onclick = () => {
    if (
      confirm(
        "Confirm action? Data payload wipe will delete database transaction fields.",
      )
    ) {
      appState.activeSession.transactions = [];
      saveDatabaseToStorage();
      updateUI();
    }
  };
}

function initSearchAndFilters() {
  document.getElementById("searchInput").oninput = () => renderTable();
  document.getElementById("typeFilter").onchange = () => renderTable();
}

function updateUI() {
  if (!appState.activeSession) return;

  const profile = appState.activeSession.profile;
  document.getElementById("topbarName").textContent = profile.name;

  let incomeSum = 0;
  let expenseSum = 0;

  appState.activeSession.transactions.forEach((t) => {
    if (t.type === "income") incomeSum += t.amount;
    else expenseSum += t.amount;
  });

  const totalBalance = incomeSum - expenseSum;
  const curr = profile.currency;

  document.getElementById("displayBalance").textContent =
    `${totalBalance < 0 ? "-" : ""}${curr}${Math.abs(totalBalance).toFixed(2)}`;
  document.getElementById("displayIncome").textContent =
    `${curr}${incomeSum.toFixed(2)}`;
  document.getElementById("displayExpense").textContent =
    `${curr}${expenseSum.toFixed(2)}`;
  document.getElementById("displayCount").textContent =
    appState.activeSession.transactions.length;

  renderTable();
  renderChart(incomeSum, expenseSum);
}

function renderTable() {
  const tableBody = document.getElementById("transactionTableBody");
  const searchQuery = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const filterType = document.getElementById("typeFilter").value;
  const curr = appState.activeSession.profile.currency;

  tableBody.innerHTML = "";

  const filtered = appState.activeSession.transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery) ||
      t.category.toLowerCase().includes(searchQuery);
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 24px;">No transactions linked to calculation index filters.</td></tr>`;
    return;
  }

  filtered.forEach((t) => {
    const tr = document.createElement("tr");
    const prefix = t.type === "income" ? "+" : "-";
    const textClass = t.type === "income" ? "text-green" : "text-red";

    tr.innerHTML = `
            <td>${t.date}</td>
            <td><strong>${escapeHtml(t.description)}</strong></td>
            <td><span class="tag">${escapeHtml(t.category)}</span></td>
            <td class="${textClass}">${prefix}${curr}${t.amount.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editTransaction(${t.id})"><i class="ri-edit-line"></i></button>
                <button class="action-btn btn-delete" onclick="deleteTransaction(${t.id})"><i class="ri-delete-bin-6-line"></i></button>
            </td>
        `;
    tableBody.appendChild(tr);
  });
}

function initThemeToggle() {
  const toggle = document.getElementById("darkModeToggle");

  toggle.checked = appState.activeSession
    ? appState.activeSession.profile.darkMode
    : true;

  toggle.onchange = () => {
    const isDark = toggle.checked;
    if (appState.activeSession) {
      appState.activeSession.profile.darkMode = isDark;
      saveDatabaseToStorage();
    }
    applySystemTheme(isDark);
  };
}

function applySystemTheme(isDark) {
  if (isDark) {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    document.getElementById("darkModeToggle").checked = true;
  } else {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
    document.getElementById("darkModeToggle").checked = false;
  }

  if (appState.activeSession && typeof Chart !== "undefined") updateUI();
}

function renderChart(income, expense) {
  const ctx = document.getElementById("cashFlowChart");
  if (!ctx || typeof Chart === "undefined") return;

  if (chartInstance) chartInstance.destroy();

  const isDark = document.body.classList.contains("dark-theme");
  const labelColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: [
            "rgba(16, 185, 129, 0.25)",
            "rgba(239, 68, 68, 0.25)",
          ],
          borderColor: ["#10b981", "#ef4444"],
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: labelColor },
        },
        x: { grid: { display: false }, ticks: { color: labelColor } },
      },
    },
  });
}

window.editTransaction = function (id) {
  const tx = appState.activeSession.transactions.find((t) => t.id === id);
  if (!tx) return;

  document.getElementById("txId").value = tx.id;
  document.getElementById("txType").value = tx.type;
  document.getElementById("txDescription").value = tx.description;
  document.getElementById("txAmount").value = tx.amount;
  document.getElementById("txDate").value = tx.date;
  document.getElementById("txCategory").value = tx.category;

  document.getElementById("modalTitle").textContent = "Edit Transaction";
  document.getElementById("transactionModal").style.display = "flex";
};

window.deleteTransaction = function (id) {
  if (confirm("Permanently erase transaction record?")) {
    appState.activeSession.transactions =
      appState.activeSession.transactions.filter((t) => t.id !== id);
    saveDatabaseToStorage();
    updateUI();
  }
};

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}