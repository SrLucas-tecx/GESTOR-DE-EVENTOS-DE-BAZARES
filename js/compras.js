/**
 * BAZARIX — compras.js
 * Lista de compras del evento (hoja "Lista de compras" de la plantilla), con costo opcional
 * y envío al Presupuesto (Costos del Evento).
 * Datos: bz.compras = [{ id, articulo, descripcion, responsableId, fecha, cantidad, costoUnit, comprado, presupuestoId }]
 * responsableId referencia bz.responsables (ver responsables.js).
 * Dependencias: state.js, utils.js, costos.js
 */

function _compraTotal(c) {
  return Number(c.cantidad || 0) * Number(c.costoUnit || 0);
}

/** ¿El artículo ya fue enviado al presupuesto (y sigue existiendo allí)? */
function compraEnPresupuesto(bz, c) {
  return Boolean(c.presupuestoId) && bz.costsConfig.extraCosts.some((x) => x.id === c.presupuestoId);
}

function renderCompras() {
  const body = document.getElementById("compras-list");
  const bz = getActiveBazaar();
  if (!body || !bz) return;
  ensureEventoFields(bz);
  updateAlertBadge(); // una fecha de entrega puede haber cambiado

  const total = bz.compras.reduce((s, c) => s + _compraTotal(c), 0);
  const comprado = bz.compras.filter((c) => c.comprado).reduce((s, c) => s + _compraTotal(c), 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("compras-stat-total", formatCurrency(total));
  set("compras-stat-comprado", formatCurrency(comprado));
  set("compras-stat-pendiente", formatCurrency(total - comprado));

  if (!bz.compras.length) {
    body.innerHTML = `<tr><td colspan="11" style="text-align:center;color:var(--color-text-muted);padding:24px;">Sin artículos. Agrega el primero con "+ Agregar artículo".</td></tr>`;
    return;
  }

  body.innerHTML = bz.compras.map((c, index) => {
    const enPresupuesto = compraEnPresupuesto(bz, c);
    return `
    <tr>
      <td><input type="checkbox" ${c.comprado ? "checked" : ""} onchange="toggleCompra('${c.id}')" aria-label="Comprado" style="accent-color:var(--color-accent);width:18px;height:18px;"></td>
      <td>${index + 1}</td>
      <td><input class="form-input" value="${escapeHTML(c.articulo)}" placeholder="Ej. Caja de dulces" style="${c.comprado ? "text-decoration:line-through;opacity:.7;" : ""}" oninput="debouncedUpdateCompra('${c.id}','articulo',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(c.descripcion)}" oninput="debouncedUpdateCompra('${c.id}','descripcion',this.value)"></td>
      <td><select class="form-select" onchange="updateCompra('${c.id}','responsableId',this.value)">${responsableOptionsHTML(c.responsableId, bz)}</select></td>
      <td><input class="form-input" type="date" value="${escapeHTML(c.fecha)}" onchange="updateCompra('${c.id}','fecha',this.value)"></td>
      <td><input class="form-input" type="number" min="0" step="1" value="${Number(c.cantidad || 0)}" style="min-width:70px;" onchange="updateCompra('${c.id}','cantidad',this.value)"></td>
      <td><input class="form-input" type="number" min="0" step="0.01" value="${Number(c.costoUnit || 0)}" style="min-width:90px;" onchange="updateCompra('${c.id}','costoUnit',this.value)"></td>
      <td style="font-weight:800;white-space:nowrap;">${formatCurrency(_compraTotal(c))}</td>
      <td>
        <button class="btn-secondary btn-sm" onclick="enviarCompraAPresupuesto('${c.id}')"
          title="${enPresupuesto ? "Quitar del presupuesto" : "Agregar como gasto en Costos del Evento"}"
          aria-label="${enPresupuesto ? "Quitar del presupuesto" : "Agregar al presupuesto"}"
          aria-pressed="${enPresupuesto}">
          ${enPresupuesto ? "✅ En presupuesto" : "➕ Presupuesto"}
        </button>
      </td>
      <td><button class="btn-danger btn-sm" onclick="deleteCompra('${c.id}')" title="Eliminar">🗑️</button></td>
    </tr>`;
  }).join("");
}

// Alta en ventana emergente (la edición posterior sigue siendo en la propia fila).
function addCompra() {
  const bz = getActiveBazaar();
  if (!bz) return;
  ensureEventoFields(bz);
  document.getElementById("form-compra").reset();
  document.getElementById("compra-responsable").innerHTML = responsableOptionsHTML("", bz);
  openModal("modal-compra");
  setTimeout(() => document.getElementById("compra-articulo")?.focus(), 50);
}

function saveCompraHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  if (!bz) return;
  bz.compras.push({
    id: `compra-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    articulo: document.getElementById("compra-articulo").value.trim(),
    descripcion: document.getElementById("compra-descripcion").value.trim(),
    responsableId: document.getElementById("compra-responsable").value,
    fecha: document.getElementById("compra-fecha").value,
    cantidad: Math.max(0, Number(document.getElementById("compra-cantidad").value) || 0),
    costoUnit: Math.max(0, Number(document.getElementById("compra-costo").value) || 0),
    comprado: false,
    presupuestoId: ""
  });
  saveState();
  closeModal("modal-compra");
  renderCompras();
  renderFichaResumen(bz);
  showToast("✅ Artículo agregado");
}

function updateCompra(id, field, value) {
  const bz = getActiveBazaar();
  const c = bz?.compras.find((item) => item.id === id);
  if (!c || !["articulo", "descripcion", "responsableId", "fecha", "cantidad", "costoUnit"].includes(field)) return;
  c[field] = ["cantidad", "costoUnit"].includes(field) ? Math.max(0, Number(value) || 0) : value;
  saveState();
  if (["cantidad", "costoUnit"].includes(field)) { renderCompras(); renderFichaResumen(bz); }
}

// Autoguardado mientras se escribe, sin esperar a perder el foco.
const debouncedUpdateCompra = debounce(updateCompra, 500);

function toggleCompra(id) {
  const bz = getActiveBazaar();
  const c = bz?.compras.find((item) => item.id === id);
  if (!c) return;
  c.comprado = !c.comprado;
  saveState();
  renderCompras();
  renderFichaResumen(bz);
}

async function deleteCompra(id) {
  const bz = getActiveBazaar();
  if (!bz || !await appConfirm("¿Eliminar este artículo de la lista?", "Eliminar artículo")) return;
  bz.compras = bz.compras.filter((c) => c.id !== id);
  saveState();
  renderCompras();
  renderFichaResumen(bz);
}

function _compraAPresupuesto(bz, c) {
  const unit = Number(c.costoUnit || 0);
  const qty = Number(c.cantidad || 0) || 1;
  const costId = `cost-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  bz.costsConfig.extraCosts.unshift({ id: costId, name: c.articulo || "Artículo", comment: c.descripcion || "", unit, qty, cost: unit * qty, ivaIncluido: false, fromCompraId: c.id });
  c.presupuestoId = costId;
}

function enviarCompraAPresupuesto(id) {
  const bz = getActiveBazaar();
  const c = bz?.compras.find((item) => item.id === id);
  if (!c) return;
  if (compraEnPresupuesto(bz, c)) {
    bz.costsConfig.extraCosts = bz.costsConfig.extraCosts.filter((item) => item.id !== c.presupuestoId);
    c.presupuestoId = "";
    saveState();
    renderCompras();
    renderCostosUI();
    renderFichaResumen(bz);
    showToast(`"${c.articulo || "Artículo"}" quitado del presupuesto`);
    return;
  }
  _compraAPresupuesto(bz, c);
  saveState();
  renderCompras();
  renderCostosUI();
  renderFichaResumen(bz);
  showToast(`💰 "${c.articulo || "Artículo"}" agregado al presupuesto`);
}

/** Envía todos los artículos con costo que aún no están en el presupuesto. */
function enviarComprasAPresupuesto() {
  const bz = getActiveBazaar();
  if (!bz) return;
  const pendientes = bz.compras.filter((c) => !compraEnPresupuesto(bz, c));
  const conCosto = pendientes.filter((c) => Number(c.costoUnit || 0) > 0);
  if (!conCosto.length) {
    showToast(pendientes.length ? "Los artículos pendientes no tienen costo unitario" : "Todo ya está en el presupuesto", "error");
    return;
  }
  conCosto.forEach((c) => _compraAPresupuesto(bz, c));
  saveState();
  renderCompras();
  renderCostosUI();
  renderFichaResumen(bz);
  const omitidos = pendientes.length - conCosto.length;
  showToast(`💰 ${conCosto.length} artículo(s) enviados al presupuesto${omitidos ? ` · ${omitidos} sin costo omitido(s)` : ""}`);
}
