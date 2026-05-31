// ─────────────────────────────────────────────────────────────
// app.js  —  Punto de entrada: inicializa la página al cargar
// ─────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async function() {
  guardRoutes();  // redirige si no hay sesión (core.js)

  if (isLoginPage()) {
    initLogin();  // login.js
    return;
  }

  if (isBoardPage()) {
    await initBoard();  // board.js
  }
});
