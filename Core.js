/**
 * EXPOSITORES.COM — Core Engine & Management System
 * Versión Unificada, Modular y Segura (Local Storage / Canvas / Chart.js)
 */

// ==========================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN (AppState)
// ==========================================
const DEFAULT_STATE = {
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
      foto: ""
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
      foto: ""
    }
  ],
  categorias: [
    { id: "cat-1", nombre: "Artesanías", emoji: "🎨", color: "#0d9488" },
    { id: "cat-2", nombre: "Gastronomía", emoji: "🥐", color: "#e11d48" },
    { id: "cat-3", nombre: "Moda y Textil", emoji: "👗", color: "#8b5cf6" },
    { id: "cat-4", nombre: "Hogar y Salud", emoji: "🌿", color: "#10b981" }
  ],
  bazaars: {
    "bazaar-1": {
      id: "bazaar-1",
      name: "Bazar Primavera",
      bgImage: null,
      tables: [
        { id: "t1", name: "Mesa A-01", x: 80, y: 80, w: 90, h: 50, exhibitorId: "exp-1", attended: true },
        { id: "t2", name: "Mesa B-02", x: 220, y: 80, w: 90, h: 50, exhibitorId: "exp-2", attended: false },
        { id: "t3", name: "Mesa C-03", x: 360, y: 80, w: 90, h: 50, exhibitorId: "", attended: false }
      ]
    },
    "bazaar-2": {
      id: "bazaar-2",
      name: "Bazar Nocturno",
      bgImage: null,
      tables: [
        { id: "t201", name: "Mesa N-01", x: 100, y: 100, w: 90, h: 50, exhibitorId: "", attended: false }
      ]
    },
    "bazaar-3": {
      id: "bazaar-3",
      name: "Bazar Artesanal",
      bgImage: null,
      tables: [
        { id: "t301", name: "Mesa ART-1", x: 120, y: 120, w: 90, h: 50, exhibitorId: "", attended: false }
      ]
    }
  },
  currentBazaarId: "bazaar-1",
  searchQuery: "",
  filterCategory: "all",
  filterStatus: "all",
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
};

let AppState = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem("EXPOSITORES_APP_STATE");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error("Error al cargar localStorage:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  try {
    localStorage.setItem("EXPOSITORES_APP_STATE", JSON.stringify(AppState));
  } catch (e) {
    console.error("Error al guardar en localStorage:", e);
  }
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
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = "toast";
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
  if (tabId === "mapa") bazaarCanvas.render();
  if (tabId === "costos") renderCostosUI();
}

// ==========================================
// 4. MODO OSCURO Y COPIAS DE SEGURIDAD
// ==========================================
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const darkIcon = document.getElementById("dark-icon");
  if (darkIcon) {
    darkIcon.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  }
}

function toggleBackupMenu() {
  const menu = document.getElementById("backup-menu");
  if (menu) menu.classList.toggle("show");
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
  csv += "ID,Nombre,Negocio,Categoria,Ubicacion,Telefono,Email,Costo,Pagado,Notas\n";

  AppState.expositores.forEach((exp) => {
    const cat = AppState.categorias.find((c) => c.id === exp.categoria)?.nombre || "";
    const cleanNotas = (exp.notas || "").replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " ");
    const line = [
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

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.ObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Expositores_Reporte_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Reporte CSV exportado");
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const importedData = JSON.parse(evt.target.result);
      if (importedData.expositores && importedData.categorias) {
        AppState = { ...DEFAULT_STATE, ...importedData };
        saveState();
        renderAll();
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
// 5. RENDERS PRINCIPALES DE VISTA
// ==========================================
function renderAll() {
  renderExpositores();
  renderCategorias();
  renderCategoryChips();
  renderFinanzasTable();
  renderFinanzasStats();
  renderCostosUI();
  renderChecklist();
  if (bazaarCanvas) bazaarCanvas.render();
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

  let list = AppState.expositores.filter((exp) => {
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
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No se encontraron expositores con los filtros aplicados.</div>`;
    return;
  }

  container.innerHTML = list
    .map((exp) => {
      const cat = AppState.categorias.find((c) => c.id === exp.categoria);
      const catName = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
      const catColor = cat ? cat.color : "#64748b";

      return `
      <div class="card card-expositor">
        <div class="card-header-flex">
          <div class="avatar-sm">
            ${
              exp.foto
                ? `<img src="${exp.foto}" alt="${escapeHTML(exp.nombre)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : escapeHTML(exp.negocio.charAt(0).toUpperCase())
            }
          </div>
          <div>
            <h3 class="card-title">${escapeHTML(exp.negocio)}</h3>
            <p class="card-subtitle">${escapeHTML(exp.nombre)}</p>
          </div>
        </div>

        <div class="card-badges" style="margin: 10px 0;">
          <span class="badge" style="background-color: ${catColor}15; color: ${catColor}; border: 1px solid ${catColor}40;">
            ${escapeHTML(catName)}
          </span>
          <span class="badge ${exp.pagado ? "badge-success" : "badge-warning"}">
            ${exp.pagado ? "✅ Pagado" : "⏳ Pendiente"}
          </span>
        </div>

        <div class="card-info-list" style="font-size: var(--fs-xs); color: var(--text-muted); margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
          <div>📍 <strong>Ubicación:</strong> ${escapeHTML(exp.ubicacion)}</div>
          <div>📞 <strong>Teléfono:</strong> ${escapeHTML(exp.tel || "N/A")}</div>
          <div>✉️ <strong>Correo:</strong> ${escapeHTML(exp.email || "N/A")}</div>
          <div>💵 <strong>Costo Mesa:</strong> ${formatCurrency(exp.costo)}</div>
          ${exp.notas ? `<div>📝 <em>${escapeHTML(exp.notas)}</em></div>` : ""}
        </div>

        <div class="card-actions" style="display: flex; gap: 6px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 10px;">
          <button class="btn-secondary btn-sm" onclick="generatePDFInvoice('${exp.id}')">📄 Recibo</button>
          <button class="btn-secondary btn-sm" onclick="openModalExpositor('${exp.id}')">✏️ Editar</button>
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

  container.innerHTML = AppState.categorias
    .map((cat) => {
      const totalInCat = AppState.expositores.filter((e) => e.categoria === cat.id).length;
      return `
      <div class="card" style="border-left: 5px solid ${cat.color};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size: 1.1rem; margin:0;">${cat.emoji} ${escapeHTML(cat.nombre)}</h3>
          <span class="badge" style="background:${cat.color}20; color:${cat.color};">${totalInCat} Expositor(es)</span>
        </div>
        <div style="margin-top: 15px; display:flex; justify-content:flex-end; gap:8px;">
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

  tbody.innerHTML = AppState.expositores
    .map(
      (exp) => `
    <tr>
      <td>
        <strong>${escapeHTML(exp.negocio)}</strong><br>
        <small style="color: var(--text-muted);">${escapeHTML(exp.nombre)}</small>
      </td>
      <td>${escapeHTML(exp.ubicacion)}</td>
      <td>${formatCurrency(exp.costo)}</td>
      <td>
        <span class="badge ${exp.pagado ? "badge-success" : "badge-warning"}">
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
  let paidTotal = 0;
  let pendingTotal = 0;

  AppState.expositores.forEach((e) => {
    if (e.pagado) paidTotal += Number(e.costo || 0);
    else pendingTotal += Number(e.costo || 0);
  });

  const totalExps = AppState.expositores.length;
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

function renderCostosUI() {
  const cfg = AppState.costsConfig;

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
    extraContainer.innerHTML = cfg.extraCosts
      .map(
        (c) => `
      <div style="display:flex; gap:10px; align-items:center;">
        <input type="text" class="form-input" style="flex:1;" value="${escapeHTML(c.name)}" onchange="updateExtraCost('${c.id}', 'name', this.value)">
        <input type="number" class="form-input" style="width:110px;" value="${c.cost}" onchange="updateExtraCost('${c.id}', 'cost', this.value)">
        <button class="btn-danger btn-sm" onclick="removeExtraCostRow('${c.id}')">🗑️</button>
      </div>
    `
      )
      .join("");
  }

  let totalIncome = AppState.expositores.reduce((sum, e) => sum + Number(e.costo || 0), 0);
  let totalExtraExpenses = cfg.extraCosts.reduce((sum, c) => sum + Number(c.cost || 0), 0);
  let totalExpenses = subTables + subChairs + totalExtraExpenses;
  let netBalance = totalIncome - totalExpenses;

  const elIncome = document.getElementById("cost-stat-income");
  const elExpenses = document.getElementById("cost-stat-expenses");
  const elBalance = document.getElementById("cost-stat-balance");

  if (elIncome) elIncome.textContent = formatCurrency(totalIncome);
  if (elExpenses) elExpenses.textContent = formatCurrency(totalExpenses);
  if (elBalance) elBalance.textContent = formatCurrency(netBalance);
}

function updateEventCostsUI() {
  const cfg = AppState.costsConfig;

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
  AppState.costsConfig.extraCosts.push({
    id: "cost-" + Date.now(),
    name: "Nuevo Gasto",
    cost: 100
  });
  saveState();
  renderCostosUI();
}

function updateExtraCost(id, field, value) {
  const item = AppState.costsConfig.extraCosts.find((c) => c.id === id);
  if (item) {
    if (field === "cost") item.cost = Number(value || 0);
    if (field === "name") item.name = value;
    saveState();
    renderCostosUI();
  }
}

function removeExtraCostRow(id) {
  AppState.costsConfig.extraCosts = AppState.costsConfig.extraCosts.filter((c) => c.id !== id);
  saveState();
  renderCostosUI();
}

// ==========================================
// 6. MODALES Y MANEJO DE FORMULARIO
// ==========================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("show");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
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
    const exp = AppState.expositores.find((e) => e.id === id);
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
  const id = document.getElementById("exp-id").value;

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
    foto: document.getElementById("exp-foto-base64").value
  };

  if (id) {
    const idx = AppState.expositores.findIndex((e) => e.id === id);
    if (idx !== -1) AppState.expositores[idx] = expData;
  } else {
    AppState.expositores.push(expData);
  }

  saveState();
  closeModal("modal-expositor");
  renderAll();
  showToast(id ? "Expositor actualizado" : "Expositor creado con éxito");
}

function togglePaymentStatus(id) {
  const exp = AppState.expositores.find((e) => e.id === id);
  if (exp) {
    exp.pagado = !exp.pagado;
    saveState();
    renderAll();
    showToast(`Estado de pago actualizado para ${exp.negocio}`);
  }
}

function deleteExpositor(id) {
  if (confirm("¿Estás seguro de eliminar este expositor?")) {
    AppState.expositores = AppState.expositores.filter((e) => e.id !== id);
    saveState();
    renderAll();
    showToast("Expositor eliminado");
  }
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
  if (confirm("¿Eliminar esta categoría? Los expositores asociados quedarán sin categoría.")) {
    AppState.categorias = AppState.categorias.filter((c) => c.id !== id);
    saveState();
    renderAll();
    showToast("Categoría eliminada");
  }
}

function generatePDFInvoice(id) {
  const exp = AppState.expositores.find((e) => e.id === id);
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
// 7. MOTOR CANVAS INTERACTIVO (BazaarCanvasManager)
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

  getCurrentBazaar() {
    if (!AppState.bazaars[AppState.currentBazaarId]) {
      AppState.currentBazaarId = Object.keys(AppState.bazaars)[0] || "bazaar-1";
    }
    return AppState.bazaars[AppState.currentBazaarId];
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
    const exhibitor = AppState.expositores.find((e) => e.id === t.exhibitorId);

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

function switchBazaar(bazaarId) {
  AppState.currentBazaarId = bazaarId;
  saveState();
  bazaarCanvas.loadBgImage();
  bazaarCanvas.render();
  renderChecklist();
}

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
    const bz = bazaarCanvas.getCurrentBazaar();
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
  const bz = bazaarCanvas.getCurrentBazaar();
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
  const bz = bazaarCanvas.getCurrentBazaar();
  const t = bz.tables.find((item) => item.id === tableId);
  if (!t) return;

  document.getElementById("edit-table-id").value = t.id;
  document.getElementById("edit-table-name").value = t.name;
  document.getElementById("edit-table-width").value = t.w;
  document.getElementById("edit-table-height").value = t.h;

  const sel = document.getElementById("edit-table-exhibitor");
  if (sel) {
    sel.innerHTML = `<option value="">-- Sin asignar (Mesa Libre) --</option>` +
      AppState.expositores
        .map((exp) => `<option value="${exp.id}" ${exp.id === t.exhibitorId ? "selected" : ""}>${escapeHTML(exp.negocio)} (${escapeHTML(exp.nombre)})</option>`)
        .join("");
  }

  openModal("modal-editar-mesa");
}

function saveTableEdit() {
  const id = document.getElementById("edit-table-id").value;
  const bz = bazaarCanvas.getCurrentBazaar();
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

function renderChecklist() {
  const container = document.getElementById("checklist-container");
  if (!container) return;

  const bz = bazaarCanvas.getCurrentBazaar();
  if (!bz || !bz.tables || bz.tables.length === 0) {
    container.innerHTML = `<p style="font-size:var(--fs-xs); color:var(--text-muted);">No hay mesas en este bazar.</p>`;
    return;
  }

  container.innerHTML = bz.tables
    .map((t) => {
      const exp = AppState.expositores.find((e) => e.id === t.exhibitorId);
      return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-secondary); border-radius:6px; font-size:var(--fs-xs);">
        <div>
          <strong>${escapeHTML(t.name)}</strong><br>
          <span style="color:var(--text-muted);">${exp ? escapeHTML(exp.negocio) : "<em>Mesa Libre</em>"}</span>
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
  const bz = bazaarCanvas.getCurrentBazaar();
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
// 8. GRÁFICAS DE CHART.JS
// ==========================================
let chartCategoriesInstance = null;
let chartPaymentsInstance = null;

function updateCharts() {
  if (typeof Chart === "undefined") return;

  const ctxCat = document.getElementById("chart-categorias");
  if (ctxCat) {
    const labels = AppState.categorias.map((c) => `${c.emoji} ${c.nombre}`);
    const data = AppState.categorias.map((c) => AppState.expositores.filter((e) => e.categoria === c.id).length);
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

    AppState.expositores.forEach((e) => {
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
// 9. INICIALIZACIÓN Y VÍNCULOS GLOBALES (WINDOW)
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
window.zoomBazaar = zoomBazaar;
window.resetBazaarZoom = resetBazaarZoom;
window.handleFloorPlanUpload = handleFloorPlanUpload;
window.addTableToCore = addTableToCore;
window.saveTableEdit = saveTableEdit;
window.toggleAttendance = toggleAttendance;

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bazaarCanvas.init();

  // 1. Abrir y cerrar Modales (usando la clase 'show' del sistema)
  document.querySelectorAll('[data-modal]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalId = trigger.getAttribute('data-modal');
      openModal(modalId);
    });
  });

  document.querySelectorAll('.modal-close, .modal-overlay, .close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      const modal = closeBtn.closest('.modal') || closeBtn.closest('.modal-overlay');
      if (modal) modal.classList.remove('show');
    });
  });

  // 2. Menú de Respaldos / Backup
  const backupBtn = document.querySelector('#btn-backup');
  if (backupBtn) {
    backupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBackupMenu();
    });
    document.addEventListener('click', () => {
      document.getElementById('backup-menu')?.classList.remove('show');
    });
  }

  // 3. Alternar Modo Oscuro
  document.querySelector('#btn-toggle-theme')?.addEventListener('click', () => {
    toggleDarkMode();
  });

  // 4. Navegación Lateral (Sidebar en Móvil)
  document.querySelector('#btn-toggle-sidebar')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('show');
  });
});