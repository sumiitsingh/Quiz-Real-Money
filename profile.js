let currentUser = null;
let currentProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupButtons();
  await loadProfile();
});


/* ================================
   BUTTONS
================================ */

function setupButtons() {

  document
    .getElementById("dashboardBtn")
    .addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });


  document
    .getElementById("logoutBtn")
    .addEventListener("click", logoutUser);


  document
    .getElementById("payoutForm")
    .addEventListener("submit", savePayoutDetails);


  document
    .getElementById("upiNumber")
    .addEventListener("input", (event) => {

      event.target.value = event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    });
}


/* ================================
   LOAD PROFILE
================================ */

async function loadProfile() {

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
    const {
      data: profile,
      error: profileError
    } = await supabaseClient
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
        upi_number,
        created_at
      `)
      .eq("id", user.id)
      .single();


    if (profileError) {
      throw profileError;
    }


    if (!profile) {
      throw new Error("Profile not found.");
    }


    currentProfile = profile;


    // Admin ko player profile page par mat rakho
    if (profile.role === "admin") {
      window.location.href = "admin-dashboard.html";
      return;
    }


    // Header
    const playerName =
      profile.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      "Player";


    document.getElementById("headerUserName").textContent =
      playerName;


    // Personal information
    document.getElementById("profileName").textContent =
      playerName;


    document.getElementById("profileEmail").textContent =
      profile.email || user.email || "-";


    document.getElementById("profileRole").textContent =
      profile.role === "admin" ? "Admin" : "Player";


    document.getElementById("profileCreated").textContent =
      formatDate(profile.created_at);


    // Payout details
    document.getElementById("upiId").value =
      profile.upi_id || "";


    document.getElementById("upiNumber").value =
      profile.upi_number || "";


    // Real stats from games table
    await loadRealStats(user.id);


    // Show content
    document
      .getElementById("profileContent")
      .classList.remove("hidden");


  } catch (error) {

    console.error("Profile loading error:", error);

    showError(
      error.message ||
      "Profile load nahi ho paya."
    );

  } finally {

    showLoading(false);

  }
}


/* ================================
   REAL STATS
================================ */

async function loadRealStats(userId) {

  const {
    data: games,
    error
  } = await supabaseClient
    .from("games")
    .select(`
      id,
      status,
      reward_amount
    `)
    .eq("user_id", userId);


  if (error) {
    throw error;
  }


  const gameList = games || [];


  const totalGames = gameList.length;


  const totalWins = gameList.filter(
    game => game.status === "won"
  ).length;


  const totalLosses = gameList.filter(
    game => game.status === "lost"
  ).length;


  const totalWinnings = gameList.reduce(
    (total, game) => {
      return total + Number(game.reward_amount || 0);
    },
    0
  );


  document.getElementById("statGames").textContent =
    totalGames;


  document.getElementById("statWins").textContent =
    totalWins;


  document.getElementById("statLosses").textContent =
    totalLosses;


  document.getElementById("statWinnings").textContent =
    `₹${formatMoney(totalWinnings)}`;
}


/* ================================
   SAVE PAYOUT DETAILS
================================ */

async function savePayoutDetails(event) {

  event.preventDefault();


  if (!currentUser) {
    return;
  }


  const upiId =
    document.getElementById("upiId")
      .value
      .trim();


  const upiNumber =
    document.getElementById("upiNumber")
      .value
      .trim();


  const messageBox =
    document.getElementById("payoutMessage");


  const saveButton =
    document.getElementById("savePayoutBtn");


  hidePayoutMessage();


  // At least one required
  if (!upiId && !upiNumber) {

    showPayoutMessage(
      "UPI ID ya UPI Number me se kam se kam ek required hai.",
      "error"
    );

    return;
  }


  // UPI ID validation
  if (upiId && !isValidUpiId(upiId)) {

    showPayoutMessage(
      "Please valid UPI ID enter karo. Example: name@upi",
      "error"
    );

    return;
  }


  // UPI number validation
  if (upiNumber && !/^\d{10}$/.test(upiNumber)) {

    showPayoutMessage(
      "UPI Number exactly 10 digits ka hona chahiye.",
      "error"
    );

    return;
  }


  try {

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";


    const {
      error
    } = await supabaseClient
      .from("profiles")
      .update({
        upi_id: upiId || null,
        upi_number: upiNumber || null
      })
      .eq("id", currentUser.id);


    if (error) {
      throw error;
    }


    // Update local profile
    if (currentProfile) {

      currentProfile.upi_id =
        upiId || null;

      currentProfile.upi_number =
        upiNumber || null;
    }


    showPayoutMessage(
      "Payout details successfully save ho gaye.",
      "success"
    );


  } catch (error) {

    console.error("Payout update error:", error);

    showPayoutMessage(
      error.message ||
      "Payout details save nahi ho paye.",
      "error"
    );


  } finally {

    saveButton.disabled = false;
    saveButton.textContent = "Save Payout Details";

  }
}


/* ================================
   UPI VALIDATION
================================ */

function isValidUpiId(value) {

  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(value);

}


/* ================================
   LOGOUT
================================ */

async function logoutUser() {

  try {

    const { error } =
      await supabaseClient.auth.signOut();


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


function formatDate(value) {

  if (!value) {
    return "-";
  }


  const date = new Date(value);


  if (Number.isNaN(date.getTime())) {
    return "-";
  }


  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

}


function showLoading(show) {

  const loading =
    document.getElementById("profileLoading");


  if (!loading) {
    return;
  }


  loading.classList.toggle(
    "hidden",
    !show
  );

}


function showError(message) {

  const errorBox =
    document.getElementById("profileError");


  if (!errorBox) {
    return;
  }


  errorBox.textContent = message;

  errorBox.classList.remove("hidden");

}


function hideError() {

  const errorBox =
    document.getElementById("profileError");


  if (!errorBox) {
    return;
  }


  errorBox.classList.add("hidden");

}


function showPayoutMessage(message, type) {

  const box =
    document.getElementById("payoutMessage");


  if (!box) {
    return;
  }


  box.textContent = message;

  box.className =
    `form-message ${type}`;

}


function hidePayoutMessage() {

  const box =
    document.getElementById("payoutMessage");


  if (!box) {
    return;
  }


  box.textContent = "";

  box.className =
    "form-message hidden";

}