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
function clearAllZones() {
  if (!confirm("¿Eliminar todas las zonas del plano?")) return;
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

  bazaarCanvas.render();
  const wrapper = document.createElement("div");
  const issuedAt = new Date().toLocaleDateString("es-MX");
  const safeName = `${bz.name}_${floor.name}`.replace(/[^a-z0-9]+/gi, "_");
  wrapper.style.cssText = "display:none;box-sizing:border-box;width:1000px;height:650px;overflow:hidden;padding:18px;font-family:Arial,sans-serif;background:#fff;color:#1e293b;page-break-inside:avoid;";
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
    <img src="${bazaarCanvas.canvas.toDataURL("image/png")}" alt="Plano de ${escapeHTML(bz.name)}" style="display:block;width:100%;height:515px;object-fit:contain;border:1px solid #cbd5e1;border-radius:6px;">
    <p style="margin:6px 0 0;text-align:center;color:#64748b;font-size:10px;">Documento generado por BAZARIX</p>`;

  document.body.appendChild(wrapper);
  wrapper.style.display = "block";
  window.html2pdf().set({
    margin: 8,
    filename: `mapa_${safeName}.pdf`,
    image: { type: "png" },
    html2canvas: { scale: 3, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
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
function resetBazaarCanvas() {
  if (!confirm("¿Eliminar todas las mesas, elementos, zonas e imagen de fondo? Esta acción no se puede deshacer.")) return;
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
function deleteTable(tableId) {
  const bz = getActiveBazaar();
  if (!confirm(`¿Eliminar esta mesa del plano?`)) return;
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

// ==========================================
// SPRINT 2 — PRODUCTIVIDAD DEL PLANO
// ==========================================

/** Duplica la mesa seleccionada o la indicada por ID */
function duplicateTable(tableId) {
  const id  = tableId || bazaarCanvas.selectedTableId;
  if (!id) { showToast("Selecciona una mesa primero", "error"); return; }
  const bz    = getActiveBazaar();
  const floor = getActiveFloor(bz);
  const orig  = getActiveTables(bz).find((t) => t.id === id);
  if (!orig || !floor) return;

  const copy = {
    ...JSON.parse(JSON.stringify(orig)),
    id:   "t-" + Date.now(),
    name: orig.name + " (copia)",
    x:    orig.x + 20,
    y:    orig.y + 20,
    // La copia no hereda expositor ni asistencia
    exhibitorId: "",
    attended:    false,
    absent:      false,
  };
  floor.tables.push(copy);
  bazaarCanvas.selectedTableId = copy.id;
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  showToast(`✅ Mesa duplicada: ${copy.name}`);
  hideCanvasContextMenu();
}

/**
 * Numera automáticamente todas las mesas según su posición en el plano.
 * Divide el canvas en filas (cada BAND_H px), y dentro de cada fila
 * ordena de izquierda a derecha. Genera nombres: A-01, A-02, B-01...
 */
function autoNumberTables() {
  const bz    = getActiveBazaar();
  const floor = getActiveFloor(bz);
  const tables = getActiveTables(bz);
  if (!tables.length) { showToast("Sin mesas para numerar", "error"); return; }
  if (!confirm(`¿Renombrar automáticamente las ${tables.length} mesas por posición?\nFormato: A-01, A-02, B-01...`)) return;

  // Determina el alto de banda usando el promedio de alturas de mesas
  const avgH    = tables.reduce((s, t) => s + t.h, 0) / tables.length;
  const BAND_H  = avgH * 2.2;

  const sorted = [...tables].sort((a, b) => {
    const rowA = Math.floor(a.y / BAND_H);
    const rowB = Math.floor(b.y / BAND_H);
    return rowA !== rowB ? rowA - rowB : a.x - b.x;
  });

  let currentRow = -1, rowLetter = -1, colIdx = 0;
  sorted.forEach((t) => {
    const row = Math.floor(t.y / BAND_H);
    if (row !== currentRow) { currentRow = row; rowLetter++; colIdx = 0; }
    colIdx++;
    const letter = String.fromCharCode(65 + (rowLetter % 26));
    t.name = `${letter}-${String(colIdx).padStart(2, "0")}`;
  });

  saveState();
  bazaarCanvas.render();
  renderChecklist();
  showToast(`✅ ${tables.length} mesas renombradas automáticamente`);
}

/** Alterna snap entre mesas */
function toggleSnapTables() {
  bazaarCanvas.snapEnabled = !bazaarCanvas.snapEnabled;
  const btn = document.getElementById("btn-snap-tables");
  if (btn) btn.classList.toggle("active", bazaarCanvas.snapEnabled);
  showToast(bazaarCanvas.snapEnabled ? "🧲 Snap activado" : "🧲 Snap desactivado");
}

/** Alterna visibilidad de la leyenda */
function toggleLegend() {
  bazaarCanvas.showLegend = !bazaarCanvas.showLegend;
  const btn = document.getElementById("btn-toggle-legend");
  if (btn) btn.classList.toggle("active", bazaarCanvas.showLegend);
  bazaarCanvas.render();
  showToast(bazaarCanvas.showLegend ? "📋 Leyenda visible" : "📋 Leyenda oculta");
}

// ── MENÚ CONTEXTUAL DEL CANVAS ──────────────────────────────────
function showCanvasContextMenu(clientX, clientY, tableId) {
  let menu = document.getElementById("canvas-ctx-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "canvas-ctx-menu";
    menu.style.cssText = `
      position:fixed;z-index:9999;
      background:var(--color-surface);border:1.5px solid var(--color-border);
      border-radius:var(--radius-md);box-shadow:var(--shadow-lg);
      min-width:180px;overflow:hidden;animation:slideUp .15s ease;`;
    document.body.appendChild(menu);
    // Cierra al hacer clic fuera
    document.addEventListener("click", () => hideCanvasContextMenu(), { once: false });
  }

  const itemStyle = `display:flex;align-items:center;gap:8px;padding:8px 14px;
    font-size:var(--fs-sm);font-weight:600;cursor:pointer;color:var(--color-text);
    background:none;border:none;width:100%;text-align:left;transition:background .15s;`;
  const divStyle  = `height:1px;background:var(--color-border);margin:2px 0;`;

  menu.innerHTML = `
    <button style="${itemStyle}" onmouseenter="this.style.background='var(--color-accent-soft)'" onmouseleave="this.style.background='none'" onclick="openModalTableEdit('${tableId}');hideCanvasContextMenu()">✏️ Editar mesa</button>
    <button style="${itemStyle}" onmouseenter="this.style.background='var(--color-accent-soft)'" onmouseleave="this.style.background='none'" onclick="duplicateTable('${tableId}')">📋 Duplicar mesa</button>
    <div style="${divStyle}"></div>
    <button style="${itemStyle}" onmouseenter="this.style.background='var(--color-accent-soft)'" onmouseleave="this.style.background='none'" onclick="bazaarCanvas.selectedTableId='${tableId}';rotateSelectedTable(-90);hideCanvasContextMenu()">↶ Girar 90° izq</button>
    <button style="${itemStyle}" onmouseenter="this.style.background='var(--color-accent-soft)'" onmouseleave="this.style.background='none'" onclick="bazaarCanvas.selectedTableId='${tableId}';rotateSelectedTable(90);hideCanvasContextMenu()">↷ Girar 90° der</button>
    <div style="${divStyle}"></div>
    <button style="${itemStyle};color:var(--color-danger);" onmouseenter="this.style.background='var(--color-danger-soft)'" onmouseleave="this.style.background='none'" onclick="bazaarCanvas.selectedTableId='${tableId}';deleteSelectedMapObject();hideCanvasContextMenu()">🗑️ Eliminar mesa</button>`;

  menu.style.left    = `${Math.min(clientX, window.innerWidth  - 200)}px`;
  menu.style.top     = `${Math.min(clientY, window.innerHeight - 220)}px`;
  menu.style.display = "block";
}

function hideCanvasContextMenu() {
  const menu = document.getElementById("canvas-ctx-menu");
  if (menu) menu.style.display = "none";
}

// ==========================================