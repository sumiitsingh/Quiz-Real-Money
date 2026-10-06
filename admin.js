document.addEventListener("DOMContentLoaded", () => {
  const adminLoginForm = document.getElementById("adminLoginForm");

  if (adminLoginForm) {
    setupAdminLogin();
    return;
  }

  const winnerTableBody = document.getElementById("winnerTableBody");

  if (winnerTableBody) {
    setupAdminDashboard();
  }
});


/* =========================================================
   ADMIN LOGIN
========================================================= */

function setupAdminLogin() {
  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");
  const button = document.getElementById("adminLoginBtn");
  const message = document.getElementById("adminLoginMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage(
        message,
        "Please enter email and password.",
        "error"
      );
      return;
    }

    button.disabled = true;
    button.textContent = "Checking...";

    try {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Login failed.");
      }

      const { data: profile, error: profileError } =
        await supabaseClient
          .from("profiles")
          .select("id, full_name, email, role")
          .eq("id", data.user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile || profile.role !== "admin") {
        await supabaseClient.auth.signOut();

        throw new Error(
          "This account does not have admin access."
        );
      }

      showMessage(
        message,
        "Admin login successful. Redirecting...",
        "success"
      );

      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 700);

    } catch (error) {
      console.error("Admin login error:", error);

      showMessage(
        message,
        error.message || "Admin login failed.",
        "error"
      );

      button.disabled = false;
      button.textContent = "Login as Admin";
    }
  });
}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

async function setupAdminDashboard() {
  const loading = document.getElementById("winnerLoading");
  const noWinners = document.getElementById("noWinners");
  const tableWrapper =
    document.getElementById("winnerTableWrapper");

  const adminEmailDisplay =
    document.getElementById("adminEmailDisplay");

  const logoutBtn =
    document.getElementById("adminLogoutBtn");

  const refreshBtn =
    document.getElementById("refreshWinnersBtn");

  try {
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const session = sessionData.session;

    if (!session) {
      window.location.href = "admin-login.html";
      return;
    }

    const user = session.user;

    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile || profile.role !== "admin") {
      await supabaseClient.auth.signOut();

      window.location.href = "admin-login.html";
      return;
    }

    if (adminEmailDisplay) {
      adminEmailDisplay.textContent =
        profile.email || user.email || "";
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "admin-login.html";
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        await loadWinners();
      });
    }

    await loadWinners();

  } catch (error) {
    console.error("Admin dashboard error:", error);

    loading.style.display = "none";

    showAdminMessage(
      error.message || "Unable to load admin dashboard.",
      "error"
    );
  }


  /* =======================================================
     LOAD WINNERS
  ======================================================= */

  async function loadWinners() {
    loading.style.display = "block";
    noWinners.style.display = "none";
    tableWrapper.style.display = "none";

    const tbody =
      document.getElementById("winnerTableBody");

    tbody.innerHTML = "";

    try {

      /*
       * We only read payment_requests.
       *
       * A payment request is created only when
       * a player claims a reward.
       */

      const { data: payments, error } =
        await supabaseClient
          .from("payment_requests")
          .select(`
            id,
            game_id,
            user_id,
            amount,
            status,
            payout_method,
            payout_identifier,
            admin_note,
            requested_at,
            updated_at,
            profiles (
              full_name,
              email,
              upi_id,
              upi_number
            ),
            games (
              id,
              status,
              correct_answers,
              questions_answered,
              reward_amount,
              reward_claimed,
              created_at,
              finished_at
            )
          `)
          .order("requested_at", {
            ascending: false
          });

      if (error) {
        throw error;
      }

      loading.style.display = "none";

      if (!payments || payments.length === 0) {
        noWinners.style.display = "block";
        updateStats([]);
        return;
      }

      /*
       * Extra frontend safety:
       * only show actual claimed reward requests.
       */

      const winners = payments.filter((payment) => {
        return (
          payment.amount > 0 &&
          payment.games &&
          payment.games.reward_claimed === true
        );
      });

      if (winners.length === 0) {
        noWinners.style.display = "block";
        updateStats([]);
        return;
      }

      winners.forEach((payment) => {
        const row = createWinnerRow(payment);
        tbody.appendChild(row);
      });

      updateStats(winners);

      tableWrapper.style.display = "block";

    } catch (error) {
      console.error("Load winners error:", error);

      loading.style.display = "none";

      showAdminMessage(
        error.message || "Unable to load winners.",
        "error"
      );
    }
  }


  /* =======================================================
     CREATE WINNER ROW
  ======================================================= */

  function createWinnerRow(payment) {
    const row = document.createElement("tr");

    const profile = payment.profiles || {};
    const game = payment.games || {};

    const name =
      profile.full_name ||
      "Unknown Player";

    const email =
      profile.email ||
      "No email";

    const amount =
      Number(payment.amount || 0);

    const requestedAt =
      formatDate(payment.requested_at);

    const status =
      payment.status || "pending";

    const correctAnswers =
      Number(game.correct_answers || 0);

    const questionsAnswered =
      Number(game.questions_answered || 0);

    const upiId =
      profile.upi_id ||
      (
        payment.payout_method === "upi_id"
          ? payment.payout_identifier
          : ""
      );

    const upiNumber =
      profile.upi_number ||
      (
        payment.payout_method === "upi_number"
          ? payment.payout_identifier
          : ""
      );

    let upiHtml = "";

    if (upiId) {
      upiHtml += `
        <div class="upi-line">
          <span>UPI ID:</span>
          <strong>${escapeHtml(upiId)}</strong>
        </div>
      `;
    }

    if (upiNumber) {
      upiHtml += `
        <div class="upi-line">
          <span>Mobile:</span>
          <strong>${escapeHtml(upiNumber)}</strong>
        </div>
      `;
    }

    if (!upiHtml) {
      upiHtml = `
        <span class="no-upi">
          Not provided
        </span>
      `;
    }

    row.innerHTML = `
      <td>
        <div class="winner-name">
          ${escapeHtml(name)}
        </div>

        <div class="winner-email">
          ${escapeHtml(email)}
        </div>
      </td>

      <td>
        <div class="reward-amount">
          ₹${amount.toFixed(2)}
        </div>
      </td>

      <td>
        <div class="upi-details">
          ${upiHtml}
        </div>
      </td>

      <td>
        <div class="game-result">
          <strong>
            ${correctAnswers} Correct
          </strong>

          <span>
            ${questionsAnswered} Questions
          </span>
        </div>
      </td>

      <td>
        <span class="date-text">
          ${requestedAt}
        </span>
      </td>

      <td>
        <span class="status-badge status-${status}">
          ${capitalize(status)}
        </span>
      </td>

      <td>
        <div class="action-buttons">

          ${
            status !== "processing"
              ? `
                <button
                  class="payment-action processing-action"
                  data-id="${payment.id}"
                  data-status="processing"
                >
                  Processing
                </button>
              `
              : ""
          }

          ${
            status !== "paid"
              ? `
                <button
                  class="payment-action paid-action"
                  data-id="${payment.id}"
                  data-status="paid"
                >
                  Mark Paid
                </button>
              `
              : `
                <span class="paid-label">
                  ✓ Paid
                </span>
              `
          }

        </div>
      </td>
    `;

    const actionButtons =
      row.querySelectorAll(".payment-action");

    actionButtons.forEach((button) => {
      button.addEventListener("click", async () => {

        const paymentId =
          button.dataset.id;

        const newStatus =
          button.dataset.status;

        await updatePaymentStatus(
          paymentId,
          newStatus,
          button
        );
      });
    });

    return row;
  }


  /* =======================================================
     UPDATE PAYMENT STATUS
  ======================================================= */

  async function updatePaymentStatus(
    paymentId,
    newStatus,
    button
  ) {

    if (!paymentId || !newStatus) {
      return;
    }

    const statusText =
      newStatus === "paid"
        ? "paid"
        : "processing";

    const confirmation =
      confirm(
        `Are you sure you want to mark this payment as ${statusText}?`
      );

    if (!confirmation) {
      return;
    }

    button.disabled = true;
    button.textContent = "Updating...";

    try {

      const { data, error } =
        await supabaseClient.rpc(
          "admin_update_payment_status",
          {
            p_payment_id: paymentId,
            p_status: newStatus,
            p_admin_note: null
          }
        );

      if (error) {
        throw error;
      }

      if (!data || data.success !== true) {
        throw new Error(
          "Payment status update failed."
        );
      }

      showAdminMessage(
        `Payment status changed to ${newStatus}.`,
        "success"
      );

      await loadWinners();

    } catch (error) {

      console.error(
        "Payment status update error:",
        error
      );

      showAdminMessage(
        error.message ||
          "Unable to update payment status.",
        "error"
      );

      button.disabled = false;

      button.textContent =
        newStatus === "paid"
          ? "Mark Paid"
          : "Processing";
    }
  }
}


/* =========================================================
   STATISTICS
========================================================= */

function updateStats(winners) {

  const total =
    winners.length;

  const pending =
    winners.filter(
      (item) => item.status === "pending"
    ).length;

  const processing =
    winners.filter(
      (item) => item.status === "processing"
    ).length;

  const paid =
    winners.filter(
      (item) => item.status === "paid"
    ).length;

  const totalReward =
    winners.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  const totalElement =
    document.getElementById("totalWinners");

  const pendingElement =
    document.getElementById("pendingWinners");

  const processingElement =
    document.getElementById("processingWinners");

  const paidElement =
    document.getElementById("paidWinners");

  const rewardElement =
    document.getElementById("totalReward");

  if (totalElement) {
    totalElement.textContent = total;
  }

  if (pendingElement) {
    pendingElement.textContent = pending;
  }

  if (processingElement) {
    processingElement.textContent = processing;
  }

  if (paidElement) {
    paidElement.textContent = paid;
  }

  if (rewardElement) {
    rewardElement.textContent =
      `₹${totalReward.toFixed(2)}`;
  }
}


/* =========================================================
   HELPERS
========================================================= */

function showMessage(
  element,
  message,
  type
) {
  if (!element) {
    return;
  }

  element.textContent = message;

  element.className =
    `auth-message ${type}`;
}


function showAdminMessage(
  message,
  type
) {
  const element =
    document.getElementById("adminMessage");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className =
    `admin-message ${type}`;

  setTimeout(() => {
    element.textContent = "";
    element.className = "admin-message";
  }, 4000);
}


function formatDate(dateString) {

  if (!dateString) {
    return "—";
  }

  const date =
    new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function capitalize(value) {

  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}