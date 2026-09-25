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
