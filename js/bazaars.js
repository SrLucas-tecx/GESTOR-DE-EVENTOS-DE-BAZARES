/**
 * EXPOSITORES.COM — bazaars.js
 * CRUD de bazares y pisos, elementos del mapa, imagen de fondo, escala, logo
 * Dependencias: state.js, utils.js
 */

// 7. GESTIÓN DE BAZARES
// [EDITABLE: aquí vive toda la lógica de crear/cambiar/eliminar bazares]
// ==========================================
function renderBazaarSelector() {
  const sel = document.getElementById("bazaar-select-global");
  if (!sel) return;
  sel.innerHTML = Object.values(AppState.bazaars)
    .map((bz) => `<option value="${bz.id}" ${bz.id === AppState.currentBazaarId ? "selected" : ""}>${escapeHTML(bz.name)}</option>`)
    .join("");
}

function updateMapaBazaarLabel() {
  const el = document.getElementById("mapa-bazaar-name-display");
  if (el) el.textContent = getActiveBazaar()?.name || "—";
  const scaleInput = document.getElementById("map-pixels-per-meter");
  if (scaleInput) scaleInput.value = getPixelsPerMeter();
  renderFloorSelector();
  applyFloorOrientation();
  const opacity = Number(getActiveFloor()?.backgroundOpacity ?? 1);
  const opacityInput = document.getElementById("floor-plan-opacity");
  const opacityValue = document.getElementById("floor-plan-opacity-value");
  if (opacityInput) opacityInput.value = Math.round(opacity * 100);
  if (opacityValue) opacityValue.textContent = `${Math.round(opacity * 100)}%`;
  const floor = getActiveFloor();
  const bgScale = Number(floor?.bgScale || 1);
  const bgScaleInput = document.getElementById("floor-plan-scale");
  const scaleValue = document.getElementById("floor-plan-scale-value");
  if (bgScaleInput) bgScaleInput.value = Math.round(bgScale * 100);
  if (scaleValue) scaleValue.textContent = `${Math.round(bgScale * 100)}%`;
}

function getPixelsPerMeter() {
  return Number(getActiveBazaar()?.mapConfig?.pixelsPerMeter) || 100;
}

function updateMapScale(value) {
  const bz = getActiveBazaar();
  const pixelsPerMeter = Math.max(1, Number(value) || 100);
  if (!bz) return;
  if (!bz.mapConfig) bz.mapConfig = defaultMapConfig();
  bz.mapConfig.pixelsPerMeter = pixelsPerMeter;
  saveState();
  updateMapaBazaarLabel();
  showToast(`✅ Escala actualizada: ${pixelsPerMeter} px = 1 m`);
}

function updateFloorPlanOpacity(value) {
  const bz = getActiveBazaar();
  const floor = getActiveFloor(bz);
  if (!bz || !floor) return;
  const opacity = Math.max(0, Math.min(1, Number(value) / 100));
  floor.backgroundOpacity = opacity;
  const output = document.getElementById("floor-plan-opacity-value");
  if (output) output.textContent = `${Math.round(opacity * 100)}%`;
  saveState();
  bazaarCanvas.render();
}

function updateFloorPlanScale(value) {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.bgScale = Math.max(0.25, Math.min(3, Number(value) / 100));
  floor.bgScaleX = floor.bgScale;
  floor.bgScaleY = floor.bgScale;
  const output = document.getElementById("floor-plan-scale-value");
  if (output) output.textContent = `${Math.round(floor.bgScale * 100)}%`;
  saveState();
  bazaarCanvas.render();
}

function moveFloorPlan(deltaX, deltaY) {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.bgX = Number(floor.bgX || 0) + deltaX;
  floor.bgY = Number(floor.bgY || 0) + deltaY;
  saveState();
  bazaarCanvas.render();
}

function rotateFloorPlan(delta) {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.bgRotation = ((Number(floor.bgRotation || 0) + delta) % 360 + 360) % 360;
  saveState();
  bazaarCanvas.render();
  showToast(`✅ Imagen girada a ${floor.bgRotation}°`);
}

function addMapElement() {
  const floor = getActiveFloor();
  if (!floor) return;
  const typeInput = document.getElementById("new-element-type");
  if (typeInput) typeInput.value = "electricidad";
  document.getElementById("new-element-label").value = "";
  document.getElementById("new-element-emoji").value = "⚡";
  document.getElementById("new-element-width").value = 30;
  document.getElementById("new-element-height").value = 30;
  updateNewElementEmoji();
  openModal("modal-nuevo-elemento");
}

function updateNewElementEmoji() {
  const type = document.getElementById("new-element-type")?.value || "otro";
  const defaults = { electricidad: "⚡", pilar: "▣", entrada: "↗", otro: "•" };
  const emojiInput = document.getElementById("new-element-emoji");
  if (emojiInput) emojiInput.value = defaults[type] || "•";
  const labelInput = document.getElementById("new-element-label");
  const hint = document.getElementById("new-element-custom-hint");
  if (labelInput) {
    labelInput.required = type === "otro";
    labelInput.placeholder = type === "otro" ? "Ej. Extintor, columna, área VIP" : "Ej. Contacto eléctrico";
  }
  if (hint) hint.textContent = type === "otro"
    ? "Escribe el nombre del nuevo elemento personalizado."
    : "Puedes cambiar este nombre antes de agregarlo.";
}

function saveNewMapElement() {
  const floor = getActiveFloor();
  const type = document.getElementById("new-element-type").value;
  const defaults = { electricidad: "Zona eléctrica", pilar: "Pilar", entrada: "Entrada", otro: "Elemento" };
  const label = document.getElementById("new-element-label").value.trim();
  const emoji = document.getElementById("new-element-emoji").value.trim() || "•";
  if (!floor) return;
  if (type === "otro" && !label) {
    showToast("Escribe el nombre del elemento personalizado", "error");
    return;
  }
  const elementLabel = label || defaults[type];
  floor.elements = floor.elements || [];
  floor.elements.push({
    id: `element-${Date.now()}`, type, label: elementLabel, emoji, x: 120, y: 120,
    width: Math.max(5, Number(document.getElementById("new-element-width").value || 30)),
    height: Math.max(5, Number(document.getElementById("new-element-height").value || 30))
  });
  saveState();
  bazaarCanvas.render();
  closeModal("modal-nuevo-elemento");
  showToast(`✅ ${elementLabel} agregado al plano`);
}

function openModalMapElementEdit(elementId) {
  const element = (getActiveFloor()?.elements || []).find((item) => item.id === elementId);
  if (!element) return;
  document.getElementById("edit-element-id").value = element.id;
  document.getElementById("edit-element-type").value = element.type || "otro";
  document.getElementById("edit-element-label").value = element.label || "Elemento";
  document.getElementById("edit-element-emoji").value = element.emoji || "•";
  document.getElementById("edit-element-x").value = Math.round(Number(element.x) || 0);
  document.getElementById("edit-element-y").value = Math.round(Number(element.y) || 0);
  document.getElementById("edit-element-width").value = Math.round(Number(element.width) || 30);
  document.getElementById("edit-element-height").value = Math.round(Number(element.height) || 30);
  openModal("modal-editar-elemento");
}

function saveMapElementEdit() {
  const elementId = document.getElementById("edit-element-id").value;
  const element = (getActiveFloor()?.elements || []).find((item) => item.id === elementId);
  if (!element) return;
  element.type = document.getElementById("edit-element-type").value;
  element.label = document.getElementById("edit-element-label").value.trim() || "Elemento";
  element.emoji = document.getElementById("edit-element-emoji").value.trim() || "•";
  element.x = Number(document.getElementById("edit-element-x").value || 0);
  element.y = Number(document.getElementById("edit-element-y").value || 0);
  element.width = Math.max(5, Number(document.getElementById("edit-element-width").value || 30));
  element.height = Math.max(5, Number(document.getElementById("edit-element-height").value || 30));
  bazaarCanvas.selectedElementId = element.id;
  saveState();
  bazaarCanvas.render();
  closeModal("modal-editar-elemento");
  showToast("✅ Elemento actualizado");
}

async function deleteMapElementFromModal() {
  const elementId = document.getElementById("edit-element-id").value;
  const floor = getActiveFloor();
  if (!floor || !await appConfirm("¿Eliminar este elemento del plano?", "Eliminar elemento")) return;
  floor.elements = (floor.elements || []).filter((item) => item.id !== elementId);
  bazaarCanvas.selectedElementId = null;
  saveState();
  bazaarCanvas.render();
  closeModal("modal-editar-elemento");
  showToast("🗑️ Elemento eliminado");
}

function renderFloorSelector() {
  const select = document.getElementById("floor-select");
  const bz = getActiveBazaar();
  if (!select || !bz?.floors) return;
  select.innerHTML = bz.floors.map((floor) =>
    `<option value="${floor.id}" ${floor.id === bz.activeFloorId ? "selected" : ""}>${escapeHTML(floor.name)}</option>`
  ).join("");
}

function switchFloor(floorId) {
  const bz = getActiveBazaar();
  if (!bz?.floors?.some((floor) => floor.id === floorId)) return;
  bz.activeFloorId = floorId;
  bazaarCanvas.selectedTableId = null;
  bazaarCanvas.selectedElementId = null;
  saveState();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.loadZones();
  bazaarCanvas.render();
  renderChecklist();
  updateMapaBazaarLabel();
}

async function addFloor() {
  const bz = getActiveBazaar();
  if (!bz) return;
  if (!Array.isArray(bz.floors)) bz.floors = [];
  const name = await appPrompt("Nombre del nuevo piso:", `Piso ${(bz.floors?.length || 0) + 1}`, "Agregar piso");
  if (!name?.trim()) return;
  const floor = createFloor(`${bz.id}-floor-${Date.now()}`, name.trim());
  if (!bz.floors) bz.floors = [];
  bz.floors.push(floor);
  bz.activeFloorId = floor.id;
  saveState();
  renderAll();
  syncCanvasWithState();
  showToast(`✅ ${floor.name} creado`);
}

async function deleteCurrentFloor() {
  const bz = getActiveBazaar();
  if (!bz?.floors || bz.floors.length <= 1) {
    showToast("Debe existir al menos un piso", "error");
    return;
  }
  const floor = getActiveFloor(bz);
  if (!floor || !await appConfirm(`¿Eliminar "${floor.name}" y sus mesas?`, "Eliminar piso")) return;
  bz.floors = bz.floors.filter((item) => item.id !== floor.id);
  bz.activeFloorId = bz.floors[0].id;
  bazaarCanvas.selectedTableId = null;
  saveState();
  renderAll();
  syncCanvasWithState();
  showToast("🗑️ Piso eliminado");
}

function switchBazaar(bazaarId) {
  if (!AppState.bazaars[bazaarId]) return;
  AppState.currentBazaarId = bazaarId;
  bazaarCanvas.selectedTableId = null;
  saveState();
  renderAll();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.loadZones();
  bazaarCanvas.render();
}

async function createBazaar() {
  const name = await appPrompt("Nombre del nuevo bazar:", "Bazar " + (Object.keys(AppState.bazaars).length + 1), "Nuevo bazar");
  if (!name?.trim()) return;
  const id = "bazaar-" + Date.now();
  AppState.bazaars[id] = {
    id, name: name.trim(),
    bgImage: null, logoImage: null, mapConfig: defaultMapConfig(),
    expositores: [], tables: [],
    costsConfig: emptyCostsConfig(),
    invitados: [], customMetrics: emptyCustomMetrics(),
    evento: emptyEvento(), tareas: [], compras: [],
    minuteByMinute: emptyMinuteByMinute(),
    floors: [createFloor(`${id}-floor-1`, "Planta baja")], activeFloorId: `${id}-floor-1`
  };
  AppState.currentBazaarId = id;
  saveState();
  renderAll();
  renderBazaresTabla();
  syncCanvasWithState();
  showToast(`✅ Bazar "${name.trim()}" creado`);
}

// deleteBazaar: solo disponible desde la sección "Mis Bazares" (sec-bazares)
// [EDITABLE: cambia el mensaje de confirmación aquí]
async function deleteBazaarById(bazaarId) {
  const bz = AppState.bazaars[bazaarId];
  if (!bz) return;
  if (!await appConfirm(`¿Eliminar permanentemente el bazar "${bz.name}"? Esta acción no se puede deshacer.`, "Eliminar bazar", "Eliminar")) return;
  const wasActive = bazaarId === AppState.currentBazaarId;
  delete AppState.bazaars[bazaarId];
  const remaining = Object.keys(AppState.bazaars);
  // Solo cambia el bazar activo si el eliminado ERA el activo.
  if (wasActive) AppState.currentBazaarId = remaining[0] || null;
  if (remaining.length === 0) {
    // Si no quedan bazares, crea uno vacío para no romper la app
    const newId = "bazaar-" + Date.now();
    AppState.bazaars[newId] = { id: newId, name: "Mi Primer Bazar", bgImage: null, logoImage: null, mapConfig: defaultMapConfig(),
      expositores: [], tables: [], costsConfig: emptyCostsConfig(), invitados: [], minuteByMinute: emptyMinuteByMinute(), customMetrics: emptyCustomMetrics(),
      floors: [createFloor(`${newId}-floor-1`, "Planta baja")], activeFloorId: `${newId}-floor-1` };
    AppState.currentBazaarId = newId;
  }
  saveState();
  renderAll();
  syncCanvasWithState();
  renderBazaresTabla();
  showToast(`🗑️ Bazar eliminado`);
}

// Tabla de gestión de bazares (tab "Mis Bazares")
// [EDITABLE: agrega columnas a la tabla aquí y en index.html sec-bazares]
function renderBazaresTabla() {
  const tbody = document.getElementById("bazares-table-body");
  if (!tbody) return;
  const bazList = Object.values(AppState.bazaars);
  if (bazList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:24px;">Sin bazares registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = bazList.map((bz) => {
    const expositores = bz.expositores || [];
    const expCount = expositores.length;
    const paidCount = expositores.filter((e) => e.pagado).length;
    const invCount = (bz.invitados || []).length;
    const isActive = bz.id === AppState.currentBazaarId;
    const logoHtml = bz.logoImage
      ? `<img src="${bz.logoImage}" style="width:36px;height:36px;object-fit:cover;border-radius:8px;border:2px solid var(--color-border);">`
      : `<span style="font-size:1.4rem;">🎪</span>`;
    return `
      <tr class="${isActive ? "active-bazaar-row" : ""}">
        <td style="display:flex;align-items:center;gap:10px;">
          <div class="bazar-logo-mini">${logoHtml}</div>
          <div>
            <strong>${escapeHTML(bz.name)}</strong>
            ${isActive ? `<span class="section-count" style="margin-left:6px;font-size:10px;">Activo</span>` : ""}
          </div>
        </td>
        <td>${expCount} expositor${expCount !== 1 ? "es" : ""}</td>
        <td>${paidCount}/${expCount} pagados</td>
        <td>${invCount} invitado${invCount !== 1 ? "s" : ""}</td>
        <td style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-secondary btn-sm" onclick="switchBazaarAndGo('${bz.id}')" title="${isActive ? "Ir a expositores" : "Activar bazar"}">
            ${isActive ? "✏️ Editar" : "🔀 Ir al Bazar"}
          </button>
          <button class="btn-secondary btn-sm" onclick="openLogoUploadModal('${bz.id}')">🖼️ Logo</button>
          <button class="btn-secondary btn-sm" onclick="renameBazaar('${bz.id}')">✏️ Renombrar</button>
          <button class="btn-danger btn-sm" onclick="deleteBazaarById('${bz.id}')">🗑️ Eliminar</button>
        </td>
      </tr>`;
  }).join("");
}

function renderBazaarHome() {
  const container = document.getElementById("bazaar-home-grid");
  if (!container) return;
  const bazaars = Object.values(AppState.bazaars || {});
  if (!bazaars.length) {
    container.innerHTML = `<div class="catalog-empty"><span class="catalog-empty-icon">🏪</span><h3>Aún no hay bazares</h3><p>Crea un bazar para empezar a organizar tu evento.</p></div>`;
    return;
  }
  container.innerHTML = bazaars.map((bz) => {
    const expositores = bz.expositores || [];
    const logo = bz.logoImage
      ? `<img src="${bz.logoImage}" alt="" class="bazaar-home-logo">`
      : `<span class="bazaar-home-emoji" aria-hidden="true">🎪</span>`;
    const active = bz.id === AppState.currentBazaarId;
    return `
      <article class="bazaar-home-card ${active ? "active" : ""}">
        <div class="bazaar-home-card-top">
          ${logo}
          ${active ? `<span class="section-count">Activo</span>` : ""}
        </div>
        <h3>${escapeHTML(bz.name)}</h3>
        <p>${expositores.length} expositor${expositores.length === 1 ? "" : "es"} · ${(bz.floors || []).length} piso${(bz.floors || []).length === 1 ? "" : "s"}</p>
        <button class="btn-primary btn-sm" onclick="switchBazaarAndGo('${bz.id}')">${active ? "Abrir bazar" : "Activar bazar"}</button>
      </article>`;
  }).join("");
}

function switchBazaarAndGo(id) {
  switchBazaar(id);
  switchTab("expositores");
}

async function renameBazaar(id) {
  const bz = AppState.bazaars[id];
  if (!bz) return;
  const newName = await appPrompt("Nuevo nombre del bazar:", bz.name, "Renombrar bazar");
  if (!newName?.trim()) return;
  bz.name = newName.trim();
  saveState();
  renderBazaarSelector();
  renderBazaresTabla();
  renderBazaarHome();
  showToast("✅ Bazar renombrado");
}

// Upload de logo/imagen del bazar
function openLogoUploadModal(bazaarId) {
  document.getElementById("logo-bazar-id").value = bazaarId;
  const bz = AppState.bazaars[bazaarId];
  const preview = document.getElementById("logo-preview-box");
  if (preview) {
    preview.innerHTML = bz?.logoImage
      ? `<img src="${bz.logoImage}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
      : "🎪";
  }
  const nameEl = document.getElementById("logo-modal-bazaar-name");
  if (nameEl) nameEl.textContent = bz?.name || "";
  openModal("modal-logo-bazar");
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const base64 = evt.target.result;
    document.getElementById("logo-base64").value = base64;
    const preview = document.getElementById("logo-preview-box");
    if (preview) preview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
  };
  reader.readAsDataURL(file);
}

function saveLogoHandler() {
  const bazaarId = document.getElementById("logo-bazar-id").value;
  const base64   = document.getElementById("logo-base64").value;
  if (!base64) { showToast("Selecciona una imagen primero", "error"); return; }
  const bz = AppState.bazaars[bazaarId];
  if (!bz) return;
  bz.logoImage = base64;
  saveState();
  renderBazaresTabla();
  renderBazaarSelector();
  renderBazaarHome();
  closeModal("modal-logo-bazar");
  showToast("✅ Logo del bazar actualizado");
}

function removeLogoHandler() {
  const bazaarId = document.getElementById("logo-bazar-id").value;
  const bz = AppState.bazaars[bazaarId];
  if (!bz) return;
  bz.logoImage = null;
  document.getElementById("logo-base64").value = "";
  const preview = document.getElementById("logo-preview-box");
  if (preview) preview.innerHTML = "🎪";
  saveState();
  renderBazaresTabla();
  renderBazaarHome();
  showToast("Imagen eliminada");
}

// ==========================================
// SINCRONIZACIÓN DEL CANVAS + ORIENTACIÓN + DUPLICAR BAZAR
// ==========================================

// Recarga fondo, zonas y tamaño del canvas desde el estado activo.
// Debe llamarse SIEMPRE que cambie el bazar o el piso activo; si no, el canvas
// conserva las zonas del piso anterior y saveZones() las copia al piso nuevo.
function syncCanvasWithState() {
  bazaarCanvas.selectedTableId = null;
  bazaarCanvas.selectedElementId = null;
  bazaarCanvas.selectedZoneId = null;
  bazaarCanvas.isDraggingTable = false;
  bazaarCanvas.isDraggingElement = false;
  bazaarCanvas.isDraggingZone = false;
  bazaarCanvas.draggedTable = null;
  bazaarCanvas.draggedElement = null;
  bazaarCanvas.draggedZone = null;
  bazaarCanvas.loadBgImage();
  bazaarCanvas.loadZones();
  applyFloorOrientation();
  bazaarCanvas.render();
  bazaarCanvas.updateZoneUI();
}

// Ajusta el tamaño del canvas según la orientación del piso activo.
function applyFloorOrientation() {
  const floor = getActiveFloor();
  const orientation = floor?.orientation === "portrait" ? "portrait" : "landscape";
  const select = document.getElementById("map-orientation");
  if (select) select.value = orientation;
  const canvas = document.getElementById("bazaar-canvas");
  if (!canvas) return;
  const [width, height] = orientation === "portrait" ? [560, 900] : [900, 560];
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  if (typeof bazaarCanvas !== "undefined" && bazaarCanvas.ctx) bazaarCanvas.render();
}

function updateMapOrientation(value) {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.orientation = value === "portrait" ? "portrait" : "landscape";
  saveState();
  applyFloorOrientation();
  bazaarCanvas.render();
  showToast(floor.orientation === "portrait" ? "↕️ Plano en vertical" : "↔️ Plano en horizontal");
}

// Duplica el bazar activo (expositores, pisos, mesas, zonas, costos, agenda...).
// La asistencia (mesas e invitados) y el historial se reinician en la copia.
async function duplicarBazaar() {
  const source = getActiveBazaar();
  if (!source) return;
  const name = await appPrompt("Nombre del bazar duplicado:", `${source.name} (copia)`, "Duplicar bazar");
  if (!name?.trim()) return;

  const copy = JSON.parse(JSON.stringify(source));
  const newId = "bazaar-" + Date.now();
  const floorIdMap = {};

  copy.id = newId;
  copy.name = name.trim();
  copy.tables = [];
  (copy.floors || []).forEach((floor, index) => {
    const newFloorId = `${newId}-floor-${index + 1}`;
    floorIdMap[floor.id] = newFloorId;
    floor.id = newFloorId;
    (floor.tables || []).forEach((table) => { table.attended = false; table.absent = false; });
  });
  copy.activeFloorId = floorIdMap[source.activeFloorId] || copy.floors?.[0]?.id;
  (copy.invitados || []).forEach((inv) => { inv.asistio = false; });
  (copy.expositores || []).forEach((exp) => { exp.historial = []; });
  (copy.tareas || []).forEach((t) => { t.hecho = false; });
  (copy.compras || []).forEach((c) => { c.comprado = false; });

  AppState.bazaars[newId] = copy;
  AppState.currentBazaarId = newId;
  saveState();
  renderAll();
  syncCanvasWithState();
  renderBazaresTabla();
  showToast(`✅ Bazar "${copy.name}" duplicado`);
}

// ==========================================
// 8. RENDERIZADO PRINCIPAL
// ==========================================
function renderAll() {
  renderBazaarSelector();
  renderBazaarHome();
  updateMapaBazaarLabel();
  renderExpositores();
  renderCategorias();
  renderCategoryChips();
  renderFinanzasTable();
  renderFinanzasStats();
  renderCostosUI();
  renderChecklist();
  renderInvitados();
  renderPlantillas();
  renderMinuteByMinute();
  renderFicha();
  renderTareas();
  renderCompras();
  renderMetricasFinancieras();
  renderPanelDiaEvento();
  updateAlertBadge();
}

function handleSearch(val) {
  AppState.searchQuery = val.toLowerCase();
  renderExpositores();
}

function setFilterCategory(catId, btnEl) {
  AppState.filterCategory = catId;
  document.querySelectorAll(".filter-chip").forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderExpositores();
}

function setFilterStatus(status) {
  AppState.filterStatus = status;
  renderExpositores();
}
