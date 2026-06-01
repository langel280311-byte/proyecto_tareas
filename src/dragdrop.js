// ─────────────────────────────────────────────────────────────
// dragdrop.js  —  Lógica de arrastrar y soltar tarjetas
// ─────────────────────────────────────────────────────────────

let tarjetaArrastrada = null;
let idTareaArrastrada = null;

// AbortController para limpiar listeners antes de re-registrarlos
// Evita que se acumulen múltiples handlers al llamar initDragAndDrop() varias veces
let dragAbortController = null;

function initDragAndDrop() {
  if (dragAbortController) {
    dragAbortController.abort();
  }
  dragAbortController = new AbortController();
  const signal = dragAbortController.signal;

  attachDragToCards(signal);
  attachDropZones(signal);
}

// Hace que cada tarjeta se pueda arrastrar
function attachDragToCards(signal) {
  const cards = document.querySelectorAll(".task-card[data-task-id]");
  for (let i = 0; i < cards.length; i++) {
    cards[i].setAttribute("draggable", "true");

    cards[i].addEventListener("dragstart", function(e) {
      tarjetaArrastrada = this;
      idTareaArrastrada = this.dataset.taskId;
      this.classList.add("opacity-50");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", idTareaArrastrada);
    }, { signal });

    cards[i].addEventListener("dragend", function() {
      this.classList.remove("opacity-50");
      tarjetaArrastrada = null;
      idTareaArrastrada = null;
    }, { signal });
  }
}

// Hace que cada columna acepte tarjetas soltadas
function attachDropZones(signal) {
  const zones = document.querySelectorAll(".kanban-column .flex-1.space-y-md");
  for (let i = 0; i < zones.length; i++) {
    zones[i].addEventListener("dragover",  function(e) { e.preventDefault(); }, { signal });
    zones[i].addEventListener("dragenter", function(e) { e.preventDefault(); }, { signal });

    zones[i].addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!tarjetaArrastrada || !idTareaArrastrada) return;

      const nuevoEstado = getStatusFromColumn(this.closest(".kanban-column"));
      if (!nuevoEstado) return;

      // Movemos la tarjeta visualmente sin re-renderizar todo el board
      this.appendChild(tarjetaArrastrada);
      updateCardVisual(tarjetaArrastrada, nuevoEstado);
      updateColumnCounts();

      // Guardamos el nuevo estado en el servidor sin recargar la página
      const id = idTareaArrastrada;
      Api.updateTask(id, { status: nuevoEstado })
        .catch(function(err) { console.error("Could not save change:", err); });
    }, { signal });
  }
}

// Devuelve el estado (ej. "in progress") a partir del elemento de columna
function getStatusFromColumn(columnEl) {
  const h3 = columnEl.querySelector("h3");
  if (!h3) return null;
  const label = h3.textContent.trim();
  const keys = Object.keys(COLUMN_HEADERS);
  for (let i = 0; i < keys.length; i++) {
    if (COLUMN_HEADERS[keys[i]] === label) return keys[i];
  }
  return null;
}

// Actualiza el aspecto visual de una tarjeta cuando cambia de columna
function updateCardVisual(card, status) {
  const badge = card.querySelector(".bg-primary-fixed");
  if (badge) badge.textContent = STATUS_LABELS[status];

  const title       = card.querySelector("h4");
  const topRow      = card.querySelector(".flex.items-start.justify-between.mb-xs");
  const isDone      = status === "done";
  const iconWrapper = topRow ? topRow.querySelector(".flex.items-center.gap-1") : null;

  card.classList.toggle("opacity-80", isDone);
  if (title) title.classList.toggle("line-through", isDone);

  let checkIcon = iconWrapper ? iconWrapper.querySelector(".dnd-check-icon") : null;

  // Agregamos el ícono de check si pasó a "done"
  if (isDone && !checkIcon && iconWrapper) {
    checkIcon = document.createElement("span");
    checkIcon.className = "material-symbols-outlined text-sm dnd-check-icon";
    checkIcon.style.fontVariationSettings = "'FILL' 1";
    checkIcon.style.color = "#8f4200";
    checkIcon.textContent = "check_circle";
    iconWrapper.appendChild(checkIcon);
  }

  // Quitamos el ícono si la tarea ya no está en "done"
  if (!isDone && checkIcon) checkIcon.remove();
}

// Actualiza el número de tarjetas mostrado en el encabezado de cada columna
function updateColumnCounts() {
  const columnas = document.querySelectorAll(".kanban-column");
  for (let i = 0; i < columnas.length; i++) {
    const selector = currentSearchQuery
      ? ".task-card:not([style*='display: none'])"
      : ".task-card";
    const count = columnas[i].querySelectorAll(selector).length;
    const h3 = columnas[i].querySelector("h3");
    if (h3 && h3.nextElementSibling) h3.nextElementSibling.textContent = count;
  }
}