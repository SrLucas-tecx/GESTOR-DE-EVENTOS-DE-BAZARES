/**
 * EXPOSITORES.COM — eventos.js
 * Estado de publicación del bazar, ban de expositores, Minuto a Minuto (agenda del evento)
 * Dependencias: state.js, utils.js
 */

const PUBLICATION_STATUSES = ["pendiente", "parcial", "lista", "publicada"];
const PUBLICATION_LABELS = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  lista: "Lista",
  publicada: "Publicada"
};

function publicationStatusLabel(status) {
  return PUBLICATION_LABELS[status] || PUBLICATION_LABELS.pendiente;
}

function cyclePublicationStatus(id) {
  const exp = getActiveBazaar()?.expositores.find((item) => item.id === id);
  if (!exp) return;
  const currentIndex = PUBLICATION_STATUSES.indexOf(exp.publicationStatus || "pendiente");
  exp.publicationStatus = PUBLICATION_STATUSES[(currentIndex + 1) % PUBLICATION_STATUSES.length];
  registrarHistorial(exp.id, `Publicación: ${publicationStatusLabel(exp.publicationStatus)}`);
  saveState();
  renderExpositores();
  showToast(`📣 ${exp.negocio}: ${publicationStatusLabel(exp.publicationStatus)}`);
}

async function toggleExpositorBan(id) {
  const exp = getActiveBazaar()?.expositores.find((item) => item.id === id);
  if (!exp) return;
  const action = exp.banned ? "quitar el baneo a" : "banear a";
  if (!await appConfirm(`¿Deseas ${action} "${exp.negocio}"?`, exp.banned ? "Quitar baneo" : "Banear expositor")) return;
  exp.banned = !exp.banned;
  registrarHistorial(exp.id, exp.banned ? "Expositor baneado" : "Baneo retirado");
  saveState();
  renderExpositores();
  showToast(exp.banned ? "🚫 Expositor baneado" : "✅ Baneo retirado");
}

// "HH:MM" → minutos desde medianoche (null si no es válido)
function _minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Duración legible entre hora inicio y hora fin: "3 min", "1 h 30 min". "" si falta alguna, "—" si es inválida. */
function minuteDuration(start, end) {
  const a = _minutesOf(start), b = _minutesOf(end);
  if (a === null || b === null) return "";
  const diff = b - a;
  if (diff < 0) return "—";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function renderMinuteByMinute() {
  const container = document.getElementById("minute-by-minute-list");
  const bz = getActiveBazaar();
  if (!container || !bz) return;
  const rows = bz.minuteByMinute || (bz.minuteByMinute = []);
  if (!rows.length) {
    container.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--color-text-muted);padding:24px;">Sin actividades programadas.</td></tr>`;
    return;
  }
  container.innerHTML = rows.map((row) => {
    const duration = minuteDuration(row.time, row.horaFin);
    return `
    <tr>
      <td><input class="form-input" type="time" value="${escapeHTML(row.time)}" onchange="updateMinuteRow('${row.id}','time',this.value)"></td>
      <td><input class="form-input" type="time" value="${escapeHTML(row.horaFin || "")}" onchange="updateMinuteRow('${row.id}','horaFin',this.value)"></td>
      <td>
        <input class="form-input" type="text" value="${escapeHTML(duration)}" placeholder="—"
          readonly aria-label="Duración calculada"
          style="font-weight:700;color:${duration === "—" ? "var(--color-danger)" : "var(--color-accent)"};cursor:default;"
          title="${duration === "—" ? "La hora fin es anterior a la de inicio" : "Calculada automáticamente"}">
      </td>
      <td><input class="form-input" value="${escapeHTML(row.activity)}" onchange="updateMinuteRow('${row.id}','activity',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(row.lugar || "")}" placeholder="Ej. Auditorio" onchange="updateMinuteRow('${row.id}','lugar',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(row.area)}" placeholder="Ej. Montaje" onchange="updateMinuteRow('${row.id}','area',this.value)"></td>
      <td><select class="form-select" onchange="updateMinuteRow('${row.id}','responsableId',this.value)">${responsableOptionsHTML(row.responsableId, bz)}</select></td>
      <td><input class="form-input" value="${escapeHTML(row.notes)}" onchange="updateMinuteRow('${row.id}','notes',this.value)"></td>
      <td><button class="btn-danger btn-sm" onclick="deleteMinuteRow('${row.id}')">🗑️</button></td>
    </tr>`;
  }).join("");
}

function addMinuteRow() {
  const bz = getActiveBazaar();
  if (!bz) return;
  if (!Array.isArray(bz.minuteByMinute)) bz.minuteByMinute = [];
  const id = `minute-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  bz.minuteByMinute.push({ id, time: "", horaFin: "", activity: "Nueva actividad", lugar: "", area: "", responsableId: "", notes: "" });
  saveState();
  renderMinuteByMinute();
}

function updateMinuteRow(id, field, value) {
  const row = (getActiveBazaar()?.minuteByMinute || []).find((item) => item.id === id);
  if (!row) return;
  row[field] = value;
  saveState();
  if (field === "time" || field === "horaFin") renderMinuteByMinute(); // refresca la duración
}

function deleteMinuteRow(id) {
  const bz = getActiveBazaar();
  if (!bz) return;
  bz.minuteByMinute = (bz.minuteByMinute || []).filter((row) => row.id !== id);
  saveState();
  renderMinuteByMinute();
}

function minuteRowsForExport() {
  return (getActiveBazaar()?.minuteByMinute || []).slice().sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function exportarMinutoAMinutoCSV() {
  const bz = getActiveBazaar();
  if (!bz) return;
  const rows = minuteRowsForExport();
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [["Hora inicio", "Hora fin", "Duración", "Actividad", "Lugar", "Área encargada", "Responsable", "Notas"], ...rows.map((row) => [row.time, row.horaFin, minuteDuration(row.time, row.horaFin), row.activity, row.lugar, row.area, getResponsableNombre(row.responsableId, bz), row.notes])]
    .map((row) => row.map(quote).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `minuto_a_minuto_${bz.name.replace(/[^a-z0-9]+/gi, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("✅ Minuto a Minuto exportado a Excel");
}

function exportarMinutoAMinutoPDF() {
  const bz = getActiveBazaar();
  if (!bz || !window.html2pdf) {
    showToast("❌ Librería PDF no disponible", "error");
    return;
  }
  const rows = minuteRowsForExport();
  const issuedAt = new Date().toLocaleDateString("es-MX");
  const wrapper = document.createElement("div");
  wrapper.id = "minuto-a-minuto-pdf-wrapper";
  // [FIX-3] "opacity:0" hacía que html2canvas capturara los píxeles TAL
  // COMO SE VEN — y con opacidad 0 son transparentes, por eso el PDF salía
  // en blanco. Se usa el mismo método que ya funciona en el comprobante de
  // pago (generatePDFInvoice): display:none por defecto, y display:block
  // solo un instante antes de capturar. Sin position:fixed, sin opacity,
  // sin coordenadas negativas — nada que interfiera con la captura.
  wrapper.style.cssText = "display:none;box-sizing:border-box;width:700px;padding:30px;font-family:Arial,sans-serif;background:#fff;color:#333;";
  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d9488;padding-bottom:15px;margin-bottom:20px;">
      <div>
        <h1 style="color:#0d9488;margin:0;font-size:22px;">PROGRAMA DEL EVENTO</h1>
        <p style="margin:5px 0 0;color:#666;font-size:13px;">BAZARIX — Gestión de Eventos</p>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:bold;font-size:15px;color:#0d9488;">MINUTO A MINUTO</div>
        <div style="font-size:12px;color:#777;">Fecha: ${issuedAt}</div>
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;">
      <div style="font-weight:bold;color:#0d9488;margin-bottom:5px;">Evento</div>
      <div>${escapeHTML(bz.name)}</div>
      <div style="color:#64748b;margin-top:4px;">Actividades programadas: ${rows.length}</div>
    </div>
    <table style="width:100%;table-layout:fixed;font-size:12px;border-collapse:collapse;">
      <colgroup><col style="width:9%"><col style="width:9%"><col style="width:9%"><col style="width:19%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:15%"></colgroup>
      <thead><tr>${["Inicio", "Fin", "Duración", "Actividad", "Lugar", "Área", "Responsable", "Notas"].map((label) => `<th style="text-align:left;background:#ccfbf1;color:#0f766e;padding:9px;border-bottom:2px solid #0d9488;">${label}</th>`).join("")}</tr></thead>
      <tbody>${rows.length ? rows.map((row, index) => `<tr style="${index % 2 ? "background:#f8fafc;" : ""}page-break-inside:avoid;">${[row.time, row.horaFin, minuteDuration(row.time, row.horaFin), row.activity, row.lugar, row.area, getResponsableNombre(row.responsableId, bz), row.notes].map((value) => `<td style="padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top;word-wrap:break-word;">${escapeHTML(value || "—")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="8" style="padding:18px;text-align:center;color:#64748b;">Sin actividades programadas.</td></tr>`}</tbody>
    </table>
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;text-align:center;">Documento generado por BAZARIX</div>`;
  document.body.appendChild(wrapper);
  wrapper.style.display = "block";
  window.html2pdf().set({
    margin: 10,
    filename: `minuto_a_minuto_${bz.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`,
    html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    // Evita que una fila de la tabla se corte entre dos páginas del PDF.
    pagebreak: { mode: ["css", "legacy"], avoid: ["tr"] }
  }).from(wrapper).save().then(() => wrapper.remove()).catch(() => {
    wrapper.remove();
    showToast("❌ No se pudo generar el PDF", "error");
  });
}

// ==========================================
