let currentUser = null;
let currentProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupButtons();
  await loadDashboard();
});


/* ================================
   BUTTONS
================================ */

function setupButtons() {
  document.getElementById("playQuizBtn").addEventListener("click", () => {
    window.location.href = "game.html";
  });

  document.getElementById("historyBtn").addEventListener("click", () => {
    window.location.href = "history.html";
  });

  document.getElementById("profileBtn").addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  document.getElementById("logoutBtn").addEventListener("click", logoutUser);
}


/* ================================
   LOAD DASHBOARD
================================ */

async function loadDashboard() {
  try {
    showLoading(true);
    hideError();

    // Check login
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = user;


    // Get profile
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          total_games,
          total_wins,
          total_losses,
          total_winnings,
          upi_id,
          upi_number
        `)
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      throw new Error("Player profile not found.");
    }

    currentProfile = profile;


    // Admin ko player dashboard par mat rakho
    if (profile.role === "admin") {
      window.location.href = "admin-dashboard.html";
      return;
    }


    // Show profile information
    const playerName =
      profile.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      "Player";

    document.getElementById("welcomeName").textContent = playerName;
    document.getElementById("headerUserName").textContent = playerName;
    document.getElementById("welcomeEmail").textContent =
      profile.email || user.email || "";


    // Stats
    document.getElementById("gamesPlayed").textContent =
      Number(profile.total_games || 0);

    document.getElementById("totalWins").textContent =
      Number(profile.total_wins || 0);

    document.getElementById("totalLosses").textContent =
      Number(profile.total_losses || 0);

    document.getElementById("totalWinnings").textContent =
      formatMoney(profile.total_winnings);


    // Recent payment
    await loadRecentPayment(user.id);

  } catch (error) {
    console.error("Dashboard error:", error);

    showError(
      error.message ||
      "Dashboard load nahi ho paya. Please refresh karke try karo."
    );

  } finally {
    showLoading(false);
  }
}


/* ================================
   RECENT PAYMENT
================================ */

async function loadRecentPayment(userId) {
  const paymentCard = document.getElementById("paymentCard");

  try {

    const { data, error } = await supabaseClient
      .from("payment_requests")
      .select(`
        id,
        amount,
        status,
        payout_method,
        payout_identifier,
        admin_note,
        requested_at,
        updated_at
      `)
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      paymentCard.innerHTML = `
        <div class="payment-empty">
          <span>💳</span>
          <div>
            <strong>No payment requests</strong>
            <p>Your claimed rewards will appear here.</p>
          </div>
        </div>
      `;

      return;
    }

    const payment = data[0];

    const status = payment.status || "pending";

    let statusText = "Pending";

    if (status === "processing") {
      statusText = "Processing";
    }

    if (status === "paid") {
      statusText = "Paid";
    }

    paymentCard.innerHTML = `
      <div class="payment-main">

        <div class="payment-icon">
          💰
        </div>

        <div class="payment-info">
          <strong>₹${formatMoney(payment.amount)}</strong>
          <span>Reward Payment</span>
        </div>

        <div class="payment-status ${status}">
          ${statusText}
        </div>

      </div>

      ${
        payment.admin_note
          ? `
            <div class="payment-note">
              <strong>Admin Note:</strong>
              ${escapeHtml(payment.admin_note)}
            </div>
          `
          : ""
      }
    `;

  } catch (error) {

    console.error("Payment loading error:", error);

    paymentCard.innerHTML = `
      <div class="payment-empty">
        <span>💳</span>
        <div>
          <strong>Payment information unavailable</strong>
          <p>Please try again later.</p>
        </div>
      </div>
    `;
  }
}


/* ================================
   LOGOUT
================================ */

async function logoutUser() {
  try {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    window.location.href = "login.html";

  } catch (error) {

    console.error("Logout error:", error);

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
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function showLoading(show) {
  const loading = document.getElementById("dashboardLoading");

  if (!loading) return;

  loading.classList.toggle("hidden", !show);
}


function showError(message) {
  const errorBox = document.getElementById("dashboardError");

  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}


function hideError() {
  const errorBox = document.getElementById("dashboardError");

  if (!errorBox) return;

  errorBox.classList.add("hidden");
}