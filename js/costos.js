/**
 * EXPOSITORES.COM — costos.js
 * Panel de costos del evento: mobiliario, gastos extra, balance
 * Dependencias: state.js, utils.js
 */

// El unitario se calcula automáticamente para referencia.
// ==========================================
function renderCostosUI() {
  const bz  = getActiveBazaar();
  const cfg = bz.costsConfig;

  const get = (id) => document.getElementById(id);

  if (get("cost-toggle-tables")) get("cost-toggle-tables").checked = cfg.tablesEnabled;
  if (get("cost-qty-tables"))    get("cost-qty-tables").value      = cfg.tablesQty;
  if (get("cost-total-tables"))  get("cost-total-tables").value    = cfg.tablesTotal;

  if (get("cost-toggle-chairs")) get("cost-toggle-chairs").checked = cfg.chairsEnabled;
  if (get("cost-qty-chairs"))    get("cost-qty-chairs").value      = cfg.chairsQty;
  if (get("cost-total-chairs"))  get("cost-total-chairs").value    = cfg.chairsTotal;

  _updateCostosCalculations(cfg);

  const extraContainer = get("extra-costs-list");
  if (extraContainer) {
    extraContainer.innerHTML = cfg.extraCosts.length === 0
      ? `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);">Aún no hay gastos adicionales.</p>`
      : cfg.extraCosts.map((c) => `
        <div class="card-meta-item" style="display:flex;gap:10px;align-items:center;">
          <input type="text" class="form-input" style="flex:1;" value="${escapeHTML(c.name)}" onchange="updateExtraCost('${c.id}','name',this.value)">
          <input type="number" class="form-input" style="width:120px;" value="${c.cost}" onchange="updateExtraCost('${c.id}','cost',this.value)">
          <button class="btn-danger btn-sm" onclick="removeExtraCostRow('${c.id}')">🗑️</button>
        </div>`).join("");
  }

  const totalIncome       = bz.expositores.reduce((s, e) => s + Number(e.costo || 0), 0);
  const totalExtraExpenses = cfg.extraCosts.reduce((s, c) => s + Number(c.cost || 0), 0);
  const subTables = cfg.tablesEnabled ? Number(cfg.tablesTotal) : 0;
  const subChairs = cfg.chairsEnabled ? Number(cfg.chairsTotal) : 0;
  const totalExpenses = subTables + subChairs + totalExtraExpenses;
  const netBalance    = totalIncome - totalExpenses;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("cost-stat-income",   formatCurrency(totalIncome));
  set("cost-stat-expenses", formatCurrency(totalExpenses));
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

  saveState();
  renderCostosUI();
}

function addExtraCostRow() {
  getActiveBazaar().costsConfig.extraCosts.push({ id: "cost-" + Date.now(), name: "Nuevo Gasto", cost: 0 });
  saveState();
  renderCostosUI();
}

function updateExtraCost(id, field, value) {
  const item = getActiveBazaar().costsConfig.extraCosts.find((c) => c.id === id);
  if (item) {
    item[field] = field === "cost" ? Number(value || 0) : value;
    saveState();
    renderCostosUI();
  }
}

function removeExtraCostRow(id) {
  const cfg = getActiveBazaar().costsConfig;
  cfg.extraCosts = cfg.extraCosts.filter((c) => c.id !== id);
  saveState();
  renderCostosUI();
}

// ==========================================
