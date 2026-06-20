window.currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {

  const loginModal    = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");

  function openModal(modal) {
    modal.classList.add("open");
  }

  function closeModal(modal) {
    modal.classList.remove("open");
  }

  document.getElementById("go-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(registerModal);
  });

  document.getElementById("go-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    closeModal(registerModal);
    openModal(loginModal);
  });

  document.getElementById("login-confirm").addEventListener("click", async (e) => {
    e.preventDefault();

    const email    = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errorEl  = document.getElementById("login-error");

    errorEl.innerText = "";

    if (!email || !password) {
      errorEl.innerText = "Please fill in all fields.";
      return;
    }

    try {
      console.log("Enviando...");
      const res  = await fetch("https://worldbuilder-b.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        closeModal(loginModal);
        document.querySelector(".account-name").innerText  = data.username;
        document.querySelector(".account-email").innerText = email;
        window.currentUserId = data.user_id;
      } else {
        errorEl.innerText = data.message || "Failed to sign in.";
      }
    } catch {
      errorEl.innerText = "Unable to connect to the server.";
    }
  });

  document.getElementById("register-confirm").addEventListener("click", async (e) => {
    e.preventDefault();

    const username = document.getElementById("register-username").value.trim();
    const email    = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirm  = document.getElementById("register-confirm-password").value;
    const errorEl  = document.getElementById("register-error");

    errorEl.innerText = "";

    if (!username || !email || !password || !confirm) {
      errorEl.innerText = "Please fill in all fields.";
      return;
    }

    if (password !== confirm) {
      errorEl.innerText = "Passwords do not match.";
      return;
    }

    try {
      console.log("Enviando...");
      const res  = await fetch("https://worldbuilder-b.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (data.success) {
        closeModal(registerModal);
        openModal(loginModal);
        document.getElementById("login-email").value = email;
        document.getElementById("login-error").innerText = "";
      } else {
        if (data.error && data.error.includes("UNIQUE")) {
          errorEl.innerText = "Email or username already exists.";
        } else {
          errorEl.innerText = data.error || "Failed to create account.";
        }
      }
    } catch {
      errorEl.innerText = "Unable to connect to the server.";
    }
  });

});
