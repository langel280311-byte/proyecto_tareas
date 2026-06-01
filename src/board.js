// ─────────────────────────────────────────────────────────────
// board.js  —  Renderizado del tablero Kanban y búsqueda
// ─────────────────────────────────────────────────────────────

let currentSearchQuery = "";

async function initBoard() {
  const user = Session.get();
  renderTopBar(user);
  renderAdminButtons();
  await renderBoard();
  initSearch();
  connectNavLinks();
}

function renderTopBar(user) {
  const header = document.querySelector("header");
  if (!header) return;

  const badge = document.createElement("span");
  badge.className = "font-label-md text-label-md text-on-surface-variant hidden md:block";
  badge.textContent = user.name + " (" + user.role + ")";

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

async function renderBoard() {
  const tasks = await Api.getTasks();
  const users = await Api.getUsers();

  const columns = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (let i = 0; i < columns.length; i++) {
    columns[i].innerHTML = "";
  }

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

  for (let t = 0; t < tasks.length; t++) {
    const task = tasks[t];
    // Primero intentamos usar userName guardado en la tarea,
    // si no existe lo buscamos en la lista de usuarios (compatibilidad con tareas antiguas)
    let assignedName = task.userName || null;
    if (!assignedName && task.userId) {
      for (let u = 0; u < users.length; u++) {
        if (String(users[u].id) === String(task.userId)) { assignedName = users[u].name; break; }
      }
    }
    const container = getColumnContainer(task.status);
    if (container) container.appendChild(buildTaskCard(task, assignedName));
  }

  initDragAndDrop();

  if (currentSearchQuery) filterTasks(currentSearchQuery);
}

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
// assignedName: string con el nombre del usuario asignado, o null
function buildTaskCard(task, assignedName) {
  const isDone = task.status === "done";

  const card = document.createElement("div");
  card.className =
    "task-card bg-surface border border-outline-variant rounded-xl p-md shadow-sm " +
    (isDone ? "opacity-80" : "");
  card.dataset.taskId  = task.id;
  card.dataset.userId  = task.userId;
  card.dataset.userName = assignedName || "";

  const checkHTML = isDone
    ? '<span class="material-symbols-outlined text-sm dnd-check-icon" ' +
      'style="font-variation-settings:\'FILL\' 1;color:#8f4200">check_circle</span>'
    : "";

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
      '<span class="assigned-name font-label-sm text-label-sm text-on-surface-variant">' +
        "👤 " + (assignedName ? escapeHtml(assignedName) : "Unassigned") +
      "</span>" +
    "</div>";

  if (Session.isAdmin()) {
    const editBtn = card.querySelector(".edit-task-btn");
    if (editBtn) {
      editBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        openEditTaskModal(task);
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

function filterTasks(query) {
  const cards = document.querySelectorAll(".task-card");

  for (let i = 0; i < cards.length; i++) {
    const title = (cards[i].querySelector("h4") ? cards[i].querySelector("h4").textContent : "").toLowerCase();
    const desc  = (cards[i].querySelector("p")  ? cards[i].querySelector("p").textContent  : "").toLowerCase();
    const match = !query || title.includes(query) || desc.includes(query);
    cards[i].style.display = match ? "" : "none";
  }

  const columnas = document.querySelectorAll(".kanban-column");
  for (let j = 0; j < columnas.length; j++) {
    const visible = columnas[j].querySelectorAll(".task-card:not([style*='display: none'])").length;
    const h3 = columnas[j].querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = visible;
  }
}
