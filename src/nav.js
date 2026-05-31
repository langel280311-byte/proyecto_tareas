// ─────────────────────────────────────────────────────────────
// nav.js  —  Navegación del sidebar (Dashboard / Team)
// ─────────────────────────────────────────────────────────────

// Conecta los links "Dashboard" y "Team" para cambiar de vista
function connectNavLinks() {
  const navLinks = document.querySelectorAll("aside nav a");
  let dashboardLink = null;
  let teamLink      = null;

  for (let i = 0; i < navLinks.length; i++) {
    const text = navLinks[i].textContent.trim();
    if (text.includes("Dashboard")) dashboardLink = navLinks[i];
    if (text.includes("Team"))      teamLink      = navLinks[i];
  }

  if (dashboardLink) {
    dashboardLink.addEventListener("click", function(e) {
      e.preventDefault();
      showDashboardView();           // admin.js
      setActiveLink(dashboardLink, teamLink);
    });
  }

  if (teamLink) {
    teamLink.addEventListener("click", function(e) {
      e.preventDefault();
      if (Session.isAdmin()) {
        showTeamView();              // admin.js
        setActiveLink(teamLink, dashboardLink);
      }
    });
  }
}

// Cambia el estilo del link activo e inactivo en el sidebar
function setActiveLink(activeLink, inactiveLink) {
  if (activeLink) {
    activeLink.className =
      "flex items-center bg-primary-fixed text-on-primary-fixed-variant rounded-lg mx-2 px-4 py-3 font-body-sm text-body-sm transition-all scale-[0.98]";
  }
  if (inactiveLink) {
    inactiveLink.className =
      "flex items-center text-secondary hover:text-primary hover:bg-primary-container/10 px-4 py-3 mx-2 font-body-sm text-body-sm rounded-lg transition-all";
  }
}
