/**
 * BAZARIX — expositores.js
 * Sprint 1: Vista tarjetas ↔ tabla + badge de alerta por fecha límite
 * Dependencias: state.js, utils.js, alertas.js
 */

// Vista activa: "cards" | "table"
let expositorViewMode = "cards";

function setExpositorView(mode) {
  expositorViewMode = mode;
  document.querySelectorAll(".view-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === mode);
  });
  renderExpositores();
}

// 9. EXPOSITORES — Renderizado
// ==========================================
function renderExpositores() {
  const container = document.getElementById("expositores-grid");
  if (!container) return;
  const bz = getActiveBazaar();

  let list = bz.expositores.filter((exp) => {
    const q = AppState.searchQuery;
    const matchQ = !q || exp.nombre.toLowerCase().includes(q) ||
                   exp.negocio.toLowerCase().includes(q) || exp.ubicacion.toLowerCase().includes(q);
    const matchC = AppState.filterCategory === "all" || exp.categoria === AppState.filterCategory;
    let matchS = true;
    if (AppState.filterStatus === "paid")   matchS = exp.pagado === true;
    if (AppState.filterStatus === "unpaid") matchS = exp.pagado === false;
    return matchQ && matchC && matchS;
  });

  // Actualiza badge de alertas cada vez que se renderizan expositores
  if (typeof updateAlertBadge === "function") updateAlertBadge();

  if (list.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🗂️</span>
        <h3>Sin expositores</h3>
        <p>No hay expositores que coincidan con los filtros en "${escapeHTML(bz.name)}".</p>
      </div>`;
    return;
  }

  if (expositorViewMode === "table") {
    _renderExpositorTable(list);
  } else {
    _renderExpositorCards(list);
  }
}

// ── Vista de TARJETAS ────────────────────────────────────────────
function _renderExpositorCards(list) {
  const container = document.getElementById("expositores-grid");
  container.style.display = "";
  container.className = "cards-grid";

  container.innerHTML = list.map((exp) => {
    const cat      = AppState.categorias.find((c) => c.id === exp.categoria);
    const catName  = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
    const checklist = exp.checklist || [];
    const doneCount = checklist.filter((i) => i.done).length;
    const adelanto  = Number(exp.adelanto || 0);
    const saldo     = Number(exp.costo || 0) - adelanto;

    // Badge de alerta de fecha límite
    let alertBadge = "";
    if (!exp.pagado && exp.fechaLimitePago) {
      const now   = new Date(); now.setHours(0,0,0,0);
      const limit = new Date(exp.fechaLimitePago); limit.setHours(0,0,0,0);
      const diff  = Math.ceil((limit - now) / 86400000);
      if (diff <= 3) {
        const color = diff < 0 ? "var(--color-danger)" : "var(--color-accent2)";
        const bg    = diff < 0 ? "var(--color-danger-soft)" : "var(--color-accent2-soft)";
        const msg   = diff < 0 ? `🚨 Venció hace ${Math.abs(diff)}d` : diff === 0 ? "⚠️ Vence hoy" : `⚠️ Vence en ${diff}d`;
        alertBadge  = `<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;background:${bg};color:${color};display:inline-block;margin-bottom:6px;">${msg}</span>`;
      }
    }

    return `
      <div class="expositor-card ${exp.banned ? "banned-card" : (exp.pagado ? "paid-card" : "unpaid-card")}">
        <div class="card-top">
          <div class="avatar-wrap">
            <div class="expositor-avatar">
              ${exp.foto ? `<img src="${exp.foto}" alt="${escapeHTML(exp.nombre)}">` : escapeHTML((exp.negocio || "?").charAt(0).toUpperCase())}
            </div>
            <button class="avatar-edit-btn" onclick="openModalExpositor('${exp.id}')" title="Editar expositor">✏️</button>
          </div>
          <div class="card-info">
            <div class="card-name" title="${escapeHTML(exp.negocio)}">${escapeHTML(exp.negocio)}</div>
            <span class="card-category">${escapeHTML(catName)}</span>
            <div class="card-contact">${escapeHTML(exp.nombre)}</div>
          </div>
        </div>

        ${alertBadge}
        <span class="paid-badge ${exp.pagado ? "paid" : "unpaid"}">
          ${exp.pagado ? "✅ Pagado" : "⏳ Pendiente"}
        </span>
        <button class="publication-status status-${escapeHTML(exp.publicationStatus || "pendiente")}" onclick="cyclePublicationStatus('${exp.id}')">
          📣 Publicación: ${publicationStatusLabel(exp.publicationStatus)}
        </button>
        ${exp.banned ? `<span class="banned-badge">🚫 Expositor baneado</span>` : ""}

        <div class="card-meta">
          <div class="card-meta-item">
            <div class="card-meta-label">Ubicación</div>
            <div class="card-meta-value">${escapeHTML(exp.ubicacion)}</div>
          </div>
          <div class="card-meta-item">
            <div class="card-meta-label">Costo Total</div>
            <div class="card-meta-value">${formatCurrency(exp.costo)}</div>
          </div>
          ${adelanto > 0 ? `
          <div class="card-meta-item">
            <div class="card-meta-label">Adelanto</div>
            <div class="card-meta-value" style="color:var(--color-paid);">${formatCurrency(adelanto)}</div>
          </div>
          <div class="card-meta-item">
            <div class="card-meta-label">Saldo</div>
            <div class="card-meta-value" style="color:${saldo > 0 ? "var(--color-unpaid)" : "var(--color-paid)"};">${formatCurrency(saldo)}</div>
          </div>` : ""}
          ${exp.fechaLimitePago ? `
          <div class="card-meta-item" style="grid-column:1/-1;">
            <div class="card-meta-label">Fecha límite de pago</div>
            <div class="card-meta-value">📅 ${escapeHTML(exp.fechaLimitePago)}</div>
          </div>` : ""}
        </div>

        <div class="card-contact" style="margin-bottom:10px;">
          📞 ${escapeHTML(exp.tel || "N/A")} &nbsp;·&nbsp; ✉️ ${escapeHTML(exp.email || "N/A")}
          ${exp.notas ? `<br>📝 <em>${escapeHTML(exp.notas)}</em>` : ""}
        </div>

        <div class="card-actions">
          <button class="btn-pay-toggle ${exp.pagado ? "mark-unpaid" : "mark-paid"}" onclick="togglePaymentStatus('${exp.id}')">
            ${exp.pagado ? "Marcar Pendiente" : "Marcar Pagado"}
          </button>
          <button class="btn-secondary btn-sm" onclick="openExpositorChecklist('${exp.id}')">☑️ (${doneCount}/${checklist.length})</button>
          <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄 Recibo</button>
          <button class="btn-secondary btn-sm" onclick="guardarComoPlantilla('${exp.id}')" title="Guardar como plantilla">💾</button>
          <button class="${exp.banned ? "btn-secondary" : "btn-danger"} btn-sm" onclick="toggleExpositorBan('${exp.id}')">${exp.banned ? "✅ Quitar baneo" : "🚫 Banear"}</button>
          <button class="btn-danger btn-sm" onclick="deleteExpositor('${exp.id}')">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

// ── Vista de TABLA ───────────────────────────────────────────────
function _renderExpositorTable(list) {
  const container = document.getElementById("expositores-grid");
  container.className = "";
  container.style.display = "block";

  let sortKey = AppState.tableSortKey || "negocio";
  let sortDir = AppState.tableSortDir || "asc";

  // Ordena la lista
  list = [...list].sort((a, b) => {
    let va = a[sortKey] ?? ""; let vb = b[sortKey] ?? "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const thStyle = "padding:8px 10px;text-align:left;font-size:var(--fs-xs);font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;cursor:pointer;user-select:none;white-space:nowrap;";
  const arrow = (k) => k === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const cols = [
    { key:"negocio",       label:"Negocio / Titular" },
    { key:"categoria",     label:"Categoría" },
    { key:"ubicacion",     label:"Mesa" },
    { key:"costo",         label:"Costo" },
    { key:"adelanto",      label:"Adelanto" },
    { key:"pagado",        label:"Estado" },
    { key:"fechaLimitePago", label:"Fecha Límite" },
    { key:"_acciones",     label:"" },
  ];

  container.innerHTML = `
    <div class="payments-table-wrap">
      <table class="payments-table" style="min-width:900px;">
        <thead>
          <tr>
            ${cols.map((c) => `
              <th style="${thStyle}" onclick="${c.key !== "_acciones" ? `sortExpositorTable('${c.key}')` : ""}">
                ${c.label}${arrow(c.key)}
              </th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${list.map((exp) => {
            const cat     = AppState.categorias.find((c) => c.id === exp.categoria);
            const catName = cat ? `${cat.emoji} ${cat.nombre}` : "—";
            const adelanto = Number(exp.adelanto || 0);
            const saldo    = Number(exp.costo || 0) - adelanto;

            // Alerta de fecha
            let dateCell = escapeHTML(exp.fechaLimitePago || "—");
            if (!exp.pagado && exp.fechaLimitePago) {
              const now   = new Date(); now.setHours(0,0,0,0);
              const limit = new Date(exp.fechaLimitePago); limit.setHours(0,0,0,0);
              const diff  = Math.ceil((limit - now) / 86400000);
              if (diff <= 3) {
                const color = diff < 0 ? "var(--color-danger)" : "var(--color-accent2)";
                dateCell = `<span style="color:${color};font-weight:700;">${diff < 0 ? "🚨" : "⚠️"} ${escapeHTML(exp.fechaLimitePago)}</span>`;
              }
            }

            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-soft);
                                display:flex;align-items:center;justify-content:center;font-weight:800;
                                font-size:var(--fs-sm);flex-shrink:0;overflow:hidden;">
                      ${exp.foto ? `<img src="${exp.foto}" style="width:100%;height:100%;object-fit:cover;">` : escapeHTML((exp.negocio||"?").charAt(0))}
                    </div>
                    <div>
                      <strong style="font-size:var(--fs-sm);">${escapeHTML(exp.negocio)}</strong><br>
                      <small style="color:var(--color-text-muted);">${escapeHTML(exp.nombre)}</small>
                    </div>
                  </div>
                </td>
                <td><span style="font-size:var(--fs-xs);">${escapeHTML(catName)}</span></td>
                <td><strong>${escapeHTML(exp.ubicacion)}</strong></td>
                <td style="font-weight:700;">${formatCurrency(exp.costo)}</td>
                <td style="color:var(--color-success);">${formatCurrency(adelanto)}</td>
                <td>
                  <span class="paid-badge ${exp.pagado ? "paid" : "unpaid"}" style="white-space:nowrap;">
                    ${exp.pagado ? "✅ Pagado" : "⏳ Pendiente"}
                  </span>
                </td>
                <td style="font-size:var(--fs-xs);">${dateCell}</td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:nowrap;">
                    <button class="btn-secondary btn-sm" onclick="openModalExpositor('${exp.id}')">✏️</button>
                    <button class="btn-secondary btn-sm" onclick="togglePaymentStatus('${exp.id}')">${exp.pagado ? "↩️" : "💰"}</button>
                    <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄</button>
                    <button class="btn-danger btn-sm" onclick="deleteExpositor('${exp.id}')">🗑️</button>
                  </div>
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function sortExpositorTable(key) {
  if (AppState.tableSortKey === key) {
    AppState.tableSortDir = AppState.tableSortDir === "asc" ? "desc" : "asc";
  } else {
    AppState.tableSortKey = key;
    AppState.tableSortDir = "asc";
  }
  renderExpositores();
}

// ==========================================
// 10. CATEGORÍAS
// ==========================================
