/**
 * EXPOSITORES.COM — state.js
 * Estado global, persistencia y getters
 * Dependencias: ninguna (módulo raíz)
 */

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
  return { id, name, tables, bgImage, backgroundOpacity, orientation: "landscape", bgScale: 1, bgScaleX: 1, bgScaleY: 1, bgRotation: 0, bgX: 0, bgY: 0, elements: [] };
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
      if (!["landscape", "portrait"].includes(floor.orientation)) floor.orientation = "landscape";
      if (floor.bgImage === undefined) floor.bgImage = null;
      if (!Number.isFinite(Number(floor.backgroundOpacity))) floor.backgroundOpacity = 1;
      floor.backgroundOpacity = Math.max(0, Math.min(1, Number(floor.backgroundOpacity)));
      if (!Number.isFinite(Number(floor.bgScale)) || floor.bgScale <= 0) floor.bgScale = 1;
      if (!Number.isFinite(Number(floor.bgScaleX)) || floor.bgScaleX <= 0) floor.bgScaleX = floor.bgScale;
      if (!Number.isFinite(Number(floor.bgScaleY)) || floor.bgScaleY <= 0) floor.bgScaleY = floor.bgScale;
      if (!Number.isFinite(Number(floor.bgRotation))) floor.bgRotation = 0;
      floor.bgRotation = ((Number(floor.bgRotation) % 360) + 360) % 360;
      if (!Number.isFinite(Number(floor.bgX))) floor.bgX = 0;
      if (!Number.isFinite(Number(floor.bgY))) floor.bgY = 0;
      if (!Array.isArray(floor.elements)) floor.elements = [];
      if (!Array.isArray(floor.zones)) floor.zones = [];
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
