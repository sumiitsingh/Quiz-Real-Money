document.addEventListener("DOMContentLoaded", () => {
  startGame();
});


/* =========================================================
   GAME STATE
========================================================= */

const GAME_MAX_QUESTIONS = 20;
const TIMER_SECONDS = 10;

const REWARDS = {
  5: 50,
  10: 200,
  20: 500
};

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

    updateTopInfo();

    showQuestion();

  } catch (error) {

    console.error("Game start error:", error);

    questionText.textContent =
      "Unable to start the quiz.";

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

  allQuestions = data.questions;
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

function handleAnswer(selectedAnswer) {

  if (answered || gameFinished) {
    return;
  }

  answered = true;

  clearTimer();

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

      const optionId =
        button.dataset.optionId;

      /*
       * Correct option is ALWAYS green
       * after an answer is submitted.
       */

      if (optionId === correctAnswer) {
        button.classList.add(
          "correct"
        );
      }

      /*
       * Selected wrong option becomes red.
       */

      if (
        optionId === selectedAnswer &&
        selectedAnswer !== correctAnswer
      ) {
        button.classList.add(
          "wrong"
        );
      }
    }
  );


  if (
    selectedAnswer ===
    correctAnswer
  ) {

    correctCount++;

    correctCountElement.textContent =
      correctCount;

    updateCurrentReward();

    answerMessage.textContent =
      "Correct answer!";

    answerMessage.className =
      "answer-message correct-message";


    /*
     * At 5 and 10 we pause BEFORE
     * showing the next question.
     */

    if (
      correctCount === 5 ||
      correctCount === 10
    ) {

      nextBtn.style.display =
        "none";

      setTimeout(() => {
        showMilestone();
      }, 450);

      return;
    }


    /*
     * 20 correct = final reward.
     */

    if (correctCount === 20) {

      nextBtn.style.display =
        "none";

      setTimeout(() => {
        finishFinalGame();
      }, 450);

      return;
    }


    showNextButton();

  } else {

    answerMessage.textContent =
      "Wrong answer!";

    answerMessage.className =
      "answer-message wrong-message";

    /*
     * Wrong answer = game over.
     *
     * We still show the correct answer
     * in green for feedback.
     */

    setTimeout(() => {

      endGame(
        "You selected the wrong answer."
      );

    }, 700);
  }
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

function handleTimeout() {

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


continueBtn.addEventListener(
  "click",
  () => {

    pendingMilestone = null;

    currentQuestionIndex++;

    updateTopInfo();

    showQuestion();
  }
);


/* =========================================================
   CLAIM
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

    /*
     * Secure payment request will be
     * connected here through Edge Function.
     */

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
        "Reward claim system is not connected yet. Please try again after the secure payment backend is added."
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

  hideMilestone();

  questionText.parentElement.style.display =
    "none";

  finalWinBox.style.display =
    "block";

  finalCorrect.textContent =
    correctCount;
}


claimFinalBtn.addEventListener(
  "click",
  async () => {

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
        "Reward claim system is not connected yet. Please try again after the secure payment backend is added."
      );

      claimFinalBtn.disabled = false;

      claimFinalBtn.textContent =
        "Claim ₹500";
    }
  }
);


/* =========================================================
   SECURE CLAIM PLACEHOLDER
========================================================= */

async function createSecureClaimRequest(
  reward
) {

  /*
   * IMPORTANT:
   *
   * Do NOT insert reward directly into
   * Supabase from the browser.
   *
   * This function will be replaced with
   * the Supabase Edge Function call.
   */

  throw new Error(
    "Secure claim backend not connected."
  );
}


/* =========================================================
   GAME OVER
========================================================= */

function endGame(reason) {

  clearTimer();

  gameFinished = true;

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

  if (correctCount >= 10) {
    reward = 200;
  } else if (correctCount >= 5) {
    reward = 50;
  }

  if (correctCount >= 20) {
    reward = 500;
  }

  currentRewardElement.textContent =
    `₹${reward}`;
}


/* =========================================================
   EXIT
========================================================= */

exitGameBtn.addEventListener(
  "click",
  () => {

    const confirmed =
      confirm(
        "Are you sure you want to exit the game?"
      );

    if (!confirmed) {
      return;
    }

    clearTimer();

    window.location.href =
      "dashboard.html";
  }
);


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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}