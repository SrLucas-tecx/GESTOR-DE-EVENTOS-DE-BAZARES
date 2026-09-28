/**
 * EXPOSITORES.COM — asistencia.js
 * Panel lateral de asistencia del mapa: 3 estados por mesa (pendiente/asistió/no asistió)
 * Dependencias: state.js, utils.js, canvas.js
 */

// 19. CHECKLIST DE ASISTENCIA DEL MAPA
// ==========================================
function renderChecklist() {
  const container = document.getElementById("checklist-container");
  if (!container) return;
  const bz = getActiveBazaar();
  const tables = getActiveTables(bz);
  if (tables.length === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);">No hay mesas en este bazar.</p>`;
    return;
  }
  container.innerHTML = tables.map((t) => {
    const exp = bz.expositores.find((e) => e.id === t.exhibitorId);
    const attendanceState = t.absent ? "absent" : t.attended ? "attended" : "pending";
    return `
      <div class="card-meta-item" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="font-size:var(--fs-xs);">${escapeHTML(t.name)}</strong><br>
          <span style="color:var(--color-text-muted);font-size:var(--fs-xs);">${exp ? escapeHTML(exp.negocio) : "<em>Mesa Libre</em>"}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <select class="form-select" style="width:125px;padding:5px 7px;font-size:var(--fs-xs);"
                  onchange="setTableAttendance('${t.id}', this.value)" aria-label="Estado de asistencia de ${escapeHTML(t.name)}">
            <option value="pending" ${attendanceState === "pending" ? "selected" : ""}>Pendiente</option>
            <option value="attended" ${attendanceState === "attended" ? "selected" : ""}>Asistió</option>
            <option value="absent" ${attendanceState === "absent" ? "selected" : ""}>No asistió</option>
          </select>
            <button class="btn-table-edit" type="button" onclick="openModalTableEdit('${t.id}')"
              title="Editar mesa, texto y color" aria-label="Editar ${escapeHTML(t.name)}">✎</button>
          <button class="btn-danger" style="padding:2px 8px;font-size:10px;border-radius:6px;" onclick="deleteTable('${t.id}')" title="Eliminar mesa">🗑️</button>
        </div>
      </div>`;
  }).join("");
}


// ==========================================


// Busca la mesa en TODOS los pisos (el panel Día del Evento muestra todos).
function findTableAnyFloor(tableId, bz = getActiveBazaar()) {
  for (const floor of bz?.floors || []) {
    const table = (floor.tables || []).find((item) => item.id === tableId);
    if (table) return table;
  }
  return null;
}

function setTableAttendance(tableId, newState) {
  const bz = getActiveBazaar();
  const t  = findTableAnyFloor(tableId, bz);
  if (!t) return;
  t.attended = newState === "attended";
  t.absent   = newState === "absent";
  const plain = { pending: "pendiente", attended: "asistió", absent: "no asistió" };
  if (t.exhibitorId) registrarHistorial(t.exhibitorId, `Asistencia (${t.name}): ${plain[newState]}`, bz);
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  renderPanelDiaEvento();
  const labels = { pending:"pendiente ⏳", attended:"asistencia confirmada ✅", absent:"no asistió ❌" };
  showToast(`${t.name}: ${labels[newState]}`);
}

// Alterna entre "asistió" y "pendiente" (antes siempre marcaba "asistió").
function toggleAttendance(tableId) {
  const t = findTableAnyFloor(tableId);
  if (!t) return;
  setTableAttendance(tableId, t.attended ? "pending" : "attended");
}
