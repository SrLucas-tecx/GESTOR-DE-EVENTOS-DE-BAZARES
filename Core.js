/**
 * EXPOSITORES.COM — Core Engine & Management System
 * Versión Unificada, Modular y Segura (Local Storage / Canvas / Chart.js)
 *
 * ──────────────────────────────────────────────────────────────────────
 * CAMBIOS EN ESTA VERSIÓN (léelo antes de editar):
 * 1. MULTI-BAZAR REAL: antes "expositores" era una sola lista global.
 *    Ahora cada bazar (AppState.bazaars[id]) tiene su PROPIA lista de
 *    expositores, sus mesas y su configuración de costos. Solo las
 *    "categorías" siguen siendo un catálogo compartido entre bazares.
 *    Usa siempre getActiveBazaar() para leer/escribir datos del bazar
 *    que el usuario tiene seleccionado — nunca "AppState.expositores".
 * 2. CHECKLIST POR EXPOSITOR: cada expositor tiene un arreglo
 *    "checklist" con pendientes (contrato, pago, mesa, material...).
 *    Se edita desde el botón "☑️ Checklist" en su tarjeta.
 * 3. Se corrigieron nombres de clases CSS y variables (--color-*) para
 *    que coincidan EXACTAMENTE con Styles.css (antes se generaba HTML
 *    con clases como .card/.badge/.avatar-sm y variables como
 *    --text-muted/--border-color/--font-heading que no existen en la
 *    hoja de estilos real, por eso se veía "roto").
 * 4. Bugs corregidos: modo oscuro (clase "dark", no "dark-mode"),
 *    apertura/cierre de modales y menú de respaldo (clase "open", no
 *    "show"), exportarCSV usaba "URL.ObjectURL" (no existe; es
 *    "URL.createObjectURL"), referencias colgantes al borrar un
 *    expositor o una categoría.
 * ──────────────────────────────────────────────────────────────────────
 */

// ==========================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN (AppState)
// [EDITABLE: agrega aquí nuevos campos por bazar o por expositor]
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

// Configuración de costos "en blanco" para un bazar nuevo.
// [EDITABLE: cambia estos valores por defecto para nuevos bazares]
function emptyCostsConfig() {
  return {
    tablesEnabled: false,
    tablesQty: 0,
    tablesUnit: 0,
    chairsEnabled: false,
    chairsQty: 0,
    chairsUnit: 0,
    extraCosts: []
  };
}

const DEFAULT_STATE = {
  // Catálogo de categorías: se comparte entre TODOS los bazares.
  categorias: [
    { id: "cat-1", nombre: "Artesanías", emoji: "🎨", color: "#0d9488" },
    { id: "cat-2", nombre: "Gastronomía", emoji: "🥐", color: "#e11d48" },
    { id: "cat-3", nombre: "Moda y Textil", emoji: "👗", color: "#8b5cf6" },
    { id: "cat-4", nombre: "Hogar y Salud", emoji: "🌿", color: "#10b981" }
  ],

  // Cada bazar es independiente: expositores, mesas y costos propios.
  bazaars: {
    "bazaar-1": {
      id: "bazaar-1",
      name: "Bazar Primavera",
      bgImage: null,
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
          pagado: true,
          notas: "Cerca de toma de corriente",
          foto: "",
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
          pagado: false,
          notas: "Requiere espacio para hielera",
          foto: "",
          checklist: defaultChecklistItems()
        }
      ],
      tables: [
        { id: "t1", name: "Mesa A-01", x: 80, y: 80, w: 90, h: 50, exhibitorId: "exp-1", attended: true },
        { id: "t2", name: "Mesa B-02", x: 220, y: 80, w: 90, h: 50, exhibitorId: "exp-2", attended: false },
        { id: "t3", name: "Mesa C-03", x: 360, y: 80, w: 90, h: 50, exhibitorId: "", attended: false }
      ],
      costsConfig: {
        tablesEnabled: true,
        tablesQty: 10,
        tablesUnit: 100,
        chairsEnabled: true,
        chairsQty: 20,
        chairsUnit: 25,
        extraCosts: [
          { id: "c1", name: "Renta de Recinto", cost: 2500 },
          { id: "c2", name: "Permisos y Licencias", cost: 800 }
        ]
      }
    },
    "bazaar-2": {
      id: "bazaar-2",
      name: "Bazar Nocturno",
      bgImage: null,
      expositores: [],
      tables: [
        { id: "t201", name: "Mesa N-01", x: 100, y: 100, w: 90, h: 50, exhibitorId: "", attended: false }
      ],
      costsConfig: emptyCostsConfig()
    },
    "bazaar-3": {
      id: "bazaar-3",
      name: "Bazar Artesanal",
      bgImage: null,
      expositores: [],
      tables: [
        { id: "t301", name: "Mesa ART-1", x: 120, y: 120, w: 90, h: 50, exhibitorId: "", attended: false }
      ],
      costsConfig: emptyCostsConfig()
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

function loadState() {
  try {
    const saved = localStorage.getItem("EXPOSITORES_APP_STATE");
    if (saved) {
      return migrateState(JSON.parse(saved));
    }
  } catch (e) {
    console.error("Error al cargar localStorage:", e);
  }
  return cloneDefaultState();
}

/**
 * Adapta datos guardados (incluyendo versiones anteriores donde
 * "expositores" vivía en la raíz del estado, no dentro de cada bazar)
 * al modelo actual. Así ningún respaldo/backup previo se pierde.
 */
function migrateState(parsed) {
  const state = { ...cloneDefaultState(), ...parsed };

  if (!state.bazaars || Object.keys(state.bazaars).length === 0) {
    state.bazaars = cloneDefaultState().bazaars;
  }

  // Asegura estructura completa en cada bazar existente.
  Object.values(state.bazaars).forEach((bz) => {
    if (!Array.isArray(bz.expositores)) bz.expositores = [];
    if (!Array.isArray(bz.tables)) bz.tables = [];
    if (!bz.costsConfig) bz.costsConfig = emptyCostsConfig();
    bz.expositores.forEach((exp) => {
      if (!Array.isArray(exp.checklist)) exp.checklist = defaultChecklistItems();
    });
  });

  // Migración de versión antigua: expositores globales -> bazar activo.
  const legacyExpositores = Array.isArray(parsed.expositores) ? parsed.expositores : null;
  if (legacyExpositores && legacyExpositores.length > 0) {
    const targetId = state.bazaars[state.currentBazaarId] ? state.currentBazaarId : Object.keys(state.bazaars)[0];
    const target = state.bazaars[targetId];
    legacyExpositores.forEach((exp) => {
      if (!exp.checklist) exp.checklist = defaultChecklistItems();
      if (!target.expositores.find((e) => e.id === exp.id)) {
        target.expositores.push(exp);
      }
    });
  }
  delete state.expositores;

  if (!state.bazaars[state.currentBazaarId]) {
    state.currentBazaarId = Object.keys(state.bazaars)[0];
  }

  return state;
}

function saveState() {
  try {
    localStorage.setItem("EXPOSITORES_APP_STATE", JSON.stringify(AppState));
  } catch (e) {
    console.error("Error al guardar en localStorage:", e);
  }
}

// Fuente única de verdad para "¿qué bazar estoy viendo?".
// Úsala en vez de tocar AppState.bazaars[...] directamente.
function getActiveBazaar() {
  if (!AppState.bazaars[AppState.currentBazaarId]) {
    AppState.currentBazaarId = Object.keys(AppState.bazaars)[0];
  }
  return AppState.bazaars[AppState.currentBazaarId];
}

// ==========================================
// 2. UTILIDADES DE SEGURIDAD Y FORMATO
// ==========================================
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(val) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val || 0);
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  // Styles.css solo define #toast y #toast.show; "type" queda disponible
  // como gancho para quien quiera agregar estilos por tipo (éxito/error).
  toast.className = `show ${type}`;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.className = "";
  }, 3000);
}

// ==========================================
// 3. NAVEGACIÓN Y TABS
// ==========================================
function switchTab(tabId) {
  const sections = document.querySelectorAll(".page-section");
  sections.forEach((sec) => sec.classList.remove("active"));

  const targetSec = document.getElementById(`sec-${tabId}`);
  if (targetSec) targetSec.classList.add("active");

  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick")?.includes(`'${tabId}'`)) {
      btn.classList.add("active");
    }
  });

  const pageTitle = document.getElementById("page-title");
  const titles = {
    expositores: "Directorio de Expositores",
    categorias: "Categorías de Productos",
    finanzas: "Control Financiero de Pagos",
    costos: "Estructura de Costos del Evento",
    mapa: "Plano Interactivo y Asistencia",
    estadisticas: "Métricas y Análisis Visual"
  };
  if (pageTitle) pageTitle.textContent = titles[tabId] || "Gestión de Bazares";

  if (tabId === "estadisticas") updateCharts();
  if (tabId === "mapa") {
    bazaarCanvas.render();
    updateMapaBazaarLabel();
  }
  if (tabId === "costos") renderCostosUI();

  // En móvil, cerrar el menú lateral tras elegir una sección.
  document.querySelector(".sidebar")?.classList.remove("open");
}

// ==========================================
// 4. MODO OSCURO Y COPIAS DE SEGURIDAD
// ==========================================
function toggleDarkMode() {
  // BUG CORREGIDO: antes se alternaba la clase "dark-mode", pero
  // Styles.css define sus overrides bajo "body.dark".
  document.body.classList.toggle("dark");
  const darkIcon = document.getElementById("dark-icon");
  if (darkIcon) {
    darkIcon.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  }
}

function toggleBackupMenu() {
  // BUG CORREGIDO: Styles.css define ".backup-menu.open", no ".show".
  const menu = document.getElementById("backup-menu");
  if (menu) menu.classList.toggle("open");
}

function exportarJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `Backup_Expositores_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Respaldo JSON descargado correctamente");
}

function exportarCSV() {
  let csv = "\uFEFF"; // BOM UTF-8 para Excel
  csv += "Bazar,ID,Nombre,Negocio,Categoria,Ubicacion,Telefono,Email,Costo,Pagado,Notas\n";

  // Recorre TODOS los bazares, no solo el activo, para un respaldo completo.
  Object.values(AppState.bazaars).forEach((bz) => {
    bz.expositores.forEach((exp) => {
      const cat = AppState.categorias.find((c) => c.id === exp.categoria)?.nombre || "";
      const cleanNotas = (exp.notas || "").replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " ");
      const line = [
        `"${bz.name.replace(/"/g, '""')}"`,
        `"${exp.id}"`,
        `"${exp.nombre.replace(/"/g, '""')}"`,
        `"${exp.negocio.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        `"${exp.ubicacion.replace(/"/g, '""')}"`,
        `"${exp.tel || ""}"`,
        `"${exp.email || ""}"`,
        exp.costo || 0,
        exp.pagado ? "PAGADO" : "PENDIENTE",
        `"${cleanNotas}"`
      ].join(",");
      csv += line + "\n";
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  // BUG CORREGIDO: antes decía "URL.ObjectURL" (no existe en el DOM API).
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Expositores_Reporte_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Reporte CSV exportado");
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const importedData = JSON.parse(evt.target.result);
      if (importedData.bazaars && importedData.categorias) {
        AppState = migrateState(importedData);
        saveState();
        renderAll();
        bazaarCanvas.loadBgImage();
        bazaarCanvas.render();
        showToast("Datos importados con éxito");
      } else {
        alert("El archivo JSON no tiene la estructura adecuada.");
      }
    } catch (err) {
      alert("Error al procesar el archivo JSON.");
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 5. GESTIÓN DE BAZARES (NUEVO)
// [EDITABLE: aquí vive la lógica de crear/cambiar/eliminar bazares]
// ==========================================
function renderBazaarSelector() {
  const sel = document.getElementById("bazaar-select-global");
  if (!sel) return;

  const bazaars = Object.values(AppState.bazaars);
  sel.innerHTML = bazaars
    .map(
      (b) =>
        `<option value="${b.id}" ${b.id === AppState.currentBazaarId ? "selected" : ""}>🎪 ${escapeHTML(b.name)} (${b.expositores.length} exp.)</option>`
    )
    .join("");
}

function updateMapaBazaarLabel() {
  const label = document.getElementById("mapa-bazaar-name-display");
  if (label) label.textContent = getActiveBazaar().name;
}

function switchBazaar(bazaarId) {
  if (!AppState.bazaars[bazaarId]) return;
  AppState.currentBazaarId = bazaarId;
  saveState();
  renderAll();
}

function createBazaar() {
  const name = prompt("Nombre del nuevo bazar:", "Nuevo Bazar");
  if (!name || !name.trim()) return;

  const id = "bazaar-" + Date.now();
  AppState.bazaars[id] = {
    id,
    name: name.trim(),
    bgImage: null,
    expositores: [],
    tables: [],
    costsConfig: emptyCostsConfig()
  };
  AppState.currentBazaarId = id;
  saveState();
  renderAll();
  showToast(`Bazar "${name.trim()}" creado`);
}

function deleteBazaar() {
  const ids = Object.keys(AppState.bazaars);
  // Regla de negocio pedida: la página NUNCA se puede quedar sin bazares.
  if (ids.length <= 1) {
    showToast("Debe existir al menos un bazar. Crea otro antes de eliminar este.", "error");
    return;
  }

  const bz = getActiveBazaar();
  const confirmMsg = `¿Eliminar el bazar "${bz.name}" junto con todos sus expositores, mesas y costos? Esta acción no se puede deshacer.`;
  if (!confirm(confirmMsg)) return;

  delete AppState.bazaars[bz.id];
  AppState.currentBazaarId = Object.keys(AppState.bazaars)[0];
  saveState();
  renderAll();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.render();
  showToast("Bazar eliminado");
}

// ==========================================
// 6. RENDERS PRINCIPALES DE VISTA
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
  if (bazaarCanvas) {
    bazaarCanvas.loadBgImage();
    bazaarCanvas.render();
  }
  updateCharts();
}

function handleSearch(val) {
  AppState.searchQuery = val.toLowerCase().trim();
  renderExpositores();
}

function setFilterCategory(catId, btnEl) {
  AppState.filterCategory = catId;
  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach((c) => c.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderExpositores();
}

function setFilterStatus(status) {
  AppState.filterStatus = status;
  renderExpositores();
}

function renderExpositores() {
  const container = document.getElementById("expositores-grid");
  if (!container) return;
  const bz = getActiveBazaar();

  let list = bz.expositores.filter((exp) => {
    const q = AppState.searchQuery;
    const matchQuery =
      !q ||
      exp.nombre.toLowerCase().includes(q) ||
      exp.negocio.toLowerCase().includes(q) ||
      exp.ubicacion.toLowerCase().includes(q);

    const matchCat = AppState.filterCategory === "all" || exp.categoria === AppState.filterCategory;

    let matchStatus = true;
    if (AppState.filterStatus === "paid") matchStatus = exp.pagado === true;
    if (AppState.filterStatus === "unpaid") matchStatus = exp.pagado === false;

    return matchQuery && matchCat && matchStatus;
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🗂️</span>
        <h3>Sin expositores</h3>
        <p>No hay expositores que coincidan con los filtros en "${escapeHTML(bz.name)}". Prueba otro filtro o agrega uno nuevo.</p>
      </div>`;
    return;
  }

  // Estructura de tarjeta alineada 1:1 con las clases reales de Styles.css:
  // .expositor-card > .card-top (.avatar-wrap + .card-info) > .paid-badge
  // > .card-meta (.card-meta-item) > .card-actions (.btn-pay-toggle...)
  container.innerHTML = list
    .map((exp) => {
      const cat = AppState.categorias.find((c) => c.id === exp.categoria);
      const catName = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
      const checklist = exp.checklist || [];
      const doneCount = checklist.filter((i) => i.done).length;

      return `
      <div class="expositor-card ${exp.pagado ? "paid-card" : "unpaid-card"}">
        <div class="card-top">
          <div class="avatar-wrap">
            <div class="expositor-avatar">
              ${
                exp.foto
                  ? `<img src="${exp.foto}" alt="${escapeHTML(exp.nombre)}">`
                  : escapeHTML((exp.negocio || "?").charAt(0).toUpperCase())
              }
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

        <div class="card-meta">
          <div class="card-meta-item">
            <div class="card-meta-label">Ubicación</div>
            <div class="card-meta-value">${escapeHTML(exp.ubicacion)}</div>
          </div>
          <div class="card-meta-item">
            <div class="card-meta-label">Costo Mesa</div>
            <div class="card-meta-value">${formatCurrency(exp.costo)}</div>
          </div>
        </div>

        <div class="card-contact" style="margin-bottom: 10px;">
          📞 ${escapeHTML(exp.tel || "N/A")} &nbsp;·&nbsp; ✉️ ${escapeHTML(exp.email || "N/A")}
          ${exp.notas ? `<br>📝 <em>${escapeHTML(exp.notas)}</em>` : ""}
        </div>

        <div class="card-actions">
          <button class="btn-pay-toggle ${exp.pagado ? "mark-unpaid" : "mark-paid"}" onclick="togglePaymentStatus('${exp.id}')">
            ${exp.pagado ? "Marcar Pendiente" : "Marcar Pagado"}
          </button>
          <button class="btn-secondary btn-sm" onclick="openExpositorChecklist('${exp.id}')">☑️ Checklist (${doneCount}/${checklist.length})</button>
          <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄 Recibo</button>
          <button class="btn-danger btn-sm" onclick="deleteExpositor('${exp.id}')">🗑️</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderCategorias() {
  const container = document.getElementById("categorias-grid");
  if (!container) return;
  const bz = getActiveBazaar();

  container.innerHTML = AppState.categorias
    .map((cat) => {
      const totalInCat = bz.expositores.filter((e) => e.categoria === cat.id).length;
      return `
      <div class="expositor-card" style="border-left: 5px solid ${cat.color};">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div class="card-name">${cat.emoji} ${escapeHTML(cat.nombre)}</div>
          <span class="card-category" style="background:${cat.color}20; color:${cat.color};">${totalInCat} en "${escapeHTML(bz.name)}"</span>
        </div>
        <div class="card-actions" style="border-top: none; justify-content: flex-end; margin-top: 14px; padding-top: 0;">
          <button class="btn-secondary btn-sm" onclick="openModalCategoria('${cat.id}')">✏️ Editar</button>
          <button class="btn-danger btn-sm" onclick="deleteCategoria('${cat.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderCategoryChips() {
  const container = document.getElementById("category-chips-container");
  if (!container) return;

  container.innerHTML = AppState.categorias
    .map(
      (cat) => `
    <button class="filter-chip" onclick="setFilterCategory('${cat.id}', this)">
      ${cat.emoji} ${escapeHTML(cat.nombre)}
    </button>
  `
    )
    .join("");
}

function renderFinanzasTable() {
  const tbody = document.getElementById("payments-table-body");
  if (!tbody) return;
  const bz = getActiveBazaar();

  tbody.innerHTML = bz.expositores
    .map(
      (exp) => `
    <tr>
      <td>
        <strong>${escapeHTML(exp.negocio)}</strong><br>
        <small style="color: var(--color-text-muted);">${escapeHTML(exp.nombre)}</small>
      </td>
      <td>${escapeHTML(exp.ubicacion)}</td>
      <td class="${exp.pagado ? "amount-paid" : "amount-unpaid"}">${formatCurrency(exp.costo)}</td>
      <td>
        <span class="paid-badge ${exp.pagado ? "paid" : "unpaid"}">
          ${exp.pagado ? "✅ Pagado" : "⏳ Pendiente"}
        </span>
      </td>
      <td>
        <button class="btn-secondary btn-sm" onclick="togglePaymentStatus('${exp.id}')">
          ${exp.pagado ? "Marcar Pendiente" : "Marcar Pagado"}
        </button>
        <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄 PDF</button>
      </td>
    </tr>
  `
    )
    .join("");
}

function renderFinanzasStats() {
  const bz = getActiveBazaar();
  let paidTotal = 0;
  let pendingTotal = 0;

  bz.expositores.forEach((e) => {
    if (e.pagado) paidTotal += Number(e.costo || 0);
    else pendingTotal += Number(e.costo || 0);
  });

  const totalExps = bz.expositores.length;
  const pct = paidTotal + pendingTotal > 0 ? Math.round((paidTotal / (paidTotal + pendingTotal)) * 100) : 0;

  const elPaid = document.getElementById("stat-total-paid");
  const elPending = document.getElementById("stat-total-pending");
  const elTables = document.getElementById("stat-total-tables");
  const elPct = document.getElementById("stat-paid-percentage");

  if (elPaid) elPaid.textContent = formatCurrency(paidTotal);
  if (elPending) elPending.textContent = formatCurrency(pendingTotal);
  if (elTables) elTables.textContent = totalExps;
  if (elPct) elPct.textContent = `${pct}%`;
}

// Sección "Costos del Evento": ahora usa .chart-card / .card-meta-item
// (los mismos bloques limpios de "Control de Pagos") en vez de una
// clase ".card" que no existía en la hoja de estilos.
function renderCostosUI() {
  const bz = getActiveBazaar();
  const cfg = bz.costsConfig;

  const tToggle = document.getElementById("cost-toggle-tables");
  const tQty = document.getElementById("cost-qty-tables");
  const tUnit = document.getElementById("cost-unit-tables");

  const cToggle = document.getElementById("cost-toggle-chairs");
  const cQty = document.getElementById("cost-qty-chairs");
  const cUnit = document.getElementById("cost-unit-chairs");

  if (tToggle) tToggle.checked = cfg.tablesEnabled;
  if (tQty) tQty.value = cfg.tablesQty;
  if (tUnit) tUnit.value = cfg.tablesUnit;

  if (cToggle) cToggle.checked = cfg.chairsEnabled;
  if (cQty) cQty.value = cfg.chairsQty;
  if (cUnit) cUnit.value = cfg.chairsUnit;

  const subTables = cfg.tablesEnabled ? cfg.tablesQty * cfg.tablesUnit : 0;
  const subChairs = cfg.chairsEnabled ? cfg.chairsQty * cfg.chairsUnit : 0;

  const elSubT = document.getElementById("subtotal-tables");
  const elSubC = document.getElementById("subtotal-chairs");

  if (elSubT) elSubT.textContent = formatCurrency(subTables);
  if (elSubC) elSubC.textContent = formatCurrency(subChairs);

  const extraContainer = document.getElementById("extra-costs-list");
  if (extraContainer) {
    if (cfg.extraCosts.length === 0) {
      extraContainer.innerHTML = `<p style="font-size:var(--fs-xs); color:var(--color-text-muted);">Aún no hay gastos adicionales registrados para este bazar.</p>`;
    } else {
      extraContainer.innerHTML = cfg.extraCosts
        .map(
          (c) => `
        <div class="card-meta-item" style="display:flex; gap:10px; align-items:center;">
          <input type="text" class="form-input" style="flex:1;" value="${escapeHTML(c.name)}" onchange="updateExtraCost('${c.id}', 'name', this.value)">
          <input type="number" class="form-input" style="width:110px;" value="${c.cost}" onchange="updateExtraCost('${c.id}', 'cost', this.value)">
          <button class="btn-danger btn-sm" onclick="removeExtraCostRow('${c.id}')">🗑️</button>
        </div>
      `
        )
        .join("");
    }
  }

  const totalIncome = bz.expositores.reduce((sum, e) => sum + Number(e.costo || 0), 0);
  const totalExtraExpenses = cfg.extraCosts.reduce((sum, c) => sum + Number(c.cost || 0), 0);
  const totalExpenses = subTables + subChairs + totalExtraExpenses;
  const netBalance = totalIncome - totalExpenses;

  const elIncome = document.getElementById("cost-stat-income");
  const elExpenses = document.getElementById("cost-stat-expenses");
  const elBalance = document.getElementById("cost-stat-balance");

  if (elIncome) elIncome.textContent = formatCurrency(totalIncome);
  if (elExpenses) elExpenses.textContent = formatCurrency(totalExpenses);
  if (elBalance) elBalance.textContent = formatCurrency(netBalance);
}

function updateEventCostsUI() {
  const cfg = getActiveBazaar().costsConfig;

  cfg.tablesEnabled = document.getElementById("cost-toggle-tables")?.checked || false;
  cfg.tablesQty = Number(document.getElementById("cost-qty-tables")?.value || 0);
  cfg.tablesUnit = Number(document.getElementById("cost-unit-tables")?.value || 0);

  cfg.chairsEnabled = document.getElementById("cost-toggle-chairs")?.checked || false;
  cfg.chairsQty = Number(document.getElementById("cost-qty-chairs")?.value || 0);
  cfg.chairsUnit = Number(document.getElementById("cost-unit-chairs")?.value || 0);

  saveState();
  renderCostosUI();
}

function addExtraCostRow() {
  getActiveBazaar().costsConfig.extraCosts.push({
    id: "cost-" + Date.now(),
    name: "Nuevo Gasto",
    cost: 100
  });
  saveState();
  renderCostosUI();
}

function updateExtraCost(id, field, value) {
  const item = getActiveBazaar().costsConfig.extraCosts.find((c) => c.id === id);
  if (item) {
    if (field === "cost") item.cost = Number(value || 0);
    if (field === "name") item.name = value;
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
// 7. MODALES Y MANEJO DE FORMULARIO
// ==========================================
function openModal(id) {
  // BUG CORREGIDO: Styles.css define ".modal-overlay.open", no ".show".
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

function openModalExpositor(id = null) {
  populateCategoriaSelect();
  const title = document.getElementById("modal-exp-title");
  const form = document.getElementById("form-expositor");
  form.reset();

  document.getElementById("exp-id").value = "";
  document.getElementById("exp-foto-base64").value = "";
  const avatarPreview = document.getElementById("avatar-preview-box");
  if (avatarPreview) avatarPreview.innerHTML = "📷";

  if (id) {
    const exp = getActiveBazaar().expositores.find((e) => e.id === id);
    if (exp) {
      if (title) title.textContent = "Editar Expositor";
      document.getElementById("exp-id").value = exp.id;
      document.getElementById("exp-nombre").value = exp.nombre;
      document.getElementById("exp-negocio").value = exp.negocio;
      document.getElementById("exp-categoria").value = exp.categoria;
      document.getElementById("exp-ubicacion").value = exp.ubicacion;
      document.getElementById("exp-tel").value = exp.tel || "";
      document.getElementById("exp-email").value = exp.email || "";
      document.getElementById("exp-costo").value = exp.costo;
      document.getElementById("exp-pagado").checked = exp.pagado;
      document.getElementById("exp-notas").value = exp.notas || "";
      document.getElementById("exp-foto-base64").value = exp.foto || "";

      if (exp.foto && avatarPreview) {
        avatarPreview.innerHTML = `<img src="${exp.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }
    }
  } else {
    if (title) title.textContent = "Nuevo Expositor";
  }
  openModal("modal-expositor");
}

function populateCategoriaSelect() {
  const sel = document.getElementById("exp-categoria");
  if (!sel) return;
  sel.innerHTML = AppState.categorias
    .map((c) => `<option value="${c.id}">${c.emoji} ${escapeHTML(c.nombre)}</option>`)
    .join("");
}

function handleFotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const base64 = evt.target.result;
    document.getElementById("exp-foto-base64").value = base64;
    const box = document.getElementById("avatar-preview-box");
    if (box) box.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  };
  reader.readAsDataURL(file);
}

function saveExpositorHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  const id = document.getElementById("exp-id").value;
  const existing = id ? bz.expositores.find((x) => x.id === id) : null;

  const expData = {
    id: id || "exp-" + Date.now(),
    nombre: document.getElementById("exp-nombre").value.trim(),
    negocio: document.getElementById("exp-negocio").value.trim(),
    categoria: document.getElementById("exp-categoria").value,
    ubicacion: document.getElementById("exp-ubicacion").value.trim(),
    tel: document.getElementById("exp-tel").value.trim(),
    email: document.getElementById("exp-email").value.trim(),
    costo: Number(document.getElementById("exp-costo").value || 0),
    pagado: document.getElementById("exp-pagado").checked,
    notas: document.getElementById("exp-notas").value.trim(),
    foto: document.getElementById("exp-foto-base64").value,
    // Conserva el checklist existente al editar; si es nuevo, usa el default.
    checklist: existing ? existing.checklist : defaultChecklistItems()
  };

  if (id) {
    const idx = bz.expositores.findIndex((e) => e.id === id);
    if (idx !== -1) bz.expositores[idx] = expData;
  } else {
    bz.expositores.push(expData);
  }

  saveState();
  closeModal("modal-expositor");
  renderAll();
  showToast(id ? "Expositor actualizado" : "Expositor creado con éxito");
}

function togglePaymentStatus(id) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === id);
  if (exp) {
    exp.pagado = !exp.pagado;
    saveState();
    renderAll();
    showToast(`Estado de pago actualizado para ${exp.negocio}`);
  }
}

function deleteExpositor(id) {
  if (!confirm("¿Estás seguro de eliminar este expositor?")) return;
  const bz = getActiveBazaar();
  bz.expositores = bz.expositores.filter((e) => e.id !== id);
  // BUG CORREGIDO: si el expositor tenía una mesa asignada, la mesa
  // quedaba con un exhibitorId "fantasma". Ahora se libera la mesa.
  bz.tables.forEach((t) => {
    if (t.exhibitorId === id) t.exhibitorId = "";
  });
  saveState();
  renderAll();
  showToast("Expositor eliminado");
}

function openModalCategoria(id = null) {
  const title = document.getElementById("modal-cat-title");
  const form = document.getElementById("form-categoria");
  form.reset();
  document.getElementById("cat-id").value = "";

  if (id) {
    const cat = AppState.categorias.find((c) => c.id === id);
    if (cat) {
      if (title) title.textContent = "Editar Categoría";
      document.getElementById("cat-id").value = cat.id;
      document.getElementById("cat-emoji").value = cat.emoji;
      document.getElementById("cat-nombre").value = cat.nombre;
      document.getElementById("cat-color").value = cat.color;
    }
  } else {
    if (title) title.textContent = "Nueva Categoría";
  }
  openModal("modal-categoria");
}

function saveCategoriaHandler(e) {
  e.preventDefault();
  const id = document.getElementById("cat-id").value;

  const catData = {
    id: id || "cat-" + Date.now(),
    emoji: document.getElementById("cat-emoji").value.trim(),
    nombre: document.getElementById("cat-nombre").value.trim(),
    color: document.getElementById("cat-color").value
  };

  if (id) {
    const idx = AppState.categorias.findIndex((c) => c.id === id);
    if (idx !== -1) AppState.categorias[idx] = catData;
  } else {
    AppState.categorias.push(catData);
  }

  saveState();
  closeModal("modal-categoria");
  renderAll();
  showToast("Categoría guardada");
}

function deleteCategoria(id) {
  if (!confirm("¿Eliminar esta categoría? Los expositores asociados en TODOS los bazares quedarán sin categoría.")) return;

  AppState.categorias = AppState.categorias.filter((c) => c.id !== id);
  // Como las categorías son compartidas, hay que limpiar la referencia
  // en los expositores de cada bazar (no solo el activo).
  Object.values(AppState.bazaars).forEach((bz) => {
    bz.expositores.forEach((exp) => {
      if (exp.categoria === id) exp.categoria = "";
    });
  });

  saveState();
  renderAll();
  showToast("Categoría eliminada");
}

function generatePDFInvoice(id) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === id);
  if (!exp) return;

  const template = document.getElementById("invoice-template");
  if (!template) return;

  document.getElementById("pdf-invoice-id").textContent = `FOLIO #${String(exp.id).slice(-4).toUpperCase()}`;
  document.getElementById("pdf-invoice-date").textContent = `Fecha: ${new Date().toLocaleDateString("es-MX")}`;
  document.getElementById("pdf-exp-negocio").innerHTML = `<strong>Marca / Negocio:</strong> ${escapeHTML(exp.negocio)}`;
  document.getElementById("pdf-exp-nombre").innerHTML = `<strong>Titular:</strong> ${escapeHTML(exp.nombre)}`;
  document.getElementById("pdf-exp-contact").innerHTML = `<strong>Contacto:</strong> ${escapeHTML(exp.tel || "")} | ${escapeHTML(exp.email || "")}`;
  document.getElementById("pdf-exp-mesa").innerHTML = `<strong>Ubicación:</strong> ${escapeHTML(exp.ubicacion)}`;
  document.getElementById("pdf-exp-status").innerHTML = `<strong>Estado del Pago:</strong> ${exp.pagado ? "✅ PAGADO" : "⏳ PENDIENTE"}`;
  document.getElementById("pdf-exp-monto").textContent = formatCurrency(exp.costo);

  template.style.display = "block";

  const opt = {
    margin: 10,
    filename: `Comprobante_${exp.negocio.replace(/\s+/g, "_")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(template).save().then(() => {
      template.style.display = "none";
    });
  } else {
    alert("Librería html2pdf no disponible.");
    template.style.display = "none";
  }
}

// ==========================================
// 8. CHECKLIST DEL EXPOSITOR (NUEVO)
// [EDITABLE: agrega más acciones sobre exp.checklist aquí]
// ==========================================
function openExpositorChecklist(expId) {
  const bz = getActiveBazaar();
  const exp = bz.expositores.find((e) => e.id === expId);
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
  const bz = getActiveBazaar();
  const exp = bz.expositores.find((e) => e.id === expId);
  const container = document.getElementById("checklist-exp-container");
  if (!exp || !container) return;

  const done = exp.checklist.filter((i) => i.done).length;
  const total = exp.checklist.length;
  const progressEl = document.getElementById("checklist-exp-progress");
  if (progressEl) progressEl.textContent = `${done} / ${total} completado`;

  if (total === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs); color:var(--color-text-muted);">Sin pendientes. Agrega uno abajo.</p>`;
    return;
  }

  container.innerHTML = exp.checklist
    .map(
      (item) => `
    <div class="form-switch">
      <span class="switch-label" style="${item.done ? "text-decoration:line-through; color:var(--color-text-muted);" : ""}">${escapeHTML(item.label)}</span>
      <label class="switch">
        <input type="checkbox" ${item.done ? "checked" : ""} onchange="toggleExpositorChecklistItem('${expId}','${item.id}')">
        <span class="slider"></span>
      </label>
      <button type="button" class="btn-danger btn-sm" style="margin-left:10px;" onclick="removeExpositorChecklistItem('${expId}','${item.id}')">🗑️</button>
    </div>
  `
    )
    .join("");
}

function toggleExpositorChecklistItem(expId, itemId) {
  const bz = getActiveBazaar();
  const exp = bz.expositores.find((e) => e.id === expId);
  const item = exp?.checklist.find((i) => i.id === itemId);
  if (!item) return;
  item.done = !item.done;
  saveState();
  renderExpositorChecklist();
  renderExpositores();
}

function addExpositorChecklistItem() {
  const expId = document.getElementById("checklist-exp-id").value;
  const input = document.getElementById("checklist-new-item");
  const label = input.value.trim();
  if (!label) return;

  const bz = getActiveBazaar();
  const exp = bz.expositores.find((e) => e.id === expId);
  if (!exp) return;

  exp.checklist.push({ id: "chk-" + Date.now(), label, done: false });
  input.value = "";
  saveState();
  renderExpositorChecklist();
  renderExpositores();
}

function removeExpositorChecklistItem(expId, itemId) {
  const bz = getActiveBazaar();
  const exp = bz.expositores.find((e) => e.id === expId);
  if (!exp) return;

  exp.checklist = exp.checklist.filter((i) => i.id !== itemId);
  saveState();
  renderExpositorChecklist();
  renderExpositores();
}

// ==========================================
// 9. CHECKLIST DE ASISTENCIA POR MESA (plano del evento)
// ==========================================
function renderChecklist() {
  const container = document.getElementById("checklist-container");
  if (!container) return;

  const bz = getActiveBazaar();
  if (!bz.tables || bz.tables.length === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs); color:var(--color-text-muted);">No hay mesas en este bazar.</p>`;
    return;
  }

  container.innerHTML = bz.tables
    .map((t) => {
      const exp = bz.expositores.find((e) => e.id === t.exhibitorId);
      return `
      <div class="card-meta-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="font-size:var(--fs-xs);">${escapeHTML(t.name)}</strong><br>
          <span style="color:var(--color-text-muted); font-size:var(--fs-xs);">${exp ? escapeHTML(exp.negocio) : "<em>Mesa Libre</em>"}</span>
        </div>
        <label class="switch" style="transform: scale(0.8);">
          <input type="checkbox" ${t.attended ? "checked" : ""} onchange="toggleAttendance('${t.id}')">
          <span class="slider"></span>
        </label>
      </div>
    `;
    })
    .join("");
}

function toggleAttendance(tableId) {
  const bz = getActiveBazaar();
  const t = bz.tables.find((item) => item.id === tableId);
  if (t) {
    t.attended = !t.attended;
    saveState();
    bazaarCanvas.render();
    renderChecklist();
    showToast(`Asistencia de ${t.name} ${t.attended ? "confirmada" : "pendiente"}`);
  }
}

// ==========================================
// 10. MOTOR CANVAS INTERACTIVO (BazaarCanvasManager)
// ==========================================
class BazaarCanvasManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.isDraggingTable = false;
    this.draggedTable = null;
    this.startMouseX = 0;
    this.startMouseY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
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

  // Delegado al helper global: una sola fuente de verdad para "bazar activo".
  getCurrentBazaar() {
    return getActiveBazaar();
  }

  loadBgImage() {
    const bz = this.getCurrentBazaar();
    if (bz && bz.bgImage) {
      this.bgImageObj = new Image();
      this.bgImageObj.src = bz.bgImage;
      this.bgImageObj.onload = () => this.render();
    } else {
      this.bgImageObj = null;
    }
  }

  attachEvents() {
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", () => this.handleMouseUp());
    this.canvas.addEventListener("mouseleave", () => this.handleMouseUp());
    this.canvas.addEventListener("dblclick", (e) => this.handleDoubleClick(e));
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const worldX = (rawX - this.panX) / this.scale;
    const worldY = (rawY - this.panY) / this.scale;

    return { rawX, rawY, worldX, worldY };
  }

  handleMouseDown(e) {
    const { rawX, rawY, worldX, worldY } = this.getCanvasCoords(e);
    const bz = this.getCurrentBazaar();

    for (let i = bz.tables.length - 1; i >= 0; i--) {
      const t = bz.tables[i];
      if (worldX >= t.x && worldX <= t.x + t.w && worldY >= t.y && worldY <= t.y + t.h) {
        this.isDraggingTable = true;
        this.draggedTable = t;
        this.dragOffsetX = worldX - t.x;
        this.dragOffsetY = worldY - t.y;
        this.canvas.style.cursor = "grabbing";
        return;
      }
    }

    this.isPanning = true;
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
    } else if (this.isPanning) {
      this.panX = rawX - this.startMouseX;
      this.panY = rawY - this.startMouseY;
      this.render();
    }
  }

  handleMouseUp() {
    if (this.isDraggingTable) {
      saveState();
    }
    this.isDraggingTable = false;
    this.draggedTable = null;
    this.isPanning = false;
    if (this.canvas) this.canvas.style.cursor = "grab";
  }

  handleDoubleClick(e) {
    const { worldX, worldY } = this.getCanvasCoords(e);
    const bz = this.getCurrentBazaar();

    for (let i = bz.tables.length - 1; i >= 0; i--) {
      const t = bz.tables[i];
      if (worldX >= t.x && worldX <= t.x + t.w && worldY >= t.y && worldY <= t.y + t.h) {
        openModalTableEdit(t.id);
        return;
      }
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);

    if (this.bgImageObj) {
      this.ctx.drawImage(this.bgImageObj, 0, 0);
    } else {
      this.drawGrid();
    }

    const bz = this.getCurrentBazaar();
    if (bz && bz.tables) {
      bz.tables.forEach((t) => this.drawTable(t));
    }

    this.ctx.restore();
  }

  drawGrid() {
    this.ctx.strokeStyle = "#e2e8f0";
    this.ctx.lineWidth = 1;
    const gridSize = 20;

    for (let x = 0; x < 2000; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, 2000);
      this.ctx.stroke();
    }
    for (let y = 0; y < 2000; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(2000, y);
      this.ctx.stroke();
    }
  }

  drawTable(t) {
    const bz = this.getCurrentBazaar();
    const exhibitor = bz.expositores.find((e) => e.id === t.exhibitorId);

    let fillColor = "#ffffff";
    let borderColor = "#94a3b8";

    if (t.attended) {
      fillColor = "#dcfce7";
      borderColor = "#22c55e";
    } else if (exhibitor) {
      const cat = AppState.categorias.find((c) => c.id === exhibitor.categoria);
      if (cat) {
        fillColor = cat.color + "25";
        borderColor = cat.color;
      } else {
        fillColor = "#e0f2fe";
        borderColor = "#0284c7";
      }
    }

    this.ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.roundRect(t.x, t.y, t.w, t.h, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowColor = "transparent";

    this.ctx.fillStyle = "#1e293b";
    this.ctx.font = "bold 11px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const labelText = t.name || "Mesa";
    this.ctx.fillText(labelText, t.x + t.w / 2, t.y + (exhibitor ? t.h / 3 : t.h / 2));

    if (exhibitor) {
      this.ctx.fillStyle = "#475569";
      this.ctx.font = "9px sans-serif";
      const expText = exhibitor.negocio.length > 11 ? exhibitor.negocio.substring(0, 9) + ".." : exhibitor.negocio;
      this.ctx.fillText(expText, t.x + t.w / 2, t.y + (t.h * 2) / 3);
    }
  }
}

const bazaarCanvas = new BazaarCanvasManager();

function zoomBazaar(delta) {
  bazaarCanvas.scale = Math.max(0.3, Math.min(3.0, bazaarCanvas.scale + delta));
  bazaarCanvas.render();
}

function resetBazaarZoom() {
  bazaarCanvas.scale = 1.0;
  bazaarCanvas.panX = 0;
  bazaarCanvas.panY = 0;
  bazaarCanvas.render();
}

function handleFloorPlanUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const bz = getActiveBazaar();
    if (bz) {
      bz.bgImage = evt.target.result;
      saveState();
      bazaarCanvas.loadBgImage();
      showToast("Imagen de fondo cargada en el plano");
    }
  };
  reader.readAsDataURL(file);
}

function addTableToCore() {
  const bz = getActiveBazaar();
  if (!bz) return;

  const newId = "t-" + Date.now();
  const count = bz.tables.length + 1;
  bz.tables.push({
    id: newId,
    name: `Mesa ${count}`,
    x: 100 + (count % 5) * 20,
    y: 100 + (count % 5) * 20,
    w: 90,
    h: 50,
    exhibitorId: "",
    attended: false
  });

  saveState();
  bazaarCanvas.render();
  renderChecklist();
  showToast("Mesa agregada al plano");
}

function openModalTableEdit(tableId) {
  const bz = getActiveBazaar();
  const t = bz.tables.find((item) => item.id === tableId);
  if (!t) return;

  document.getElementById("edit-table-id").value = t.id;
  document.getElementById("edit-table-name").value = t.name;
  document.getElementById("edit-table-width").value = t.w;
  document.getElementById("edit-table-height").value = t.h;

  const sel = document.getElementById("edit-table-exhibitor");
  if (sel) {
    sel.innerHTML =
      `<option value="">-- Sin asignar (Mesa Libre) --</option>` +
      bz.expositores
        .map((exp) => `<option value="${exp.id}" ${exp.id === t.exhibitorId ? "selected" : ""}>${escapeHTML(exp.negocio)} (${escapeHTML(exp.nombre)})</option>`)
        .join("");
  }

  openModal("modal-editar-mesa");
}

function saveTableEdit() {
  const id = document.getElementById("edit-table-id").value;
  const bz = getActiveBazaar();
  const t = bz.tables.find((item) => item.id === id);

  if (t) {
    t.name = document.getElementById("edit-table-name").value.trim() || t.name;
    t.exhibitorId = document.getElementById("edit-table-exhibitor").value;
    t.w = Number(document.getElementById("edit-table-width").value || t.w);
    t.h = Number(document.getElementById("edit-table-height").value || t.h);

    saveState();
    bazaarCanvas.render();
    renderChecklist();
    closeModal("modal-editar-mesa");
    showToast("Propiedades de mesa actualizadas");
  }
}

// ==========================================
// 11. GRÁFICAS DE CHART.JS
// [EDITABLE: agrega más gráficas aquí siguiendo el mismo patrón]
// ==========================================
let chartCategoriesInstance = null;
let chartPaymentsInstance = null;

function updateCharts() {
  if (typeof Chart === "undefined") return;
  const bz = getActiveBazaar();

  const ctxCat = document.getElementById("chart-categorias");
  if (ctxCat) {
    const labels = AppState.categorias.map((c) => `${c.emoji} ${c.nombre}`);
    const data = AppState.categorias.map((c) => bz.expositores.filter((e) => e.categoria === c.id).length);
    const colors = AppState.categorias.map((c) => c.color);

    if (chartCategoriesInstance) chartCategoriesInstance.destroy();

    chartCategoriesInstance = new Chart(ctxCat, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: data, backgroundColor: colors }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  const ctxPay = document.getElementById("chart-pagos");
  if (ctxPay) {
    let paid = 0;
    let pending = 0;

    bz.expositores.forEach((e) => {
      if (e.pagado) paid += Number(e.costo || 0);
      else pending += Number(e.costo || 0);
    });

    if (chartPaymentsInstance) chartPaymentsInstance.destroy();

    chartPaymentsInstance = new Chart(ctxPay, {
      type: "pie",
      data: {
        labels: ["Recaudado", "Pendiente"],
        datasets: [{ data: [paid, pending], backgroundColor: ["#10b981", "#f59e0b"] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }
}

// ==========================================
// 12. INICIALIZACIÓN Y VÍNCULOS GLOBALES (WINDOW)
// [EDITABLE: si agregas una función que se llama desde onclick="" en el
// HTML, expórtala aquí en window.miFuncion = miFuncion]
// ==========================================
window.switchTab = switchTab;
window.toggleDarkMode = toggleDarkMode;
window.toggleBackupMenu = toggleBackupMenu;
window.exportarJSON = exportarJSON;
window.exportarCSV = exportarCSV;
window.handleImportJSON = handleImportJSON;
window.handleSearch = handleSearch;
window.setFilterCategory = setFilterCategory;
window.setFilterStatus = setFilterStatus;
window.openModalExpositor = openModalExpositor;
window.closeModal = closeModal;
window.handleFotoUpload = handleFotoUpload;
window.saveExpositorHandler = saveExpositorHandler;
window.togglePaymentStatus = togglePaymentStatus;
window.deleteExpositor = deleteExpositor;
window.openModalCategoria = openModalCategoria;
window.saveCategoriaHandler = saveCategoriaHandler;
window.deleteCategoria = deleteCategoria;
window.generatePDFInvoice = generatePDFInvoice;
window.updateEventCostsUI = updateEventCostsUI;
window.addExtraCostRow = addExtraCostRow;
window.updateExtraCost = updateExtraCost;
window.removeExtraCostRow = removeExtraCostRow;
window.switchBazaar = switchBazaar;
window.createBazaar = createBazaar;
window.deleteBazaar = deleteBazaar;
window.zoomBazaar = zoomBazaar;
window.resetBazaarZoom = resetBazaarZoom;
window.handleFloorPlanUpload = handleFloorPlanUpload;
window.addTableToCore = addTableToCore;
window.saveTableEdit = saveTableEdit;
window.toggleAttendance = toggleAttendance;
window.openExpositorChecklist = openExpositorChecklist;
window.toggleExpositorChecklistItem = toggleExpositorChecklistItem;
window.addExpositorChecklistItem = addExpositorChecklistItem;
window.removeExpositorChecklistItem = removeExpositorChecklistItem;

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bazaarCanvas.init();

  // Cierra un modal al hacer click en el fondo oscuro (no en la caja blanca).
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Cierra el menú de respaldo al hacer click fuera de él.
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("backup-menu");
    if (!menu) return;
    const clickedInsideMenu = menu.contains(e.target);
    const clickedToggleBtn = e.target.closest('[onclick="toggleBackupMenu()"]');
    if (!clickedInsideMenu && !clickedToggleBtn) menu.classList.remove("open");
  });

  // Navegación lateral en móvil.
  document.querySelector("#btn-toggle-sidebar")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("open");
  });
});