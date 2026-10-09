/**
 * BAZARIX — evento_ficha.js
 * Ficha descriptiva del evento (equivale a la hoja "Ficha descriptiva" de la plantilla de logística)
 * y tablero resumen: días para el evento, avance de tareas, compras, presupuesto.
 * Datos: bz.evento = { fecha, objetivo, lideres, publico, asistentes, lugar, staff } (+ bz.name = nombre del evento)
 * Dependencias: state.js, utils.js, tareas.js, compras.js, costos.js
 */

// Mapa campo → id del input en index.html
const FICHA_INPUTS = {
  nombre:      "ficha-nombre",
  fecha:       "ficha-fecha",
  objetivo:    "ficha-objetivo",
  lideres:     "ficha-lideres",
  publico:     "ficha-publico",
  asistentes:  "ficha-asistentes",
  lugar:       "ficha-lugar",
  staff:       "ficha-staff",
  presupuestoBase: "ficha-presupuesto-base",
};

/** Días entre hoy y la fecha "YYYY-MM-DD" (negativo si ya pasó). null si no hay fecha válida. */
function diasParaEvento(fecha) {
  const date = typeof parseAlertDate === "function" ? parseAlertDate(fecha) : null;
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}

function renderFicha() {
  const bz = getActiveBazaar();
  if (!bz || !document.getElementById("sec-ficha")) return;
  ensureEventoFields(bz);
  Object.entries(FICHA_INPUTS).forEach(([field, id]) => {
    const el = document.getElementById(id);
    if (!el || document.activeElement === el) return; // no pisar lo que se está escribiendo
    el.value = field === "nombre" ? bz.name : (bz.evento[field] ?? "");
  });
  renderFichaResumen(bz);
  renderPanelMetricas(bz);
  renderFichaDatos(bz);
}

function updateFichaField(field, value) {
  const bz = getActiveBazaar();
  if (!bz || !(field in FICHA_INPUTS)) return;
  ensureEventoFields(bz);
  if (field === "nombre") {
    const name = String(value).trim();
    if (!name) {
      showToast("El nombre del evento no puede estar vacío", "error");
      renderFicha();
      return;
    }
    bz.name = name;
    saveState();
    renderAll(); // el nombre aparece en selector, tablas y encabezados
    return;
  }
  if (field === "presupuestoBase") {
    bz.evento[field] = value === "" ? "" : Math.max(0, Number(value) || 0);
  } else {
    bz.evento[field] = ["asistentes", "staff"].includes(field) && value !== "" ? Math.max(0, Number(value) || 0) : value;
  }
  saveState();
  renderFichaResumen(bz);
  renderFichaDatos(bz);
}

// Autoguardado mientras se escribe (campos de texto libre), sin esperar a
// que el campo pierda el foco. updateFichaField ya evita repintar el
// input activo, así que no interrumpe lo que el usuario está tecleando.
const debouncedUpdateFichaField = debounce(updateFichaField, 500);

function renderFichaResumen(bz = getActiveBazaar()) {
  const box = document.getElementById("ficha-resumen");
  if (!bz) return;
  ensureEventoFields(bz);

  const presupuesto = calcPresupuesto(bz);
  const presupuestoBase = bz.evento.presupuestoBase === "" ? null : Number(bz.evento.presupuestoBase);
  const ingresos = bz.expositores.reduce((s, e) => s + Number(e.costo || 0), 0);
  const balance = ingresos - presupuesto.total;
  const disponible = presupuestoBase === null ? null : presupuestoBase - presupuesto.total;
  if (box) {
    const item = (label, value, className = "") => `
      <div class="panel-kpi ${className}">
        <span class="panel-kpi-label">${label}</span>
        <strong class="panel-kpi-value">${escapeHTML(String(value))}</strong>
      </div>`;
    box.innerHTML =
      item("Presupuesto base", presupuestoBase === null ? "Sin definir" : formatCurrency(presupuestoBase)) +
      item("Dinero ganado", formatCurrency(ingresos), ingresos > 0 ? "panel-kpi-positive" : "") +
      item("Dinero invertido", formatCurrency(presupuesto.total)) +
      item("Saldo del presupuesto", disponible === null ? "—" : formatCurrency(disponible),
        disponible === null ? "" : disponible < 0 ? "panel-kpi-negative" : "panel-kpi-positive") +
      item("Ganancia neta", formatCurrency(balance), balance < 0 ? "panel-kpi-negative" : "panel-kpi-positive");
  }
  const status = document.getElementById("panel-budget-status");
  if (status) {
    if (presupuestoBase === null) {
      status.className = "panel-budget-status";
      status.textContent = "Define el presupuesto base en la ficha para saber si los gastos están dentro del límite.";
    } else if (disponible < 0) {
      status.className = "panel-budget-status is-over";
      status.textContent = `Presupuesto excedido por ${formatCurrency(Math.abs(disponible))}.`;
    } else if (disponible === 0) {
      status.className = "panel-budget-status is-at-limit";
      status.textContent = "Presupuesto base agotado; no queda saldo disponible.";
    } else {
      status.className = "panel-budget-status is-within";
      status.textContent = `Dentro del presupuesto; quedan ${formatCurrency(disponible)} disponibles.`;
    }
  }
  renderPanelChecklist(bz);
}

let _panelChecklistTab = "tareas";

function setPanelChecklistTab(tab) {
  if (!["tareas", "alertas"].includes(tab)) return;
  _panelChecklistTab = tab;
  ["tareas", "alertas"].forEach((name) => {
    const button = document.getElementById(`panel-tab-${name}`);
    const content = document.getElementById(`panel-content-${name}`);
    const active = name === tab;
    if (button) {
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    }
    if (content) content.hidden = !active;
  });
}

function handlePanelTabKey(event) {
  const tabs = ["tareas", "alertas"];
  const current = tabs.indexOf(event.target.id.replace("panel-tab-", ""));
  if (current < 0) return;
  let next = current;
  if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
  else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else return;
  event.preventDefault();
  const tab = tabs[next];
  setPanelChecklistTab(tab);
  document.getElementById(`panel-tab-${tab}`)?.focus();
}

/** Lista hasta cuatro pendientes y alertas, priorizando los vencimientos cercanos. */
function renderPanelChecklist(bz = getActiveBazaar()) {
  const alertBox = document.getElementById("panel-alertas");
  const checklist = document.getElementById("panel-checklist");
  if (!bz || !alertBox || !checklist) return;

  const alerts = getTodasLasAlertas(bz);
  const pendingAlerts = alerts.slice(0, 4);
  const overdueAlerts = alerts.filter((alert) => alert.isOverdue).length;
  updateAlertBadge();
  alertBox.innerHTML = pendingAlerts.length
    ? pendingAlerts.map(({ tipo, exp, t, c, label, isOverdue }) => {
        let title, detail, action;
        if (tipo === "pago") {
          title = exp.negocio || "Expositor sin nombre";
          detail = `Pago pendiente · ${label}`;
          action = `<button type="button" class="btn-secondary btn-sm" onclick="togglePaymentStatus('${exp.id}')">Marcar pagado</button>`;
        } else if (tipo === "tarea") {
          title = t.actividad || "Tarea sin nombre";
          detail = `Tarea ${TAREAS_FASES[t.fase]?.label || t.fase} · ${label}`;
          action = `<button type="button" class="btn-secondary btn-sm" onclick="toggleTarea('${t.id}')">Marcar lista</button>`;
        } else {
          title = c.articulo || "Artículo sin nombre";
          detail = `Artículo por comprar · ${label}`;
          action = `<button type="button" class="btn-secondary btn-sm" onclick="toggleCompra('${c.id}')">Marcar comprado</button>`;
        }
        return `
          <div class="panel-alert-row ${isOverdue ? "panel-alert-overdue" : ""}">
            <span class="panel-alert-icon" aria-hidden="true">!</span>
            <div class="panel-alert-copy">
              <strong>${escapeHTML(title)}</strong>
              <span>${escapeHTML(detail)}</span>
            </div>
            ${action}
          </div>`;
      }).join("")
    : `<p class="panel-empty-state">No hay alertas activas.</p>`;

  const taskItems = (bz.tareas || []).filter((t) => !t.hecho).map((t) => ({
    id: t.id,
    label: t.actividad || "Tarea sin nombre",
    typeLabel: TAREAS_FASES[t.fase]?.label || t.fase,
    dueDate: t.fecha,
    type: "tarea",
    overdue: diasParaEvento(t.fecha) !== null && diasParaEvento(t.fecha) < 0
  }));
  const purchaseItems = (bz.compras || []).filter((c) => !c.comprado).map((c) => ({
    id: c.id,
    label: c.articulo || "Artículo sin nombre",
    typeLabel: "Artículo por comprar",
    dueDate: c.fecha,
    type: "compra",
    overdue: diasParaEvento(c.fecha) !== null && diasParaEvento(c.fecha) < 0
  }));
  const items = [...taskItems, ...purchaseItems].sort((a, b) => {
    const dateA = parseAlertDate(a.dueDate)?.getTime() ?? Infinity;
    const dateB = parseAlertDate(b.dueDate)?.getTime() ?? Infinity;
    return dateA - dateB;
  });
  const visibleItems = items.slice(0, 4);
  const overdueTasks = items.filter((item) => item.overdue).length;
  const updateOverdueBadge = (id, count, label) => {
    const badge = document.getElementById(id);
    const tab = badge?.closest(".panel-work-tab");
    if (!badge || !tab) return;
    badge.hidden = count === 0;
    badge.textContent = String(count);
    badge.setAttribute("aria-label", `${count} ${label} vencidas`);
    tab.classList.toggle("has-overdue", count > 0);
  };
  updateOverdueBadge("panel-alertas-overdue", overdueAlerts, "alertas");
  updateOverdueBadge("panel-tareas-overdue", overdueTasks, "tareas o artículos");

  checklist.innerHTML = visibleItems.length
    ? visibleItems.map((item) => {
        const days = diasParaEvento(item.dueDate);
        const dueLabel = days === null ? "Sin vencimiento"
          : days < 0 ? `Venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`
            : days === 0 ? "Vence hoy" : `Vence en ${days} día${days === 1 ? "" : "s"}`;
        const detail = item.dueDate ? `${item.typeLabel} · ${dueLabel}` : item.typeLabel;
        return `
          <label class="panel-checklist-row ${item.overdue ? "panel-checklist-overdue" : ""}">
            <input type="checkbox"
                   onchange="${item.type === "tarea" ? "toggleTarea" : "toggleCompra"}('${item.id}')"
                   aria-label="Marcar listo: ${escapeHTML(item.label)}">
            <span class="panel-checklist-copy">
              <strong>${escapeHTML(item.label)}</strong>
              <small>${escapeHTML(detail)}</small>
            </span>
          </label>`;
      }).join("")
    : `<p class="panel-empty-state">No hay tareas ni artículos pendientes.</p>`;
  setPanelChecklistTab(_panelChecklistTab);
}

/** Muestra el avance en pagos, asistencia y confirmación de invitados. */
function renderPanelMetricas(bz = getActiveBazaar()) {
  const box = document.getElementById("panel-metricas");
  if (!box || !bz) return;
  ensureEventoFields(bz);
  const pct = (a, t) => (t ? Math.round((a / t) * 100) : 0);
  const pagados = bz.expositores.filter((e) => e.pagado).length;
  const mesas = typeof getDiaEventoTables === "function" ? getDiaEventoTables(bz) : [];
  const asistieron = mesas.filter((e) => e.state === "attended").length;
  const invitados = bz.invitados || [];
  const confirmados = invitados.filter((i) => i.confirmado).length;
  const progress = (label, completed, total) => {
    const percentage = pct(completed, total);
    return `
      <div class="panel-progress-item">
        <div class="panel-progress-heading">
          <span>${label}</span>
          <strong>${completed}/${total} <span>· ${percentage}%</span></strong>
        </div>
        <div class="panel-progress-track" role="progressbar" aria-label="${label}"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}">
          <span class="panel-progress-fill" style="width:${percentage}%"></span>
        </div>
      </div>`;
  };
  box.innerHTML =
    progress("Expositores al corriente", pagados, bz.expositores.length) +
    progress("Asistencia de mesas asignadas", asistieron, mesas.length) +
    progress("Confirmación de invitados", confirmados, invitados.length);
}

/** Resumen de solo lectura de la ficha (se muestra cuando el formulario está oculto). */
function renderFichaDatos(bz = getActiveBazaar()) {
  const box = document.getElementById("ficha-datos");
  if (!box || !bz) return;
  ensureEventoFields(bz);
  const ev = bz.evento;
  let fecha = "";
  if (ev.fecha) {
    const d = new Date(`${ev.fecha}T00:00:00`);
    fecha = Number.isNaN(d.getTime()) ? ev.fecha : d.toLocaleDateString("es-MX", { dateStyle: "long" });
  }
  const rows = [["Fecha", fecha], ["Lugar", ev.lugar], ["Líderes", ev.lideres], ["Público", ev.publico],
                ["Asistentes esperados", ev.asistentes], ["Staff considerado", ev.staff]]
    .filter(([, v]) => v !== "" && v !== null && v !== undefined);
  box.innerHTML = `
    <div class="ficha-resumen-nombre">${escapeHTML(bz.name)}</div>
    ${ev.objetivo ? `<p class="ficha-objetivo">${escapeHTML(ev.objetivo)}</p>` : ""}
    ${rows.length || ev.objetivo
      ? `<div class="panel-event-meta">${rows.map(([label, value]) => `
          <span><strong>${label}</strong> ${escapeHTML(String(value))}</span>`).join("")}</div>`
      : `<p class="panel-event-hint">Aún no hay datos del evento. Completa la ficha para compartir los detalles.</p>`}`;
}

/** Muestra u oculta el formulario de la ficha. Sin argumento alterna; true/false fuerza el estado. */
function toggleFichaForm(forceOpen) {
  const card = document.getElementById("ficha-form-card");
  if (!card) return;
  const open = typeof forceOpen === "boolean" ? forceOpen : card.hidden;
  card.hidden = !open;
  const datos = document.getElementById("ficha-datos");
  if (datos) datos.hidden = open;
  const btn = document.getElementById("btn-toggle-ficha");
  if (btn) {
    btn.textContent = open ? "Listo" : "Editar ficha";
    btn.setAttribute("aria-expanded", String(open));
  }
  if (open) {
    renderFicha();
    document.getElementById("ficha-nombre")?.focus();
    document.getElementById("ficha-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    document.activeElement?.blur();   // dispara el guardado del campo en edición
    renderFichaDatos();
  }
}
