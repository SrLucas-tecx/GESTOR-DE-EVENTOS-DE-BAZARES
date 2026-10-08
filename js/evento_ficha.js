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
  bz.evento[field] = ["asistentes", "staff"].includes(field) && value !== "" ? Math.max(0, Number(value) || 0) : value;
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
  if (!box || !bz) return;
  ensureEventoFields(bz);

  const dias = diasParaEvento(bz.evento.fecha);
  const diasValue = dias === null ? "—" : dias > 0 ? String(dias) : dias === 0 ? "Hoy" : String(Math.abs(dias));
  const diasLabel = dias === null ? "Define la fecha del evento"
    : dias > 0 ? "Días para el evento" : dias === 0 ? "¡El evento es hoy!" : "Días desde el evento";

  const previo = tareasStats(bz, "previo");
  const post = tareasStats(bz, "post");
  const comprasHechas = bz.compras.filter((c) => c.comprado).length;
  const presupuesto = calcPresupuesto(bz);

  const card = (accent, icon, value, label) => `
    <div class="stat-card ${accent}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${escapeHTML(String(value))}</div>
      <div class="stat-label">${escapeHTML(label)}</div>
    </div>`;

  box.innerHTML =
    card("accent-teal",  "📅", diasValue, diasLabel) +
    card("accent-green", "✅", `${previo.hechas}/${previo.total}`, "Tareas previas listas") +
    card("accent-gold",  "📋", `${post.hechas}/${post.total}`, "Tareas posteriores listas") +
    card("accent-gold",  "🛒", `${comprasHechas}/${bz.compras.length}`, "Artículos comprados") +
    card("accent-red",   "💰", formatCurrency(presupuesto.total), "Presupuesto total");
}

/** Métricas del Panel del bazar (cada tarjeta lleva a su pantalla de detalle). */
function renderPanelMetricas(bz = getActiveBazaar()) {
  const box = document.getElementById("panel-metricas");
  if (!box || !bz) return;
  ensureEventoFields(bz);
  const pct = (a, t) => (t ? Math.round((a / t) * 100) : 0);
  const ingresos = bz.expositores.reduce((s, e) => s + Number(e.costo || 0), 0);
  const egresos = calcPresupuesto(bz).total;
  const pagados = bz.expositores.filter((e) => e.pagado).length;
  const mesas = typeof getDiaEventoTables === "function" ? getDiaEventoTables(bz) : [];
  const asistieron = mesas.filter((e) => e.state === "attended").length;
  const invitados = bz.invitados || [];
  const confirmados = invitados.filter((i) => i.confirmado).length;
  const alertas = getTodasLasAlertas(bz).length;
  const card = (accent, icon, value, label, tab) => `
    <button type="button" class="stat-card stat-link ${accent}" onclick="switchTab('${tab}')" title="Ver detalle">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${escapeHTML(String(value))}</div>
      <div class="stat-label">${escapeHTML(label)}</div>
    </button>`;
  box.innerHTML = `<h3 class="panel-section-title">Métricas del bazar</h3>` +
    card("accent-teal",  "📥", formatCurrency(ingresos), "Ingresos", "finanzas") +
    card("accent-red",   "📤", formatCurrency(egresos), "Egresos", "costos") +
    card("accent-green", "💎", formatCurrency(ingresos - egresos), "Balance", "costos") +
    card("accent-teal",  "🎯", formatCurrency(calcTicketPromedio(bz)), "Ticket promedio", "estadisticas") +
    card("accent-gold",  "💳", `${pagados}/${bz.expositores.length} · ${pct(pagados, bz.expositores.length)}%`, "Expositores al corriente", "finanzas") +
    card("accent-teal",  "🎪", `${pct(asistieron, mesas.length)}%`, `Asistencia (${asistieron}/${mesas.length} mesas)`, "dia-evento") +
    card("accent-gold",  "🎟️", `${pct(confirmados, invitados.length)}%`, "Confirmación de invitados", "invitados") +
    card("accent-red",   "⚠️", alertas, alertas === 1 ? "Alerta por atender" : "Alertas por atender", "alertas") +
    `<div style="grid-column:1/-1;"><button type="button" class="link-inline" onclick="switchTab('estadisticas')">📈 Ver todas las métricas y gráficas</button></div>`;
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
  const rows = [["📅 Fecha", fecha], ["📍 Lugar", ev.lugar], ["👤 Líderes", ev.lideres], ["🎯 Público", ev.publico],
                ["👥 Asistentes esperados", ev.asistentes], ["🙋 Staff considerado", ev.staff]]
    .filter(([, v]) => v !== "" && v !== null && v !== undefined);
  box.innerHTML = `
    <div class="ficha-resumen-nombre">${escapeHTML(bz.name)}</div>
    ${ev.objetivo ? `<p class="ficha-objetivo">${escapeHTML(ev.objetivo)}</p>` : ""}
    ${rows.length || ev.objetivo
      ? `<div class="ficha-datos-grid">${rows.map(([label, value]) => `
          <div class="card-meta-item">
            <div class="card-meta-label">${label}</div>
            <div class="card-meta-value">${escapeHTML(String(value))}</div>
          </div>`).join("")}</div>`
      : `<p class="form-hint">Aún no hay datos del evento. Pulsa “✏️ Editar” para completarlos.</p>`}`;
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
    btn.textContent = open ? "✔ Listo" : "✏️ Editar";
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
