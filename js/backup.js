/**
 * BAZARIX — backup.js
 * Exportar un bazar completo o solo las secciones elegidas, e importar
 * con dos modos: COMBINAR (agrega/actualiza por id) o REEMPLAZAR.
 *
 * Formato de exportación (tipo "bazar"):
 *   { app, tipo:"bazar", version, exportedAt, origen:{id,name}, secciones:[...], datos:{ <seccion>: ... } }
 *
 * También sabe leer los respaldos completos antiguos (todo el AppState):
 * en ese caso el usuario elige de cuál bazar del archivo importar.
 *
 * Dependencias: state.js, utils.js, modales.js (openModal/closeModal),
 *               bazaars.js (renderAll, syncCanvasWithState)
 */

const BACKUP_APP_NAMES = ["BAZARIX", "BAZARICXS", "BARARIX-EXPOSITORES", "EXPOSITORES.COM"];
const BACKUP_VERSION = 4;

// scope "bazar": vive dentro de un bazar · scope "global": compartido entre bazares
const BACKUP_SECTIONS = [
  { key: "general",       scope: "bazar",  label: "Datos generales",  desc: "Nombre, logo y escala del plano",
    count: (d) => (d?.logoImage ? "con logo" : "sin logo") },
  { key: "ficha",         scope: "bazar",  label: "Ficha del evento", desc: "Fecha, objetivo, líderes, público, lugar y staff",
    count: (d) => (d.fecha ? `fecha ${d.fecha}` : "sin fecha") },
  { key: "tareas",        scope: "bazar",  label: "Tareas previas y posteriores", desc: "Fases Previo y Post",
    count: (d) => `${d.length} tarea(s)` },
  { key: "compras",       scope: "bazar",  label: "Lista de compras", desc: "Artículos, responsables y costos",
    count: (d) => `${d.length} artículo(s)` },
  { key: "expositores",   scope: "bazar",  label: "Expositores",      desc: "Datos, pagos, checklist e historial",
    count: (d) => `${d.length} expositor(es)` },
  { key: "invitados",     scope: "bazar",  label: "Lista de expositores (invitados)", desc: "Confirmación y asistencia",
    count: (d) => `${d.length} registro(s)` },
  { key: "costos",        scope: "bazar",  label: "Costos del evento", desc: "Mobiliario y gastos extra",
    count: (d) => `${(d.extraCosts || []).length} gasto(s) extra` },
  { key: "minutoAMinuto", scope: "bazar",  label: "Minuto a Minuto",  desc: "Agenda del evento",
    count: (d) => `${d.length} actividad(es)` },
  { key: "plano",         scope: "bazar",  label: "Plano del evento", desc: "Pisos, mesas, elementos, zonas e imagen de fondo",
    count: (d) => `${d.floors.length} piso(s) · ${d.floors.reduce((s, f) => s + (f.tables || []).length, 0)} mesa(s)` },
  { key: "categorias",    scope: "global", label: "Categorías",       desc: "Las usan los expositores de todos los bazares",
    count: (d) => `${d.length} categoría(s)` },
  { key: "plantillas",    scope: "global", label: "Expositores guardados (plantillas)", desc: "Reutilizables entre bazares",
    count: (d) => `${d.length} plantilla(s)` },
];

// ==========================================
// Helpers
// ==========================================
const _bkClone = (value) => JSON.parse(JSON.stringify(value));
const _bkUid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const _bkIsObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function backupSectionValid(key, data) {
  if (key === "general" || key === "costos" || key === "ficha") return _bkIsObj(data);
  if (key === "plano") return _bkIsObj(data) && Array.isArray(data.floors);
  return Array.isArray(data);
}

/** Extrae de un bazar las secciones que se pueden exportar. */
function backupExtraerSecciones(bz) {
  return {
    general:       { name: bz.name, logoImage: bz.logoImage || null, mapConfig: bz.mapConfig },
    ficha:         bz.evento || emptyEvento(),
    tareas:        bz.tareas || [],
    compras:       bz.compras || [],
    expositores:   bz.expositores || [],
    invitados:     bz.invitados || [],
    costos:        bz.costsConfig || emptyCostsConfig(),
    minutoAMinuto: bz.minuteByMinute || [],
    plano:         { floors: bz.floors || [], activeFloorId: bz.activeFloorId },
  };
}

function _bkSectionRow(sec, count, checked, onchange) {
  return `
    <label style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:6px;cursor:pointer;">
      <input type="checkbox" value="${sec.key}" ${checked ? "checked" : ""} onchange="${onchange}" style="margin-top:3px;accent-color:var(--color-accent);">
      <span>
        <strong>${escapeHTML(sec.label)}</strong>
        ${sec.scope === "global" ? `<small style="margin-left:6px;padding:1px 6px;border-radius:999px;background:var(--color-accent-soft);color:var(--color-accent);font-weight:700;">Compartido</small>` : ""}
        <br><small style="color:var(--color-text-muted);">${escapeHTML(sec.desc)} · ${escapeHTML(count)}</small>
      </span>
    </label>`;
}

function _bkChecked(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`)].map((i) => i.value);
}

// ==========================================
// EXPORTAR
// ==========================================
function openBackupExport() {
  document.getElementById("backup-menu")?.classList.remove("open");
  const select = document.getElementById("be-bazar");
  if (!select) return;
  select.innerHTML = Object.values(AppState.bazaars).map((bz) =>
    `<option value="${bz.id}" ${bz.id === AppState.currentBazaarId ? "selected" : ""}>${escapeHTML(bz.name)}</option>`
  ).join("");
  renderBackupExportSections();
  openModal("modal-backup-export");
}

function renderBackupExportSections() {
  const bz = AppState.bazaars[document.getElementById("be-bazar")?.value];
  const container = document.getElementById("be-sections");
  if (!bz || !container) return;
  const datos = backupExtraerSecciones(bz);
  container.innerHTML = BACKUP_SECTIONS.map((sec) => {
    const data = sec.scope === "global"
      ? (sec.key === "categorias" ? AppState.categorias : AppState.expositorPlantillas)
      : datos[sec.key];
    return _bkSectionRow(sec, sec.count(data), sec.key !== "plantillas", "backupExportRefresh()");
  }).join("");
  backupExportRefresh();
}

function backupExportSeleccionar(modo) {
  document.querySelectorAll("#be-sections input[type=checkbox]").forEach((input) => {
    input.checked = modo === "completo" ? input.value !== "plantillas" : false;
  });
  backupExportRefresh();
}

function backupExportRefresh() {
  const keys = _bkChecked("be-sections");
  const bazarKeys = BACKUP_SECTIONS.filter((s) => s.scope === "bazar").map((s) => s.key);
  const complete = bazarKeys.every((k) => keys.includes(k));
  const el = document.getElementById("be-resumen");
  if (el) {
    el.textContent = keys.length === 0
      ? "Selecciona al menos una sección."
      : `${keys.length} sección(es) seleccionada(s)${complete ? " · bazar completo" : " · exportación parcial"}`;
  }
}

function ejecutarExportacionBazar() {
  const bz = AppState.bazaars[document.getElementById("be-bazar")?.value];
  if (!bz) return;
  const keys = _bkChecked("be-sections");
  if (keys.length === 0) {
    showToast("Selecciona al menos una sección", "error");
    return;
  }
  const all = backupExtraerSecciones(bz);
  const datos = {};
  keys.forEach((key) => {
    if (key === "categorias") datos.categorias = AppState.categorias;
    else if (key === "plantillas") datos.plantillas = AppState.expositorPlantillas;
    else datos[key] = all[key];
  });
  const complete = BACKUP_SECTIONS.filter((s) => s.scope === "bazar").every((s) => keys.includes(s.key));
  const paquete = {
    app: "BAZARIX", tipo: "bazar", version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    origen: { id: bz.id, name: bz.name },
    secciones: keys,
    datos,
  };
  const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bazarix_${bz.name.replace(/[^a-z0-9]+/gi, "_")}_${complete ? "completo" : "parcial"}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  closeModal("modal-backup-export");
  showToast(complete ? "✅ Bazar completo exportado" : `✅ ${keys.length} sección(es) exportada(s)`);
}

// ==========================================
// IMPORTAR — lectura del archivo
// ==========================================
let _bi = null; // { source, srcId }

/** Convierte cualquier archivo válido a { kind, bazaars:[{id,name,datos}], globales, fullState }. */
function backupNormalizarArchivo(parsed) {
  if (parsed && parsed.tipo === "bazar" && _bkIsObj(parsed.datos)) {
    const datos = {};
    BACKUP_SECTIONS.filter((s) => s.scope === "bazar").forEach((s) => {
      if (parsed.datos[s.key] !== undefined) datos[s.key] = parsed.datos[s.key];
    });
    return {
      kind: "bazar", exportedAt: parsed.exportedAt, fullState: null,
      bazaars: [{ id: parsed.origen?.id || "origen", name: parsed.origen?.name || datos.general?.name || "Bazar importado", datos }],
      globales: { categorias: parsed.datos.categorias, plantillas: parsed.datos.plantillas },
    };
  }
  const st = parsed?.data && BACKUP_APP_NAMES.includes(parsed.app) ? parsed.data : parsed;
  if (_bkIsObj(st) && _bkIsObj(st.bazaars)) {
    const clone = migrateState(_bkClone(st));
    return {
      kind: "full", exportedAt: parsed.exportedAt, fullState: st,
      bazaars: Object.entries(clone.bazaars).map(([key, bz]) => ({ id: bz.id || key, name: bz.name || key, datos: backupExtraerSecciones(bz) })),
      globales: { categorias: clone.categorias, plantillas: clone.expositorPlantillas },
    };
  }
  return null;
}

function backupPrepararImportacion(parsed) {
  const source = backupNormalizarArchivo(parsed);
  if (!source || source.bazaars.length === 0) throw new Error("Estructura de respaldo inválida");
  _bi = { source, srcId: source.bazaars[0].id };

  const active = getActiveBazaar();
  const destSelect = document.getElementById("bi-dest");
  destSelect.innerHTML =
    Object.values(AppState.bazaars).map((bz) =>
      `<option value="${bz.id}" ${bz.id === active?.id ? "selected" : ""}>${bz.id === active?.id ? "Bazar activo — " : ""}${escapeHTML(bz.name)}</option>`).join("") +
    `<option value="__new__">➕ Crear un bazar nuevo con estos datos</option>`;

  const srcSelect = document.getElementById("bi-source");
  srcSelect.innerHTML = source.bazaars.map((bz) => `<option value="${escapeHTML(bz.id)}">${escapeHTML(bz.name)}</option>`).join("");
  document.getElementById("bi-source-wrap").style.display = source.bazaars.length > 1 ? "block" : "none";

  const date = source.exportedAt ? new Date(source.exportedAt) : null;
  document.getElementById("bi-file-info").textContent =
    `${source.kind === "full" ? "Respaldo completo de la app" : "Exportación de bazar"}` +
    `${date && !Number.isNaN(date.getTime()) ? " · " + date.toLocaleDateString("es-MX") : ""}` +
    ` · ${source.bazaars.length} bazar(es)`;

  document.getElementById("bi-full-btn").style.display = source.kind === "full" ? "inline-flex" : "none";
  document.querySelector('input[name="bi-modo"][value="combinar"]').checked = true;
  document.getElementById("bi-new-name").value = `${source.bazaars[0].name} (importado)`;

  backupImportRenderSections();
  openModal("modal-backup-import");
}

function backupImportSourceChanged() {
  _bi.srcId = document.getElementById("bi-source").value;
  const bz = _bi.source.bazaars.find((b) => b.id === _bi.srcId);
  document.getElementById("bi-new-name").value = `${bz.name} (importado)`;
  backupImportRenderSections();
}

function _bkAvailable() {
  const bz = _bi.source.bazaars.find((b) => b.id === _bi.srcId);
  return BACKUP_SECTIONS.map((sec) => {
    const data = sec.scope === "global" ? _bi.source.globales[sec.key] : bz?.datos[sec.key];
    return backupSectionValid(sec.key, data) ? { sec, data } : null;
  }).filter(Boolean);
}

function backupImportRenderSections() {
  const items = _bkAvailable();
  const container = document.getElementById("bi-sections");
  container.innerHTML = items.length
    ? items.map(({ sec, data }) => _bkSectionRow(sec, sec.count(data), sec.key !== "plantillas", "backupImportRefresh()")).join("")
    : `<p style="color:var(--color-text-muted);font-size:var(--fs-sm);">Este archivo no trae secciones que se puedan importar.</p>`;
  backupImportRefresh();
}

function backupImportSeleccionar(modo) {
  document.querySelectorAll("#bi-sections input[type=checkbox]").forEach((input) => {
    input.checked = modo === "todo" ? input.value !== "plantillas" : false;
  });
  backupImportRefresh();
}

function _bkModo() {
  return document.querySelector('input[name="bi-modo"]:checked')?.value || "combinar";
}

/** Muestra/oculta campos según el destino y calcula avisos en vivo. */
function backupImportRefresh() {
  if (!_bi) return;
  const isNew = document.getElementById("bi-dest").value === "__new__";
  document.getElementById("bi-new-name-wrap").style.display = isNew ? "block" : "none";
  document.getElementById("bi-modo-wrap").style.display = isNew ? "none" : "block";

  const keys = _bkChecked("bi-sections");
  const modo = isNew ? "reemplazar" : _bkModo();
  const warnings = [];
  const bz = _bi.source.bazaars.find((b) => b.id === _bi.srcId);

  if (!isNew && modo === "reemplazar" && keys.length) {
    const names = keys.map((k) => BACKUP_SECTIONS.find((s) => s.key === k).label);
    warnings.push(`⚠️ Se reemplazará por completo: ${names.join(", ")}. Lo que tengas ahí ahora se perderá.`);
  }
  if (keys.includes("categorias") && modo === "reemplazar" && !isNew) {
    warnings.push("⚠️ Las categorías son compartidas: reemplazarlas afecta a todos tus bazares.");
  }
  if (keys.includes("expositores") && !keys.includes("categorias")) {
    const known = new Set([...AppState.categorias.map((c) => c.id), ...((_bi.source.globales.categorias || []).map((c) => c.id))]);
    const missing = (bz?.datos.expositores || []).filter((e) => e.categoria && !AppState.categorias.some((c) => c.id === e.categoria)).length;
    if (missing > 0 && known.size) warnings.push(`ℹ️ ${missing} expositor(es) usan categorías que no tienes; se verán como "Sin Categoría". Marca "Categorías" para traerlas.`);
  }
  if (keys.includes("plano") && !keys.includes("expositores")) {
    warnings.push("ℹ️ Las mesas del plano quedarán sin expositor asignado si esos expositores no existen en el destino.");
  }
  if (keys.includes("general") && modo === "combinar" && !isNew) {
    warnings.push("ℹ️ En modo Combinar, Datos generales solo agrega el logo si aún no tienes uno.");
  }
  document.getElementById("bi-warnings").innerHTML = warnings.map((w) =>
    `<p style="margin:4px 0;font-size:var(--fs-xs);color:var(--color-text-muted);">${escapeHTML(w)}</p>`).join("");
}

// ==========================================
// IMPORTAR — aplicar secciones
// ==========================================
function _bkMergeById(actual, nuevos) {
  const map = new Map((actual || []).map((x) => [x.id, x]));
  (nuevos || []).forEach((x) => {
    const item = _bkClone(x);
    if (!item.id) item.id = _bkUid("imp");
    map.set(item.id, item);
  });
  return [...map.values()];
}

function _bkWithIds(list) {
  return _bkClone(list).map((x) => (x.id ? x : { ...x, id: _bkUid("imp") }));
}

function _bkApplyPlano(dest, incoming, modo, sameBazaar) {
  const src = _bkClone(incoming.floors || []);
  if (modo === "reemplazar") {
    const idMap = {};
    src.forEach((floor, index) => {
      const newId = sameBazaar ? floor.id : `${dest.id}-floor-${index + 1}`;
      idMap[floor.id] = newId;
      floor.id = newId;
    });
    dest.floors = src;
    dest.activeFloorId = idMap[incoming.activeFloorId] || src[0]?.id;
    return;
  }
  dest.floors = dest.floors || [];
  const usedTableIds = new Set(dest.floors.flatMap((f) => (f.tables || []).map((t) => t.id)));
  src.forEach((floor, index) => {
    const existing = dest.floors.find((f) => f.id === floor.id);
    if (existing) {
      existing.tables   = _bkMergeById(existing.tables, floor.tables);
      existing.elements = _bkMergeById(existing.elements, floor.elements);
      existing.zones    = _bkMergeById(existing.zones, floor.zones);
      if (floor.bgImage) {
        ["bgImage", "backgroundOpacity", "bgScale", "bgScaleX", "bgScaleY", "bgRotation", "bgX", "bgY"].forEach((k) => { existing[k] = floor[k]; });
      }
      return;
    }
    // Piso nuevo: id propio, nombre sin repetir e ids de mesa únicos (se buscan en todos los pisos).
    floor.id = `${dest.id}-floor-${Date.now()}-${index}`;
    if (dest.floors.some((f) => f.name === floor.name)) floor.name = `${floor.name} (importado)`;
    (floor.tables || []).forEach((table, i) => {
      if (usedTableIds.has(table.id)) table.id = `t-${Date.now()}-${index}-${i}`;
      usedTableIds.add(table.id);
    });
    dest.floors.push(floor);
  });
}

function _bkApplySection(dest, key, data, modo, sameBazaar) {
  switch (key) {
    case "general":
      if (modo === "reemplazar") {
        if (data.name) dest.name = data.name;
        dest.logoImage = data.logoImage || null;
        if (data.mapConfig) dest.mapConfig = _bkClone(data.mapConfig);
      } else if (data.logoImage && !dest.logoImage) {
        dest.logoImage = data.logoImage;
      }
      break;
    case "expositores":
      dest.expositores = modo === "reemplazar" ? _bkWithIds(data) : _bkMergeById(dest.expositores, data);
      break;
    case "ficha": {
      const incoming = { ...emptyEvento(), ..._bkClone(data) };
      if (modo === "reemplazar") dest.evento = incoming;
      else {
        dest.evento = { ...emptyEvento(), ...(dest.evento || {}) };
        Object.keys(incoming).forEach((k) => { if (incoming[k] !== "" && incoming[k] !== null) dest.evento[k] = incoming[k]; });
      }
      break;
    }
    case "tareas":
      dest.tareas = modo === "reemplazar" ? _bkWithIds(data) : _bkMergeById(dest.tareas, data);
      break;
    case "compras":
      dest.compras = modo === "reemplazar" ? _bkWithIds(data) : _bkMergeById(dest.compras, data);
      break;
    case "invitados":
      dest.invitados = modo === "reemplazar" ? _bkWithIds(data) : _bkMergeById(dest.invitados, data);
      break;
    case "minutoAMinuto":
      dest.minuteByMinute = modo === "reemplazar" ? _bkWithIds(data) : _bkMergeById(dest.minuteByMinute, data);
      break;
    case "costos": {
      const incoming = _bkClone(data);
      dest.costsConfig = modo === "reemplazar"
        ? { ...emptyCostsConfig(), ...incoming, extraCosts: _bkWithIds(incoming.extraCosts || []) }
        : { ...dest.costsConfig, ...incoming, extraCosts: _bkMergeById(dest.costsConfig?.extraCosts, incoming.extraCosts) };
      break;
    }
    case "plano":
      _bkApplyPlano(dest, data, modo, sameBazaar);
      break;
  }
}

/** Quita referencias rotas (mesas o invitados que apuntan a un expositor que no existe). */
function _bkSanear(dest) {
  const ids = new Set(dest.expositores.map((e) => e.id));
  let mesas = 0, invitados = 0;
  dest.floors.forEach((floor) => (floor.tables || []).forEach((table) => {
    if (table.exhibitorId && !ids.has(table.exhibitorId)) { table.exhibitorId = ""; mesas += 1; }
  }));
  dest.invitados.forEach((inv) => {
    if (inv.expositorId && !ids.has(inv.expositorId)) { inv.expositorId = ""; invitados += 1; }
  });
  return { mesas, invitados };
}

function ejecutarImportacion() {
  if (!_bi) return;
  const keys = _bkChecked("bi-sections");
  if (keys.length === 0) {
    showToast("Selecciona al menos una sección", "error");
    return;
  }
  const destValue = document.getElementById("bi-dest").value;
  const isNew = destValue === "__new__";
  const modo = isNew ? "reemplazar" : _bkModo();
  const srcBazaar = _bi.source.bazaars.find((b) => b.id === _bi.srcId);

  if (!isNew && modo === "reemplazar") {
    const names = keys.map((k) => BACKUP_SECTIONS.find((s) => s.key === k).label).join(", ");
    if (!confirm(`Se reemplazará por completo: ${names}.\n\nLo que tengas actualmente en esas secciones se perderá. ¿Continuar?`)) return;
  }

  // Todo se aplica sobre una COPIA; solo si sale bien se guarda.
  try {
    const next = _bkClone(AppState);
    let dest;
    let newName = "";
    if (isNew) {
      const id = "bazaar-" + Date.now();
      const name = newName = document.getElementById("bi-new-name").value.trim() || `${srcBazaar.name} (importado)`;
      dest = {
        id, name, bgImage: null, logoImage: null, mapConfig: defaultMapConfig(),
        expositores: [], tables: [], costsConfig: emptyCostsConfig(),
        invitados: [], minuteByMinute: [], customMetrics: [],
      };
      next.bazaars[id] = dest;
    } else {
      dest = next.bazaars[destValue];
    }
    if (!dest) throw new Error("Destino no encontrado");
    const sameBazaar = srcBazaar.id === dest.id;

    keys.forEach((key) => {
      const sec = BACKUP_SECTIONS.find((s) => s.key === key);
      if (sec.scope === "global") {
        const data = _bi.source.globales[key];
        const target = key === "categorias" ? "categorias" : "expositorPlantillas";
        next[target] = modo === "reemplazar" ? _bkWithIds(data) : _bkMergeById(next[target], data);
      } else {
        _bkApplySection(dest, key, srcBazaar.datos[key], modo, sameBazaar);
      }
    });

    if (isNew) dest.name = newName;      // el nombre que escribió el usuario manda sobre el del archivo
    migrateState(next);                  // completa campos y valida el conjunto
    const fixed = _bkSanear(dest);
    if (isNew) next.currentBazaarId = dest.id;
    else if (destValue !== next.currentBazaarId) next.currentBazaarId = destValue;

    AppState = next;
    saveState();
    renderAll();
    syncCanvasWithState();
    closeModal("modal-backup-import");
    _bi = null;

    const extra = fixed.mesas || fixed.invitados
      ? ` (${fixed.mesas} mesa(s) y ${fixed.invitados} invitado(s) quedaron sin expositor)` : "";
    showToast(`✅ Importado en "${dest.name}" — ${modo === "reemplazar" ? "Reemplazar" : "Combinar"}${extra}`);
  } catch (err) {
    console.error(err);
    showToast("❌ No se pudo importar: el archivo tiene datos inválidos", "error");
  }
}

/** Comportamiento anterior: sustituye TODA la app con un respaldo completo. */
function reemplazarTodaLaApp() {
  if (!_bi || !_bi.source.fullState) return;
  if (!confirm("Esto reemplaza TODA la app (todos los bazares, categorías y plantillas) con el contenido del archivo. ¿Continuar?")) return;
  try {
    AppState = migrateState(_bkClone(_bi.source.fullState));
    saveState();
    renderAll();
    syncCanvasWithState();
    closeModal("modal-backup-import");
    _bi = null;
    showToast("✅ Datos importados correctamente");
  } catch (err) {
    console.error(err);
    showToast("❌ Archivo JSON inválido", "error");
  }
}
