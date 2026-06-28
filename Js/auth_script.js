window.currentUserId = null;

const SESSION_KEY = "wb_session";
const REMEMBER_DAYS = 30;
function saveSession(userId, username, email, remember) {
  const expiry = remember
    ? Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000
    : null;
  const session = { userId, username, email, expiry };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiry && Date.now() > session.expiry) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function applySession(session, loginModal) {
  window.currentUserId = session.userId;
  const nameEl  = document.querySelector(".account-name");
  const emailEl = document.querySelector(".account-email");
  if (nameEl)  nameEl.innerText  = session.username;
  if (emailEl) emailEl.innerText = session.email;
  if (loginModal) loginModal.classList.remove("open");
}
document.addEventListener("DOMContentLoaded", () => {

  const loginModal    = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");

  const savedSession = loadSession();
  if (savedSession) {
    applySession(savedSession, loginModal);
    if (window.loadUserItems) window.loadUserItems(savedSession.userId);
  }

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
    const remember = document.getElementById("login-remember").checked;
    const errorEl  = document.getElementById("login-error");

    errorEl.innerText = "";

    if (!email || !password) {
      errorEl.innerText = "Please fill in all fields.";
      return;
    }

    try {
      console.log("Enviando...");
      const res  = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.user_id, data.username, data.email, remember);
        applySession({ userId: data.user_id, username: data.username, email: data.email }, loginModal);
        if (window.loadUserItems) window.loadUserItems(data.user_id);
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
      const res  = await fetch(`${API_URL}/register`, {
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
