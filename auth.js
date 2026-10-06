// ========================================
// AUTH.JS
// SIGNUP + LOGIN
// ========================================


// ========================================
// SIGNUP
// ========================================

const signupForm = document.getElementById("signupForm");


if (signupForm) {

  signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    // ------------------------------------
    // GET FORM VALUES
    // ------------------------------------

    const fullName = document
      .getElementById("fullName")
      .value
      .trim();


    const email = document
      .getElementById("email")
      .value
      .trim()
      .toLowerCase();


    const password =
      document.getElementById("password").value;


    const confirmPassword =
      document.getElementById("confirmPassword").value;


    const upiId = document
      .getElementById("upiId")
      .value
      .trim();


    const upiNumber = document
      .getElementById("upiNumber")
      .value
      .trim();


    const message =
      document.getElementById("signupMessage");


    const button =
      document.getElementById("signupBtn");


    // ------------------------------------
    // CLEAR OLD MESSAGE
    // ------------------------------------

    message.textContent = "";
    message.className = "";


    // ------------------------------------
    // PASSWORD CHECK
    // ------------------------------------

    if (password !== confirmPassword) {

      message.textContent =
        "Passwords do not match.";

      message.className = "error";

      return;
    }


    if (password.length < 6) {

      message.textContent =
        "Password must be at least 6 characters.";

      message.className = "error";

      return;
    }


    // ------------------------------------
    // UPI CHECK
    // AT LEAST ONE IS REQUIRED
    // ------------------------------------

    if (!upiId && !upiNumber) {

      message.textContent =
        "UPI ID ya UPI Number me se koi ek zaroor dena hai.";

      message.className = "error";

      return;
    }


    // ------------------------------------
    // MOBILE NUMBER VALIDATION
    // ------------------------------------

    if (
      upiNumber &&
      !/^[0-9]{10}$/.test(upiNumber)
    ) {

      message.textContent =
        "UPI Number 10 digit ka hona chahiye.";

      message.className = "error";

      return;
    }


    // ------------------------------------
    // UPI ID BASIC VALIDATION
    // ------------------------------------

    if (
      upiId &&
      !/^[^\s@]+@[^\s@]+$/.test(upiId)
    ) {

      message.textContent =
        "UPI ID ka format sahi nahi hai.";

      message.className = "error";

      return;
    }


    // ------------------------------------
    // DISABLE BUTTON
    // ------------------------------------

    button.disabled = true;

    button.textContent =
      "Creating Account...";


    try {


      // ----------------------------------
      // CREATE SUPABASE AUTH ACCOUNT
      // ----------------------------------

      const {
        data,
        error
      } = await supabaseClient.auth.signUp({

        email: email,

        password: password,

        options: {

          data: {
            full_name: fullName
          }

        }

      });


      // ----------------------------------
      // AUTH ERROR
      // ----------------------------------

      if (error) {
        throw error;
      }


      // ----------------------------------
      // USER CREATED
      // ----------------------------------

      if (!data || !data.user) {

        throw new Error(
          "Account create nahi ho saka."
        );

      }


      // ----------------------------------
      // UPDATE PROFILE
      // ----------------------------------

      const {
        error: profileError
      } = await supabaseClient

        .from("profiles")

        .update({

          full_name: fullName,

          email: email,

          upi_id: upiId || null,

          upi_number: upiNumber || null

        })

        .eq(
          "id",
          data.user.id
        );


      // ----------------------------------
      // PROFILE ERROR
      // ----------------------------------

      if (profileError) {

        console.error(
          "Profile update error:",
          profileError
        );

        throw new Error(
          "Account ban gaya, lekin profile details save nahi ho paayi."
        );

      }


      // ----------------------------------
      // SUCCESS
      // ----------------------------------

      message.textContent =
        "Account successfully created! Ab login kar sakte ho.";

      message.className =
        "success";


      // ----------------------------------
      // CLEAR FORM
      // ----------------------------------

      signupForm.reset();


      // ----------------------------------
      // GO TO LOGIN
      // ----------------------------------

      setTimeout(function () {

        window.location.href =
          "login.html";

      }, 1500);


    } catch (error) {


      console.error(
        "Signup error:",
        error
      );


      message.textContent =
        error.message ||
        "Signup failed.";

      message.className =
        "error";


    } finally {

      button.disabled = false;

      button.textContent =
        "Create Account";

    }

  });

}



// ========================================
// LOGIN
// ========================================

const loginForm =
  document.getElementById("loginForm");


if (loginForm) {

  loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    // ------------------------------------
    // GET VALUES
    // ------------------------------------

    const email = document
      .getElementById("email")
      .value
      .trim()
      .toLowerCase();


    const password =
      document.getElementById("password").value;


    const message =
      document.getElementById("loginMessage");


    const button =
      document.getElementById("loginBtn");


    // ------------------------------------
    // CLEAR MESSAGE
    // ------------------------------------

    message.textContent = "";
    message.className = "";


    // ------------------------------------
    // DISABLE BUTTON
    // ------------------------------------

    button.disabled = true;

    button.textContent =
      "Logging in...";


    try {


      // ----------------------------------
      // LOGIN
      // ----------------------------------

      const {
        data,
        error
      } = await supabaseClient.auth.signInWithPassword({

        email: email,

        password: password

      });


      if (error) {
        throw error;
      }


      if (!data || !data.user) {

        throw new Error(
          "Login failed."
        );

      }


      // ----------------------------------
      // GET PROFILE
      // ----------------------------------

      const {
        data: profile,
        error: profileError
      } = await supabaseClient

        .from("profiles")

        .select(
          "id, full_name, email, role, upi_id, upi_number"
        )

        .eq(
          "id",
          data.user.id
        )

        .single();


      if (profileError) {
        throw profileError;
      }


      // ----------------------------------
      // ADMIN
      // ----------------------------------

      if (
        profile &&
        profile.role === "admin"
      ) {

        window.location.href =
          "admin-dashboard.html";

        return;
      }


      // ----------------------------------
      // PLAYER
      // ------------------------------------

      window.location.href =
        "dashboard.html";


    } catch (error) {


      console.error(
        "Login error:",
        error
      );


      message.textContent =
        error.message ||
        "Login failed.";

      message.className =
        "error";


    } finally {

      button.disabled = false;

      button.textContent =
        "Login";

    }

  });

}