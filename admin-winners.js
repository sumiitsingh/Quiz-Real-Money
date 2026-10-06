let adminUser = null;
let winnersData = [];


document.addEventListener("DOMContentLoaded", async () => {

  setupButtons();

  await loadWinners();

});


/* ================================
   BUTTONS
================================ */

function setupButtons() {

  document
    .getElementById("dashboardBtn")
    .addEventListener("click", () => {

      window.location.href = "admin-dashboard.html";

    });


  document
    .getElementById("paymentsBtn")
    .addEventListener("click", () => {

      window.location.href = "admin-payments.html";

    });


  document
    .getElementById("refreshBtn")
    .addEventListener("click", async () => {

      await loadWinners();

    });


  document
    .getElementById("logoutBtn")
    .addEventListener("click", logoutAdmin);

}


/* ================================
   LOAD WINNERS
================================ */

async function loadWinners() {

  try {

    showLoading(true);

    hideError();

    hideEmpty();

    hideWinners();


    // Current user
    const {
      data: {
        user
      },
      error: userError
    } =
      await supabaseClient.auth.getUser();


    if (userError) {
      throw userError;
    }


    if (!user) {

      window.location.href = "admin-login.html";

      return;

    }


    adminUser = user;


    // Verify admin role
    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role
        `)
        .eq("id", user.id)
        .single();


    if (profileError) {
      throw profileError;
    }


    if (!profile || profile.role !== "admin") {

      window.location.href = "dashboard.html";

      return;

    }


    document.getElementById("adminName").textContent =
      profile.full_name?.trim() || "Admin";


    // Get claimed winner payment requests
    const {
      data,
      error
    } =
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
          requested_at,
          updated_at,

          profiles (
            full_name,
            email,
            upi_id,
            upi_number
          ),

          games (
            status,
            correct_answers,
            questions_answered,
            reward_amount,
            reward_claimed,
            created_at
          )
        `)
        .gt("amount", 0)
        .order("requested_at", {
          ascending: false
        });


    if (error) {
      throw error;
    }


    // Only actual claimed winners
    winnersData = (data || []).filter(payment => {

      return (
        payment.games &&
        payment.games.reward_claimed === true
      );

    });


    updateStats();

    renderWinners();


  } catch (error) {

    console.error(
      "Admin winners error:",
      error
    );


    showError(
      error.message ||
      "Winners load nahi ho paye."
    );


  } finally {

    showLoading(false);

  }

}


/* ================================
   UPDATE STATS
================================ */

function updateStats() {

  const totalWinners =
    winnersData.length;


  const totalReward =
    winnersData.reduce(
      (total, winner) => {

        return total +
          Number(winner.amount || 0);

      },
      0
    );


  const pendingCount =
    winnersData.filter(
      winner => winner.status === "pending"
    ).length;


  const paidCount =
    winnersData.filter(
      winner => winner.status === "paid"
    ).length;


  document.getElementById("totalWinners").textContent =
    totalWinners;


  document.getElementById("totalReward").textContent =
    `₹${formatMoney(totalReward)}`;


  document.getElementById("pendingCount").textContent =
    pendingCount;


  document.getElementById("paidCount").textContent =
    paidCount;

}


/* ================================
   RENDER
================================ */

function renderWinners() {

  const tbody =
    document.getElementById(
      "winnersTableBody"
    );


  tbody.innerHTML = "";


  if (winnersData.length === 0) {

    showEmpty();

    return;

  }


  winnersData.forEach(winner => {

    const profile =
      winner.profiles || {};


    const game =
      winner.games || {};


    const row =
      document.createElement("tr");


    const playerName =
      profile.full_name?.trim() ||
      "Player";


    const email =
      profile.email ||
      "-";


    const upiId =
      profile.upi_id ||
      "-";


    const upiNumber =
      profile.upi_number ||
      "-";


    const paymentStatus =
      winner.status ||
      "pending";


    const statusText =
      getStatusText(paymentStatus);


    row.innerHTML = `

      <td>
        <div class="player-name">
          ${escapeHtml(playerName)}
        </div>
      </td>

      <td>
        <div class="player-email">
          ${escapeHtml(email)}
        </div>
      </td>

      <td>
        <span class="reward-amount">
          ₹${formatMoney(winner.amount)}
        </span>
      </td>

      <td>
        ${Number(game.correct_answers || 0)}
      </td>

      <td>
        ${escapeHtml(upiId)}
      </td>

      <td>
        ${escapeHtml(upiNumber)}
      </td>

      <td>
        <span class="payment-status ${paymentStatus}">
          ${statusText}
        </span>
      </td>

      <td>
        ${formatDate(winner.requested_at)}
      </td>

    `;


    tbody.appendChild(row);

  });


  showWinners();

}


/* ================================
   STATUS TEXT
================================ */

function getStatusText(status) {

  if (status === "processing") {
    return "Processing";
  }


  if (status === "paid") {
    return "Paid";
  }


  return "Pending";

}


/* ================================
   LOGOUT
================================ */

async function logoutAdmin() {

  try {

    const {
      error
    } =
      await supabaseClient.auth.signOut();


    if (error) {
      throw error;
    }


    window.location.href =
      "admin-login.html";


  } catch (error) {

    console.error(
      "Admin logout error:",
      error
    );


    alert(
      error.message ||
      "Logout nahi ho paya."
    );

  }

}


/* ================================
   HELPERS
================================ */

function formatMoney(value) {

  return Number(value || 0)
    .toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

}


function formatDate(value) {

  if (!value) {
    return "-";
  }


  const date =
    new Date(value);


  if (Number.isNaN(date.getTime())) {
    return "-";
  }


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* ================================
   UI HELPERS
================================ */

function showLoading(show) {

  document
    .getElementById("loadingBox")
    .classList.toggle(
      "hidden",
      !show
    );

}


function hideWinners() {

  document
    .getElementById("winnersSection")
    .classList.add("hidden");

}


function showWinners() {

  document
    .getElementById("winnersSection")
    .classList.remove("hidden");

}


function showEmpty() {

  document
    .getElementById("emptyBox")
    .classList.remove("hidden");

}


function hideEmpty() {

  document
    .getElementById("emptyBox")
    .classList.add("hidden");

}


function showError(message) {

  const box =
    document.getElementById("errorBox");


  box.textContent = message;

  box.classList.remove("hidden");

}


function hideError() {

  document
    .getElementById("errorBox")
    .classList.add("hidden");

}