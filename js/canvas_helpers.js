/**
 * EXPOSITORES.COM — canvas_helpers.js
 * Funciones globales del canvas: zoom, reset, addTable, deleteTable, editTable, exportarMapaPDF
 * Dependencias: state.js, utils.js, canvas.js
 */

// Colores predefinidos para zonas (cicla automáticamente)
const ZONE_COLORS = ["#0d9488","#f59e0b","#8b5cf6","#ef4444","#10b981","#3b82f6","#ec4899","#f97316"];
function _randomZoneColor() {
  return ZONE_COLORS[bazaarCanvas.zones.length % ZONE_COLORS.length];
}

// Cambia el modo del canvas desde botones de la barra de herramientas
// [EDITABLE: llama a setCanvasMode('zone') para activar el dibujado de zonas]
function setCanvasMode(mode) {
  bazaarCanvas.setMode(mode);
  setSideTab(mode === "zone" ? "zonas" : "mesas");
}

function toggleLayer(layer) {
  if (layer === "tables") bazaarCanvas.showTables = !bazaarCanvas.showTables;
  if (layer === "zones") bazaarCanvas.showZones = !bazaarCanvas.showZones;
  if (layer === "grid") {
    bazaarCanvas.showGrid = !bazaarCanvas.showGrid;
    try { localStorage.setItem("BAZARIX_GRID", bazaarCanvas.showGrid ? "1" : "0"); } catch {}
  }
  const button = document.getElementById(`layer-btn-${layer}`);
  const visible = { tables: bazaarCanvas.showTables, zones: bazaarCanvas.showZones, grid: bazaarCanvas.showGrid }[layer];
  if (button) button.classList.toggle("active", visible);
  bazaarCanvas.render();
}

function toggleSnapTables() {
  bazaarCanvas.snapTables = !bazaarCanvas.snapTables;
  const button = document.getElementById("btn-snap-tables");
  if (button) button.classList.toggle("active", bazaarCanvas.snapTables);
  showToast(bazaarCanvas.snapTables ? "🧲 Snap activado" : "Snap desactivado");
}

function toggleLegend() {
  bazaarCanvas.showLegend = !bazaarCanvas.showLegend;
  const button = document.getElementById("btn-toggle-legend");
  if (button) button.classList.toggle("active", bazaarCanvas.showLegend);
  bazaarCanvas.render();
}

function autoNumberTables() {
  const tables = getActiveTables(getActiveBazaar()).slice().sort((a, b) => a.y - b.y || a.x - b.x);
  let row = 0;
  let rowY = null;
  let rowNumber = 0;
  tables.forEach((table) => {
    if (rowY === null || Math.abs(table.y - rowY) > Math.max(12, table.h * 0.45)) {
      row += 1;
      rowY = table.y;
      rowNumber = 0;
    }
    rowNumber += 1;
    table.name = `${String.fromCodePoint(64 + Math.min(row, 26))}-${String(rowNumber).padStart(2, "0")}`;
  });
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  showToast(tables.length ? "✅ Mesas numeradas" : "No hay mesas para numerar");
}

// Exporta zonas del piso actual como JSON
function exportZonesJSON() {
  const floor = getActiveFloor(getActiveBazaar());
  const data  = JSON.stringify(floor?.zones || [], null, 2);
  const blob  = new Blob([data], { type: "application/json" });
  const a     = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download  = "zonas_bazar.json"; a.click();
  showToast("✅ Zonas exportadas");
}

// Elimina TODAS las zonas del piso activo
async function clearAllZones() {
  if (!await appConfirm("¿Eliminar todas las zonas del plano?", "Eliminar zonas")) return;
  const floor = getActiveFloor(getActiveBazaar());
  if (floor) floor.zones = [];
  bazaarCanvas.zones = [];
  bazaarCanvas.drawingZone = null;
  bazaarCanvas.saveZones();
  bazaarCanvas.render();
  bazaarCanvas.updateZoneUI();
  showToast("🗑️ Todas las zonas eliminadas");
}

function exportarMapaPDF() {
  const bz = getActiveBazaar();
  const floor = getActiveFloor(bz);
  if (!bz || !floor || !window.html2pdf || !bazaarCanvas.canvas) {
    showToast("❌ No se pudo preparar el PDF del mapa", "error");
    return;
  }

  // El PDF sigue la orientación del plano: un plano vertical ya no se
  // fuerza dentro de una hoja horizontal (quedaba con márgenes enormes).
  const isPortrait = floor.orientation === "portrait";
  const wrapW = isPortrait ? 650 : 1000;
  const wrapH = isPortrait ? 1000 : 650;
  const imgH  = isPortrait ? 830 : 515;

  bazaarCanvas.render();
  const wrapper = document.createElement("div");
  const issuedAt = new Date().toLocaleDateString("es-MX");
  const safeName = `${bz.name}_${floor.name}`.replace(/[^a-z0-9]+/gi, "_");
  wrapper.style.cssText = `display:none;box-sizing:border-box;width:${wrapW}px;height:${wrapH}px;overflow:hidden;padding:18px;font-family:Arial,sans-serif;background:#fff;color:#1e293b;page-break-inside:avoid;`;
  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d9488;padding-bottom:8px;margin-bottom:10px;">
      <div>
        <h1 style="color:#0d9488;margin:0;font-size:22px;">PLANO DEL EVENTO</h1>
        <p style="margin:2px 0 0;color:#64748b;font-size:12px;">BAZARIX — Gestión de Eventos</p>
      </div>
      <div style="text-align:right;font-size:12px;color:#64748b;">
        <strong style="display:block;color:#0f766e;font-size:15px;">${escapeHTML(bz.name)}</strong>
        <span>${escapeHTML(floor.name)} · ${issuedAt}</span>
      </div>
    </div>
    <img src="${bazaarCanvas.canvas.toDataURL("image/png")}" alt="Plano de ${escapeHTML(bz.name)}" style="display:block;width:100%;height:${imgH}px;object-fit:contain;border:1px solid #cbd5e1;border-radius:6px;">
    <p style="margin:6px 0 0;text-align:center;color:#64748b;font-size:10px;">Documento generado por BAZARIX</p>`;

  document.body.appendChild(wrapper);
  wrapper.style.display = "block";
  window.html2pdf().set({
    margin: 8,
    filename: `mapa_${safeName}.pdf`,
    image: { type: "png" },
    html2canvas: { scale: 3, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: isPortrait ? "portrait" : "landscape" },
    pagebreak: { mode: ["avoid-all"] }
  }).from(wrapper).save().then(() => {
    wrapper.remove();
    showToast("✅ Mapa descargado en PDF");
  }).catch(() => {
    wrapper.remove();
    showToast("❌ No se pudo generar el PDF del mapa", "error");
  });
}

function zoomBazaar(delta) {
  bazaarCanvas.scale = Math.max(0.3, Math.min(3.0, bazaarCanvas.scale + delta));
  bazaarCanvas.render();
}

function resetBazaarZoom() {
  bazaarCanvas.scale = 1.0;
  bazaarCanvas.panX  = 0;
  bazaarCanvas.panY  = 0;
  bazaarCanvas.render();
}

// Reset completo: borra todos los objetos del piso y la imagen de fondo.
async function resetBazaarCanvas() {
  if (!await appConfirm("¿Eliminar todas las mesas, elementos, zonas e imagen de fondo? Esta acción no se puede deshacer.", "Limpiar plano", "Limpiar plano")) return;
  const bz = getActiveBazaar();
  const floor = getActiveFloor(bz);
  if (!floor) return;
  floor.tables = [];
  floor.bgImage = null;
  floor.elements = [];
  floor.zones = [];
  floor.bgScale = 1;
  floor.bgScaleX = 1;
  floor.bgScaleY = 1;
  floor.bgRotation = 0;
  floor.bgX = 0;
  floor.bgY = 0;
  bazaarCanvas.bgImageObj = null;
  bazaarCanvas.zones = [];
  bazaarCanvas.drawingZone = null;
  bazaarCanvas.selectedTableId = null;
  bazaarCanvas.selectedElementId = null;
  bazaarCanvas.selectedZoneId = null;
  bazaarCanvas.isDraggingTable = false;
  bazaarCanvas.isDraggingElement = false;
  bazaarCanvas.isDraggingZone = false;
  bazaarCanvas.draggedTable = null;
  bazaarCanvas.draggedElement = null;
  bazaarCanvas.draggedZone = null;
  bazaarCanvas.scale = 1.0;
  bazaarCanvas.panX  = 0;
  bazaarCanvas.panY  = 0;
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  bazaarCanvas.updateZoneUI();
  showToast("🗑️ Plano completamente limpiado");
}

function handleFloorPlanUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const bz = getActiveBazaar();
    if (bz) {
      const floor = getActiveFloor(bz);
      if (!floor) return;
      floor.bgImage = evt.target.result;
      floor.bgScale = 1;
      floor.bgScaleX = 1;
      floor.bgScaleY = 1;
      floor.bgRotation = 0;
      floor.bgX = 0;
      floor.bgY = 0;
      saveState();
      bazaarCanvas.loadBgImage();
      showToast("✅ Imagen de fondo cargada");
    }
  };
  reader.readAsDataURL(file);
}

function addTableToCore() {
  const bz  = getActiveBazaar();
  if (!bz) return;
  const id  = "t-" + Date.now();
  const tables = getActiveTables(bz);
  const cnt = tables.length + 1;
  tables.push({
    id, name: `Mesa ${cnt}`,
    x: 80 + ((cnt - 1) % 6) * 110,
    y: 80 + Math.floor((cnt - 1) / 6) * 80,
    w: 90, h: 50, rotation: 0, exhibitorId: "", attended: false
  });
  saveState(); bazaarCanvas.render(); renderChecklist();
  showToast("Mesa agregada al plano");
}

// [NUEVO] Eliminar mesa del canvas
async function deleteTable(tableId) {
  const bz = getActiveBazaar();
  if (!await appConfirm("¿Eliminar esta mesa del plano?", "Eliminar mesa")) return;
  const floor = getActiveFloor(bz);
  if (!floor) return;
  floor.tables = floor.tables.filter((t) => t.id !== tableId);
  saveState(); bazaarCanvas.render(); renderChecklist();
  showToast("🗑️ Mesa eliminada del plano");
}

function deleteSelectedMapObject() {
  const bz = getActiveBazaar();
  const floor = getActiveFloor(bz);
  if (!floor) return;

  if (bazaarCanvas.selectedTableId) {
    floor.tables = (floor.tables || []).filter((table) => table.id !== bazaarCanvas.selectedTableId);
    bazaarCanvas.selectedTableId = null;
    saveState();
    bazaarCanvas.render();
    renderChecklist();
    showToast("🗑️ Mesa seleccionada eliminada");
    return;
  }

  if (bazaarCanvas.selectedElementId) {
    floor.elements = (floor.elements || []).filter((element) => element.id !== bazaarCanvas.selectedElementId);
    bazaarCanvas.selectedElementId = null;
    saveState();
    bazaarCanvas.render();
    showToast("🗑️ Elemento seleccionado eliminado");
    return;
  }

  if (bazaarCanvas.selectedZoneId) {
    bazaarCanvas.zones = bazaarCanvas.zones.filter((zone) => zone.id !== bazaarCanvas.selectedZoneId);
    bazaarCanvas.selectedZoneId = null;
    bazaarCanvas.saveZones();
    bazaarCanvas.render();
    bazaarCanvas.updateZoneUI();
    showToast("🗑️ Zona seleccionada eliminada");
    return;
  }

  showToast("Selecciona una mesa, elemento o zona primero", "error");
}

function openModalTableEdit(tableId) {
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === tableId);
  if (!t) return;
  document.getElementById("edit-table-id").value    = t.id;
  document.getElementById("edit-table-name").value  = t.name;
  const pixelsPerCentimeter = getPixelsPerMeter() / 100;
  document.getElementById("edit-table-width-cm").value = Math.round(t.w / pixelsPerCentimeter);
  document.getElementById("edit-table-height-cm").value = Math.round(t.h / pixelsPerCentimeter);
  document.getElementById("edit-table-color").value = t.color || "#ffffff";
  document.getElementById("edit-table-label-color").value = t.labelColor || "#1e293b";
  document.getElementById("edit-table-label-size").value = t.labelFontSize || 11;
  document.getElementById("edit-table-rotation").value = Number(t.rotation) || 0;
  const sel = document.getElementById("edit-table-exhibitor");
  if (sel) {
    sel.innerHTML = `<option value="">-- Sin asignar (Mesa Libre) --</option>` +
      bz.expositores.map((exp) =>
        `<option value="${exp.id}" ${exp.id === t.exhibitorId ? "selected" : ""}>${escapeHTML(exp.negocio)} (${escapeHTML(exp.nombre)})</option>`
      ).join("");
  }
  openModal("modal-editar-mesa");
}

function saveTableEdit() {
  const id = document.getElementById("edit-table-id").value;
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === id);
  if (t) {
    t.name        = document.getElementById("edit-table-name").value.trim() || t.name;
    t.exhibitorId = document.getElementById("edit-table-exhibitor").value;
    const pixelsPerCentimeter = getPixelsPerMeter() / 100;
    t.w           = Math.max(1, Number(document.getElementById("edit-table-width-cm").value || 1) * pixelsPerCentimeter);
    t.h           = Math.max(1, Number(document.getElementById("edit-table-height-cm").value || 1) * pixelsPerCentimeter);
    t.color       = document.getElementById("edit-table-color").value || "#ffffff";
    t.labelColor  = document.getElementById("edit-table-label-color").value || "#1e293b";
    t.labelFontSize = Math.max(8, Math.min(32, Number(document.getElementById("edit-table-label-size").value) || 11));
    t.rotation    = ((Number(document.getElementById("edit-table-rotation").value) || 0) % 360 + 360) % 360;
    saveState(); bazaarCanvas.render(); renderChecklist();
    closeModal("modal-editar-mesa");
    showToast("✅ Mesa actualizada");
  }
}

function rotateEditingTable(delta) {
  const tableId = document.getElementById("edit-table-id")?.value;
  const table = getActiveTables().find((item) => item.id === tableId);
  if (!table) return;
  table.rotation = ((Number(table.rotation) || 0) + delta + 360) % 360;
  const rotationInput = document.getElementById("edit-table-rotation");
  if (rotationInput) rotationInput.value = table.rotation;
  saveState();
  bazaarCanvas.render();
  showToast(`Mesa girada a ${table.rotation}°`);
}

function rotateSelectedTable(delta) {
  const tableId = bazaarCanvas.selectedTableId;
  const table = getActiveTables().find((item) => item.id === tableId);
  if (!table) {
    showToast("Selecciona una mesa primero", "error");
    return;
  }
  table.rotation = ((Number(table.rotation) || 0) + delta + 360) % 360;
  saveState();
  bazaarCanvas.render();
  showToast(`Mesa girada a ${table.rotation}°`);
}

// ==========================================

// ── Plano: UI (plegable, pestañas del panel lateral, atajos) ──
function setSideTab(tab) {
  const panel = document.querySelector(".map-side-panel");
  if (!panel) return;
  panel.dataset.tab = tab;
  panel.querySelectorAll(".side-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "zonas") bazaarCanvas.updateZoneUI();
}

function handleMapShortcut(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!document.getElementById("sec-mapa")?.classList.contains("active")) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (document.querySelector(".modal-overlay.open")) return;
  const key = e.key.toLowerCase();
  const actions = {
    v: () => setCanvasMode("select"),
    i: () => setCanvasMode("imgEdit"),
    z: () => setCanvasMode("zone"),
    m: () => addTableToCore(),
    r: () => rotateSelectedTable(e.shiftKey ? -90 : 90),
    escape: () => setCanvasMode("select")
  };
  if (!actions[key]) return;
  e.preventDefault();
  actions[key]();
}

// Cinta de herramientas con pestañas (estilo Word): Plano · Vista · Imagen de fondo · Exportar y limpiar
function setRibbonTab(tab) {
  const ribbon = document.querySelector(".ribbon");
  if (!ribbon || !ribbon.querySelector(`.ribbon-tab[data-rt="${tab}"]`)) return;
  ribbon.dataset.tab = tab;
  ribbon.querySelectorAll(".ribbon-tab").forEach((b) => {
    const on = b.dataset.rt === tab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  try { localStorage.setItem("BAZARIX_RIBBON_TAB", tab); } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  try {   // recuerda si la cuadrícula estaba oculta
    if (localStorage.getItem("BAZARIX_GRID") === "0") {
      bazaarCanvas.showGrid = false;
      document.getElementById("layer-btn-grid")?.classList.remove("active");
    }
  } catch {}
  try { setRibbonTab(localStorage.getItem("BAZARIX_RIBBON_TAB") || "plano"); } catch {}
});
