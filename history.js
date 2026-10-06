document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadHistory();
  }
);


/* =========================
   ELEMENTS
========================= */

const loadingBox =
  document.getElementById(
    "loadingBox"
  );

const errorBox =
  document.getElementById(
    "errorBox"
  );

const emptyBox =
  document.getElementById(
    "emptyBox"
  );

const historySection =
  document.getElementById(
    "historySection"
  );

const historyList =
  document.getElementById(
    "historyList"
  );

const totalGamesElement =
  document.getElementById(
    "totalGames"
  );

const totalWinsElement =
  document.getElementById(
    "totalWins"
  );

const totalLossesElement =
  document.getElementById(
    "totalLosses"
  );

const totalRewardElement =
  document.getElementById(
    "totalReward"
  );

const backDashboardBtn =
  document.getElementById(
    "backDashboardBtn"
  );

const playNowBtn =
  document.getElementById(
    "playNowBtn"
  );


/* =========================
   NAVIGATION
========================= */

backDashboardBtn.addEventListener(
  "click",
  () => {
    window.location.href =
      "dashboard.html";
  }
);


playNowBtn.addEventListener(
  "click",
  () => {
    window.location.href =
      "game.html";
  }
);


/* =========================
   LOAD HISTORY
========================= */

async function loadHistory() {

  try {

    showLoading();

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient.auth
        .getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (
      !sessionData ||
      !sessionData.session
    ) {

      window.location.href =
        "login.html";

      return;
    }


    const user =
      sessionData.session.user;


    const {
      data,
      error
    } =
      await supabaseClient
        .from("games")
        .select(`
          id,
          status,
          correct_answers,
          questions_answered,
          reward_amount,
          reward_claimed,
          payment_status,
          created_at,
          updated_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }


    hideLoading();


    if (
      !data ||
      data.length === 0
    ) {

      showEmpty();

      updateStats([]);

      return;
    }


    updateStats(data);

    renderHistory(data);

  } catch (error) {

    console.error(
      "History error:",
      error
    );

    hideLoading();

    showError(
      error.message ||
      "Unable to load game history."
    );
  }
}


/* =========================
   UPDATE STATS
========================= */

function updateStats(games) {

  const totalGames =
    games.length;

  const wins =
    games.filter(
      game =>
        game.status === "won"
    ).length;

  const losses =
    games.filter(
      game =>
        game.status === "lost"
    ).length;

  const reward =
    games.reduce(
      (total, game) => {

        const amount =
          Number(
            game.reward_amount || 0
          );

        return total + amount;

      },
      0
    );


  totalGamesElement.textContent =
    totalGames;

  totalWinsElement.textContent =
    wins;

  totalLossesElement.textContent =
    losses;

  totalRewardElement.textContent =
    formatMoney(reward);
}


/* =========================
   RENDER HISTORY
========================= */

function renderHistory(games) {

  historyList.innerHTML =
    "";


  games.forEach(
    (game, index) => {

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "history-card";


      const status =
        String(
          game.status ||
          "playing"
        ).toLowerCase();


      const statusClass =
        getStatusClass(status);


      const statusText =
        getStatusText(status);


      const reward =
        Number(
          game.reward_amount || 0
        );


      const createdDate =
        formatDate(
          game.created_at
        );


      const paymentStatus =
        getPaymentStatus(
          game
        );


      card.innerHTML = `

        <div class="history-main">

          <div class="history-top">

            <span class="game-number">
              Game #${games.length - index}
            </span>

            <span class="
              status-badge
              ${statusClass}
            ">
              ${statusText}
            </span>

          </div>


          <div class="history-details">

            <span>
              🎯 Correct:
              ${Number(
                game.correct_answers || 0
              )}
            </span>

            <span>
              📝 Questions:
              ${Number(
                game.questions_answered || 0
              )}
            </span>

            <span>
              📅 ${createdDate}
            </span>

          </div>

        </div>


        <div class="history-reward">

          <span class="reward-label">
            Reward
          </span>

          <span class="reward-amount">
            ${formatMoney(reward)}
          </span>

          <span class="payment-status">
            ${paymentStatus}
          </span>

        </div>

      `;


      historyList.appendChild(
        card
      );
    }
  );


  historySection.style.display =
    "block";

  emptyBox.style.display =
    "none";
}


/* =========================
   PAYMENT STATUS
========================= */

function getPaymentStatus(game) {

  if (
    !game.reward_claimed
  ) {

    if (
      game.reward_amount > 0
    ) {
      return "Reward not claimed";
    }

    return "No reward";
  }


  const status =
    String(
      game.payment_status ||
      "pending"
    ).toLowerCase();


  if (
    status === "paid"
  ) {
    return "Payment Paid";
  }

  if (
    status === "processing"
  ) {
    return "Payment Processing";
  }

  if (
    status === "pending"
  ) {
    return "Payment Pending";
  }

  return "Payment Pending";
}


/* =========================
   STATUS CLASS
========================= */

function getStatusClass(
  status
) {

  if (
    status === "won"
  ) {
    return "status-won";
  }

  if (
    status === "lost"
  ) {
    return "status-lost";
  }

  if (
    status === "quit"
  ) {
    return "status-quit";
  }

  return "status-playing";
}


/* =========================
   STATUS TEXT
========================= */

function getStatusText(
  status
) {

  if (
    status === "won"
  ) {
    return "Won";
  }

  if (
    status === "lost"
  ) {
    return "Lost";
  }

  if (
    status === "quit"
  ) {
    return "Quit";
  }

  return "Playing";
}


/* =========================
   MONEY
========================= */

function formatMoney(
  amount
) {

  return (
    "₹" +
    Number(amount || 0)
      .toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }
      )
  );
}


/* =========================
   DATE
========================= */

function formatDate(
  dateValue
) {

  if (!dateValue) {
    return "-";
  }


  const date =
    new Date(dateValue);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
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


/* =========================
   UI STATES
========================= */

function showLoading() {

  loadingBox.style.display =
    "block";

  errorBox.style.display =
    "none";

  emptyBox.style.display =
    "none";

  historySection.style.display =
    "none";
}


function hideLoading() {

  loadingBox.style.display =
    "none";
}


function showEmpty() {

  emptyBox.style.display =
    "block";

  historySection.style.display =
    "none";
}


function showError(message) {

  errorBox.textContent =
    message;

  errorBox.style.display =
    "block";

  emptyBox.style.display =
    "none";

  historySection.style.display =
    "none";
}
