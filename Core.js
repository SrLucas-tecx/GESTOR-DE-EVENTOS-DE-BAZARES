/**
 * BAZARIX — Core.js v2.0
 * ─────────────────────────────────────────────────────────────────
 * NUEVAS FUNCIONES EN ESTA VERSIÓN:
 *  1. Eliminar mesas del canvas (botón en modal editar mesa)
 *  2. Reset de canvas: borra TODAS las mesas y la imagen de fondo
 *  3. Checklist editable (editar texto de ítem existente)
 *  4. Lista de Invitados por bazar (nombre, confirmación asistencia)
 *  5. Guardar expositor como "plantilla" reutilizable entre bazares
 *  6. Costo de mobiliario: campo Costo TOTAL + cálculo automático de Costo Unitario
 *  7. Campo "Adelanto" y "Fecha límite de pago" por expositor
 *  8. PDF con adelanto, saldo restante y estado claro del pago
 *  9. Imagen de bazar (reemplaza emoji) en la tarjeta del bazar
 * 10. Sección /tab "Mis Bazares" — tabla para gestionar y borrar bazares
 * ─────────────────────────────────────────────────────────────────
 */

// ==========================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN (AppState)
// [EDITABLE: agrega nuevos campos por bazar o por expositor aquí]
// ==========================================

// Checklist por defecto que recibe cada expositor nuevo.
// [EDITABLE: agrega/quita pendientes por defecto aquí]
function defaultChecklistItems() {
  const base = Date.now();
  return [
    { id: `chk-${base}-1`, label: "Contrato / registro firmado", done: false },
    { id: `chk-${base}-2`, label: "Pago de mesa confirmado", done: false },
    { id: `chk-${base}-3`, label: "Mesa asignada en el plano", done: false },
    { id: `chk-${base}-4`, label: "Material / mercancía entregada", done: false }
  ];
}

// Configuración de costos vacía para un bazar nuevo.
// [EDITABLE: cambia los valores por defecto de nuevos bazares aquí]
function emptyCostsConfig() {
  return {
    tablesEnabled: false,
    tablesQty: 0,
    tablesTotal: 0,   // <- NUEVO: costo TOTAL (antes era tablesUnit)
    chairsEnabled: false,
    chairsQty: 0,
    chairsTotal: 0,   // <- NUEVO: costo TOTAL
    extraCosts: []
  };
}

function emptyCustomMetrics() {
  return [];
}

function emptyMinuteByMinute() {
  return [];
}

function defaultMapConfig() {
  return { pixelsPerMeter: 100, backgroundOpacity: 1 };
}

function createFloor(id, name, tables = [], bgImage = null, backgroundOpacity = 1) {
  return { id, name, tables, bgImage, backgroundOpacity, bgScale: 1, bgX: 0, bgY: 0, elements: [] };
}

const DEFAULT_STATE = {
  // Catálogo de categorías compartido entre todos los bazares.
  categorias: [
    { id: "cat-1", nombre: "Artesanías",   emoji: "🎨", color: "#0d9488" },
    { id: "cat-2", nombre: "Gastronomía",  emoji: "🥐", color: "#e11d48" },
    { id: "cat-3", nombre: "Moda y Textil",emoji: "👗", color: "#8b5cf6" },
    { id: "cat-4", nombre: "Hogar y Salud",emoji: "🌿", color: "#10b981" }
  ],

  // Plantillas de expositores guardados (reutilizables entre bazares).
  // [EDITABLE: estructura de plantilla: { id, nombre, negocio, categoria, tel, email, foto, notas }]
  expositorPlantillas: [],

  // Cada bazar es independiente: expositores, mesas, costos e invitados.
  bazaars: {
    "bazaar-1": {
      id: "bazaar-1",
      name: "Bazar Primavera",
      bgImage: null,
      logoImage: null,       // <- NUEVO: imagen de logo/portada del bazar
      mapConfig: defaultMapConfig(),
      expositores: [
        {
          id: "exp-1",
          nombre: "Ana García",
          negocio: "Joyería Artesanal",
          categoria: "cat-1",
          ubicacion: "Mesa A-01",
          tel: "55-1234-5678",
          email: "ana@ejemplo.com",
          costo: 450,
          adelanto: 200,             // <- NUEVO: cuánto ha pagado de adelanto
          fechaLimitePago: "",       // <- NUEVO: fecha límite para completar pago
          pagado: true,
          notas: "Cerca de toma de corriente",
          foto: "",
          publicationStatus: "pendiente",
          banned: false,
          checklist: defaultChecklistItems()
        },
        {
          id: "exp-2",
          nombre: "Carlos López",
          negocio: "Café de Altura",
          categoria: "cat-2",
          ubicacion: "Mesa B-02",
          tel: "55-8765-4321",
          email: "carlos@ejemplo.com",
          costo: 500,
          adelanto: 0,
          fechaLimitePago: "",
          pagado: false,
          notas: "Requiere espacio para hielera",
          foto: "",
          publicationStatus: "pendiente",
          banned: false,
          checklist: defaultChecklistItems()
        }
      ],
      tables: [
        { id: "t1", name: "Mesa A-01", x: 80,  y: 80, w: 90, h: 50, exhibitorId: "exp-1", attended: true  },
        { id: "t2", name: "Mesa B-02", x: 220, y: 80, w: 90, h: 50, exhibitorId: "exp-2", attended: false },
        { id: "t3", name: "Mesa C-03", x: 360, y: 80, w: 90, h: 50, exhibitorId: "",      attended: false }
      ],
      costsConfig: {
        tablesEnabled: true,  tablesQty: 10, tablesTotal: 1000,
        chairsEnabled: true,  chairsQty: 20, chairsTotal: 500,
        extraCosts: [
          { id: "c1", name: "Renta de Recinto",       cost: 2500 },
          { id: "c2", name: "Permisos y Licencias",   cost: 800  }
        ]
      },
      // [NUEVO] Lista de invitados del bazar
      invitados: [
        { id: "inv-1", nombre: "Roberto Sánchez", expositorId: "", confirmado: true, asistio: false, notas: "Viene con familia" },
        { id: "inv-2", nombre: "Laura Martínez", expositorId: "", confirmado: false, asistio: false, notas: "" }
      ],
      minuteByMinute: [],
      customMetrics: []
    },
    "bazaar-2": {
      id: "bazaar-2",
      name: "Bazar Nocturno",
      bgImage: null,
      logoImage: null,
      mapConfig: defaultMapConfig(),
      expositores: [],
      tables: [
        { id: "t201", name: "Mesa N-01", x: 100, y: 100, w: 90, h: 50, exhibitorId: "", attended: false }
      ],
      costsConfig: emptyCostsConfig(),
      invitados: []
      ,minuteByMinute: [], customMetrics: []
    }
  },

  currentBazaarId: "bazaar-1",
  searchQuery: "",
  filterCategory: "all",
  filterStatus: "all"
};

let AppState = loadState();

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

// ==========================================
// 2. PERSISTENCIA (localStorage)
// ==========================================
function loadState() {
  try {
    const saved = localStorage.getItem("EXPOSITORES_APP_STATE");
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrateState(parsed);
    }
  } catch (err) {
    console.warn("Error cargando estado:", err);
  }
  return migrateState(cloneDefaultState());
}

// migrateState: asegura que bazares viejos tengan los campos nuevos.
function migrateState(parsed) {
  if (!parsed.expositorPlantillas) parsed.expositorPlantillas = [];

  Object.values(parsed.bazaars || {}).forEach((bz) => {
    if (!bz.invitados)   bz.invitados   = [];
    if (!bz.minuteByMinute) bz.minuteByMinute = emptyMinuteByMinute();
    if (!bz.customMetrics) bz.customMetrics = emptyCustomMetrics();
    if (!bz.mapConfig) bz.mapConfig = defaultMapConfig();
    if (!Number.isFinite(Number(bz.mapConfig.pixelsPerMeter)) || bz.mapConfig.pixelsPerMeter <= 0) {
      bz.mapConfig.pixelsPerMeter = 100;
    }
    if (!Number.isFinite(Number(bz.mapConfig.backgroundOpacity))) bz.mapConfig.backgroundOpacity = 1;
    bz.mapConfig.backgroundOpacity = Math.max(0, Math.min(1, Number(bz.mapConfig.backgroundOpacity)));
    if (!Array.isArray(bz.floors) || bz.floors.length === 0) {
      bz.floors = [createFloor(`${bz.id}-floor-1`, "Planta baja", bz.tables || [], bz.bgImage || null, bz.mapConfig.backgroundOpacity)];
    }
    bz.floors.forEach((floor, index) => {
      if (!floor.id) floor.id = `${bz.id}-floor-${index + 1}`;
      if (!floor.name) floor.name = `Piso ${index + 1}`;
      if (!Array.isArray(floor.tables)) floor.tables = [];
      if (floor.bgImage === undefined) floor.bgImage = null;
      if (!Number.isFinite(Number(floor.backgroundOpacity))) floor.backgroundOpacity = 1;
      floor.backgroundOpacity = Math.max(0, Math.min(1, Number(floor.backgroundOpacity)));
      if (!Number.isFinite(Number(floor.bgScale)) || floor.bgScale <= 0) floor.bgScale = 1;
      if (!Number.isFinite(Number(floor.bgX))) floor.bgX = 0;
      if (!Number.isFinite(Number(floor.bgY))) floor.bgY = 0;
      if (!Array.isArray(floor.elements)) floor.elements = [];
      floor.elements.forEach((element) => {
        if (!element.id) element.id = `element-${Date.now()}-${Math.random()}`;
        if (!element.type) element.type = "otro";
        if (!element.label) element.label = "Elemento";
        if (!Number.isFinite(Number(element.x))) element.x = 100;
        if (!Number.isFinite(Number(element.y))) element.y = 100;
        if (!Number.isFinite(Number(element.width)) || element.width <= 0) element.width = 30;
        if (!Number.isFinite(Number(element.height)) || element.height <= 0) element.height = 30;
        if (!element.emoji) element.emoji = { electricidad: "⚡", pilar: "▣", entrada: "↗", otro: "•" }[element.type] || "•";
      });
    });
    if (!bz.activeFloorId || !bz.floors.some((floor) => floor.id === bz.activeFloorId)) {
      bz.activeFloorId = bz.floors[0].id;
    }
    if (!bz.logoImage)   bz.logoImage   = null;

    // Migrar costsConfig: renombrar tablesUnit->tablesTotal, chairsUnit->chairsTotal
    const cfg = bz.costsConfig || {};
    if (cfg.tablesUnit !== undefined && cfg.tablesTotal === undefined) {
      cfg.tablesTotal = cfg.tablesUnit * (cfg.tablesQty || 0);
      delete cfg.tablesUnit;
    }
    if (cfg.chairsUnit !== undefined && cfg.chairsTotal === undefined) {
      cfg.chairsTotal = cfg.chairsUnit * (cfg.chairsQty || 0);
      delete cfg.chairsUnit;
    }
    if (cfg.tablesTotal === undefined) cfg.tablesTotal = 0;
    if (cfg.chairsTotal === undefined) cfg.chairsTotal = 0;

    // Migrar expositores: agregar adelanto y fechaLimitePago si no existen
    (bz.expositores || []).forEach((exp) => {
      if (exp.adelanto           === undefined) exp.adelanto           = 0;
      if (exp.fechaLimitePago    === undefined) exp.fechaLimitePago    = "";
      if (!exp.publicationStatus) exp.publicationStatus = "pendiente";
      if (exp.banned === undefined) exp.banned = false;
      if (exp.mesasCantidad === undefined) exp.mesasCantidad = 1;
      if (exp.mesasCantidadOtro === undefined) exp.mesasCantidadOtro = "";
      if (exp.areaEncargada === undefined) exp.areaEncargada = "";
    });
    (bz.minuteByMinute || []).forEach((row) => {
      if (row.area === undefined) row.area = "";
    });
    getActiveTables(bz).forEach((table) => {
      if (table.rotation === undefined) table.rotation = 0;
    });
    bz.invitados.forEach((inv) => {
      if (inv.expositorId === undefined) inv.expositorId = "";
      if (inv.asistio === undefined) inv.asistio = false;
    });
  });
  return parsed;
}

function saveState() {
  try {
    localStorage.setItem("EXPOSITORES_APP_STATE", JSON.stringify(AppState));
  } catch (err) {
    showToast("⚠️ Error al guardar datos", "error");
  }
}

function getActiveBazaar() {
  return AppState.bazaars[AppState.currentBazaarId] || null;
}

function getActiveFloor(bz = getActiveBazaar()) {
  if (!bz) return null;
  return bz.floors?.find((floor) => floor.id === bz.activeFloorId) || bz.floors?.[0] || null;
}

function getActiveTables(bz = getActiveBazaar()) {
  return getActiveFloor(bz)?.tables || [];
}

// ==========================================
// 3. UTILIDADES GENERALES
// ==========================================
function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(val) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(val) || 0);
}

function showToast(message, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = message;
  t.style.background = type === "error" ? "var(--color-danger)" : "var(--color-text)";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ==========================================
// 4. NAVEGACIÓN / TABS
// [EDITABLE: para agregar un tab nuevo, agrega su ID aquí y el botón .nav-item en index.html]
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));

  const section = document.getElementById(`sec-${tabId}`);
  if (section) section.classList.add("active");

  const navBtn = document.querySelector(`.nav-item[onclick="switchTab('${tabId}')"]`);
  if (navBtn) navBtn.classList.add("active");

  const titles = {
    expositores:  "Directorio de Expositores",
    categorias:   "Categorías de Productos",
    finanzas:     "Control de Pagos",
    costos:       "Costos del Evento",
    mapa:         "Plano Interactivo del Bazar",
    estadisticas: "Métricas y Gráficas",
    invitados:    "Lista de Invitados",
    "minuto-a-minuto": "Minuto a Minuto",
    bazares:      "Mis Bazares",
    plantillas:   "Expositores Guardados"
  };
  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = titles[tabId] || tabId;

  if (tabId === "estadisticas") updateCharts();
  if (tabId === "mapa")         { bazaarCanvas.render(); renderChecklist(); }
  if (tabId === "finanzas")     { renderFinanzasTable(); renderFinanzasStats(); }
  if (tabId === "costos")       renderCostosUI();
  if (tabId === "invitados")    renderInvitados();
  if (tabId === "minuto-a-minuto") renderMinuteByMinute();
  if (tabId === "bazares")      renderBazaresTabla();
  if (tabId === "plantillas")   renderPlantillas();
  renderFabMenu(tabId);
}

// [FIX] Antes faltaban "finanzas" y "plantillas": al no existir su llave,
// caían en el fallback de fabActions.expositores y el botón + mostraba
// siempre "Nuevo Expositor" sin importar la pantalla en la que estuvieras.
// Ahora cada pestaña tiene su propia entrada explícita (aunque esté vacía).
const fabActions = {
  expositores: [{ label: "👤 Nuevo Expositor", action: openModalExpositorForCurrentCategory }],
  categorias: [{ label: "🏷️ Nueva Categoría", action: openModalCategoria }],
  plantillas: [],
  finanzas: [],
  costos: [{ label: "💸 Agregar Gasto", action: addExtraCostRow }],
  mapa: [
    { label: "🪑 Nueva Mesa", action: addTableToCore },
    { label: "🏢 Nuevo Piso", action: addFloor }
  ],
  invitados: [{ label: "🎟️ Agregar Invitado", action: openModalInvitado }],
  "minuto-a-minuto": [{ label: "🕒 Agregar actividad", action: addMinuteRow }],
  estadisticas: [],
  bazares: [{ label: "🏪 Nuevo Bazar", action: createBazaar }]
};

function renderFabMenu(tabId = "expositores") {
  const menu = document.getElementById("fab-add-menu");
  const container = document.querySelector(".fab-container");
  if (!menu) return;
  // [FIX] Solo usa el fallback si el tab realmente no está registrado
  // (no cuando su lista de acciones está vacía a propósito).
  const actions = Object.prototype.hasOwnProperty.call(fabActions, tabId)
    ? fabActions[tabId]
    : fabActions.expositores;
  menu.innerHTML = actions.map((item, index) =>
    `<button class="fab-add-item" onclick="runFabAction('${tabId}', ${index})">${item.label}</button>`
  ).join("");
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  // [FIX] Si la pantalla actual no tiene ninguna acción de "agregar"
  // (ej. Métricas, Control de Pagos, Expositores Guardados), se oculta
  // el botón flotante por completo en vez de dejarlo sin efecto.
  if (container) container.style.display = actions.length ? "" : "none";
}

function toggleFabMenu() {
  const menu = document.getElementById("fab-add-menu");
  if (!menu) return;
  const isOpen = menu.classList.toggle("open");
  menu.setAttribute("aria-hidden", String(!isOpen));
}

function runFabAction(tabId, actionIndex) {
  const menu = document.getElementById("fab-add-menu");
  if (menu) menu.classList.remove("open");
  const action = fabActions[tabId]?.[actionIndex]?.action;
  if (typeof action === "function") action();
}

// ==========================================
// 5. MODO OSCURO Y MENÚ DE RESPALDO
// ==========================================
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const icon = document.getElementById("dark-icon");
  const label = document.getElementById("dark-label");
  const isDark = document.body.classList.contains("dark");
  if (icon) icon.textContent = isDark ? "☀️" : "🌙";
  if (label) label.textContent = isDark ? "Modo Claro" : "Modo Oscuro";
}

function toggleBackupMenu() {
  document.getElementById("backup-menu")?.classList.toggle("open");
}

// ==========================================
// 6. EXPORTAR / IMPORTAR DATOS
// ==========================================
function exportarJSON() {
  const data = JSON.stringify(AppState, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bazarix_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  showToast("✅ JSON descargado correctamente");
}

function exportarJSONCompleto() {
  const backup = {
    app: "BAZARIX",
    version: 3,
    exportedAt: new Date().toISOString(),
    data: AppState
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bazarix_respaldo_completo_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("✅ Respaldo completo descargado");
}

function exportarCSV() {
  const bz = getActiveBazaar();
  if (!bz) return;
  const headers = ["Nombre", "Negocio", "Categoría", "Teléfono", "Email",
                   "Ubicación", "Mesas Solicitadas", "Área Encargada", "Costo Total", "Adelanto", "Saldo", "Fecha Límite", "Estado", "Notas"];
  const catMap = {};
  AppState.categorias.forEach((c) => (catMap[c.id] = `${c.emoji} ${c.nombre}`));

  const rows = bz.expositores.map((e) => [
    e.nombre, e.negocio, catMap[e.categoria] || "",
    e.tel, e.email, e.ubicacion,
    e.mesasCantidad === "otro" ? e.mesasCantidadOtro : e.mesasCantidad || 1,
    e.areaEncargada || "",
    e.costo, e.adelanto || 0,
    (e.costo - (e.adelanto || 0)),
    e.fechaLimitePago || "",
    e.pagado ? "Pagado" : "Pendiente",
    e.notas
  ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`));

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `expositores_${bz.name}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast("✅ CSV descargado correctamente");
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      const importedState = parsed.data && ["BAZARIX", "BAZARICXS", "BARARIX-EXPOSITORES", "EXPOSITORES.COM"].includes(parsed.app) ? parsed.data : parsed;
      if (!importedState || typeof importedState !== "object" || !importedState.bazaars) {
        throw new Error("Estructura de respaldo inválida");
      }
      if (!confirm("La importación reemplazará los datos actuales. ¿Deseas continuar?")) return;
      AppState = migrateState(importedState);
      saveState();
      renderAll();
      showToast("✅ Datos importados correctamente");
    } catch {
      showToast("❌ Archivo JSON inválido", "error");
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 7. GESTIÓN DE BAZARES
// [EDITABLE: aquí vive toda la lógica de crear/cambiar/eliminar bazares]
// ==========================================
function renderBazaarSelector() {
  const sel = document.getElementById("bazaar-select-global");
  if (!sel) return;
  sel.innerHTML = Object.values(AppState.bazaars)
    .map((bz) => `<option value="${bz.id}" ${bz.id === AppState.currentBazaarId ? "selected" : ""}>${bz.name}</option>`)
    .join("");
}

function updateMapaBazaarLabel() {
  const el = document.getElementById("mapa-bazaar-name-display");
  if (el) el.textContent = getActiveBazaar()?.name || "—";
  const scaleInput = document.getElementById("map-pixels-per-meter");
  if (scaleInput) scaleInput.value = getPixelsPerMeter();
  renderFloorSelector();
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

function deleteMapElementFromModal() {
  const elementId = document.getElementById("edit-element-id").value;
  const floor = getActiveFloor();
  if (!floor || !confirm("¿Eliminar este elemento del plano?")) return;
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
  bazaarCanvas.render();
  renderChecklist();
  updateMapaBazaarLabel();
}

function addFloor() {
  const bz = getActiveBazaar();
  if (!bz) return;
  const name = prompt("Nombre del nuevo piso:", `Piso ${(bz.floors?.length || 0) + 1}`);
  if (!name?.trim()) return;
  const floor = createFloor(`${bz.id}-floor-${Date.now()}`, name.trim());
  if (!bz.floors) bz.floors = [];
  bz.floors.push(floor);
  bz.activeFloorId = floor.id;
  saveState();
  renderAll();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.render();
  showToast(`✅ ${floor.name} creado`);
}

function deleteCurrentFloor() {
  const bz = getActiveBazaar();
  if (!bz?.floors || bz.floors.length <= 1) {
    showToast("Debe existir al menos un piso", "error");
    return;
  }
  const floor = getActiveFloor(bz);
  if (!floor || !confirm(`¿Eliminar "${floor.name}" y sus mesas?`)) return;
  bz.floors = bz.floors.filter((item) => item.id !== floor.id);
  bz.activeFloorId = bz.floors[0].id;
  bazaarCanvas.selectedTableId = null;
  saveState();
  renderAll();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.render();
  showToast("🗑️ Piso eliminado");
}

function switchBazaar(bazaarId) {
  if (!AppState.bazaars[bazaarId]) return;
  AppState.currentBazaarId = bazaarId;
  bazaarCanvas.selectedTableId = null;
  saveState();
  renderAll();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.render();
}

function createBazaar() {
  const name = prompt("Nombre del nuevo bazar:", "Bazar " + (Object.keys(AppState.bazaars).length + 1));
  if (!name?.trim()) return;
  const id = "bazaar-" + Date.now();
  AppState.bazaars[id] = {
    id, name: name.trim(),
    bgImage: null, logoImage: null, mapConfig: defaultMapConfig(),
    expositores: [], tables: [],
    costsConfig: emptyCostsConfig(),
    invitados: [], customMetrics: emptyCustomMetrics(),
    minuteByMinute: emptyMinuteByMinute(),
    floors: [createFloor(`${id}-floor-1`, "Planta baja")], activeFloorId: `${id}-floor-1`
  };
  AppState.currentBazaarId = id;
  saveState();
  renderAll();
  showToast(`✅ Bazar "${name.trim()}" creado`);
}

// deleteBazaar: solo disponible desde la sección "Mis Bazares" (sec-bazares)
// [EDITABLE: cambia el mensaje de confirmación aquí]
function deleteBazaarById(bazaarId) {
  const bz = AppState.bazaars[bazaarId];
  if (!bz) return;
  if (!confirm(`¿Eliminar permanentemente el bazar "${bz.name}"? Esta acción no se puede deshacer.`)) return;
  delete AppState.bazaars[bazaarId];
  const remaining = Object.keys(AppState.bazaars);
  AppState.currentBazaarId = remaining[0] || null;
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
    const expCount = bz.expositores.length;
    const paidCount = bz.expositores.filter((e) => e.pagado).length;
    const invCount = (bz.invitados || []).length;
    const isActive = bz.id === AppState.currentBazaarId;
    const logoHtml = bz.logoImage
      ? `<img src="${bz.logoImage}" style="width:36px;height:36px;object-fit:cover;border-radius:8px;border:2px solid var(--color-border);">`
      : `<span style="font-size:1.4rem;">🎪</span>`;
    return `
      <tr style="${isActive ? "background:var(--color-accent-soft);" : ""}">
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
          <button class="btn-secondary btn-sm" onclick="switchBazaarAndGo('${bz.id}')">
            ${isActive ? "✏️ Editar" : "🔀 Ir al Bazar"}
          </button>
          <button class="btn-secondary btn-sm" onclick="openLogoUploadModal('${bz.id}')">🖼️ Logo</button>
          <button class="btn-secondary btn-sm" onclick="renameBazaar('${bz.id}')">✏️ Renombrar</button>
          <button class="btn-danger btn-sm" onclick="deleteBazaarById('${bz.id}')">🗑️ Eliminar</button>
        </td>
      </tr>`;
  }).join("");
}

function switchBazaarAndGo(id) {
  switchBazaar(id);
  switchTab("expositores");
}

function renameBazaar(id) {
  const bz = AppState.bazaars[id];
  if (!bz) return;
  const newName = prompt("Nuevo nombre del bazar:", bz.name);
  if (!newName?.trim()) return;
  bz.name = newName.trim();
  saveState();
  renderBazaarSelector();
  renderBazaresTabla();
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
  showToast("Imagen eliminada");
}

// ==========================================
// 8. RENDERIZADO PRINCIPAL
// ==========================================
function renderAll() {
  renderBazaarSelector();
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

const PUBLICATION_STATUSES = ["pendiente", "parcial", "lista", "publicada"];
const PUBLICATION_LABELS = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  lista: "Lista",
  publicada: "Publicada"
};

function publicationStatusLabel(status) {
  return PUBLICATION_LABELS[status] || PUBLICATION_LABELS.pendiente;
}

function cyclePublicationStatus(id) {
  const exp = getActiveBazaar()?.expositores.find((item) => item.id === id);
  if (!exp) return;
  const currentIndex = PUBLICATION_STATUSES.indexOf(exp.publicationStatus || "pendiente");
  exp.publicationStatus = PUBLICATION_STATUSES[(currentIndex + 1) % PUBLICATION_STATUSES.length];
  saveState();
  renderExpositores();
  showToast(`📣 ${exp.negocio}: ${publicationStatusLabel(exp.publicationStatus)}`);
}

function toggleExpositorBan(id) {
  const exp = getActiveBazaar()?.expositores.find((item) => item.id === id);
  if (!exp) return;
  const action = exp.banned ? "quitar el baneo a" : "banear a";
  if (!confirm(`¿Deseas ${action} "${exp.negocio}"?`)) return;
  exp.banned = !exp.banned;
  saveState();
  renderExpositores();
  showToast(exp.banned ? "🚫 Expositor baneado" : "✅ Baneo retirado");
}

function renderMinuteByMinute() {
  const container = document.getElementById("minute-by-minute-list");
  const bz = getActiveBazaar();
  if (!container || !bz) return;
  const rows = bz.minuteByMinute || (bz.minuteByMinute = []);
  if (!rows.length) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:24px;">Sin actividades programadas.</td></tr>`;
    return;
  }
  container.innerHTML = rows.map((row) => `
    <tr>
      <td><input class="form-input" type="time" value="${escapeHTML(row.time)}" onchange="updateMinuteRow('${row.id}','time',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(row.activity)}" onchange="updateMinuteRow('${row.id}','activity',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(row.area)}" placeholder="Ej. Montaje" onchange="updateMinuteRow('${row.id}','area',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(row.responsible)}" onchange="updateMinuteRow('${row.id}','responsible',this.value)"></td>
      <td><input class="form-input" value="${escapeHTML(row.notes)}" onchange="updateMinuteRow('${row.id}','notes',this.value)"></td>
      <td><button class="btn-danger btn-sm" onclick="deleteMinuteRow('${row.id}')">🗑️</button></td>
    </tr>`).join("");
}

function addMinuteRow() {
  const bz = getActiveBazaar();
  if (!bz) return;
  if (!bz.minuteByMinute) bz.minuteByMinute = [];
  bz.minuteByMinute.push({ id: `minute-${Date.now()}`, time: "", activity: "Nueva actividad", area: "", responsible: "", notes: "" });
  saveState();
  renderMinuteByMinute();
}

function updateMinuteRow(id, field, value) {
  const row = (getActiveBazaar()?.minuteByMinute || []).find((item) => item.id === id);
  if (!row) return;
  row[field] = value;
  saveState();
}

function deleteMinuteRow(id) {
  const bz = getActiveBazaar();
  if (!bz) return;
  bz.minuteByMinute = (bz.minuteByMinute || []).filter((row) => row.id !== id);
  saveState();
  renderMinuteByMinute();
}

function minuteRowsForExport() {
  return (getActiveBazaar()?.minuteByMinute || []).slice().sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function exportarMinutoAMinutoCSV() {
  const bz = getActiveBazaar();
  if (!bz) return;
  const rows = minuteRowsForExport();
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [["Hora", "Actividad", "Área encargada", "Responsable", "Notas"], ...rows.map((row) => [row.time, row.activity, row.area, row.responsible, row.notes])]
    .map((row) => row.map(quote).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `minuto_a_minuto_${bz.name.replace(/[^a-z0-9]+/gi, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("✅ Minuto a Minuto exportado a Excel");
}

function exportarMinutoAMinutoPDF() {
  const bz = getActiveBazaar();
  if (!bz || !window.html2pdf) {
    showToast("❌ Librería PDF no disponible", "error");
    return;
  }
  const rows = minuteRowsForExport();
  const issuedAt = new Date().toLocaleDateString("es-MX");
  const wrapper = document.createElement("div");
  wrapper.id = "minuto-a-minuto-pdf-wrapper";
  // [FIX-3] "opacity:0" hacía que html2canvas capturara los píxeles TAL
  // COMO SE VEN — y con opacidad 0 son transparentes, por eso el PDF salía
  // en blanco. Se usa el mismo método que ya funciona en el comprobante de
  // pago (generatePDFInvoice): display:none por defecto, y display:block
  // solo un instante antes de capturar. Sin position:fixed, sin opacity,
  // sin coordenadas negativas — nada que interfiera con la captura.
  wrapper.style.cssText = "display:none;box-sizing:border-box;width:700px;padding:30px;font-family:Arial,sans-serif;background:#fff;color:#333;";
  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d9488;padding-bottom:15px;margin-bottom:20px;">
      <div>
        <h1 style="color:#0d9488;margin:0;font-size:22px;">PROGRAMA DEL EVENTO</h1>
        <p style="margin:5px 0 0;color:#666;font-size:13px;">BAZARIX — Gestión de Eventos</p>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:bold;font-size:15px;color:#0d9488;">MINUTO A MINUTO</div>
        <div style="font-size:12px;color:#777;">Fecha: ${issuedAt}</div>
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;">
      <div style="font-weight:bold;color:#0d9488;margin-bottom:5px;">Evento</div>
      <div>${escapeHTML(bz.name)}</div>
      <div style="color:#64748b;margin-top:4px;">Actividades programadas: ${rows.length}</div>
    </div>
    <table style="width:100%;table-layout:fixed;font-size:12px;border-collapse:collapse;">
      <colgroup><col style="width:11%"><col style="width:28%"><col style="width:20%"><col style="width:18%"><col style="width:23%"></colgroup>
      <thead><tr>${["Hora", "Actividad", "Área encargada", "Responsable", "Notas"].map((label) => `<th style="text-align:left;background:#ccfbf1;color:#0f766e;padding:9px;border-bottom:2px solid #0d9488;">${label}</th>`).join("")}</tr></thead>
      <tbody>${rows.length ? rows.map((row, index) => `<tr style="${index % 2 ? "background:#f8fafc;" : ""}page-break-inside:avoid;">${[row.time, row.activity, row.area, row.responsible, row.notes].map((value) => `<td style="padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top;word-wrap:break-word;">${escapeHTML(value || "—")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="5" style="padding:18px;text-align:center;color:#64748b;">Sin actividades programadas.</td></tr>`}</tbody>
    </table>
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;text-align:center;">Documento generado por BAZARIX</div>`;
  document.body.appendChild(wrapper);
  wrapper.style.display = "block";
  window.html2pdf().set({
    margin: 10,
    filename: `minuto_a_minuto_${bz.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`,
    html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    // Evita que una fila de la tabla se corte entre dos páginas del PDF.
    pagebreak: { mode: ["css", "legacy"], avoid: ["tr"] }
  }).from(wrapper).save().then(() => wrapper.remove()).catch(() => {
    wrapper.remove();
    showToast("❌ No se pudo generar el PDF", "error");
  });
}

// ==========================================
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

  if (list.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🗂️</span>
        <h3>Sin expositores</h3>
        <p>No hay expositores que coincidan con los filtros en "${escapeHTML(bz.name)}".</p>
      </div>`;
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
          <button class="btn-secondary btn-sm" onclick="guardarComoPlantilla('${exp.id}')" title="Guardar expositor como plantilla">💾</button>
          <button class="${exp.banned ? "btn-secondary" : "btn-danger"} btn-sm" onclick="toggleExpositorBan('${exp.id}')">${exp.banned ? "✅ Quitar baneo" : "🚫 Banear"}</button>
          <button class="btn-danger btn-sm" onclick="deleteExpositor('${exp.id}')">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

// ==========================================
// 10. CATEGORÍAS
// ==========================================
function renderCategorias() {
  const container = document.getElementById("categorias-grid");
  if (!container) return;
  const bz = getActiveBazaar();
  container.innerHTML = AppState.categorias.map((cat) => {
    const totalInCat = bz.expositores.filter((e) => e.categoria === cat.id).length;
    return `
      <div class="expositor-card" style="border-left: 5px solid ${cat.color};">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div class="card-name">${cat.emoji} ${escapeHTML(cat.nombre)}</div>
          <span class="card-category" style="background:${cat.color}20; color:${cat.color};">${totalInCat} en "${escapeHTML(bz.name)}"</span>
        </div>
        <div class="card-actions" style="border-top:none;margin-top:14px;padding-top:0;">
          <button class="btn-secondary btn-sm" onclick="openModalCategoria('${cat.id}')">✏️ Editar</button>
          <button class="btn-danger btn-sm" onclick="deleteCategoria('${cat.id}')">🗑️ Eliminar</button>
        </div>
      </div>`;
  }).join("");
}

function renderCategoryChips() {
  const container = document.getElementById("category-chips-container");
  if (!container) return;
  container.innerHTML = AppState.categorias.map((cat) => `
    <button class="filter-chip" onclick="setFilterCategory('${cat.id}', this)">
      ${cat.emoji} ${escapeHTML(cat.nombre)}
    </button>`).join("");
}

// ==========================================
// 11. FINANZAS
// ==========================================
function renderFinanzasTable() {
  const tbody = document.getElementById("payments-table-body");
  if (!tbody) return;
  const bz = getActiveBazaar();
  if (bz.expositores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:24px;">Sin expositores en este bazar.</td></tr>`;
    return;
  }
  tbody.innerHTML = bz.expositores.map((exp) => {
    const adelanto = Number(exp.adelanto || 0);
    const saldo    = Number(exp.costo || 0) - adelanto;
    return `
      <tr>
        <td>
          <strong>${escapeHTML(exp.negocio)}</strong><br>
          <small style="color:var(--color-text-muted);">${escapeHTML(exp.nombre)}</small>
        </td>
        <td>${escapeHTML(exp.ubicacion)}</td>
        <td class="${exp.pagado ? "amount-paid" : "amount-unpaid"}">${formatCurrency(exp.costo)}</td>
        <td style="color:var(--color-paid);">${formatCurrency(adelanto)}</td>
        <td style="color:${saldo > 0 ? "var(--color-unpaid)" : "var(--color-paid)"};">${formatCurrency(saldo)}</td>
        <td>
          <span class="paid-badge ${exp.pagado ? "paid" : "unpaid"}">
            ${exp.pagado ? "✅ Pagado" : "⏳ Pendiente"}
          </span>
        </td>
        <td>
          <button class="btn-secondary btn-sm" onclick="togglePaymentStatus('${exp.id}')">
            ${exp.pagado ? "Pend." : "Pagado"}
          </button>
          <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄</button>
        </td>
      </tr>`;
  }).join("");
}

function renderFinanzasStats() {
  const bz = getActiveBazaar();
  let paidTotal = 0, pendingTotal = 0;
  bz.expositores.forEach((e) => {
    if (e.pagado) paidTotal   += Number(e.costo || 0);
    else          pendingTotal += Number(e.costo || 0);
  });
  const totalExps = bz.expositores.length;
  const pct = paidTotal + pendingTotal > 0 ? Math.round((paidTotal / (paidTotal + pendingTotal)) * 100) : 0;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("stat-total-paid",        formatCurrency(paidTotal));
  set("stat-total-pending",     formatCurrency(pendingTotal));
  set("stat-total-tables",      totalExps);
  set("stat-paid-percentage",   `${pct}%`);
}

// ==========================================
// 12. COSTOS DEL EVENTO
// Ahora usa Costo TOTAL en lugar de Costo Unitario como campo principal.
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
// 13. MODALES Y FORMULARIO DE EXPOSITOR
// ==========================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

function openModalExpositor(id = null, categoryId = null) {
  populateCategoriaSelect();
  const form = document.getElementById("form-expositor");
  form.reset();
  document.getElementById("exp-id").value           = "";
  document.getElementById("exp-foto-base64").value  = "";
  const box = document.getElementById("avatar-preview-box");
  if (box) box.innerHTML = "📷";

  if (id) {
    const exp = getActiveBazaar().expositores.find((e) => e.id === id);
    if (exp) {
      document.getElementById("modal-exp-title").textContent = "Editar Expositor";
      document.getElementById("exp-id").value           = exp.id;
      document.getElementById("exp-nombre").value        = exp.nombre;
      document.getElementById("exp-negocio").value       = exp.negocio;
      document.getElementById("exp-categoria").value     = exp.categoria;
      document.getElementById("exp-ubicacion").value     = exp.ubicacion;
      document.getElementById("exp-mesas-cantidad").value = exp.mesasCantidad || "1";
      document.getElementById("exp-mesas-otro").value = exp.mesasCantidadOtro || "";
      document.getElementById("exp-area-encargada").value = exp.areaEncargada || "";
      toggleOtherTableCount();
      document.getElementById("exp-tel").value           = exp.tel || "";
      document.getElementById("exp-email").value         = exp.email || "";
      document.getElementById("exp-costo").value         = exp.costo;
      document.getElementById("exp-adelanto").value      = exp.adelanto || 0;
      document.getElementById("exp-fecha-limite").value  = exp.fechaLimitePago || "";
      document.getElementById("exp-pagado").checked      = exp.pagado;
      document.getElementById("exp-notas").value         = exp.notas || "";
      document.getElementById("exp-foto-base64").value   = exp.foto || "";
      if (exp.foto && box) box.innerHTML = `<img src="${exp.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
  } else {
    document.getElementById("modal-exp-title").textContent = "Nuevo Expositor";
    if (categoryId && AppState.categorias.some((category) => category.id === categoryId)) {
      document.getElementById("exp-categoria").value = categoryId;
    }
  }
  openModal("modal-expositor");
}

function toggleOtherTableCount() {
  const select = document.getElementById("exp-mesas-cantidad");
  const input = document.getElementById("exp-mesas-otro");
  if (!select || !input) return;
  const custom = select.value === "otro";
  input.style.display = custom ? "block" : "none";
  input.required = custom;
}

function openModalExpositorForCurrentCategory() {
  const categoryId = AppState.filterCategory === "all" ? null : AppState.filterCategory;
  openModalExpositor(null, categoryId);
}

function populateCategoriaSelect() {
  const sel = document.getElementById("exp-categoria");
  if (!sel) return;
  sel.innerHTML = AppState.categorias.map((c) => `<option value="${c.id}">${c.emoji} ${escapeHTML(c.nombre)}</option>`).join("");
}

function handleFotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const b64 = evt.target.result;
    document.getElementById("exp-foto-base64").value = b64;
    const box = document.getElementById("avatar-preview-box");
    if (box) box.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  };
  reader.readAsDataURL(file);
}

function saveExpositorHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  const id = document.getElementById("exp-id").value;
  const existing = id ? bz.expositores.find((x) => x.id === id) : null;

  const expData = {
    id:             id || "exp-" + Date.now(),
    nombre:         document.getElementById("exp-nombre").value.trim(),
    negocio:        document.getElementById("exp-negocio").value.trim(),
    categoria:      document.getElementById("exp-categoria").value,
    ubicacion:      document.getElementById("exp-ubicacion").value.trim(),
    mesasCantidad:  document.getElementById("exp-mesas-cantidad").value,
    mesasCantidadOtro: document.getElementById("exp-mesas-otro").value.trim(),
    areaEncargada: document.getElementById("exp-area-encargada").value.trim(),
    tel:            document.getElementById("exp-tel").value.trim(),
    email:          document.getElementById("exp-email").value.trim(),
    costo:          Number(document.getElementById("exp-costo").value || 0),
    adelanto:       Number(document.getElementById("exp-adelanto").value || 0),
    fechaLimitePago: document.getElementById("exp-fecha-limite").value || "",
    pagado:         document.getElementById("exp-pagado").checked,
    notas:          document.getElementById("exp-notas").value.trim(),
    foto:           document.getElementById("exp-foto-base64").value,
    publicationStatus: existing?.publicationStatus || "pendiente",
    banned:         existing?.banned || false,
    checklist:      existing ? existing.checklist : defaultChecklistItems(),
  };

  if (id) {
    const idx = bz.expositores.findIndex((e) => e.id === id);
    if (idx !== -1) bz.expositores[idx] = expData;
  } else {
    bz.expositores.push(expData);
  }

  saveState();
  renderAll();
  closeModal("modal-expositor");
  showToast(id ? "✅ Expositor actualizado" : "✅ Expositor registrado");
}

function togglePaymentStatus(id) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === id);
  if (exp) {
    exp.pagado = !exp.pagado;
    saveState();
    renderAll();
    showToast(`${exp.negocio}: marcado como ${exp.pagado ? "pagado ✅" : "pendiente ⏳"}`);
  }
}

function deleteExpositor(id) {
  if (!confirm("¿Eliminar este expositor del bazar?")) return;
  const bz = getActiveBazaar();
  bz.expositores = bz.expositores.filter((e) => e.id !== id);
  saveState();
  renderAll();
  showToast("🗑️ Expositor eliminado");
}

// ==========================================
// 14. CATEGORÍAS — Modal
// ==========================================
function openModalCategoria(id = null) {
  document.getElementById("form-categoria").reset();
  document.getElementById("cat-id").value = "";
  if (id) {
    const cat = AppState.categorias.find((c) => c.id === id);
    if (cat) {
      document.getElementById("modal-cat-title").textContent = "Editar Categoría";
      document.getElementById("cat-id").value    = cat.id;
      document.getElementById("cat-emoji").value = cat.emoji;
      document.getElementById("cat-nombre").value = cat.nombre;
      document.getElementById("cat-color").value  = cat.color;
    }
  } else {
    document.getElementById("modal-cat-title").textContent = "Nueva Categoría";
  }
  openModal("modal-categoria");
}

function saveCategoriaHandler(e) {
  e.preventDefault();
  const id = document.getElementById("cat-id").value;
  const catData = {
    id:     id || "cat-" + Date.now(),
    emoji:  document.getElementById("cat-emoji").value.trim() || "📦",
    nombre: document.getElementById("cat-nombre").value.trim(),
    color:  document.getElementById("cat-color").value
  };
  if (id) {
    const idx = AppState.categorias.findIndex((c) => c.id === id);
    if (idx !== -1) AppState.categorias[idx] = catData;
  } else {
    AppState.categorias.push(catData);
  }
  saveState();
  renderAll();
  closeModal("modal-categoria");
  showToast(id ? "✅ Categoría actualizada" : "✅ Categoría creada");
}

function deleteCategoria(id) {
  if (!confirm("¿Eliminar esta categoría?")) return;
  AppState.categorias = AppState.categorias.filter((c) => c.id !== id);
  saveState();
  renderAll();
  showToast("🗑️ Categoría eliminada");
}

// ==========================================
// 15. PDF — Comprobante con adelanto y saldo
// ==========================================
function generatePDFInvoice(id) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === id);
  if (!exp) return;
  const template = document.getElementById("invoice-template");
  if (!template) return;

  const adelanto   = Number(exp.adelanto || 0);
  const saldo      = Number(exp.costo || 0) - adelanto;
  const pagoTotal  = exp.pagado && saldo <= 0;

  const set = (sid, html) => { const el = document.getElementById(sid); if (el) el.innerHTML = html; };

  set("pdf-invoice-id",    `FOLIO #${String(exp.id).slice(-4).toUpperCase()}`);
  set("pdf-invoice-date",  `Fecha: ${new Date().toLocaleDateString("es-MX")}`);
  set("pdf-exp-negocio",   `<strong>Marca / Negocio:</strong> ${escapeHTML(exp.negocio)}`);
  set("pdf-exp-nombre",    `<strong>Titular:</strong> ${escapeHTML(exp.nombre)}`);
  set("pdf-exp-contact",   `<strong>Contacto:</strong> ${escapeHTML(exp.tel || "")} | ${escapeHTML(exp.email || "")}`);
  set("pdf-exp-mesa",      `<strong>Ubicación:</strong> ${escapeHTML(exp.ubicacion)}`);
  set("pdf-exp-costo",     `<strong>Costo Total de Mesa:</strong> ${formatCurrency(exp.costo)}`);
  set("pdf-exp-adelanto",  `<strong>Adelanto Entregado:</strong> ${formatCurrency(adelanto)}`);
  set("pdf-exp-saldo",     `<strong>Saldo Restante:</strong> ${formatCurrency(saldo <= 0 ? 0 : saldo)}`);
  if (exp.fechaLimitePago) {
    set("pdf-exp-fecha-limite", `<strong>Fecha Límite de Pago:</strong> ${escapeHTML(exp.fechaLimitePago)}`);
  } else {
    const el = document.getElementById("pdf-exp-fecha-limite");
    if (el) el.innerHTML = "";
  }
  set("pdf-exp-status",
    exp.pagado
      ? `<strong>Estado:</strong> <span style="color:#10b981;font-weight:800;">✅ PAGO COMPLETO</span>`
      : adelanto > 0
        ? `<strong>Estado:</strong> <span style="color:#f59e0b;font-weight:800;">🕐 CON ADELANTO — SALDO PENDIENTE</span>`
        : `<strong>Estado:</strong> <span style="color:#ef4444;font-weight:800;">⏳ PENDIENTE DE PAGO</span>`
  );

  // Monto principal: si pagó todo = costo total; si no = saldo
  const montoEl = document.getElementById("pdf-exp-monto");
  if (montoEl) {
    montoEl.textContent = pagoTotal || exp.pagado ? formatCurrency(exp.costo) : formatCurrency(saldo > 0 ? saldo : exp.costo);
    montoEl.title = pagoTotal ? "Pago total" : "Saldo pendiente";
  }

  template.style.display = "block";
  const opt = {
    margin: 10,
    filename: `Comprobante_${exp.negocio.replace(/\s+/g, "_")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  if (window.html2pdf) {
    window.html2pdf().set(opt).from(template).save().then(() => { template.style.display = "none"; });
  } else {
    alert("Librería html2pdf no disponible.");
    template.style.display = "none";
  }
}

// ==========================================
// 16. CHECKLIST DEL EXPOSITOR (editar texto + eliminar + agregar)
// ==========================================
function openExpositorChecklist(expId) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === expId);
  if (!exp) return;
  if (!Array.isArray(exp.checklist)) exp.checklist = defaultChecklistItems();
  document.getElementById("checklist-exp-id").value = expId;
  const titleEl = document.getElementById("modal-checklist-title");
  if (titleEl) titleEl.textContent = `Checklist — ${exp.negocio}`;
  renderExpositorChecklist();
  openModal("modal-checklist");
}

function renderExpositorChecklist() {
  const expId = document.getElementById("checklist-exp-id").value;
  const exp   = getActiveBazaar().expositores.find((e) => e.id === expId);
  const container = document.getElementById("checklist-exp-container");
  if (!exp || !container) return;

  const done  = exp.checklist.filter((i) => i.done).length;
  const total = exp.checklist.length;
  const progressEl = document.getElementById("checklist-exp-progress");
  if (progressEl) progressEl.textContent = `${done} / ${total} completado`;

  if (total === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);">Sin pendientes. Agrega uno abajo.</p>`;
    return;
  }

  // Cada ítem: checkbox + campo de texto editable + botón eliminar
  container.innerHTML = exp.checklist.map((item) => `
    <div class="checklist-edit-row">
      <label class="switch" style="flex-shrink:0;">
        <input type="checkbox" ${item.done ? "checked" : ""} onchange="toggleExpositorChecklistItem('${expId}','${item.id}')">
        <span class="slider"></span>
      </label>
      <input type="text" class="form-input checklist-text-input"
             value="${escapeHTML(item.label)}"
             style="${item.done ? "text-decoration:line-through;color:var(--color-text-muted);" : ""}"
             onchange="editChecklistItemLabel('${expId}','${item.id}',this.value)">
      <button type="button" class="btn-danger btn-sm" onclick="removeExpositorChecklistItem('${expId}','${item.id}')">🗑️</button>
    </div>`).join("");
}

function toggleExpositorChecklistItem(expId, itemId) {
  const exp  = getActiveBazaar().expositores.find((e) => e.id === expId);
  const item = exp?.checklist.find((i) => i.id === itemId);
  if (!item) return;
  item.done = !item.done;
  saveState();
  renderExpositorChecklist();
  renderExpositores();
}

// [NUEVO] Editar el texto de un ítem del checklist
function editChecklistItemLabel(expId, itemId, newLabel) {
  const exp  = getActiveBazaar().expositores.find((e) => e.id === expId);
  const item = exp?.checklist.find((i) => i.id === itemId);
  if (!item) return;
  item.label = newLabel.trim() || item.label;
  saveState();
}

function addExpositorChecklistItem() {
  const expId = document.getElementById("checklist-exp-id").value;
  const input = document.getElementById("checklist-new-item");
  const label = input.value.trim();
  if (!label) return;
  const exp = getActiveBazaar().expositores.find((e) => e.id === expId);
  if (!exp) return;
  exp.checklist.push({ id: "chk-" + Date.now(), label, done: false });
  input.value = "";
  saveState();
  renderExpositorChecklist();
  renderExpositores();
}

function removeExpositorChecklistItem(expId, itemId) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === expId);
  if (!exp) return;
  exp.checklist = exp.checklist.filter((i) => i.id !== itemId);
  saveState();
  renderExpositorChecklist();
  renderExpositores();
}

// ==========================================
// 17. PLANTILLAS DE EXPOSITORES (guardar y reutilizar)
// ==========================================
function guardarComoPlantilla(expId) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === expId);
  if (!exp) return;

  // Evita duplicados por negocio+nombre
  const yaExiste = AppState.expositorPlantillas.some(
    (p) => p.negocio === exp.negocio && p.nombre === exp.nombre
  );
  if (yaExiste) {
    if (!confirm(`"${exp.negocio}" ya está guardado como plantilla. ¿Sobreescribir?`)) return;
    AppState.expositorPlantillas = AppState.expositorPlantillas.filter(
      (p) => !(p.negocio === exp.negocio && p.nombre === exp.nombre)
    );
  }

  AppState.expositorPlantillas.push({
    id:        "plt-" + Date.now(),
    nombre:    exp.nombre,
    negocio:   exp.negocio,
    categoria: exp.categoria,
    tel:       exp.tel,
    email:     exp.email,
    foto:      exp.foto,
    notas:     exp.notas
  });

  saveState();
  renderPlantillas();
  showToast(`💾 "${exp.negocio}" guardado como plantilla`);
}

function renderPlantillas() {
  const container = document.getElementById("plantillas-grid");
  if (!container) return;
  const list = AppState.expositorPlantillas;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">💾</span>
        <h3>Sin plantillas guardadas</h3>
        <p>Usa el botón 💾 en la tarjeta de un expositor para guardarlo aquí.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map((plt) => {
    const cat = AppState.categorias.find((c) => c.id === plt.categoria);
    const catName = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
    return `
      <div class="expositor-card" style="border-top-color:var(--color-accent2);">
        <div class="card-top">
          <div class="expositor-avatar" style="width:48px;height:48px;font-size:1.1rem;">
            ${plt.foto ? `<img src="${plt.foto}" alt="${escapeHTML(plt.negocio)}">` : escapeHTML((plt.negocio || "?").charAt(0))}
          </div>
          <div class="card-info">
            <div class="card-name">${escapeHTML(plt.negocio)}</div>
            <span class="card-category">${escapeHTML(catName)}</span>
            <div class="card-contact">${escapeHTML(plt.nombre)}</div>
          </div>
        </div>
        <div class="card-contact" style="margin-bottom:10px;">
          📞 ${escapeHTML(plt.tel || "—")} &nbsp;·&nbsp; ✉️ ${escapeHTML(plt.email || "—")}
        </div>
        <div class="card-actions">
          <button class="btn-primary btn-sm" onclick="usarPlantilla('${plt.id}')">➕ Usar en este Bazar</button>
          <button class="btn-danger btn-sm" onclick="eliminarPlantilla('${plt.id}')">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

function usarPlantilla(pltId) {
  const plt = AppState.expositorPlantillas.find((p) => p.id === pltId);
  if (!plt) return;

  populateCategoriaSelect();
  const form = document.getElementById("form-expositor");
  form.reset();
  document.getElementById("exp-id").value           = "";
  document.getElementById("exp-foto-base64").value  = plt.foto || "";
  document.getElementById("modal-exp-title").textContent = "Nuevo Expositor (desde plantilla)";
  document.getElementById("exp-nombre").value        = plt.nombre;
  document.getElementById("exp-negocio").value       = plt.negocio;
  document.getElementById("exp-categoria").value     = plt.categoria;
  document.getElementById("exp-tel").value           = plt.tel || "";
  document.getElementById("exp-email").value         = plt.email || "";
  document.getElementById("exp-notas").value         = plt.notas || "";

  const box = document.getElementById("avatar-preview-box");
  if (box && plt.foto) box.innerHTML = `<img src="${plt.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  else if (box) box.innerHTML = "📷";

  openModal("modal-expositor");
}

function eliminarPlantilla(pltId) {
  if (!confirm("¿Eliminar esta plantilla?")) return;
  AppState.expositorPlantillas = AppState.expositorPlantillas.filter((p) => p.id !== pltId);
  saveState();
  renderPlantillas();
  showToast("🗑️ Plantilla eliminada");
}

// ==========================================
// 18. LISTA DE INVITADOS DEL BAZAR
// [EDITABLE: agrega campos a cada invitado en saveInvitadoHandler]
// ==========================================
function renderInvitados() {
  const container = document.getElementById("invitados-list");
  if (!container) return;
  const bz = getActiveBazaar();
  const invitados = bz.invitados || [];

  const totalConf  = invitados.filter((i) => i.confirmado).length;
  const totalAsist = invitados.filter((i) => i.asistio).length;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("inv-stat-total",     invitados.length);
  set("inv-stat-confirmados", totalConf);
  set("inv-stat-asistieron",  totalAsist);

  if (invitados.length === 0) {
    container.innerHTML = `
      <tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:24px;">
        Sin invitados registrados. Agrega uno con "+ Agregar Invitado".
      </td></tr>`;
    return;
  }

  container.innerHTML = invitados.map((inv) => {
    const exp = bz.expositores.find((item) => item.id === inv.expositorId);
    return `
    <tr>
      <td><strong>${escapeHTML(inv.nombre)}</strong></td>
      <td>${exp ? escapeHTML(exp.negocio) : "<span style=\"color:var(--color-text-muted)\">Sin vincular</span>"}</td>
      <td>${escapeHTML(inv.notas || "—")}</td>
      <td>
        <label class="switch" style="transform:scale(0.85);display:inline-block;">
          <input type="checkbox" ${inv.confirmado ? "checked" : ""} onchange="toggleInvConfirmado('${inv.id}')">
          <span class="slider"></span>
        </label>
        <span style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-left:6px;">
          ${inv.confirmado ? "Confirmó" : "Sin confirmar"}
        </span>
      </td>
      <td>
        <label class="switch" style="transform:scale(0.85);display:inline-block;">
          <input type="checkbox" ${inv.asistio ? "checked" : ""} onchange="toggleInvAsistio('${inv.id}')">
          <span class="slider"></span>
        </label>
        <span style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-left:6px;">
          ${inv.asistio ? "Asistió ✅" : "Sin asistir"}
        </span>
      </td>
      <td>
        <button class="btn-danger btn-sm" onclick="deleteInvitado('${inv.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join("");
}

function toggleInvConfirmado(id) {
  const bz  = getActiveBazaar();
  const inv = (bz.invitados || []).find((i) => i.id === id);
  if (inv) { inv.confirmado = !inv.confirmado; saveState(); renderInvitados(); }
}

function toggleInvAsistio(id) {
  const bz  = getActiveBazaar();
  const inv = (bz.invitados || []).find((i) => i.id === id);
  if (inv) { inv.asistio = !inv.asistio; saveState(); renderInvitados(); }
}

function deleteInvitado(id) {
  const bz = getActiveBazaar();
  bz.invitados = (bz.invitados || []).filter((i) => i.id !== id);
  saveState();
  renderInvitados();
  showToast("🗑️ Invitado eliminado");
}

function openModalInvitado() {
  document.getElementById("form-invitado").reset();
  const select = document.getElementById("inv-expositor");
  if (select) {
    select.innerHTML = `<option value="">-- Sin vincular --</option>` +
      getActiveBazaar().expositores.map((exp) => `<option value="${exp.id}">${escapeHTML(exp.negocio)} (${escapeHTML(exp.nombre)})</option>`).join("");
  }
  openModal("modal-invitado");
}

function saveInvitadoHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  if (!bz.invitados) bz.invitados = [];
  bz.invitados.push({
    id:          "inv-" + Date.now(),
    nombre:      document.getElementById("inv-nombre").value.trim(),
    expositorId: document.getElementById("inv-expositor").value,
    notas:       document.getElementById("inv-notas").value.trim(),
    confirmado:  document.getElementById("inv-confirmado").checked,
    asistio:     false
  });
  saveState();
  renderInvitados();
  closeModal("modal-invitado");
  showToast("✅ Invitado agregado");
}

// ==========================================
// 19. CHECKLIST DE ASISTENCIA DEL MAPA
// ==========================================
function renderChecklist() {
  const container = document.getElementById("checklist-container");
  if (!container) return;
  const bz = getActiveBazaar();
  const tables = getActiveTables(bz);
  if (tables.length === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);">No hay mesas en este bazar.</p>`;
    return;
  }
  container.innerHTML = tables.map((t) => {
    const exp = bz.expositores.find((e) => e.id === t.exhibitorId);
    return `
      <div class="card-meta-item" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="font-size:var(--fs-xs);">${escapeHTML(t.name)}</strong><br>
          <span style="color:var(--color-text-muted);font-size:var(--fs-xs);">${exp ? escapeHTML(exp.negocio) : "<em>Mesa Libre</em>"}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <label class="switch" style="transform:scale(0.8);">
            <input type="checkbox" ${t.attended ? "checked" : ""} onchange="toggleAttendance('${t.id}')">
            <span class="slider"></span>
          </label>
          <button class="btn-danger" style="padding:2px 8px;font-size:10px;border-radius:6px;" onclick="deleteTable('${t.id}')" title="Eliminar mesa">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

function toggleAttendance(tableId) {
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === tableId);
  if (t) {
    t.attended = !t.attended;
    saveState();
    bazaarCanvas.render();
    renderChecklist();
    showToast(`${t.name}: ${t.attended ? "asistencia confirmada ✅" : "pendiente ⏳"}`);
  }
}

// ==========================================
// 20. CANVAS — BazaarCanvasManager
// ==========================================
class BazaarCanvasManager {
  constructor() {
    this.canvas = null; this.ctx = null;
    this.scale = 1.0; this.panX = 0; this.panY = 0;
    this.isPanning = false; this.isDraggingTable = false; this.isDraggingElement = false;
    this.draggedTable = null; this.draggedElement = null;
    this.selectedTableId = null; this.selectedElementId = null;
    this.startMouseX = 0; this.startMouseY = 0;
    this.dragOffsetX = 0; this.dragOffsetY = 0;
    this.bgImageObj = null;
  }

  init() {
    this.canvas = document.getElementById("bazaar-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.attachEvents();
    this.loadBgImage();
    this.render();
  }

  getCurrentBazaar() { return getActiveBazaar(); }

  loadBgImage() {
    const bz = this.getCurrentBazaar();
    const floor = getActiveFloor(bz);
    if (floor?.bgImage) {
      this.bgImageObj = new Image();
      this.bgImageObj.src = floor.bgImage;
      this.bgImageObj.onload = () => this.render();
    } else {
      this.bgImageObj = null;
    }
  }

  attachEvents() {
    this.canvas.addEventListener("mousedown",  (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove",  (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup",    () => this.handleMouseUp());
    this.canvas.addEventListener("mouseleave", () => this.handleMouseUp());
    this.canvas.addEventListener("dblclick",   (e) => this.handleDoubleClick(e));
  }

  getCanvasCoords(e) {
    const rect  = this.canvas.getBoundingClientRect();
    const rawX  = e.clientX - rect.left;
    const rawY  = e.clientY - rect.top;
    const worldX = (rawX - this.panX) / this.scale;
    const worldY = (rawY - this.panY) / this.scale;
    return { rawX, rawY, worldX, worldY };
  }

  handleMouseDown(e) {
    const { rawX, rawY, worldX, worldY } = this.getCanvasCoords(e);
    const bz = this.getCurrentBazaar();
    const tables = getActiveTables(bz);
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (this.isPointInsideTable(t, worldX, worldY)) {
        this.selectedTableId = t.id;
        this.selectedElementId = null;
        this.isDraggingTable = true; this.draggedTable = t;
        this.dragOffsetX = worldX - t.x; this.dragOffsetY = worldY - t.y;
        this.canvas.style.cursor = "grabbing"; return;
      }
    }
    const elements = getActiveFloor(bz)?.elements || [];
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (this.isPointInsideElement(element, worldX, worldY)) {
        this.selectedTableId = null;
        this.selectedElementId = element.id;
        this.isDraggingElement = true;
        this.draggedElement = element;
        this.dragOffsetX = worldX - element.x;
        this.dragOffsetY = worldY - element.y;
        this.canvas.style.cursor = "grabbing";
        this.render();
        return;
      }
    }
    this.isPanning = true;
    this.selectedTableId = null;
    this.selectedElementId = null;
    this.startMouseX = rawX - this.panX;
    this.startMouseY = rawY - this.panY;
    this.canvas.style.cursor = "grabbing";
  }

  handleMouseMove(e) {
    const { rawX, rawY, worldX, worldY } = this.getCanvasCoords(e);
    if (this.isDraggingTable && this.draggedTable) {
      this.draggedTable.x = Math.round(worldX - this.dragOffsetX);
      this.draggedTable.y = Math.round(worldY - this.dragOffsetY);
      this.render();
    } else if (this.isDraggingElement && this.draggedElement) {
      this.draggedElement.x = Math.round(worldX - this.dragOffsetX);
      this.draggedElement.y = Math.round(worldY - this.dragOffsetY);
      this.render();
    } else if (this.isPanning) {
      this.panX = rawX - this.startMouseX;
      this.panY = rawY - this.startMouseY;
      this.render();
    }
  }

  handleMouseUp() {
    if (this.isDraggingTable || this.isDraggingElement) saveState();
    this.isDraggingTable = false; this.draggedTable = null;
    this.isDraggingElement = false; this.draggedElement = null;
    this.isPanning = false;
    if (this.canvas) this.canvas.style.cursor = "grab";
  }

  handleDoubleClick(e) {
    const { worldX, worldY } = this.getCanvasCoords(e);
    const bz = this.getCurrentBazaar();
    const tables = getActiveTables(bz);
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (this.isPointInsideTable(t, worldX, worldY)) {
        openModalTableEdit(t.id); return;
      }
    }
    const elements = getActiveFloor(bz)?.elements || [];
    for (let i = elements.length - 1; i >= 0; i--) {
      if (this.isPointInsideElement(elements[i], worldX, worldY)) {
        openModalMapElementEdit(elements[i].id);
        return;
      }
    }
  }

  isPointInsideTable(table, x, y) {
    const angle = -(Number(table.rotation) || 0) * Math.PI / 180;
    const centerX = table.x + table.w / 2;
    const centerY = table.y + table.h / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle) + centerX;
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle) + centerY;
    return localX >= table.x && localX <= table.x + table.w && localY >= table.y && localY <= table.y + table.h;
  }

  isPointInsideElement(element, x, y) {
    const width = Math.max(5, Number(element.width) || 30);
    const height = Math.max(5, Number(element.height) || 30);
    return x >= element.x - width / 2 && x <= element.x + width / 2 &&
           y >= element.y - height / 2 && y <= element.y + height / 2;
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width, h = this.canvas.height;
    this.ctx.save();
    this.ctx.clearRect(0, 0, w, h);
    if (!this.bgImageObj) this.drawGrid(w, h);
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);
    if (this.bgImageObj) {
      const floor = getActiveFloor(this.getCurrentBazaar());
      const opacity = Number(floor?.backgroundOpacity ?? 1);
      this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      const bgScale = Number(floor?.bgScale || 1);
      this.ctx.drawImage(this.bgImageObj, Number(floor?.bgX || 0), Number(floor?.bgY || 0),
        this.bgImageObj.naturalWidth * bgScale, this.bgImageObj.naturalHeight * bgScale);
      this.ctx.globalAlpha = 1;
    }
    const bz = this.getCurrentBazaar();
    this.drawMapElements(getActiveFloor(bz)?.elements || []);
    getActiveTables(bz).forEach((t) => this.drawTable(t));
    this.ctx.restore();
  }

  drawGrid(width, height) {
    this.ctx.strokeStyle = "rgba(13,148,136,0.15)";
    this.ctx.lineWidth = 1;
    const gs = 20;
    for (let x = 0; x <= width; x += gs) {
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, height); this.ctx.stroke();
    }
    for (let y = 0; y <= height; y += gs) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(width, y); this.ctx.stroke();
    }
  }

  drawMapElements(elements) {
    const styles = {
      electricidad: { color: "#f59e0b", icon: "⚡" },
      pilar: { color: "#64748b", icon: "▣" },
      entrada: { color: "#0d9488", icon: "↗" },
      otro: { color: "#8b5cf6", icon: "•" }
    };
    elements.forEach((element) => {
      const style = styles[element.type] || styles.otro;
      this.ctx.save();
      this.ctx.fillStyle = style.color;
      this.ctx.globalAlpha = 0.9;
      this.ctx.beginPath();
      const width = Math.max(5, Number(element.width) || 30);
      const height = Math.max(5, Number(element.height) || 30);
      this.ctx.roundRect(element.x - width / 2, element.y - height / 2, width, height, 5);
      this.ctx.fill();
      if (element.id === this.selectedElementId) {
        this.ctx.strokeStyle = "#1e293b";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(element.x - width / 2 - 4, element.y - height / 2 - 4, width + 8, height + 8, 7);
        this.ctx.stroke();
      }
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 15px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(element.emoji || style.icon, element.x, element.y);
      this.ctx.fillStyle = "#1e293b";
      this.ctx.font = "bold 10px sans-serif";
      this.ctx.fillText(element.label, element.x, element.y + 26);
      this.ctx.restore();
    });
  }

  drawTable(t) {
    const bz = this.getCurrentBazaar();
    const exhibitor = bz.expositores.find((e) => e.id === t.exhibitorId);
    let fillColor = "#ffffff", borderColor = "#94a3b8";
    if (t.attended)       { fillColor = "#dcfce7"; borderColor = "#22c55e"; }
    else if (exhibitor) {
      const cat = AppState.categorias.find((c) => c.id === exhibitor.categoria);
      if (cat) { fillColor = cat.color + "25"; borderColor = cat.color; }
      else     { fillColor = "#e0f2fe"; borderColor = "#0284c7"; }
    }
    this.ctx.save();
    this.ctx.translate(t.x + t.w / 2, t.y + t.h / 2);
    this.ctx.rotate((Number(t.rotation) || 0) * Math.PI / 180);
    this.ctx.translate(-(t.x + t.w / 2), -(t.y + t.h / 2));
    this.ctx.shadowColor = "rgba(0,0,0,0.08)"; this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 2; this.ctx.shadowOffsetY = 2;
    this.ctx.fillStyle = fillColor; this.ctx.strokeStyle = borderColor; this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.roundRect(t.x, t.y, t.w, t.h, 6);
    this.ctx.fill(); this.ctx.stroke();
    this.ctx.shadowColor = "transparent";
    this.ctx.fillStyle = "#1e293b"; this.ctx.font = "bold 11px sans-serif";
    this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
    this.ctx.fillText(t.name || "Mesa", t.x + t.w / 2, t.y + (exhibitor ? t.h / 3 : t.h / 2));
    if (exhibitor) {
      this.ctx.fillStyle = "#475569"; this.ctx.font = "9px sans-serif";
      const txt = exhibitor.negocio.length > 11 ? exhibitor.negocio.slice(0, 9) + ".." : exhibitor.negocio;
      this.ctx.fillText(txt, t.x + t.w / 2, t.y + (t.h * 2) / 3);
    }
    this.ctx.restore();
  }
}

const bazaarCanvas = new BazaarCanvasManager();

// ==========================================
// 21. FUNCIONES DEL CANVAS (helpers globales)
// ==========================================
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

// [NUEVO] Reset COMPLETO: borra todas las mesas Y la imagen de fondo
function resetBazaarCanvas() {
  if (!confirm("¿Eliminar todas las mesas e imagen de fondo del plano? Esta acción no se puede deshacer.")) return;
  const bz = getActiveBazaar();
  const floor = getActiveFloor(bz);
  if (!floor) return;
  floor.tables = [];
  floor.bgImage = null;
  floor.elements = [];
  floor.bgScale = 1;
  floor.bgX = 0;
  floor.bgY = 0;
  bazaarCanvas.bgImageObj = null;
  bazaarCanvas.scale = 1.0;
  bazaarCanvas.panX  = 0;
  bazaarCanvas.panY  = 0;
  saveState();
  bazaarCanvas.render();
  renderChecklist();
  showToast("🗑️ Plano limpiado: sin mesas ni imagen de fondo");
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

function openModalTableEdit(tableId) {
  const bz = getActiveBazaar();
  const t  = getActiveTables(bz).find((item) => item.id === tableId);
  if (!t) return;
  document.getElementById("edit-table-id").value    = t.id;
  document.getElementById("edit-table-name").value  = t.name;
  const pixelsPerCentimeter = getPixelsPerMeter() / 100;
  document.getElementById("edit-table-width-cm").value = Math.round(t.w / pixelsPerCentimeter);
  document.getElementById("edit-table-height-cm").value = Math.round(t.h / pixelsPerCentimeter);
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
// 22. GRÁFICAS (Chart.js)
// [EDITABLE: agrega más gráficas aquí siguiendo el mismo patrón]
// ==========================================
let chartCategoriesInstance   = null;
let chartPaymentsInstance     = null;
let chartCustomInstance       = null;
let chartAttendanceInstance   = null;
let chartConfirmationInstance = null;

function updateCharts() {
  if (typeof Chart === "undefined") return;
  const bz = getActiveBazaar();

  const ctxCat = document.getElementById("chart-categorias");
  if (ctxCat) {
    const labels = AppState.categorias.map((c) => `${c.emoji} ${c.nombre}`);
    const data   = AppState.categorias.map((c) => bz.expositores.filter((e) => e.categoria === c.id).length);
    const colors = AppState.categorias.map((c) => c.color);
    if (chartCategoriesInstance) chartCategoriesInstance.destroy();
    chartCategoriesInstance = new Chart(ctxCat, {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  const ctxPay = document.getElementById("chart-pagos");
  if (ctxPay) {
    let paid = 0, pending = 0;
    bz.expositores.forEach((e) => {
      if (e.pagado) paid    += Number(e.costo || 0);
      else          pending += Number(e.costo || 0);
    });
    if (chartPaymentsInstance) chartPaymentsInstance.destroy();
    chartPaymentsInstance = new Chart(ctxPay, {
      type: "pie",
      data: { labels: ["Recaudado", "Pendiente"], datasets: [{ data: [paid, pending], backgroundColor: ["#10b981", "#f59e0b"] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  // [NUEVO] Porcentaje de asistentes (invitados que asistieron vs no)
  const ctxAsist = document.getElementById("chart-asistencia");
  if (ctxAsist) {
    const invitados  = bz.invitados || [];
    const total      = invitados.length;
    const asistieron = invitados.filter((i) => i.asistio).length;
    const noAsist    = total - asistieron;
    const pct        = total ? Math.round((asistieron / total) * 100) : 0;
    const titleEl = document.getElementById("chart-asistencia-title");
    if (titleEl) titleEl.textContent = `Porcentaje de Asistencia (${pct}%)`;
    if (chartAttendanceInstance) chartAttendanceInstance.destroy();
    chartAttendanceInstance = new Chart(ctxAsist, {
      type: "doughnut",
      data: {
        labels: ["Asistieron", "No asistieron"],
        datasets: [{ data: total ? [asistieron, noAsist] : [0, 1], backgroundColor: ["#0d9488", "#e2e8f0"] }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${total ? Math.round((ctx.raw / total) * 100) : 0}%)` } }
        }
      }
    });
  }

  // [NUEVO] Porcentaje de confirmación de invitados
  const ctxConf = document.getElementById("chart-confirmacion");
  if (ctxConf) {
    const invitados  = bz.invitados || [];
    const total       = invitados.length;
    const confirmados = invitados.filter((i) => i.confirmado).length;
    const sinConfirmar = total - confirmados;
    const pct = total ? Math.round((confirmados / total) * 100) : 0;
    const titleEl = document.getElementById("chart-confirmacion-title");
    if (titleEl) titleEl.textContent = `Confirmación de Invitados (${pct}%)`;
    if (chartConfirmationInstance) chartConfirmationInstance.destroy();
    chartConfirmationInstance = new Chart(ctxConf, {
      type: "doughnut",
      data: {
        labels: ["Confirmados", "Sin confirmar"],
        datasets: [{ data: total ? [confirmados, sinConfirmar] : [0, 1], backgroundColor: ["#f59e0b", "#e2e8f0"] }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${total ? Math.round((ctx.raw / total) * 100) : 0}%)` } }
        }
      }
    });
  }

}

// ==========================================
// 23. EXPOSICIÓN GLOBAL DE FUNCIONES (window.*) + INIT
// [EDITABLE: si agregas una función llamada desde onclick en HTML, expórtala aquí]
// ==========================================
window.switchTab                     = switchTab;
window.toggleDarkMode                = toggleDarkMode;
window.toggleBackupMenu              = toggleBackupMenu;
window.exportarJSON                  = exportarJSON;
window.exportarJSONCompleto           = exportarJSONCompleto;
window.exportarCSV                   = exportarCSV;
window.handleImportJSON              = handleImportJSON;
window.handleSearch                  = handleSearch;
window.setFilterCategory             = setFilterCategory;
window.setFilterStatus               = setFilterStatus;
window.openModalExpositor            = openModalExpositor;
window.openModalExpositorForCurrentCategory = openModalExpositorForCurrentCategory;
window.closeModal                    = closeModal;
window.handleFotoUpload              = handleFotoUpload;
window.saveExpositorHandler          = saveExpositorHandler;
window.togglePaymentStatus           = togglePaymentStatus;
window.deleteExpositor               = deleteExpositor;
window.openModalCategoria            = openModalCategoria;
window.saveCategoriaHandler          = saveCategoriaHandler;
window.deleteCategoria               = deleteCategoria;
window.generatePDFInvoice            = generatePDFInvoice;
window.updateEventCostsUI            = updateEventCostsUI;
window.addExtraCostRow               = addExtraCostRow;
window.updateExtraCost               = updateExtraCost;
window.removeExtraCostRow            = removeExtraCostRow;
window.switchBazaar                  = switchBazaar;
window.switchFloor                   = switchFloor;
window.addFloor                      = addFloor;
window.deleteCurrentFloor            = deleteCurrentFloor;
window.createBazaar                  = createBazaar;
window.deleteBazaarById              = deleteBazaarById;
window.switchBazaarAndGo             = switchBazaarAndGo;
window.renameBazaar                  = renameBazaar;
window.renderBazaresTabla            = renderBazaresTabla;
window.openLogoUploadModal           = openLogoUploadModal;
window.handleLogoUpload              = handleLogoUpload;
window.saveLogoHandler               = saveLogoHandler;
window.removeLogoHandler             = removeLogoHandler;
window.zoomBazaar                    = zoomBazaar;
window.resetBazaarZoom               = resetBazaarZoom;
window.resetBazaarCanvas             = resetBazaarCanvas;
window.updateMapScale                = updateMapScale;
window.handleFloorPlanUpload         = handleFloorPlanUpload;
window.addTableToCore                = addTableToCore;
window.deleteTable                   = deleteTable;
window.saveTableEdit                 = saveTableEdit;
window.rotateEditingTable             = rotateEditingTable;
window.rotateSelectedTable             = rotateSelectedTable;
window.updateFloorPlanOpacity          = updateFloorPlanOpacity;
window.updateFloorPlanScale            = updateFloorPlanScale;
window.moveFloorPlan                   = moveFloorPlan;
window.addMapElement                   = addMapElement;
window.updateNewElementEmoji            = updateNewElementEmoji;
window.saveNewMapElement                = saveNewMapElement;
window.openModalMapElementEdit         = openModalMapElementEdit;
window.saveMapElementEdit              = saveMapElementEdit;
window.deleteMapElementFromModal       = deleteMapElementFromModal;
window.toggleOtherTableCount           = toggleOtherTableCount;
window.toggleAttendance              = toggleAttendance;
window.openExpositorChecklist        = openExpositorChecklist;
window.toggleExpositorChecklistItem  = toggleExpositorChecklistItem;
window.editChecklistItemLabel        = editChecklistItemLabel;
window.addExpositorChecklistItem     = addExpositorChecklistItem;
window.removeExpositorChecklistItem  = removeExpositorChecklistItem;
window.guardarComoPlantilla          = guardarComoPlantilla;
window.renderPlantillas              = renderPlantillas;
window.usarPlantilla                 = usarPlantilla;
window.eliminarPlantilla             = eliminarPlantilla;
window.openModalInvitado             = openModalInvitado;
window.saveInvitadoHandler           = saveInvitadoHandler;
window.toggleInvConfirmado           = toggleInvConfirmado;
window.toggleInvAsistio              = toggleInvAsistio;
window.deleteInvitado                = deleteInvitado;
window.cyclePublicationStatus          = cyclePublicationStatus;
window.toggleExpositorBan              = toggleExpositorBan;
window.addMinuteRow                    = addMinuteRow;
window.updateMinuteRow                 = updateMinuteRow;
window.deleteMinuteRow                 = deleteMinuteRow;
window.exportarMinutoAMinutoCSV        = exportarMinutoAMinutoCSV;
window.exportarMinutoAMinutoPDF        = exportarMinutoAMinutoPDF;
window.updateCharts                   = updateCharts;

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderFabMenu("expositores");
  bazaarCanvas.init();

  // Cierra modales al hacer clic en el fondo oscuro
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Cierra el menú de respaldo al hacer clic fuera de él
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("backup-menu");
    if (!menu) return;
    if (!menu.contains(e.target) && !e.target.closest('[onclick="toggleBackupMenu()"]')) {
      menu.classList.remove("open");
    }
  });

  // [NUEVO] Cierra el menú del botón flotante (FAB) al hacer clic fuera de él
  document.addEventListener("click", (e) => {
    const fabMenu = document.getElementById("fab-add-menu");
    if (!fabMenu) return;
    if (!fabMenu.contains(e.target) && !e.target.closest(".fab")) {
      fabMenu.classList.remove("open");
      fabMenu.setAttribute("aria-hidden", "true");
    }
  });

  // Hamburguesa en móvil
  document.querySelector("#btn-toggle-sidebar")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("open");
  });
});