// ─────────────────────────────────────────────────────────────
// board.js  —  Renderizado del tablero Kanban y búsqueda
// ─────────────────────────────────────────────────────────────

// Guarda el texto de búsqueda actual para poder reaplicarlo después
let currentSearchQuery = "";

// Inicializa todo cuando cargamos el board
async function initBoard() {
  const user = Session.get();
  renderTopBar(user);       // muestra el nombre y el botón de logout
  renderAdminButtons();     // activa los botones de admin (admin.js)
  await renderBoard();      // carga y dibuja las tareas
  initSearch();             // activa el buscador
  connectNavLinks();        // conecta los links del sidebar (Team y Dashboard)
}

// Pone el nombre del usuario y el botón de logout en el header
function renderTopBar(user) {
  const header = document.querySelector("header");
  if (!header) return;

  // Badge con el nombre y rol
  const badge = document.createElement("span");
  badge.className = "font-label-md text-label-md text-on-surface-variant hidden md:block";
  badge.textContent = user.name + " (" + user.role + ")";

  // Botón de logout
  const logoutBtn = document.createElement("button");
  logoutBtn.className =
    "flex items-center gap-1 text-error font-label-md text-label-md hover:underline ml-2";
  logoutBtn.innerHTML =
    '<span class="material-symbols-outlined text-sm">logout</span> Logout';
  logoutBtn.addEventListener("click", function() {
    Session.clear();
    window.location.href = "login.html";
  });

  const actions = header.querySelector(".flex.items-center.gap-4.ml-4");
  if (actions) {
    actions.insertBefore(badge, actions.firstChild);
    actions.appendChild(logoutBtn);
  }
}

// Carga las tareas del servidor y las dibuja en el kanban
async function renderBoard() {
  const tasks = await Api.getTasks();
  const users = await Api.getUsers();

  // Vaciamos las columnas antes de volver a pintar
  const columns = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (let i = 0; i < columns.length; i++) {
    columns[i].innerHTML = "";
  }

  // Actualizamos los contadores de cada columna
  for (let s = 0; s < STATUSES.length; s++) {
    const status = STATUSES[s];
    const count = tasks.filter(function(t) { return t.status === status; }).length;
    const h3s = document.querySelectorAll(".kanban-column h3");
    for (let k = 0; k < h3s.length; k++) {
      if (h3s[k].textContent.trim() === COLUMN_HEADERS[status] && h3s[k].nextElementSibling) {
        h3s[k].nextElementSibling.textContent = count;
      }
    }
  }

  // Agregamos cada tarea a su columna
  for (let t = 0; t < tasks.length; t++) {
    const task = tasks[t];
    let assignedUser = null;
    for (let u = 0; u < users.length; u++) {
      if (users[u].id === task.userId) { assignedUser = users[u]; break; }
    }
    const container = getColumnContainer(task.status);
    if (container) container.appendChild(buildTaskCard(task, assignedUser));
  }

  initDragAndDrop();

  // Si había una búsqueda activa, la reaplicamos
  if (currentSearchQuery) filterTasks(currentSearchQuery);
}

// Devuelve el div donde van las tarjetas de una columna según su estado
function getColumnContainer(status) {
  const h3s = document.querySelectorAll(".kanban-column h3");
  for (let i = 0; i < h3s.length; i++) {
    if (h3s[i].textContent.trim() === COLUMN_HEADERS[status]) {
      return h3s[i].closest(".kanban-column").querySelector(".flex-1.space-y-md");
    }
  }
  return null;
}

// Construye la tarjeta visual de una tarea
function buildTaskCard(task, assignedUser) {
  const isDone = task.status === "done";

  const card = document.createElement("div");
  card.className =
    "task-card bg-surface border border-outline-variant rounded-xl p-md shadow-sm " +
    (isDone ? "opacity-80" : "");
  card.dataset.taskId = task.id;
  card.dataset.userId = task.userId;

  // Ícono de check si la tarea está terminada
  const checkHTML = isDone
    ? '<span class="material-symbols-outlined text-sm dnd-check-icon" ' +
      'style="font-variation-settings:\'FILL\' 1;color:#8f4200">check_circle</span>'
    : "";

  // Botón de editar (solo visible para el admin)
  const editBtnHTML = Session.isAdmin()
    ? '<button class="edit-task-btn material-symbols-outlined text-sm text-outline ' +
      'hover:text-primary transition-colors" title="Edit task">edit</button>'
    : "";

  const titleClass = "font-label-md text-label-md text-on-surface mb-xs" + (isDone ? " line-through" : "");

  card.innerHTML =
    '<div class="flex items-start justify-between mb-xs">' +
      '<span class="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-label-sm text-label-sm">' +
        STATUS_LABELS[task.status] +
      "</span>" +
      '<div class="flex items-center gap-1">' + editBtnHTML + checkHTML + "</div>" +
    "</div>" +
    '<h4 class="' + titleClass + '">' + escapeHtml(task.title) + "</h4>" +
    '<p class="font-body-sm text-body-sm text-on-surface-variant">' + escapeHtml(task.description) + "</p>" +
    '<div class="mt-md flex items-center justify-between">' +
      (assignedUser
        ? '<span class="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container ' +
          'px-2 py-0.5 rounded-full font-label-sm text-label-sm">' +
          '<span class="material-symbols-outlined text-xs" style="font-size:13px">person</span>' +
          escapeHtml(assignedUser.name) +
          '</span>'
        : '<span class="font-label-sm text-label-sm text-on-surface-variant opacity-60 italic">Unassigned</span>'
      ) +
    "</div>";

  // Conectamos el botón de editar si somos admin
  if (Session.isAdmin()) {
    const editBtn = card.querySelector(".edit-task-btn");
    if (editBtn) {
      editBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        openEditTaskModal(task);  // admin.js
      });
    }
  }

  return card;
}


// ── Búsqueda ─────────────────────────────────────────────────

function initSearch() {
  const input = document.querySelector("header input[type='text']");
  if (!input) return;

  input.addEventListener("input", function() {
    currentSearchQuery = input.value.trim().toLowerCase();
    filterTasks(currentSearchQuery);
  });
}

// Muestra u oculta las tarjetas según el texto buscado
function filterTasks(query) {
  const cards = document.querySelectorAll(".task-card");

  for (let i = 0; i < cards.length; i++) {
    const title = (cards[i].querySelector("h4") ? cards[i].querySelector("h4").textContent : "").toLowerCase();
    const desc  = (cards[i].querySelector("p")  ? cards[i].querySelector("p").textContent  : "").toLowerCase();
    const match = !query || title.includes(query) || desc.includes(query);
    cards[i].style.display = match ? "" : "none";
  }

  // Actualizamos el contador de cada columna con las tarjetas visibles
  const columnas = document.querySelectorAll(".kanban-column");
  for (let j = 0; j < columnas.length; j++) {
    const visible = columnas[j].querySelectorAll(".task-card:not([style*='display: none'])").length;
    const h3 = columnas[j].querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = visible;
  }
}
