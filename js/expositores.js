/**
 * EXPOSITORES.COM — expositores.js
 * Render de tarjetas de expositores con filtros
 * Dependencias: state.js, utils.js
 */

// 9. EXPOSITORES — Renderizado
// ==========================================
function renderExpositores() {
  const container = document.getElementById("expositores-grid");
  if (!container) return;
  const bz = getActiveBazaar();
  syncExpositorViewButtons();

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

  if (list.length === 0) {
    const sinDatos = bz.expositores.length === 0;
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🗂️</span>
        <h3>${sinDatos ? "Aún no hay expositores" : "Sin resultados"}</h3>
        <p>${sinDatos
          ? `Registra al primer expositor de "${escapeHTML(bz.name)}".`
          : `No hay expositores que coincidan con los filtros en "${escapeHTML(bz.name)}".`}</p>
        ${sinDatos ? `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
          <button class="btn-primary" onclick="openModalExpositorForCurrentCategory()">+ Nuevo expositor</button>
          ${AppState.expositorPlantillas.length ? `<button class="btn-secondary" onclick="openPickerGuardados()">💾 Traer de guardados</button>` : ""}
        </div>` : ""}
      </div>`;
    return;
  }

  if (AppState.expositorView === "table") {
    container.innerHTML = renderExpositoresTabla(list);
    return;
  }

  container.innerHTML = list.map((exp) => {
    const cat = AppState.categorias.find((c) => c.id === exp.categoria);
    const catName = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
    const checklist = exp.checklist || [];
    const doneCount = checklist.filter((i) => i.done).length;
    const adelanto = Number(exp.adelanto || 0);
    const saldo = Number(exp.costo || 0) - adelanto;

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
            <div class="card-meta-label">Mesas solicitadas</div>
            <div class="card-meta-value">${escapeHTML(exp.mesasCantidad === "otro" ? exp.mesasCantidadOtro : exp.mesasCantidad || "1")} mesa(s)</div>
          </div>
          ${exp.areaEncargada ? `<div class="card-meta-item"><div class="card-meta-label">Área encargada</div><div class="card-meta-value">${escapeHTML(exp.areaEncargada)}</div></div>` : ""}
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

        <div class="card-contact" style="margin-bottom: 10px;">
          📞 ${escapeHTML(exp.tel || "N/A")} &nbsp;·&nbsp; ✉️ ${escapeHTML(exp.email || "N/A")}
          ${exp.notas ? `<br>📝 <em>${escapeHTML(exp.notas)}</em>` : ""}
        </div>

        <div class="card-actions">
          <button class="btn-pay-toggle ${exp.pagado ? "mark-unpaid" : "mark-paid"}" onclick="togglePaymentStatus('${exp.id}')">
            ${exp.pagado ? "Marcar Pendiente" : "Marcar Pagado"}
          </button>
          <button class="btn-secondary btn-sm" onclick="openExpositorChecklist('${exp.id}')">☑️ (${doneCount}/${checklist.length})</button>
          <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄 Recibo</button>
          <button class="btn-secondary btn-sm" onclick="openHistorial('${exp.id}')" title="Ver historial de cambios" aria-label="Ver historial de cambios">🕘</button>
          <button class="btn-secondary btn-sm" onclick="guardarComoPlantilla('${exp.id}')" title="Guardar expositor como plantilla" aria-label="Guardar expositor como plantilla">💾</button>
          <button class="${exp.banned ? "btn-secondary" : "btn-danger"} btn-sm" onclick="toggleExpositorBan('${exp.id}')">${exp.banned ? "✅ Quitar baneo" : "🚫 Banear"}</button>
          <button class="btn-danger btn-sm" onclick="deleteExpositor('${exp.id}')" title="Eliminar expositor" aria-label="Eliminar expositor">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

// ==========================================
// VISTA TARJETAS / TABLA
// ==========================================
function setExpositorView(view) {
  AppState.expositorView = view === "table" ? "table" : "cards";
  saveState();
  renderExpositores();
}

function syncExpositorViewButtons() {
  document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === (AppState.expositorView || "cards"));
  });
}

function renderExpositoresTabla(list) {
  const rows = list.map((exp) => {
    const cat = AppState.categorias.find((c) => c.id === exp.categoria);
    const catName = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
    const saldo = Number(exp.costo || 0) - Number(exp.adelanto || 0);
    const checklist = exp.checklist || [];
    const doneCount = checklist.filter((i) => i.done).length;
    const status = exp.publicationStatus || "pendiente";
    return `
      <tr${exp.banned ? ' style="opacity:.72;"' : ""}>
        <td>
          <strong>${escapeHTML(exp.negocio)}</strong>${exp.banned ? ` <span style="color:var(--color-danger);font-weight:800;font-size:var(--fs-xs);">🚫 Baneado</span>` : ""}<br>
          <small style="color:var(--color-text-muted);">${escapeHTML(exp.nombre)}</small>
        </td>
        <td>${escapeHTML(catName)}</td>
        <td>${escapeHTML(exp.ubicacion)}</td>
        <td>${formatCurrency(exp.costo)}</td>
        <td style="color:${saldo > 0 ? "var(--color-unpaid)" : "var(--color-paid)"};">${formatCurrency(saldo)}</td>
        <td><span class="paid-badge ${exp.pagado ? "paid" : "unpaid"}">${exp.pagado ? "✅ Pagado" : "⏳ Pendiente"}</span></td>
        <td><button class="publication-status status-${escapeHTML(status)}" onclick="cyclePublicationStatus('${exp.id}')">📣 ${publicationStatusLabel(status)}</button></td>
        <td style="white-space:nowrap;">
          <button class="btn-secondary btn-sm" onclick="togglePaymentStatus('${exp.id}')">${exp.pagado ? "Pend." : "Pagado"}</button>
          <button class="btn-secondary btn-sm" onclick="openModalExpositor('${exp.id}')" title="Editar">✏️</button>
          <button class="btn-secondary btn-sm" onclick="openExpositorChecklist('${exp.id}')" title="Checklist">☑️ ${doneCount}/${checklist.length}</button>
          <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')" title="Recibo">📄</button>
          <button class="btn-secondary btn-sm" onclick="openHistorial('${exp.id}')" title="Ver historial de cambios" aria-label="Ver historial de cambios">🕘</button>
          <button class="btn-secondary btn-sm" onclick="guardarComoPlantilla('${exp.id}')" title="Guardar expositor como plantilla" aria-label="Guardar expositor como plantilla">💾</button>
          <button class="${exp.banned ? "btn-secondary" : "btn-danger"} btn-sm" onclick="toggleExpositorBan('${exp.id}')" title="${exp.banned ? "Quitar baneo" : "Banear"}">${exp.banned ? "✅" : "🚫"}</button>
          <button class="btn-danger btn-sm" onclick="deleteExpositor('${exp.id}')" title="Eliminar expositor" aria-label="Eliminar expositor">🗑️</button>
        </td>
      </tr>`;
  }).join("");

  return `
    <div class="payments-table-wrap" style="grid-column:1/-1;">
      <table class="payments-table">
        <thead>
          <tr>
            <th>Negocio / Titular</th><th>Categoría</th><th>Ubicación</th>
            <th>Costo</th><th>Saldo</th><th>Pago</th><th>Publicación</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ==========================================
// 10. CATEGORÍAS
// ==========================================
