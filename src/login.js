// ─────────────────────────────────────────────────────────────
// login.js  —  Lógica de la página de inicio de sesión
// ─────────────────────────────────────────────────────────────

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Creamos el elemento donde mostraremos los errores de login
  const errorEl = document.createElement("div");
  errorEl.className =
    "hidden mt-2 p-3 bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm";
  form.appendChild(errorEl);

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    errorEl.classList.add("hidden");

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // Buscamos el usuario en la base de datos
      const users = await Api.getUsers();
      let found = null;

      for (let i = 0; i < users.length; i++) {
        if (users[i].email === email && users[i].password === password) {
          found = users[i];
          break;
        }
      }

      if (found) {
        // Guardamos el usuario en sesión y vamos al board
        Session.save(found);
        window.location.href = "board.html";
      } else {
        errorEl.textContent = "Invalid email or password.";
        errorEl.classList.remove("hidden");
      }
    } catch(err) {
      errorEl.textContent = "Could not connect to server.";
      errorEl.classList.remove("hidden");
    }
  });
}
