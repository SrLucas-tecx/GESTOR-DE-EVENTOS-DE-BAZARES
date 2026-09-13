/**
 * EXPOSITORES.COM — ui.js
 * Navegación (switchTab), FAB, modo oscuro, backup menu, exportar/importar, renderAll, filtros
 * Dependencias: state.js, utils.js, todos los módulos de render
 */

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
    invitados:    "Lista de Expositores",
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
    { label: "📍 Nuevo Elemento", action: addMapElement },
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
  const actions = Object.prototype.hasOwnProperty.call(fabActions, tabId)
    ? fabActions[tabId]
    : [];
  menu.innerHTML = actions.map((item, index) =>
    `<button class="fab-add-item" onclick="runFabAction('${tabId}', ${index})">${item.label}</button>`
  ).join("");
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  if (container) container.style.display = actions.length ? "" : "none";
}

function toggleFabMenu() {
  const menu = document.getElementById("fab-add-menu");
  if (!menu) return;
  const activeTab = document.querySelector(".page-section.active")?.id.replace(/^sec-/, "") || "";
  const actions = fabActions[activeTab] || [];
  if (actions.length === 1) {
    actions[0].action();
    return;
  }
  if (!actions.length) return;
  const isOpen = menu.classList.toggle("open");
  menu.setAttribute("aria-hidden", String(!isOpen));
}

function toggleSocialFabMenu() {
  const menu = document.getElementById("fab-social-menu");
  if (!menu) return;
  const isOpen = menu.classList.toggle("open");
  menu.setAttribute("aria-hidden", String(!isOpen));
}

function runFabAction(tabId, actionIndex) {
  const activeSection = document.querySelector(".page-section.active")?.id || "";
  if (activeSection !== `sec-${tabId}`) return;
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
