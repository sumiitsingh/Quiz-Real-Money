let adminUser = null;
let paymentsData = [];


document.addEventListener("DOMContentLoaded", async () => {

  setupButtons();

  await loadPayments();

});


/* ================================
   BUTTONS
================================ */

function setupButtons() {

  document
    .getElementById("dashboardBtn")
    .addEventListener("click", () => {

      window.location.href =
        "admin-dashboard.html";

    });


  document
    .getElementById("winnersBtn")
    .addEventListener("click", () => {

      window.location.href =
        "admin-winners.html";

    });


  document
    .getElementById("refreshBtn")
    .addEventListener("click", async () => {

      await loadPayments();

    });


  document
    .getElementById("statusFilter")
    .addEventListener("change", () => {

      renderPayments();

    });


  document
    .getElementById("logoutBtn")
    .addEventListener("click", logoutAdmin);

}


/* ================================
   LOAD PAYMENTS
================================ */

async function loadPayments() {

  try {

    showLoading(true);

    hideError();

    hideEmpty();

    hidePayments();


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

      window.location.href =
        "admin-login.html";

      return;

    }


    adminUser = user;


    // Verify admin
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

      window.location.href =
        "dashboard.html";

      return;

    }


    document.getElementById("adminName").textContent =
      profile.full_name?.trim() || "Admin";


    // Get payments
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


    paymentsData = (data || []).filter(payment => {

      return (
        payment.games &&
        payment.games.reward_claimed === true
      );

    });


    updateStats();

    renderPayments();


  } catch (error) {

    console.error(
      "Admin payments error:",
      error
    );


    showError(
      error.message ||
      "Payments load nahi ho paye."
    );


  } finally {

    showLoading(false);

  }

}


/* ================================
   STATS
================================ */

function updateStats() {

  const pending =
    paymentsData.filter(
      payment => payment.status === "pending"
    ).length;


  const processing =
    paymentsData.filter(
      payment => payment.status === "processing"
    ).length;


  const paid =
    paymentsData.filter(
      payment => payment.status === "paid"
    ).length;


  const total =
    paymentsData.reduce(
      (sum, payment) => {

        return sum +
          Number(payment.amount || 0);

      },
      0
    );


  document.getElementById("pendingCount").textContent =
    pending;


  document.getElementById("processingCount").textContent =
    processing;


  document.getElementById("paidCount").textContent =
    paid;


  document.getElementById("totalAmount").textContent =
    `₹${formatMoney(total)}`;

}


/* ================================
   RENDER PAYMENTS
================================ */

function renderPayments() {

  const container =
    document.getElementById(
      "paymentsSection"
    );


  container.innerHTML = "";


  const filter =
    document.getElementById(
      "statusFilter"
    ).value;


  let filteredPayments =
    paymentsData;


  if (filter !== "all") {

    filteredPayments =
      paymentsData.filter(
        payment =>
          payment.status === filter
      );

  }


  if (filteredPayments.length === 0) {

    showEmpty();

    return;

  }


  filteredPayments.forEach(payment => {

    const card =
      document.createElement("div");


    card.className =
      "payment-card";


    const profile =
      payment.profiles || {};


    const game =
      payment.games || {};


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


    const status =
      payment.status ||
      "pending";


    const statusText =
      getStatusText(status);


    card.innerHTML = `

      <div class="payment-top">

        <div>

          <h3 class="player-name">
            ${escapeHtml(playerName)}
          </h3>

          <p class="player-email">
            ${escapeHtml(email)}
          </p>

        </div>

        <div class="reward">
          ₹${formatMoney(payment.amount)}
        </div>

      </div>


      <div class="payment-details">

        <div class="detail-item">
          <label>UPI ID</label>
          <strong>
            ${escapeHtml(upiId)}
          </strong>
        </div>

        <div class="detail-item">
          <label>UPI Number</label>
          <strong>
            ${escapeHtml(upiNumber)}
          </strong>
        </div>

        <div class="detail-item">
          <label>Correct Answers</label>
          <strong>
            ${Number(game.correct_answers || 0)}
          </strong>
        </div>

        <div class="detail-item">
          <label>Requested</label>
          <strong>
            ${formatDate(payment.requested_at)}
          </strong>
        </div>

      </div>


      <div class="status-row">

        <div>

          <span class="status-badge ${status}">
            ${statusText}
          </span>

        </div>


        <div class="payment-actions">

          <select
            class="payment-status-select"
            data-payment-id="${payment.id}"
          >

            <option
              value="pending"
              ${status === "pending" ? "selected" : ""}
            >
              Pending
            </option>

            <option
              value="processing"
              ${status === "processing" ? "selected" : ""}
            >
              Processing
            </option>

            <option
              value="paid"
              ${status === "paid" ? "selected" : ""}
            >
              Paid
            </option>

          </select>


          <button
            class="update-btn"
            data-payment-id="${payment.id}"
          >
            Update Status
          </button>

        </div>

      </div>


      ${
        payment.admin_note
          ? `
            <div class="admin-note">
              <strong>Admin Note:</strong>
              ${escapeHtml(payment.admin_note)}
            </div>
          `
          : ""
      }

    `;


    container.appendChild(card);

  });


  // Attach update events
  container
    .querySelectorAll(".update-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const paymentId =
            button.dataset.paymentId;


          const select =
            container.querySelector(
              `.payment-status-select[data-payment-id="${paymentId}"]`
            );


          const newStatus =
            select.value;


          await updatePaymentStatus(
            paymentId,
            newStatus,
            button
          );

        }
      );

    });


  showPayments();

}


/* ================================
   UPDATE PAYMENT STATUS
================================ */

async function updatePaymentStatus(
  paymentId,
  newStatus,
  button
) {

  try {

    button.disabled = true;

    button.textContent =
      "Updating...";


    const {
      data,
      error
    } =
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


    console.log(
      "Payment status updated:",
      data
    );


    // Update local data
    const payment =
      paymentsData.find(
        item => item.id === paymentId
      );


    if (payment) {

      payment.status =
        newStatus;

    }


    updateStats();

    renderPayments();


  } catch (error) {

    console.error(
      "Payment status update error:",
      error
    );


    alert(
      error.message ||
      "Payment status update nahi ho paya."
    );


  } finally {

    button.disabled = false;

    button.textContent =
      "Update Status";

  }

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
      "Logout error:",
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
   UI
================================ */

function showLoading(show) {

  document
    .getElementById("loadingBox")
    .classList.toggle(
      "hidden",
      !show
    );

}


function showPayments() {

  document
    .getElementById("paymentsSection")
    .classList.remove("hidden");

}


function hidePayments() {

  document
    .getElementById("paymentsSection")
    .classList.add("hidden");

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
    document.getElementById(
      "errorBox"
    );


  box.textContent =
    message;


  box.classList.remove(
    "hidden"
  );

}


function hideError() {

  document
    .getElementById(
      "errorBox"
    )
    .classList.add(
      "hidden"
    );

}