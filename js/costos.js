/**
 * EXPOSITORES.COM — costos.js
 * Panel de costos / Presupuesto del evento: mobiliario, gastos extra (concepto, comentario,
 * costo unitario × cantidad), IVA opcional y balance.
 * Dependencias: state.js, utils.js
 */

/**
 * Totales del presupuesto de un bazar.
 * Mobiliario nunca incluye IVA en el dato capturado (si el IVA global está
 * activo, se le suma). Cada gasto extra decide por su cuenta si su "costo
 * unitario" YA trae IVA (c.ivaIncluido = true, se calcula el sin-IVA hacia
 * atrás) o si aún no lo trae (false, se le suma si el IVA global está activo).
 */
function calcPresupuesto(bz = getActiveBazaar()) {
  const cfg = bz.costsConfig;
  const rate = cfg.ivaEnabled ? Number(cfg.ivaRate || 0) / 100 : 0;

  const mobiliarioSinIva = (cfg.tablesEnabled ? Number(cfg.tablesTotal || 0) : 0) + (cfg.chairsEnabled ? Number(cfg.chairsTotal || 0) : 0);
  const mobiliarioConIva = mobiliarioSinIva * (1 + rate);

  let extrasSinIva = 0, extrasConIva = 0;
  (cfg.extraCosts || []).forEach((c) => {
    const cost = Number(c.cost || 0);
    if (cfg.ivaEnabled && c.ivaIncluido) {
      // El monto capturado ya trae IVA: el "sin IVA" se calcula hacia atrás.
      extrasConIva += cost;
      extrasSinIva += rate > 0 ? cost / (1 + rate) : cost;
    } else {
      // El monto capturado no incluye IVA: se le suma si el IVA global está activo.
      extrasSinIva += cost;
      extrasConIva += cost * (1 + rate);
    }
  });

  const subtotal = mobiliarioSinIva + extrasSinIva;
  const total = mobiliarioConIva + extrasConIva;
  return { mobiliario: mobiliarioSinIva, extras: extrasSinIva, subtotal, rate, iva: total - subtotal, total };
}

// Costos del Evento vive en 2 sub-páginas: Mobiliario (mesas/sillas del
// proveedor) y Otros Gastos (renta, permisos, etc. con IVA). Se muestra
// una a la vez para no mezclar dos formularios sin relación entre sí.
function setCostosSubTab(tab) {
  if (!["mobiliario", "gastos"].includes(tab)) return;
  AppState.costosSubTab = tab;
  saveState();
  _renderCostosSubTabs();
}

function _renderCostosSubTabs() {
  const tab = ["mobiliario", "gastos"].includes(AppState.costosSubTab) ? AppState.costosSubTab : "mobiliario";
  const panelMob = document.getElementById("costos-panel-mobiliario");
  const panelGas = document.getElementById("costos-panel-gastos");
  if (panelMob) panelMob.style.display = tab === "mobiliario" ? "" : "none";
  if (panelGas) panelGas.style.display = tab === "gastos" ? "" : "none";
  document.getElementById("costos-tab-mobiliario")?.classList.toggle("active", tab === "mobiliario");
  document.getElementById("costos-tab-gastos")?.classList.toggle("active", tab === "gastos");
}

function renderCostosUI() {
  const bz  = getActiveBazaar();
  ensureEventoFields(bz);
  const cfg = bz.costsConfig;

  _renderCostosSubTabs();
  const get = (id) => document.getElementById(id);

  if (get("cost-toggle-tables")) get("cost-toggle-tables").checked = cfg.tablesEnabled;
  if (get("cost-qty-tables"))    get("cost-qty-tables").value      = cfg.tablesQty;
  if (get("cost-total-tables"))  get("cost-total-tables").value    = cfg.tablesTotal;

  if (get("cost-toggle-chairs")) get("cost-toggle-chairs").checked = cfg.chairsEnabled;
  if (get("cost-qty-chairs"))    get("cost-qty-chairs").value      = cfg.chairsQty;
  if (get("cost-total-chairs"))  get("cost-total-chairs").value    = cfg.chairsTotal;

  if (get("cost-toggle-iva")) get("cost-toggle-iva").checked = cfg.ivaEnabled;
  if (get("cost-iva-rate"))   get("cost-iva-rate").value     = cfg.ivaRate;

  _updateCostosCalculations(cfg);

  const rate = cfg.ivaEnabled ? Number(cfg.ivaRate || 0) / 100 : 0;
  const extraContainer = get("extra-costs-list");
  if (extraContainer) {
    extraContainer.innerHTML = cfg.extraCosts.length === 0
      ? `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);">Aún no hay gastos adicionales.</p>`
      : cfg.extraCosts.map((c) => {
        const cost      = Number(c.cost || 0);
        const included  = cfg.ivaEnabled && !!c.ivaIncluido;
        const sinIva    = included ? (rate > 0 ? cost / (1 + rate) : cost) : cost;
        const conIva    = included ? cost : cost * (1 + rate);
        return `
        <div class="card-meta-item" style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" class="form-input" style="flex:1;" value="${escapeHTML(c.name)}" placeholder="Concepto" oninput="debouncedUpdateExtraCost('${c.id}','name',this.value)">
            <button class="btn-danger btn-sm" onclick="removeExtraCostRow('${c.id}')" title="Eliminar">🗑️</button>
          </div>
          <input type="text" class="form-input" value="${escapeHTML(c.comment || "")}" placeholder="Comentario (opcional)" oninput="debouncedUpdateExtraCost('${c.id}','comment',this.value)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label class="form-label" style="font-size:var(--fs-xs);">Costo unitario</label>
              <input type="number" class="form-input" min="0" step="0.01" value="${Number(c.unit || 0)}" onchange="updateExtraCost('${c.id}','unit',this.value)">
            </div>
            <div>
              <label class="form-label" style="font-size:var(--fs-xs);">Cantidad</label>
              <input type="number" class="form-input" min="0" step="1" value="${Number(c.qty ?? 1)}" onchange="updateExtraCost('${c.id}','qty',this.value)">
            </div>
          </div>
          ${cfg.ivaEnabled ? `
          <div class="form-switch" style="padding:2px 0;">
            <span class="switch-label" style="font-size:var(--fs-xs);">Este costo ya incluye IVA</span>
            <label class="switch">
              <input type="checkbox" ${c.ivaIncluido ? "checked" : ""} onchange="updateExtraCost('${c.id}','ivaIncluido',this.checked)">
              <span class="slider"></span>
            </label>
          </div>` : ""}
          <div style="font-size:var(--fs-xs);font-weight:700;color:var(--color-accent);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <span>Sin IVA: ${formatCurrency(sinIva)}</span>
            ${cfg.ivaEnabled ? `<span>Con IVA: ${formatCurrency(conIva)}</span>` : ""}
          </div>
        </div>`;
      }).join("");
  }

  const totalIncome = bz.expositores.reduce((s, e) => s + Number(e.costo || 0), 0);
  const p = calcPresupuesto(bz);
  const netBalance = totalIncome - p.total;

  const summary = get("cost-summary");
  if (summary) {
    const line = (label, value, strong) => `<div style="display:flex;justify-content:space-between;${strong ? "font-weight:800;border-top:1px solid var(--color-border);padding-top:6px;margin-top:4px;" : ""}"><span>${label}</span><span>${formatCurrency(value)}</span></div>`;
    summary.innerHTML = `
      <div class="card-meta-item" style="margin-top:12px;font-size:var(--fs-sm);">
        ${line("Subtotal sin IVA", p.subtotal, false)}
        ${cfg.ivaEnabled ? line(`IVA (${Number(cfg.ivaRate || 0)}%)`, p.iva, false) : ""}
        ${line(cfg.ivaEnabled ? "Total con IVA" : "Total egresos", p.total, true)}
      </div>`;
  }

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("cost-stat-income",   formatCurrency(totalIncome));
  set("cost-stat-expenses", formatCurrency(p.total));
  set("cost-stat-balance",  formatCurrency(netBalance));
}

function _updateCostosCalculations(cfg) {
  const subTables = cfg.tablesEnabled ? Number(cfg.tablesTotal || 0) : 0;
  const subChairs = cfg.chairsEnabled ? Number(cfg.chairsTotal || 0) : 0;

  const unitTables = cfg.tablesQty > 0 ? subTables / cfg.tablesQty : 0;
  const unitChairs = cfg.chairsQty > 0 ? subChairs / cfg.chairsQty : 0;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("subtotal-tables", formatCurrency(subTables));
  set("unit-tables",     formatCurrency(unitTables));
  set("subtotal-chairs", formatCurrency(subChairs));
  set("unit-chairs",     formatCurrency(unitChairs));
}

function updateEventCostsUI() {
  const cfg = getActiveBazaar().costsConfig;
  const get = (id) => document.getElementById(id);

  cfg.tablesEnabled = get("cost-toggle-tables")?.checked || false;
  cfg.tablesQty     = Number(get("cost-qty-tables")?.value  || 0);
  cfg.tablesTotal   = Number(get("cost-total-tables")?.value || 0);

  cfg.chairsEnabled = get("cost-toggle-chairs")?.checked || false;
  cfg.chairsQty     = Number(get("cost-qty-chairs")?.value  || 0);
  cfg.chairsTotal   = Number(get("cost-total-chairs")?.value || 0);

  cfg.ivaEnabled = get("cost-toggle-iva")?.checked || false;
  const rate = Number(get("cost-iva-rate")?.value);
  cfg.ivaRate = Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 16;

  saveState();
  renderCostosUI();
  renderFichaResumen();
}

function addExtraCostRow() {
  getActiveBazaar().costsConfig.extraCosts.push({ id: "cost-" + Date.now(), name: "Nuevo Gasto", comment: "", unit: 0, qty: 1, cost: 0, ivaIncluido: false });
  saveState();
  renderCostosUI();
}

function updateExtraCost(id, field, value) {
  const item = getActiveBazaar().costsConfig.extraCosts.find((c) => c.id === id);
  if (!item || !["name", "comment", "unit", "qty", "ivaIncluido"].includes(field)) return;
  if (field === "unit" || field === "qty") {
    item[field] = Math.max(0, Number(value) || 0);
    item.cost = Number(item.unit || 0) * Number(item.qty ?? 1); // total capturado (según ivaIncluido, con o sin IVA)
  } else if (field === "ivaIncluido") {
    item.ivaIncluido = Boolean(value);
  } else {
    item[field] = value;
  }
  saveState();
  if (["unit", "qty", "ivaIncluido"].includes(field)) renderCostosUI(); // recalcula el total/balance mostrado
  else renderFichaResumen(); // nombre/comentario: no hace falta repintar la fila mientras se escribe
}

// Autoguardado mientras se escribe (concepto y comentario), sin esperar a perder el foco.
const debouncedUpdateExtraCost = debounce(updateExtraCost, 500);

function removeExtraCostRow(id) {
  const cfg = getActiveBazaar().costsConfig;
  cfg.extraCosts = cfg.extraCosts.filter((c) => c.id !== id);
  saveState();
  renderCostosUI();
  renderCompras();      // si venía de la lista de compras, vuelve a poder enviarse
  renderFichaResumen();
}
