// ─────────────────────────────────────────────────────────────
// admin.js  —  Todo lo que solo puede hacer el admin
// ─────────────────────────────────────────────────────────────

// Estilo reutilizable para los inputs de los modales
const INPUT_CLASS =
  "w-full px-md py-2 bg-white border border-outline-variant rounded-lg " +
  "font-body-sm text-body-sm text-on-surface focus:outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary-fixed transition-all";


// ── Helpers de modal ─────────────────────────────────────────

// Cierra el modal que esté abierto
function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.remove();
}

// Crea el fondo oscuro del modal
function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.className =
    "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";

  // Clic fuera del modal → se cierra
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeModal();
  });

  return overlay;
}

// Crea la caja blanca del modal con su título y botón de cerrar
function createModalBox(title) {
  const box = document.createElement("div");
  box.className =
    "bg-surface-container-lowest border border-outline-variant rounded-xl " +
    "shadow-xl w-full max-w-md p-xl space-y-lg";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between";

  const h2 = document.createElement("h2");
  h2.className = "font-headline-md text-headline-md text-on-surface";
  h2.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.className = "material-symbols-outlined text-outline hover:text-on-surface transition-colors";
  closeBtn.textContent = "close";
  closeBtn.addEventListener("click", closeModal);

  header.appendChild(h2);
  header.appendChild(closeBtn);
  box.appendChild(header);

  return box;
}

// Crea un campo de formulario con su label y espacio para error
function createField(labelText, inputEl) {
  const wrapper = document.createElement("div");
  wrapper.className = "space-y-xs";

  const label = document.createElement("label");
  label.className = "font-label-md text-label-md text-on-surface block";
  label.textContent = labelText;

  const error = document.createElement("p");
  error.className = "hidden font-body-sm text-body-sm text-error mt-xs";

  wrapper.appendChild(label);
  wrapper.appendChild(inputEl);
  wrapper.appendChild(error);

  // Devolvemos el wrapper y el párrafo de error para poder usarlos después
  return { wrapper: wrapper, error: error };
}

// Crea el botón "Cancel" que cierra el modal
function makeCancelBtn() {
  const btn = document.createElement("button");
  btn.className =
    "flex-1 py-md border border-outline-variant rounded-lg font-label-md " +
    "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
  btn.textContent = "Cancel";
  btn.addEventListener("click", closeModal);
  return btn;
}

// Muestra un mensaje de éxito dentro del modal y luego lo cierra solo
function showSuccess(message) {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;

  const box = overlay.querySelector(".bg-surface-container-lowest");
  if (!box) return;

  box.innerHTML =
    '<div class="flex flex-col items-center gap-md py-xl">' +
      '<span class="material-symbols-outlined text-5xl text-primary" ' +
        'style="font-variation-settings:\'FILL\' 1">check_circle</span>' +
      '<p class="font-title-sm text-title-sm text-on-surface text-center">' +
        escapeHtml(message) +
      "</p>" +
    "</div>";

  // Cierra el modal después de 1.5 segundos
  setTimeout(closeModal, 1500);
}


// ── Tareas ───────────────────────────────────────────────────

// Abre el modal para crear una tarea nueva
async function openNewTaskModal() {
  closeModal();

  // Traemos los usuarios para el selector "Assign to"
  let users = [];
  try { users = await Api.getUsers(); } catch(e) { console.error(e); }

  const overlay = createOverlay();
  const box     = createModalBox("New Task");
  const form    = buildTaskForm(users, {});

  // Botón guardar
  const saveBtn = document.createElement("button");
  saveBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">add</span> Create Task';

  saveBtn.addEventListener("click", async function() {
    // Validación: el título es obligatorio
    const titleVal = form.titleInput.value.trim();
    if (!titleVal) {
      form.titleError.textContent = "Title is required.";
      form.titleError.classList.remove("hidden");
      return;
    }
    form.titleError.classList.add("hidden");

    // Bloqueamos el botón mientras guarda
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const newTask = {
      id:          generateId(),
      title:       titleVal,
      description: form.descInput.value.trim(),
      status:      form.statusSelect.value,
      userId:      form.assignSelect.value ? Number(form.assignSelect.value) : null
    };

    try {
      await Api.createTask(newTask);
      showSuccess("Task created successfully!");
      setTimeout(async function() { await renderBoard(); }, 1600);
    } catch(err) {
      form.generalError.textContent = "Could not save task. Check the server.";
      form.generalError.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">add</span> Create Task';
    }
  });

  // Fila de botones: [Cancel] [Create Task]
  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";
  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(saveBtn);

  form.container.appendChild(btnRow);
  box.appendChild(form.container);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  form.titleInput.focus();
}

// Abre el modal para editar una tarea existente
async function openEditTaskModal(task) {
  closeModal();

  let users = [];
  try { users = await Api.getUsers(); } catch(e) { console.error(e); }

  const overlay = createOverlay();
  const box     = createModalBox("Edit Task");
  const form    = buildTaskForm(users, task);

  // Botón eliminar (rojo, solo el ícono)
  const deleteBtn = document.createElement("button");
  deleteBtn.className =
    "py-md px-lg border border-error text-error rounded-lg font-label-md " +
    "text-label-md hover:bg-error-container transition-colors flex items-center gap-1";
  deleteBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete</span>';
  deleteBtn.title = "Delete task";
  deleteBtn.addEventListener("click", function() { openDeleteTaskModal(task); });

  // Botón guardar cambios
  const saveBtn = document.createElement("button");
  saveBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';

  saveBtn.addEventListener("click", async function() {
    const titleVal = form.titleInput.value.trim();
    if (!titleVal) {
      form.titleError.textContent = "Title is required.";
      form.titleError.classList.remove("hidden");
      return;
    }
    form.titleError.classList.add("hidden");

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const updatedTask = {
      title:       titleVal,
      description: form.descInput.value.trim(),
      status:      form.statusSelect.value,
      userId:      form.assignSelect.value ? Number(form.assignSelect.value) : null
    };

    try {
      await Api.updateTask(task.id, updatedTask);
      showSuccess("Task updated successfully!");
      setTimeout(async function() { await renderBoard(); }, 1600);
    } catch(err) {
      form.generalError.textContent = "Could not update task. Check the server.";
      form.generalError.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';
    }
  });

  // Fila: [Delete] [Cancel] [Save]
  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";
  btnRow.appendChild(deleteBtn);
  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(saveBtn);

  form.container.appendChild(btnRow);
  box.appendChild(form.container);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  form.titleInput.focus();
}

// Abre el modal de confirmación para eliminar una tarea
function openDeleteTaskModal(task) {
  closeModal();

  const overlay = createOverlay();
  const box     = createModalBox("Delete Task");

  const msg = document.createElement("p");
  msg.className = "font-body-md text-body-md text-on-surface-variant";
  msg.innerHTML =
    'Are you sure you want to delete <strong class="text-on-surface">' +
    escapeHtml(task.title) + "</strong>? This action cannot be undone.";

  const errorEl = document.createElement("p");
  errorEl.className = "hidden font-body-sm text-body-sm text-error";

  const confirmBtn = document.createElement("button");
  confirmBtn.className =
    "flex-1 py-md bg-error text-on-error rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete_forever</span> Yes, delete';

  confirmBtn.addEventListener("click", async function() {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Deleting…';

    try {
      await Api.deleteTask(task.id);
      showSuccess("Task deleted.");
      setTimeout(async function() { await renderBoard(); }, 1600);
    } catch(err) {
      errorEl.textContent = "Could not delete task. Check the server.";
      errorEl.classList.remove("hidden");
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete_forever</span> Yes, delete';
    }
  });

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";
  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(confirmBtn);

  const content = document.createElement("div");
  content.className = "space-y-lg";
  content.appendChild(msg);
  content.appendChild(errorEl);
  content.appendChild(btnRow);

  box.appendChild(content);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Construye el formulario de tarea (sirve para crear y para editar)
// prefill = objeto con los datos actuales si estamos editando, o {} si es nuevo
function buildTaskForm(users, prefill) {
  const container = document.createElement("div");
  container.className = "space-y-lg";

  // Campo: título
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Task title";
  titleInput.className = INPUT_CLASS;
  titleInput.value = prefill.title || "";
  const titleField = createField("Title *", titleInput);

  // Campo: descripción
  const descInput = document.createElement("textarea");
  descInput.rows = 3;
  descInput.placeholder = "Describe the task…";
  descInput.className = INPUT_CLASS + " resize-none";
  descInput.value = prefill.description || "";
  const descField = createField("Description", descInput);

  // Campo: estado (To Do, In Progress, etc.)
  const statusSelect = document.createElement("select");
  statusSelect.className = INPUT_CLASS;
  for (let i = 0; i < STATUSES.length; i++) {
    const opt = document.createElement("option");
    opt.value = STATUSES[i];
    opt.textContent = STATUS_LABELS[STATUSES[i]];
    if (STATUSES[i] === prefill.status) opt.selected = true;
    statusSelect.appendChild(opt);
  }
  const statusField = createField("Status *", statusSelect);

  // Campo: asignar a un usuario
  const assignSelect = document.createElement("select");
  assignSelect.className = INPUT_CLASS;
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "— Unassigned —";
  assignSelect.appendChild(defaultOpt);
  for (let j = 0; j < users.length; j++) {
    const uOpt = document.createElement("option");
    uOpt.value = users[j].id;
    uOpt.textContent = users[j].name + " (" + users[j].role + ")";
    if (String(users[j].id) === String(prefill.userId)) uOpt.selected = true;
    assignSelect.appendChild(uOpt);
  }
  const assignField = createField("Assign to", assignSelect);

  // Párrafo de error general (para errores del servidor)
  const generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  container.appendChild(titleField.wrapper);
  container.appendChild(descField.wrapper);
  container.appendChild(statusField.wrapper);
  container.appendChild(assignField.wrapper);
  container.appendChild(generalError);

  // Devolvemos todo lo que necesitamos para leer los valores y mostrar errores
  return {
    container:    container,
    titleInput:   titleInput,
    descInput:    descInput,
    statusSelect: statusSelect,
    assignSelect: assignSelect,
    titleError:   titleField.error,
    generalError: generalError
  };
}


// ── Usuarios (vista Team) ────────────────────────────────────

// Variable para guardar el HTML del kanban mientras estamos en Team
let boardBackup = null;

// Muestra la vista de Team: oculta el kanban y muestra la lista de usuarios
async function showTeamView() {
  if (!Session.isAdmin()) return;

  // Buscamos el área de contenido donde vive el kanban
  const contentArea = document.querySelector("main .flex-1.overflow-x-auto");
  if (!contentArea) return;

  // Guardamos el HTML del kanban la primera vez que entramos a Team
  if (!boardBackup) {
    boardBackup = contentArea.innerHTML;
  }

  // Limpiamos el área y cambiamos el scroll para que sea vertical
  contentArea.innerHTML = "";
  contentArea.classList.remove("overflow-x-auto");
  contentArea.classList.add("overflow-y-auto");

  // Mostramos "Loading..." mientras traemos los usuarios
  const loadingMsg = document.createElement("p");
  loadingMsg.className = "font-body-md text-body-md text-on-surface-variant text-center py-xl";
  loadingMsg.textContent = "Loading team…";
  contentArea.appendChild(loadingMsg);

  // Pedimos los usuarios al servidor
  let users = [];
  try {
    users = await Api.getUsers();
  } catch(err) {
    loadingMsg.textContent = "Could not load users. Check the server.";
    return;
  }

  // Ya tenemos los usuarios, limpiamos y construimos la vista
  contentArea.innerHTML = "";

  // Encabezado: título "Team" + botón "Add User"
  const topRow = document.createElement("div");
  topRow.className = "flex items-center justify-between mb-lg";

  const title = document.createElement("h2");
  title.className = "font-headline-md text-headline-md text-on-surface";
  title.textContent = "Team";

  const addBtn = document.createElement("button");
  addBtn.className =
    "flex items-center gap-2 bg-primary text-on-primary py-2 px-lg rounded-xl " +
    "font-label-md text-label-md hover:opacity-90 transition-opacity";
  addBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">person_add</span> Add User';
  addBtn.addEventListener("click", function() {
    openNewUserModal(function() { showTeamView(); });
  });

  topRow.appendChild(title);
  topRow.appendChild(addBtn);
  contentArea.appendChild(topRow);

  // Lista de tarjetas de usuarios
  const list = document.createElement("div");
  list.className = "space-y-md";

  if (users.length === 0) {
    const empty = document.createElement("p");
    empty.className = "font-body-md text-body-md text-on-surface-variant text-center py-xl";
    empty.textContent = "No users found.";
    list.appendChild(empty);
  } else {
    for (let i = 0; i < users.length; i++) {
      list.appendChild(buildUserCard(users[i]));
    }
  }

  contentArea.appendChild(list);
}

// Vuelve a mostrar el kanban original
function showDashboardView() {
  const contentArea = document.querySelector("main .flex-1.overflow-y-auto");
  if (!contentArea || !boardBackup) return;

  // Restauramos el HTML guardado
  contentArea.innerHTML = boardBackup;
  boardBackup = null;

  // Volvemos al scroll horizontal del kanban
  contentArea.classList.remove("overflow-y-auto");
  contentArea.classList.add("overflow-x-auto");

  // Volvemos a activar el drag & drop y la búsqueda si había una activa
  initDragAndDrop();
  if (currentSearchQuery) filterTasks(currentSearchQuery);
}

// Construye la tarjeta visual de un usuario con sus botones de editar y eliminar
function buildUserCard(user) {
  const card = document.createElement("div");
  card.className =
    "bg-surface border border-outline-variant rounded-xl p-md flex items-center justify-between gap-md";

  // Información del usuario: nombre, email y rol
  const info = document.createElement("div");
  info.className = "flex-1 min-w-0";

  const nameEl = document.createElement("p");
  nameEl.className = "font-label-md text-label-md text-on-surface truncate";
  nameEl.textContent = escapeHtml(user.name);

  const emailEl = document.createElement("p");
  emailEl.className = "font-body-sm text-body-sm text-on-surface-variant truncate";
  emailEl.textContent = escapeHtml(user.email);

  const roleBadge = document.createElement("span");
  roleBadge.className =
    "inline-block mt-xs bg-primary-fixed text-on-primary-fixed-variant " +
    "px-2 py-0.5 rounded-full font-label-sm text-label-sm";
  roleBadge.textContent = user.role;

  info.appendChild(nameEl);
  info.appendChild(emailEl);
  info.appendChild(roleBadge);

  // Botones de acción: editar y eliminar
  const actions = document.createElement("div");
  actions.className = "flex items-center gap-sm shrink-0";

  const editBtn = document.createElement("button");
  editBtn.className = "material-symbols-outlined text-outline hover:text-primary transition-colors p-1";
  editBtn.title = "Edit user";
  editBtn.textContent = "edit";
  editBtn.addEventListener("click", function() {
    openEditUserModal(user, function() { showTeamView(); });
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "material-symbols-outlined text-outline hover:text-error transition-colors p-1";
  deleteBtn.title = "Delete user";
  deleteBtn.textContent = "delete";
  deleteBtn.addEventListener("click", function() {
    openDeleteUserModal(user, function() { showTeamView(); });
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

// Construye el formulario de usuario (sirve para crear y para editar)
// prefill = objeto con los datos actuales si estamos editando, o {} si es nuevo
function buildUserForm(prefill) {
  const container = document.createElement("div");
  container.className = "space-y-lg";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Full name";
  nameInput.className = INPUT_CLASS;
  nameInput.value = prefill.name || "";
  const nameField = createField("Full Name *", nameInput);

  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "email@company.com";
  emailInput.className = INPUT_CLASS;
  emailInput.value = prefill.email || "";
  const emailField = createField("Email *", emailInput);

  // Si estamos editando, la contraseña es opcional (se mantiene si se deja vacía)
  const passLabel = prefill.id ? "New Password (optional)" : "Password *";
  const passHint  = prefill.id ? "Leave blank to keep current password" : "••••••••";
  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = passHint;
  passInput.className = INPUT_CLASS;
  const passField = createField(passLabel, passInput);

  const roleSelect = document.createElement("select");
  roleSelect.className = INPUT_CLASS;
  ["admin", "coder", "user"].forEach(function(r) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
    if (r === prefill.role) opt.selected = true;
    roleSelect.appendChild(opt);
  });
  const roleField = createField("Role *", roleSelect);

  const generalError = document.createElement("p");
  generalError.className = "hidden font-body-sm text-body-sm text-error";

  container.appendChild(nameField.wrapper);
  container.appendChild(emailField.wrapper);
  container.appendChild(passField.wrapper);
  container.appendChild(roleField.wrapper);
  container.appendChild(generalError);

  return {
    container:    container,
    nameInput:    nameInput,
    emailInput:   emailInput,
    passInput:    passInput,
    roleSelect:   roleSelect,
    nameError:    nameField.error,
    emailError:   emailField.error,
    passError:    passField.error,
    generalError: generalError
  };
}

// Abre el modal para crear un usuario nuevo
// onDone = función que se llama al terminar (para refrescar la lista)
function openNewUserModal(onDone) {
  closeModal();

  const overlay = createOverlay();
  const box     = createModalBox("New User");
  const form    = buildUserForm({});

  const saveBtn = document.createElement("button");
  saveBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">person_add</span> Create User';

  saveBtn.addEventListener("click", async function() {
    const nameVal  = form.nameInput.value.trim();
    const emailVal = form.emailInput.value.trim();
    const passVal  = form.passInput.value;
    let valid = true;

    // Validaciones
    if (!nameVal) {
      form.nameError.textContent = "Name is required.";
      form.nameError.classList.remove("hidden");
      valid = false;
    } else { form.nameError.classList.add("hidden"); }

    if (!emailVal || !emailVal.includes("@")) {
      form.emailError.textContent = "Enter a valid email.";
      form.emailError.classList.remove("hidden");
      valid = false;
    } else { form.emailError.classList.add("hidden"); }

    if (!passVal || passVal.length < 4) {
      form.passError.textContent = "Password must be at least 4 characters.";
      form.passError.classList.remove("hidden");
      valid = false;
    } else { form.passError.classList.add("hidden"); }

    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    const newUser = {
      id:       generateId(),
      name:     nameVal,
      email:    emailVal,
      password: passVal,
      role:     form.roleSelect.value
    };

    try {
      await Api.createUser(newUser);
      showSuccess('User "' + nameVal + '" created!');
      setTimeout(function() { if (onDone) onDone(); }, 1600);
    } catch(err) {
      form.generalError.textContent = "Could not save user. Check the server.";
      form.generalError.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">person_add</span> Create User';
    }
  });

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";
  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(saveBtn);

  form.container.appendChild(btnRow);
  box.appendChild(form.container);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  form.nameInput.focus();
}

// Abre el modal para editar un usuario existente
function openEditUserModal(user, onDone) {
  closeModal();

  const overlay = createOverlay();
  const box     = createModalBox("Edit User");
  const form    = buildUserForm(user);  // le pasamos el usuario para pre-llenar los campos

  const saveBtn = document.createElement("button");
  saveBtn.className =
    "flex-1 py-md bg-primary text-on-primary rounded-lg font-label-md " +
    "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
  saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';

  saveBtn.addEventListener("click", async function() {
    const nameVal  = form.nameInput.value.trim();
    const emailVal = form.emailInput.value.trim();
    let valid = true;

    if (!nameVal) {
      form.nameError.textContent = "Name is required.";
      form.nameError.classList.remove("hidden");
      valid = false;
    } else { form.nameError.classList.add("hidden"); }

    if (!emailVal || !emailVal.includes("@")) {
      form.emailError.textContent = "Enter a valid email.";
      form.emailError.classList.remove("hidden");
      valid = false;
    } else { form.emailError.classList.add("hidden"); }

    if (!valid) return;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Saving…';

    // Solo enviamos la contraseña si el admin escribió una nueva
    const updatedData = {
      name:  nameVal,
      email: emailVal,
      role:  form.roleSelect.value
    };
    if (form.passInput.value.length >= 4) {
      updatedData.password = form.passInput.value;
    }

    try {
      await Api.updateUser(user.id, updatedData);
      showSuccess("User updated successfully!");
      setTimeout(function() { if (onDone) onDone(); }, 1600);
    } catch(err) {
      form.generalError.textContent = "Could not update user. Check the server.";
      form.generalError.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">save</span> Save Changes';
    }
  });

  const btnRow = document.createElement("div");
  btnRow.className = "flex gap-md pt-sm";
  btnRow.appendChild(makeCancelBtn());
  btnRow.appendChild(saveBtn);

  form.container.appendChild(btnRow);
  box.appendChild(form.container);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  form.nameInput.focus();
}

// Abre el modal de confirmación para eliminar un usuario
// Bloquea la eliminación si el usuario tiene tareas asignadas
async function openDeleteUserModal(user, onDone) {
  closeModal();

  const overlay = createOverlay();
  const box     = createModalBox("Delete User");

  const content = document.createElement("div");
  content.className = "space-y-lg";

  // Verificamos si el usuario tiene tareas antes de mostrar el modal
  let userTasks = [];
  try {
    const allTasks = await Api.getTasks();
    userTasks = allTasks.filter(function(t) { return String(t.userId) === String(user.id); });
  } catch(err) {
    console.error("Could not check tasks:", err);
  }

  if (userTasks.length > 0) {
    // El usuario tiene tareas → mostrar advertencia y bloquear eliminación
    const warningIcon = document.createElement("div");
    warningIcon.className = "flex justify-center";
    warningIcon.innerHTML =
      '<span class="material-symbols-outlined text-5xl text-warning" ' +
      'style="font-variation-settings:\'FILL\' 1; color: #b45309;">warning</span>';

    const msg = document.createElement("p");
    msg.className = "font-body-md text-body-md text-on-surface-variant text-center";
    msg.innerHTML =
      'Cannot delete <strong class="text-on-surface">' + escapeHtml(user.name) + "</strong>.<br>" +
      'This user has <strong class="text-error">' + userTasks.length +
      ' task' + (userTasks.length > 1 ? 's' : '') + '</strong> assigned. ' +
      'Please reassign or delete their tasks first.';

    const closeButton = document.createElement("button");
    closeButton.className =
      "w-full py-md border border-outline-variant rounded-lg font-label-md " +
      "text-label-md text-on-surface hover:bg-surface-container-low transition-colors";
    closeButton.textContent = "Understood";
    closeButton.addEventListener("click", closeModal);

    content.appendChild(warningIcon);
    content.appendChild(msg);
    content.appendChild(closeButton);
  } else {
    // El usuario NO tiene tareas → permitir eliminación normal
    const msg = document.createElement("p");
    msg.className = "font-body-md text-body-md text-on-surface-variant";
    msg.innerHTML =
      'Are you sure you want to delete <strong class="text-on-surface">' +
      escapeHtml(user.name) + "</strong>? This action cannot be undone.";

    const errorEl = document.createElement("p");
    errorEl.className = "hidden font-body-sm text-body-sm text-error";

    const confirmBtn = document.createElement("button");
    confirmBtn.className =
      "flex-1 py-md bg-error text-on-error rounded-lg font-label-md " +
      "text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-sm";
    confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete_forever</span> Yes, delete';

    confirmBtn.addEventListener("click", async function() {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span> Deleting…';

      try {
        await Api.deleteUser(user.id);
        showSuccess("User deleted.");
        setTimeout(function() { if (onDone) onDone(); }, 1600);
      } catch(err) {
        errorEl.textContent = "Could not delete user. Check the server.";
        errorEl.classList.remove("hidden");
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">delete_forever</span> Yes, delete';
      }
    });

    const btnRow = document.createElement("div");
    btnRow.className = "flex gap-md pt-sm";
    btnRow.appendChild(makeCancelBtn());
    btnRow.appendChild(confirmBtn);

    content.appendChild(msg);
    content.appendChild(errorEl);
    content.appendChild(btnRow);
  }

  box.appendChild(content);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


// ── Inicialización ───────────────────────────────────────────

// Se llama desde board.js al cargar el board
// Conecta el botón "New Project" del sidebar para que abra el modal de nueva tarea
function renderAdminButtons() {
  if (!Session.isAdmin()) return;

  const sidebar = document.querySelector("aside");
  if (!sidebar) return;

  const newProjectBtn = sidebar.querySelector(".px-4.mt-auto button");
  if (newProjectBtn) {
    newProjectBtn.addEventListener("click", openNewTaskModal);
  }
}
