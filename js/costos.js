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

function renderCostosUI() {
  const bz  = getActiveBazaar();
  ensureEventoFields(bz);
  const cfg = bz.costsConfig;

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

  const extraContainer = get("extra-costs-list");
  if (extraContainer) extraContainer.innerHTML = _extraCostsTableHTML(cfg);

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

// Alta en ventana emergente. El gasto nuevo se inserta al INICIO de la lista.
function addExtraCostRow() {
  const bz = getActiveBazaar();
  if (!bz) return;
  ensureEventoFields(bz);
  document.getElementById("form-gasto").reset();
  updateGastoUnitHint();
  const ivaGroup = document.getElementById("gasto-iva-group");
  if (ivaGroup) ivaGroup.style.display = bz.costsConfig.ivaEnabled ? "" : "none";   // solo tiene sentido con IVA activo
  openModal("modal-gasto");
  setTimeout(() => document.getElementById("gasto-nombre")?.focus(), 50);
}

// Muestra en vivo el costo unitario (total ÷ cantidad) mientras se llena el formulario.
function updateGastoUnitHint() {
  const hint = document.getElementById("gasto-unit-hint");
  if (!hint) return;
  const total = Math.max(0, Number(document.getElementById("gasto-total")?.value) || 0);
  const qty = Math.max(1, Number(document.getElementById("gasto-qty")?.value) || 1);
  hint.textContent = `Costo unitario: ${formatCurrency(total / qty)}`;
}

function saveGastoHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  if (!bz) return;
  ensureEventoFields(bz);
  const cfg = bz.costsConfig;
  const total = Math.max(0, Number(document.getElementById("gasto-total").value) || 0);
  const qty = Math.max(1, Number(document.getElementById("gasto-qty").value) || 1);
  const unit = total / qty;
  cfg.extraCosts.unshift({
    id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: document.getElementById("gasto-nombre").value.trim(),
    comment: document.getElementById("gasto-comentario").value.trim(),
    unit, qty, cost: total,
    ivaIncluido: cfg.ivaEnabled && document.getElementById("gasto-iva-incluido").checked
  });
  saveState();
  closeModal("modal-gasto");
  renderCostosUI();
  renderFichaResumen();
  showToast("✅ Gasto agregado al inicio de la lista");
}

function updateExtraCost(id, field, value) {
  const item = getActiveBazaar().costsConfig.extraCosts.find((c) => c.id === id);
  if (!item || !["name", "comment", "cost", "unit", "qty", "ivaIncluido"].includes(field)) return;
  if (field === "cost") {
    // El usuario captura el COSTO TOTAL; el unitario se calcula (total ÷ cantidad).
    item.cost = Math.max(0, Number(value) || 0);
    item.qty = Math.max(1, Number(item.qty) || 1);
    item.unit = item.cost / item.qty;
  } else if (field === "qty") {
    // Al cambiar la cantidad el total se conserva y cambia el unitario.
    item.qty = Math.max(1, Number(value) || 1);
    item.unit = Number(item.cost || 0) / item.qty;
  } else if (field === "unit") {   // compatibilidad: unitario × cantidad
    item.qty = Math.max(1, Number(item.qty) || 1);
    item.unit = Math.max(0, Number(value) || 0);
    item.cost = item.unit * item.qty;
  } else if (field === "ivaIncluido") {
    item.ivaIncluido = Boolean(value);
  } else {
    item[field] = value;
  }
  saveState();
  if (["cost", "unit", "qty", "ivaIncluido"].includes(field)) renderCostosUI(); // recalcula totales y balance
  else renderFichaResumen();
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

/** Otros gastos como tabla de filas compactas (en vez de una tarjeta por gasto). */
function _extraCostsTableHTML(cfg) {
  if (!cfg.extraCosts.length) {
    return `<p class="form-hint" style="padding:var(--space-3) 0;">Aún no hay gastos adicionales. Pulsa “+ Agregar” para registrar el primero.</p>`;
  }
  const rate = cfg.ivaEnabled ? Number(cfg.ivaRate || 0) / 100 : 0;
  const rows = cfg.extraCosts.map((c) => {
    const cost = Number(c.cost || 0);
    const qty = Math.max(1, Number(c.qty) || 1);
    const unit = cost / qty;                       // el unitario siempre se calcula
    const included = cfg.ivaEnabled && !!c.ivaIncluido;
    const sinIva = included ? (rate > 0 ? cost / (1 + rate) : cost) : cost;
    const conIva = included ? cost : cost * (1 + rate);
    return `
      <tr>
        <td><input type="text" class="form-input" value="${escapeHTML(c.name)}" placeholder="Concepto" aria-label="Concepto" oninput="debouncedUpdateExtraCost('${c.id}','name',this.value)"></td>
        <td><input type="text" class="form-input" value="${escapeHTML(c.comment || "")}" placeholder="Comentario (opcional)" aria-label="Comentario" oninput="debouncedUpdateExtraCost('${c.id}','comment',this.value)"></td>
        <td><input type="number" class="form-input costos-num" min="0" step="0.01" value="${cost}" aria-label="Costo total" onchange="updateExtraCost('${c.id}','cost',this.value)"></td>
        <td><input type="number" class="form-input costos-num" min="1" step="1" value="${qty}" aria-label="Cantidad" onchange="updateExtraCost('${c.id}','qty',this.value)"></td>
        <td class="costos-total costos-unit" title="Costo total ÷ cantidad">${formatCurrency(unit)}</td>
        ${cfg.ivaEnabled ? `
        <td style="text-align:center;"><input type="checkbox" class="costos-check" ${c.ivaIncluido ? "checked" : ""} title="El costo total ya incluye IVA" aria-label="El costo total ya incluye IVA" onchange="updateExtraCost('${c.id}','ivaIncluido',this.checked)"></td>
        <td class="costos-total">${formatCurrency(conIva)}<small>sin IVA ${formatCurrency(sinIva)}</small></td>` : ""}
        <td><button class="btn-danger btn-sm" onclick="removeExtraCostRow('${c.id}')" title="Eliminar gasto" aria-label="Eliminar gasto">🗑️</button></td>
      </tr>`;
  }).join("");
  return `
    <div class="costos-table-scroll">
      <table class="payments-table costos-table">
        <thead><tr><th>Concepto</th><th>Comentario</th><th>Costo total</th><th>Cant.</th><th title="Costo total ÷ cantidad">Unitario</th>${cfg.ivaEnabled ? `<th title="El costo total ya incluye IVA">IVA incl.</th><th>Total con IVA</th>` : ""}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
