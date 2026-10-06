document.addEventListener("DOMContentLoaded", () => {
  startGame();
});


/* =========================================================
   GAME CONFIG
========================================================= */

const GAME_MAX_QUESTIONS = 20;
const TIMER_SECONDS = 10;

const REWARDS = {
  5: 50,
  10: 200,
  20: 500
};


/* =========================================================
   GAME STATE
========================================================= */

let allQuestions = [];
let gameQuestions = [];

let currentQuestionIndex = 0;
let correctCount = 0;

let timerValue = TIMER_SECONDS;
let timerInterval = null;

let answered = false;
let gameFinished = false;

let pendingMilestone = null;

let currentUser = null;

/*
 * IMPORTANT:
 * Supabase game record ID.
 */
let currentGameId = null;


/* =========================================================
   ELEMENTS
========================================================= */

const questionNumber =
  document.getElementById("questionNumber");

const totalQuestions =
  document.getElementById("totalQuestions");

const correctCountElement =
  document.getElementById("correctCount");

const currentRewardElement =
  document.getElementById("currentReward");

const timerElement =
  document.getElementById("timer");

const timerCircle =
  document.getElementById("timerCircle");

const difficultyElement =
  document.getElementById("difficulty");

const questionText =
  document.getElementById("questionText");

const optionsContainer =
  document.getElementById("optionsContainer");

const answerMessage =
  document.getElementById("answerMessage");

const nextBtn =
  document.getElementById("nextBtn");

const playerNameElement =
  document.getElementById("playerName");

const exitGameBtn =
  document.getElementById("exitGameBtn");

const milestoneBox =
  document.getElementById("milestoneBox");

const milestoneTitle =
  document.getElementById("milestoneTitle");

const milestoneText =
  document.getElementById("milestoneText");

const claimBtn =
  document.getElementById("claimBtn");

const continueBtn =
  document.getElementById("continueBtn");

const gameOverBox =
  document.getElementById("gameOverBox");

const gameOverReason =
  document.getElementById("gameOverReason");

const finalCorrect =
  document.getElementById("finalCorrect");

const backDashboardBtn =
  document.getElementById("backDashboardBtn");

const finalWinBox =
  document.getElementById("finalWinBox");

const claimFinalBtn =
  document.getElementById("claimFinalBtn");


/* =========================================================
   START GAME
========================================================= */

async function startGame() {

  try {

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData.session) {
      window.location.href = "login.html";
      return;
    }

    currentUser =
      sessionData.session.user;

    await loadPlayerProfile();

    await loadQuestions();

    prepareGameQuestions();

    /*
     * CREATE GAME IN SUPABASE
     */
    await createGameRecord();

    updateTopInfo();

    showQuestion();

  } catch (error) {

    console.error("Game start error:", error);

    if (questionText) {
      questionText.textContent =
        "Unable to start the quiz.";
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = `
        <div style="
          padding:20px;
          text-align:center;
          color:#dc2626;
        ">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}


/* =========================================================
   PLAYER PROFILE
========================================================= */

async function loadPlayerProfile() {

  const {
    data: profile,
    error
  } = await supabaseClient
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error("Player profile not found.");
  }

  if (profile.role === "admin") {

    window.location.href =
      "admin-dashboard.html";

    return;
  }

  if (playerNameElement) {

    playerNameElement.textContent =
      profile.full_name ||
      profile.email ||
      "Player";
  }
}


/* =========================================================
   LOAD QUESTIONS
========================================================= */

async function loadQuestions() {

  const response =
    await fetch("questions.json", {
      cache: "no-store"
    });

  if (!response.ok) {

    throw new Error(
      "Unable to load questions.json"
    );
  }

  const data =
    await response.json();

  if (
    !data ||
    !Array.isArray(data.questions) ||
    data.questions.length === 0
  ) {

    throw new Error(
      "No questions found."
    );
  }

  allQuestions =
    data.questions;
}


/* =========================================================
   PREPARE RANDOM QUESTIONS
========================================================= */

function prepareGameQuestions() {

  const shuffled =
    [...allQuestions].sort(
      () => Math.random() - 0.5
    );

  gameQuestions =
    shuffled.slice(
      0,
      GAME_MAX_QUESTIONS
    );

  totalQuestions.textContent =
    gameQuestions.length;
}


/* =========================================================
   CREATE DATABASE GAME
========================================================= */

async function createGameRecord() {

  const {
    data,
    error
  } = await supabaseClient.rpc(
    "start_quiz_game",
    {
      p_total_questions:
        gameQuestions.length
    }
  );

  if (error) {

    console.error(
      "Start game RPC error:",
      error
    );

    throw new Error(
      error.message
    );
  }

  if (!data) {
    throw new Error(
      "Game ID was not returned by server."
    );
  }

  currentGameId = data;

  console.log(
    "Game created:",
    currentGameId
  );
}


/* =========================================================
   UPDATE DATABASE GAME
========================================================= */

async function updateGameRecord(
  status = "playing"
) {

  if (!currentGameId) {

    throw new Error(
      "Game ID not found."
    );
  }

  const {
    error
  } = await supabaseClient.rpc(
    "update_quiz_game",
    {
      p_game_id:
        currentGameId,

      p_status:
        status,

      p_correct_answers:
        correctCount,

      p_questions_answered:
        Math.min(
          currentQuestionIndex + 1,
          GAME_MAX_QUESTIONS
        )
    }
  );

  if (error) {

    console.error(
      "Update game RPC error:",
      error
    );

    throw new Error(
      error.message
    );
  }
}


/* =========================================================
   SHOW QUESTION
========================================================= */

function showQuestion() {

  if (gameFinished) {
    return;
  }

  if (
    currentQuestionIndex >=
    gameQuestions.length
  ) {

    finishFinalGame();

    return;
  }

  answered = false;

  clearTimer();

  hideMilestone();
  hideGameOver();
  hideFinalWin();

  const question =
    gameQuestions[
      currentQuestionIndex
    ];

  questionNumber.textContent =
    currentQuestionIndex + 1;

  difficultyElement.textContent =
    String(
      question.difficulty || "medium"
    ).toUpperCase();

  questionText.textContent =
    question.question;

  answerMessage.textContent = "";

  answerMessage.className =
    "answer-message";

  nextBtn.style.display =
    "none";

  renderOptions(question);

  startTimer();
}


/* =========================================================
   RENDER OPTIONS
========================================================= */

function renderOptions(question) {

  optionsContainer.innerHTML = "";

  question.options.forEach(
    (option) => {

      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "option-btn";

      button.dataset.optionId =
        option.id;

      button.innerHTML = `
        <span class="option-letter">
          ${escapeHtml(option.id)}
        </span>

        <span class="option-text">
          ${escapeHtml(option.text)}
        </span>
      `;

      button.addEventListener(
        "click",
        () => handleAnswer(option.id)
      );

      optionsContainer.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   ANSWER
========================================================= */

async function handleAnswer(selectedAnswer) {

  if (answered || gameFinished) {
    return;
  }

  answered = true;
  clearTimer();

  const question =
    gameQuestions[currentQuestionIndex];

  const correctAnswer =
    question.correctAnswer;

  const optionButtons =
    document.querySelectorAll(".option-btn");

  optionButtons.forEach((button) => {
    button.disabled = true;
  });

  /* =======================================================
     CORRECT ANSWER
  ======================================================= */

  if (selectedAnswer === correctAnswer) {

    const selectedButton =
      document.querySelector(
        `.option-btn[data-option-id="${selectedAnswer}"]`
      );

    if (selectedButton) {
      selectedButton.classList.add("correct");
    }

    correctCount++;

    correctCountElement.textContent =
      correctCount;

    updateCurrentReward();

    answerMessage.textContent =
      "Correct answer!";

    answerMessage.className =
      "answer-message correct-message";

    /*
     * Save current progress in database.
     */
    try {

      await updateGameRecord("playing");

    } catch (error) {

      console.error(
        "Answer save error:",
        error
      );

      alert(
        "Answer save nahi hua:\n" +
        (error?.message || error)
      );

      answered = false;

      optionButtons.forEach((button) => {
        button.disabled = false;
        button.classList.remove("correct");
      });

      return;
    }

    /*
     * 5 CORRECT
     */
    if (correctCount === 5) {

      nextBtn.style.display = "none";

      setTimeout(() => {
        showMilestone();
      }, 450);

      return;
    }

    /*
     * 10 CORRECT
     */
    if (correctCount === 10) {

      nextBtn.style.display = "none";

      setTimeout(() => {
        showMilestone();
      }, 450);

      return;
    }

    /*
     * 20 CORRECT
     */
    if (correctCount === 20) {

      nextBtn.style.display = "none";

      setTimeout(() => {
        finishFinalGame();
      }, 450);

      return;
    }

    showNextButton();

    return;
  }


  /* =======================================================
     WRONG ANSWER
  ======================================================= */

  const selectedButton =
    document.querySelector(
      `.option-btn[data-option-id="${selectedAnswer}"]`
    );

  const correctButton =
    document.querySelector(
      `.option-btn[data-option-id="${correctAnswer}"]`
    );

  /*
   * Selected wrong option = RED
   */
  if (selectedButton) {
    selectedButton.classList.add("wrong");
  }

  /*
   * Actual correct option = GREEN
   */
  if (correctButton) {
    correctButton.classList.add("correct");
  }

  answerMessage.textContent =
    "Wrong answer!";

  answerMessage.className =
    "answer-message wrong-message";

  /*
   * Save game as lost.
   */
  try {

    await updateGameRecord("lost");

  } catch (error) {

    console.error(
      "Wrong answer save error:",
      error
    );
  }

  /*
   * Show game over after short delay.
   */
  setTimeout(() => {

    endGame(
      "You selected the wrong answer."
    );

  }, 700);
}


/* =========================================================
   NEXT BUTTON
========================================================= */

function showNextButton() {

  nextBtn.style.display =
    "block";
}


nextBtn.addEventListener(
  "click",
  () => {

    if (!answered) {
      return;
    }

    currentQuestionIndex++;

    updateTopInfo();

    showQuestion();
  }
);


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

  timerValue =
    TIMER_SECONDS;

  updateTimerUI();

  timerInterval =
    setInterval(() => {

      timerValue--;

      updateTimerUI();

      if (timerValue <= 0) {

        clearTimer();

        handleTimeout();
      }

    }, 1000);
}


function clearTimer() {

  if (timerInterval) {

    clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}


function updateTimerUI() {

  timerElement.textContent =
    timerValue;

  if (timerValue <= 3) {

    timerCircle.classList.add(
      "warning"
    );

  } else {

    timerCircle.classList.remove(
      "warning"
    );
  }
}


/* =========================================================
   TIMEOUT
========================================================= */

async function handleTimeout() {

  if (answered || gameFinished) {
    return;
  }

  answered = true;

  const question =
    gameQuestions[
      currentQuestionIndex
    ];

  const correctAnswer =
    question.correctAnswer;

  const optionButtons =
    document.querySelectorAll(
      ".option-btn"
    );

  optionButtons.forEach(
    (button) => {

      button.disabled = true;

      if (
        button.dataset.optionId ===
        correctAnswer
      ) {

        button.classList.add(
          "correct"
        );
      }
    }
  );

  answerMessage.textContent =
    "Time's up!";

  answerMessage.className =
    "answer-message wrong-message";

  try {

    await updateGameRecord("lost");

  } catch (error) {

    console.error(
      "Timeout save error:",
      error
    );
  }

  setTimeout(() => {

    endGame(
      "You did not answer within 10 seconds."
    );

  }, 700);
}


/* =========================================================
   MILESTONE
========================================================= */

function showMilestone() {

  pendingMilestone =
    correctCount;

  const reward =
    REWARDS[
      pendingMilestone
    ];

  milestoneTitle.textContent =
    `${pendingMilestone} Correct Answers!`;

  milestoneText.textContent =
    `You have reached ₹${reward}. You can claim it now or continue playing.`;

  milestoneBox.style.display =
    "block";

  questionText.parentElement.style.display =
    "none";
}


function hideMilestone() {

  milestoneBox.style.display =
    "none";

  questionText.parentElement.style.display =
    "block";
}


/* =========================================================
   CONTINUE
========================================================= */

continueBtn.addEventListener(
  "click",
  () => {

    if (!pendingMilestone) {
      return;
    }

    pendingMilestone = null;

    currentQuestionIndex++;

    updateTopInfo();

    showQuestion();
  }
);


/* =========================================================
   CLAIM REWARD
========================================================= */

claimBtn.addEventListener(
  "click",
  async () => {

    if (!pendingMilestone) {
      return;
    }

    const reward =
      REWARDS[
        pendingMilestone
      ];

    claimBtn.disabled = true;

    claimBtn.textContent =
      "Preparing Claim...";

    try {

      await createSecureClaimRequest(
        reward
      );

    } catch (error) {

      console.error(
        "Claim error:",
        error
      );

      alert(
        "CLAIM ERROR: " +
        (error?.message || error)
      );

      claimBtn.disabled = false;

      claimBtn.textContent =
        "Claim Reward";

      return;
    }
  }
);


/* =========================================================
   FINAL 20
========================================================= */

function finishFinalGame() {

  clearTimer();

  gameFinished = true;

  /*
   * Final claim ke liye milestone
   * 20 set karna zaroori hai.
   */
  pendingMilestone = 20;

  hideMilestone();

  questionText.parentElement.style.display =
    "none";

  finalWinBox.style.display =
    "block";

  finalCorrect.textContent =
    correctCount;
}


/* =========================================================
   FINAL ₹500 CLAIM
========================================================= */

claimFinalBtn.addEventListener(
  "click",
  async () => {

    if (
      correctCount !== 20 ||
      !currentGameId
    ) {

      alert(
        "Final reward is not available yet."
      );

      return;
    }

    claimFinalBtn.disabled = true;

    claimFinalBtn.textContent =
      "Preparing Claim...";

    try {

      await createSecureClaimRequest(
        500
      );

    } catch (error) {

      console.error(
        "Final claim error:",
        error
      );

      alert(
        "FINAL CLAIM ERROR: " +
        (error?.message || error)
      );

      claimFinalBtn.disabled = false;

      claimFinalBtn.textContent =
        "Claim ₹500";
    }
  }
);


/* =========================================================
   SECURE CLAIM
========================================================= */

async function createSecureClaimRequest(
  reward
) {

  if (!currentGameId) {

    throw new Error(
      "Game ID not found."
    );
  }

  if (!pendingMilestone) {

    throw new Error(
      "No reward milestone available."
    );
  }

  const expectedReward =
    REWARDS[
      pendingMilestone
    ];

  if (
    reward !== expectedReward
  ) {

    throw new Error(
      "Invalid reward amount."
    );
  }

  const {
    data,
    error
  } = await supabaseClient.rpc(
    "claim_quiz_reward",
    {
      p_game_id:
        currentGameId
    }
  );

  if (error) {

    console.error(
      "Claim RPC error:",
      error
    );

    throw new Error(
      error.message
    );
  }

  if (
    !data ||
    data.success !== true
  ) {

    throw new Error(
      "Reward claim was not completed."
    );
  }

  /*
   * CLAIM SUCCESS
   */
  gameFinished = true;

  clearTimer();

  hideMilestone();

  alert(
    `₹${data.reward} reward claimed successfully!`
  );

  window.location.href =
    "dashboard.html";
}


/* =========================================================
   GAME OVER
========================================================= */

function endGame(reason) {

  clearTimer();

  gameFinished = true;

  pendingMilestone = null;

  hideMilestone();

  questionText.parentElement.style.display =
    "none";

  gameOverReason.textContent =
    reason;

  finalCorrect.textContent =
    correctCount;

  gameOverBox.style.display =
    "block";
}


function hideGameOver() {

  gameOverBox.style.display =
    "none";
}


function hideFinalWin() {

  finalWinBox.style.display =
    "none";
}


/* =========================================================
   TOP INFO
========================================================= */

function updateTopInfo() {

  questionNumber.textContent =
    currentQuestionIndex + 1;

  correctCountElement.textContent =
    correctCount;

  updateCurrentReward();
}


function updateCurrentReward() {

  let reward = 0;

  if (correctCount >= 20) {

    reward = 500;

  } else if (correctCount >= 10) {

    reward = 200;

  } else if (correctCount >= 5) {

    reward = 50;
  }

  currentRewardElement.textContent =
    `₹${reward}`;
}


/* =========================================================
   EXIT
========================================================= */

exitGameBtn.addEventListener(
  "click",
  async () => {

    const confirmed =
      confirm(
        "Are you sure you want to exit the game?"
      );

    if (!confirmed) {
      return;
    }

    clearTimer();

    /*
     * Agar game chal raha tha to DB me
     * current state save kar do.
     *
     * Isse claim nahi hoga.
     */
    if (
      currentGameId &&
      !gameFinished
    ) {

      try {

        await updateGameRecord(
          "lost"
        );

      } catch (error) {

        console.error(
          "Exit game update error:",
          error
        );
      }
    }

    window.location.href =
      "dashboard.html";
  }
);


/* =========================================================
   BACK DASHBOARD
========================================================= */

backDashboardBtn.addEventListener(
  "click",
  () => {

    window.location.href =
      "dashboard.html";
  }
);


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}