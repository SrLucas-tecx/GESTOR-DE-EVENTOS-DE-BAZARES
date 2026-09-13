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
    return `
      <div class="card-meta-item" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="font-size:var(--fs-xs);">${escapeHTML(t.name)}</strong><br>
          <span style="color:var(--color-text-muted);font-size:var(--fs-xs);">${exp ? escapeHTML(exp.negocio) : "<em>Mesa Libre</em>"}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <label class="switch" style="transform:scale(0.8);">
            <input type="checkbox" ${t.attended ? "checked" : ""} onchange="toggleAttendance('${t.id}')">
            <span class="slider"></span>
          </label>
          <button class="btn-danger" style="padding:2px 8px;font-size:10px;border-radius:6px;" onclick="deleteTable('${t.id}')" title="Eliminar mesa">🗑️</button>
        </div>
      </div>`;
  }).join("");
}


// ==========================================


function setTableAttendance(tableId, newState) {
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === tableId);
  if (!t) return;
  t.attended = newState === "attended";
  t.absent   = newState === "absent";
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  const labels = { pending:"pendiente ⏳", attended:"asistencia confirmada ✅", absent:"no asistió ❌" };
  showToast(`${t.name}: ${labels[newState]}`);
}

function toggleAttendance(tableId) {
  setTableAttendance(tableId, "attended");
}