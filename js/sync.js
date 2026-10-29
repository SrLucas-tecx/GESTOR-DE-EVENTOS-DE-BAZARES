/**
 * BAZARIX — sync.js (Sprint 4B: carga desde el servidor, SOLO LECTURA)
 * Arma el AppState completo con lo que devuelve la API y lo deja en la forma que ya leen los render*.
 *
 *  - loadServerData(): se llama al iniciar sesión (auth.js → enterApp). Carga la lista de bazares,
 *    el bazar activo completo (11 peticiones en paralelo) y los demás en segundo plano.
 *  - refreshBazaar(id): recarga un bazar (se usa al cambiar de bazar).
 *  - Los catálogos (categorías/características) son del DUEÑO de cada bazar: se aplican al cambiar de bazar.
 *  - saveState() deja de escribir en localStorage: los datos viejos locales NO se tocan (se importan en el Sprint 5).
 *    Los cambios hechos en pantalla viven solo en memoria hasta el Sprint 4C.
 *
 * Dependencias: api.js, state.js. Cargar DESPUÉS de backup.js y ANTES de init.js.
 */

const SYNC_LAST_BAZAAR_KEY = "BAZARIX_LAST_BAZAAR";
const SYNC_UI_PREFS = ["searchQuery", "filterCategory", "filterStatus", "filterExpositorDay", "expositorSort",
  "expositorView", "tareasFase", "diaEventoDia", "minutoDia", "costosSubTab"];

let _syncLoaded = false;
let _plantillasRaw = [];

const _s = (v) => (v === null || v === undefined ? "" : v);
const _oidTime = (id) => { const t = parseInt(String(id).slice(0, 8), 16); return Number.isFinite(t) ? t * 1000 : Date.now(); };
/** Un 403 (sin permiso para ver ese módulo, p. ej. costos) no es un error: se usa un valor por defecto. */
const _optional = (promise, fallback) => promise.catch((err) => { if (err.status === 403) return fallback; throw err; });

// ── API → forma del frontend ───────────────────────────────────
function mapExpositor(e) {
  const n = Math.max(1, Number(e.mesasCantidad) || 1);
  return {
    id: e.id, nombre: e.nombre, negocio: e.negocio, categoria: _s(e.categoria),
    caracteristicas: e.caracteristicas || [], areaRolId: _s(e.areaRolId), encargadoId: _s(e.encargadoId),
    tel: _s(e.tel), email: _s(e.email), notas: _s(e.notas), foto: _s(e.foto),
    mesaTipo: e.mesaTipo === "media" ? "media" : "completa", color: _s(e.color), diasParticipacion: e.diasParticipacion || [],
    mesasCantidad: n > 5 ? "otro" : String(n), mesasCantidadOtro: n > 5 ? String(n) : "", // el formulario usa 1-5 u «Otro»
    sillasPorMesa: e.sillasPorMesa, sillasExtraCantidad: e.sillasExtraCantidad, sillasCantidad: e.sillasCantidad,
    // sin amounts:view el servidor no manda montos: se dejan en 0 para que ningún cálculo dé NaN (4D ocultará esas columnas)
    costoBase: e.costoBase ?? 0, costoExtraSillas: e.costoExtraSillas ?? 0, costo: e.costo ?? 0, adelanto: e.adelanto ?? 0, descuento: e.descuento ?? 0,
    notaCredito: _s(e.notaCredito), fechaLimitePago: _s(e.fechaLimitePago),
    pagado: Boolean(e.pagado), banned: Boolean(e.banned), publicationStatus: e.publicationStatus || "pendiente",
    checklist: (e.checklist || []).map((c) => ({ id: c.id, label: c.label, done: Boolean(c.done) })),
    historial: [], version: e.version,
  };
}

function mapFloor(f) {
  return {
    id: f.id, name: f.name, orientation: f.orientation || "landscape", dia: _s(f.dia),
    bgImage: f.bgImage || null, backgroundOpacity: f.backgroundOpacity ?? 1,
    bgScaleX: f.bgScaleX ?? 1, bgScaleY: f.bgScaleY ?? 1, bgScale: ((f.bgScaleX ?? 1) + (f.bgScaleY ?? 1)) / 2,
    bgRotation: f.bgRotation || 0, bgX: f.bgX || 0, bgY: f.bgY || 0,
    tables: (f.tables || []).map((t) => ({
      id: t.id, name: t.name, x: t.x, y: t.y, w: t.w, h: t.h, rotation: t.rotation,
      color: t.color, labelColor: t.labelColor, labelFontSize: t.labelFontSize,
      exhibitorId: _s(t.exhibitorId), exhibitorId2: _s(t.exhibitorId2), shared: Boolean(t.shared),
      attended: Boolean(t.attended), absent: Boolean(t.absent), attended2: Boolean(t.attended2), absent2: Boolean(t.absent2),
    })),
    elements: JSON.parse(JSON.stringify(f.elements || [])),
    zones: JSON.parse(JSON.stringify(f.zones || [])),
    version: f.version,
  };
}

const mapTarea = (t) => ({ id: t.id, fase: t.fase, actividad: t.actividad, descripcion: _s(t.descripcion),
  responsableId: _s(t.responsableId), areaRolId: _s(t.areaRolId), fecha: _s(t.fecha), avance: _s(t.avance), hecho: Boolean(t.hecho), version: t.version });

const mapCompra = (c) => ({ id: c.id, articulo: c.articulo, descripcion: _s(c.descripcion),
  responsableId: _s(c.responsableId), areaRolId: _s(c.areaRolId), fecha: _s(c.fecha), cantidad: c.cantidad,
  costoTotal: c.costoTotal ?? 0, costoUnit: c.costoUnit ?? 0, ivaIncluido: c.ivaIncluido ?? true, comprado: Boolean(c.comprado),
  presupuestoId: _s(c.presupuestoId), version: c.version }); // sin amounts:view no llegan los costos

const mapInvitado = (i) => ({ id: i.id, nombre: i.nombre, expositorId: _s(i.expositorId), notas: _s(i.notas),
  confirmado: Boolean(i.confirmado), asistio: Boolean(i.asistio), version: i.version });

const mapActividad = (a) => ({ id: a.id, dia: _s(a.dia), time: _s(a.time), horaFin: _s(a.horaFin), activity: a.activity,
  lugar: _s(a.lugar), responsableId: _s(a.responsableId), areaRolId: _s(a.areaRolId), notes: _s(a.notes), version: a.version });

function mapCosts(config, gastos) {
  const base = { ...emptyCostsConfig(), chairExtraUnitPrice: 0 };
  const cfg = config ? { ...base, ...config } : base;
  cfg.extraCosts = (gastos || []).map((g) => ({ id: g.id, name: g.name, comment: _s(g.comment), unit: g.unit, qty: g.qty,
    cost: g.cost, ivaIncluido: Boolean(g.ivaIncluido), fromCompraId: _s(g.compraId) }));
  return cfg;
}

function buildBazaar(id, d, previousActiveFloorId = null) {
  const f = d.bazaar.bazaar.ficha || {};
  const floors = (d.floors.floors || []).map(mapFloor);
  const mem = d.bazaar.membership || {};
  return {
    id, name: d.bazaar.bazaar.name,
    createdAt: Date.parse(d.bazaar.bazaar.createdAt) || _oidTime(id),
    mesasMigradas: true, // la fuente de verdad ya es la mesa del plano
    color: "", logoImage: null, mapConfig: defaultMapConfig(), // la API aún no guarda color, logo ni escala del plano
    evento: {
      fecha: _s(f.fecha), objetivo: _s(f.objetivo), lideres: _s(f.lideres), publico: _s(f.publico), lugar: _s(f.lugar),
      asistentes: _s(f.asistentes), staff: _s(f.staff), presupuestoBase: _s(f.presupuestoBase),
      multiDia: Boolean(f.multiDia), dias: (f.dias || []).map((x) => ({ id: x.id, nombre: _s(x.nombre), fecha: _s(x.fecha) })),
    },
    roles: (d.staff.roles || []).map((r) => ({ id: r.id, nombre: r.nombre, color: r.color })),
    responsables: (d.staff.responsables || []).map((p) => ({ id: p.id, nombre: p.nombre, rolId: _s(p.rolId), userId: _s(p.userId), tel: _s(p.tel), email: _s(p.email) })),
    expositores: (d.expositores.expositores || []).map(mapExpositor),
    floors,
    activeFloorId: floors.some((x) => x.id === previousActiveFloorId) ? previousActiveFloorId : floors[0]?.id,
    invitados: (d.invitados.items || []).map(mapInvitado),
    tareas: (d.tareas.items || []).map(mapTarea),
    compras: (d.compras.items || []).map(mapCompra),
    minuteByMinute: (d.actividades.items || []).map(mapActividad),
    costsConfig: mapCosts(d.costos?.config, d.gastos?.items),
    customMetrics: [], tables: [],
    catalogos: { categorias: d.catalogs.categorias || [], caracteristicas: d.catalogs.caracteristicas || [] },
    membership: { role: mem.role, roleId: mem.roleId, roleName: mem.roleName, flags: mem.flags || {}, permissions: mem.permissions || [] },
    version: d.bazaar.bazaar.version,
  };
}

function stubBazaar(meta) {
  return { id: meta.id, name: meta.name, createdAt: _oidTime(meta.id), mesasMigradas: true, stub: true,
    membership: { role: meta.role, permissions: [] }, evento: { fecha: meta.fecha || "" } };
}

async function fetchBazaar(id) {
  const get = (path) => api.get(`/bazaars/${id}${path}`);
  const [bazaar, staff, expositores, floors, tareas, compras, invitados, actividades, costos, gastos, catalogs] = await Promise.all([
    get(""), get("/staff"), get("/expositores"), get("/floors"), get("/tareas"), get("/compras"), get("/invitados"), get("/actividades"),
    _optional(get("/costos"), null), _optional(get("/gastos"), { items: [] }), get("/catalogs"),
  ]);
  return { bazaar, staff, expositores, floors, tareas, compras, invitados, actividades, costos, gastos, catalogs };
}

// ── Catálogos y plantillas (dependen del bazar abierto) ────────
function applyBazaarCatalogs(bz) {
  const cat = bz?.catalogos || { categorias: [], caracteristicas: [] };
  AppState.categorias = cat.categorias;
  AppState.caracteristicas = cat.caracteristicas;
  const key = (s) => String(s || "").trim().toLowerCase();
  const catId = new Map(cat.categorias.map((c) => [key(c.nombre), c.id]));
  const carId = new Map(cat.caracteristicas.map((c) => [key(c.nombre), c.id]));
  AppState.expositorPlantillas = _plantillasRaw.map((p) => ({
    id: p.id, nombre: p.nombre, negocio: p.negocio, categoria: catId.get(key(p.categoria)) || "",
    caracteristicas: (p.caracteristicas || []).map((n) => carId.get(key(n))).filter(Boolean),
    tel: _s(p.tel), email: _s(p.email), foto: _s(p.foto), notas: _s(p.notas),
  }));
}

function _renderEverything() {
  if (typeof renderAll === "function") renderAll();
  if (typeof syncCanvasWithState === "function") syncCanvasWithState();
}

// ── Carga inicial ──────────────────────────────────────────────
async function loadServerData() {
  const list = (await api.get("/bazaars")).bazaars || [];
  let last = null;
  try { last = localStorage.getItem(SYNC_LAST_BAZAAR_KEY); } catch { /* sin almacenamiento */ }
  const first = list.find((b) => b.id === last) || list[0] || null;

  try { _plantillasRaw = (await api.get("/plantillas")).plantillas || []; } catch { _plantillasRaw = []; }

  const next = { categorias: [], caracteristicas: [], expositorPlantillas: [], bazaars: {}, currentBazaarId: first ? first.id : null };
  const prev = typeof AppState !== "undefined" ? AppState : {};
  SYNC_UI_PREFS.forEach((k) => { if (prev[k] !== undefined) next[k] = prev[k]; });
  list.forEach((m) => { next.bazaars[m.id] = stubBazaar(m); });
  if (first) next.bazaars[first.id] = buildBazaar(first.id, await fetchBazaar(first.id));

  AppState = migrateState(next);
  applyBazaarCatalogs(getActiveBazaar());
  _syncLoaded = true;
  showSyncBanner();
  _renderEverything();
  if (typeof switchTab === "function") switchTab(getActiveBazaar() ? "bazares" : "inicio");

  // Los demás bazares se completan en segundo plano (sus cifras aparecen en Mis Bazares).
  (async () => {
    for (const m of list) {
      if (!_syncLoaded || m.id === first?.id || !AppState.bazaars[m.id]?.stub) continue;
      try { await refreshBazaar(m.id); } catch (err) { console.warn("No se pudo cargar el bazar", m.id, err.message); }
    }
  })();
}

/** Recarga un bazar desde el servidor y lo reemplaza en memoria. */
async function refreshBazaar(id) {
  if (!_syncLoaded || !AppState.bazaars[id]) return;
  const data = await fetchBazaar(id);
  if (!AppState.bazaars[id]) return; // se cerró la sesión o cambió el estado mientras cargaba
  const built = buildBazaar(id, data, AppState.bazaars[id].activeFloorId);
  const holder = migrateState({ categorias: [], bazaars: { [id]: built }, currentBazaarId: id });
  AppState.bazaars[id] = holder.bazaars[id];
  if (id === AppState.currentBazaarId) {
    if (document.querySelector(".modal-overlay.open")) return; // no pisar lo que se está editando
    applyBazaarCatalogs(AppState.bazaars[id]);
    _renderEverything();
  } else if (typeof renderBazaresTabla === "function") {
    renderBazaresTabla(); renderBazaarHome(); renderBazaarSelector();
  }
}

/** Al cerrar sesión: no dejar datos del usuario anterior en memoria. */
function clearServerData() {
  if (!_syncLoaded) return;
  _syncLoaded = false;
  _plantillasRaw = [];
  AppState = migrateState({ categorias: [], caracteristicas: [], expositorPlantillas: [], bazaars: {}, currentBazaarId: null });
  _renderEverything();
  document.getElementById("sync-banner")?.remove();
}

// ── Cambiar de bazar: catálogos propios + datos frescos ────────
const _switchBazaarOriginal = switchBazaar;
window.switchBazaar = function (id) {
  const bz = AppState.bazaars[id];
  if (!bz) return;
  if (!bz.stub) applyBazaarCatalogs(bz);
  try { localStorage.setItem(SYNC_LAST_BAZAAR_KEY, id); } catch { /* sin almacenamiento */ }
  _switchBazaarOriginal(id);
  refreshBazaar(id).catch((err) => { if (typeof showToast === "function") showToast(`No se pudo actualizar el bazar: ${err.message}`, "error"); });
};

// ── Solo lectura: nada se escribe en localStorage ──────────────
let _readOnlyHintTimer = null;
window.saveState = function () {
  const el = document.getElementById("save-indicator");
  if (el) {
    el.textContent = "⚠ No se guarda";
    el.classList.add("show");
    clearTimeout(_readOnlyHintTimer);
    _readOnlyHintTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }
  return true; // los datos viejos de este navegador (EXPOSITORES_APP_STATE) quedan intactos
};

function showSyncBanner() {
  if (document.getElementById("sync-banner")) return;
  const host = document.querySelector(".page-content");
  if (!host) return;
  const banner = document.createElement("div");
  banner.id = "sync-banner";
  banner.className = "sync-banner";
  banner.setAttribute("role", "status");
  banner.textContent = "Modo solo lectura: estás viendo los datos del servidor, pero los cambios que hagas aquí NO se guardan todavía (llega en el Sprint 4C) y se pierden al recargar.";
  host.prepend(banner);
}
