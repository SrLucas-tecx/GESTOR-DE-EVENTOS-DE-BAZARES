/**
 * BAZARIX — asistencia.js
 * Panel lateral de asistencia del mapa.
 * 3 estados por mesa: pendiente / asistió / no asistió
 * Clic en el estado activo → lo desactiva (vuelve a pendiente)
 * Dependencias: state.js, utils.js, canvas.js
 */

// ==========================================
// 19. CHECKLIST DE ASISTENCIA DEL MAPA
// ==========================================
function renderChecklist() {
  const container = document.getElementById("checklist-container");
  if (!container) return;
  const bz     = getActiveBazaar();
  const tables = getActiveTables(bz);

  if (tables.length === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);">
      No hay mesas en este bazar.</p>`;
    return;
  }

  container.innerHTML = tables.map((t) => {
    const exp   = bz.expositores.find((e) => e.id === t.exhibitorId);
    // Estado actual
    const state = t.absent ? "absent" : t.attended ? "attended" : "pending";

    // Config visual de cada estado
    const S = {
      pending:  { icon:"⏳", label:"Pendiente",   bg:"#fef3c7", color:"#d97706" },
      attended: { icon:"✅", label:"Asistió",      bg:"#d1fae5", color:"#059669" },
      absent:   { icon:"❌", label:"No asistió",   bg:"#fee2e2", color:"#dc2626" },
    };

    // Genera un botón: si está activo y se hace clic → vuelve a pending (toggle off)
    const btn = (st) => {
      const active  = state === st;
      const onClick = active
        ? `setTableAttendance('${t.id}','pending')`   // desactivar
        : `setTableAttendance('${t.id}','${st}')`;    // activar
      return `
        <button onclick="${onClick}"
          title="${active ? 'Clic para desmarcar' : S[st].label}"
          style="
            flex:1;font-size:10px;font-weight:700;padding:5px 2px;
            border-radius:6px;cursor:pointer;transition:all .15s;
            border: 1.5px solid ${active ? S[st].color : 'var(--color-border)'};
            background: ${active ? S[st].bg : 'transparent'};
            color: ${active ? S[st].color : 'var(--color-text-muted)'};
            ${active ? 'box-shadow:0 0 0 2px ' + S[st].color + '33;' : ''}
          ">
          ${S[st].icon} ${S[st].label}
        </button>`;
    };

    return `
      <div class="card-meta-item" style="display:flex;flex-direction:column;gap:7px;padding:8px;">
        <!-- Fila superior: nombre + badge + eliminar -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <div style="min-width:0;">
            <strong style="font-size:var(--fs-xs);display:block;
                           white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHTML(t.name)}
            </strong>
            <span style="color:var(--color-text-muted);font-size:var(--fs-xs);">
              ${exp ? escapeHTML(exp.negocio) : '<em>Mesa Libre</em>'}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
            <span style="
              font-size:10px;font-weight:700;padding:2px 8px;
              border-radius:999px;white-space:nowrap;
              background:${S[state].bg};color:${S[state].color};">
              ${S[state].icon} ${S[state].label}
            </span>
            <button class="btn-danger"
              style="padding:2px 7px;font-size:10px;border-radius:6px;"
              onclick="deleteTable('${t.id}')" title="Eliminar mesa">🗑️</button>
          </div>
        </div>
        <!-- Fila inferior: 3 botones de estado -->
        <div style="display:flex;gap:4px;">
          ${btn("pending")}
          ${btn("attended")}
          ${btn("absent")}
        </div>
      </div>`;
  }).join("");
}

// Cambia el estado de asistencia de una mesa.
// Si newState === estado actual → ya lo gestiona el toggle del btn (vuelve a pending).
function setTableAttendance(tableId, newState) {
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === tableId);
  if (!t) return;
  t.attended = newState === "attended";
  t.absent   = newState === "absent";
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  const labels = {
    pending:  "pendiente ⏳",
    attended: "asistencia confirmada ✅",
    absent:   "no asistió ❌"
  };
  showToast(`${t.name}: ${labels[newState]}`);
}

// Alias de compatibilidad
function toggleAttendance(tableId) {
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === tableId);
  if (!t) return;
  // Toggle: si ya asistió → pending; si no → attended
  setTableAttendance(tableId, t.attended ? "pending" : "attended");
}