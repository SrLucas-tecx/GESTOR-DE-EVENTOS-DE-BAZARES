/**
 * BAZARIX — responsables.js
 * Staff del evento: catálogo de Roles y directorio de Responsables (por bazar).
 * Los campos "Responsable" de Tareas, Compras y Minuto a Minuto ya no son
 * texto libre: apuntan (por id) a una persona de este directorio.
 * Dependencias: state.js, utils.js
 */

// ==========================================
// LECTURA / HELPERS COMPARTIDOS
// ==========================================
function getResponsable(id, bz = getActiveBazaar()) {
  return (bz?.responsables || []).find((r) => r.id === id) || null;
}

function getResponsableNombre(id, bz = getActiveBazaar()) {
  return getResponsable(id, bz)?.nombre || "";
}

function getRol(id, bz = getActiveBazaar()) {
  return (bz?.roles || []).find((r) => r.id === id) || null;
}

function getRolNombre(id, bz = getActiveBazaar()) {
  return getRol(id, bz)?.nombre || "";
}

/** <option> compartido por los selects de Tareas, Compras y Minuto a Minuto. */
function responsableOptionsHTML(selectedId, bz = getActiveBazaar()) {
  const lista = (bz?.responsables || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const opts = lista.map((r) => {
    const rol = getRolNombre(r.rolId, bz);
    return `<option value="${r.id}" ${r.id === selectedId ? "selected" : ""}>${escapeHTML(r.nombre)}${rol ? ` (${escapeHTML(rol)})` : ""}</option>`;
  }).join("");
  return `<option value="">-- Sin asignar --</option>${opts}`;
}

// ==========================================
// RENDER: PÁGINA STAFF
// ==========================================
function renderResponsables() {
  const bz = getActiveBazaar();
  if (!bz) return;

  const rolesContainer = document.getElementById("roles-chips");
  if (rolesContainer) {
    rolesContainer.innerHTML = bz.roles.length === 0
      ? `<span style="font-size:var(--fs-xs);color:var(--color-text-muted);">Aún no hay roles. Agrega el primero.</span>`
      : bz.roles.map((rol) => {
          const count = bz.responsables.filter((r) => r.rolId === rol.id).length;
          return `
            <span class="role-chip" style="border-color:${rol.color};color:${rol.color};">
              ${escapeHTML(rol.nombre)}${count ? ` · ${count}` : ""}
              <button type="button" onclick="openModalRol('${rol.id}')" title="Editar rol">✏️</button>
              <button type="button" onclick="deleteRol('${rol.id}')" title="Eliminar rol">✕</button>
            </span>`;
        }).join("");
  }

  const grid = document.getElementById("responsables-grid");
  if (!grid) return;

  if (bz.responsables.length === 0) {
    grid.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🙋</span>
        <h3>Sin responsables registrados</h3>
        <p>Agrega a las personas del comité organizador con "+ Agregar Responsable".</p>
      </div>`;
    return;
  }

  const list = bz.responsables.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  grid.innerHTML = list.map((r) => {
    const rol = getRol(r.rolId, bz);
    const tareasCount  = (bz.tareas   || []).filter((t) => t.responsableId === r.id && !t.hecho).length;
    const comprasCount = (bz.compras  || []).filter((c) => c.responsableId === r.id && !c.comprado).length;
    return `
      <div class="expositor-card" style="border-left:5px solid ${rol ? rol.color : "var(--color-border)"};">
        <div class="card-top">
          <div class="expositor-avatar" style="width:48px;height:48px;font-size:1.1rem;">
            ${escapeHTML((r.nombre || "?").charAt(0).toUpperCase())}
          </div>
          <div class="card-info">
            <div class="card-name">${escapeHTML(r.nombre)}</div>
            <span class="card-category" style="${rol ? `background:${rol.color}20;color:${rol.color};` : ""}">${rol ? escapeHTML(rol.nombre) : "Sin rol"}</span>
          </div>
        </div>
        ${(r.tel || r.email) ? `
        <div class="card-contact" style="margin:8px 0;">
          ${r.tel ? `📞 ${escapeHTML(r.tel)}` : ""} ${r.tel && r.email ? "&nbsp;·&nbsp;" : ""} ${r.email ? `✉️ ${escapeHTML(r.email)}` : ""}
        </div>` : ""}
        <div class="card-meta-item" style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-bottom:10px;">
          ${tareasCount ? `✅ ${tareasCount} tarea(s) pendiente(s)` : "✅ Sin tareas pendientes"}
          ${comprasCount ? ` · 🛒 ${comprasCount} compra(s) pendiente(s)` : ""}
        </div>
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="openModalResponsable('${r.id}')">✏️ Editar</button>
          <button class="btn-danger btn-sm" onclick="deleteResponsable('${r.id}')">🗑️ Eliminar</button>
        </div>
      </div>`;
  }).join("");
}

// ==========================================
// ROLES — modal + CRUD
// ==========================================
function openModalRol(id = null) {
  const form = document.getElementById("form-rol");
  form.reset();
  document.getElementById("rol-id").value = "";
  document.getElementById("rol-color").value = ROLE_COLORS[getActiveBazaar().roles.length % ROLE_COLORS.length];
  document.getElementById("modal-rol-title").textContent = "Nuevo Rol";

  if (id) {
    const rol = getRol(id);
    if (!rol) return;
    document.getElementById("modal-rol-title").textContent = "Editar Rol";
    document.getElementById("rol-id").value = rol.id;
    document.getElementById("rol-nombre").value = rol.nombre;
    document.getElementById("rol-color").value = rol.color || "#0d9488";
  }
  openModal("modal-rol");
}

function saveRolHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  const id = document.getElementById("rol-id").value;
  const nombre = document.getElementById("rol-nombre").value.trim();
  if (!nombre) return;
  const data = { nombre, color: document.getElementById("rol-color").value || "#0d9488" };

  if (id) {
    const rol = getRol(id, bz);
    if (rol) Object.assign(rol, data);
  } else {
    bz.roles.push({ id: `rol-${Date.now()}`, ...data });
  }
  saveState();
  renderResponsables();
  closeModal("modal-rol");
  showToast(id ? "✅ Rol actualizado" : "✅ Rol agregado");
}

function deleteRol(id) {
  const bz = getActiveBazaar();
  const enUso = bz.responsables.filter((r) => r.rolId === id).length;
  if (!confirm(enUso
    ? `${enUso} responsable(s) tienen este rol. Se quedarán sin rol asignado. ¿Eliminar de todos modos?`
    : "¿Eliminar este rol?")) return;
  bz.roles = bz.roles.filter((r) => r.id !== id);
  bz.responsables.forEach((r) => { if (r.rolId === id) r.rolId = ""; });
  saveState();
  renderResponsables();
  showToast("🗑️ Rol eliminado");
}

// ==========================================
// RESPONSABLES — modal + CRUD
// ==========================================
function _populateRolSelect(selectedId) {
  const sel = document.getElementById("resp-rol");
  if (!sel) return;
  const bz = getActiveBazaar();
  sel.innerHTML = `<option value="">-- Sin rol --</option>` +
    bz.roles.map((rol) => `<option value="${rol.id}" ${rol.id === selectedId ? "selected" : ""}>${escapeHTML(rol.nombre)}</option>`).join("");
}

function openModalResponsable(id = null) {
  const form = document.getElementById("form-responsable");
  form.reset();
  document.getElementById("resp-id").value = "";
  document.getElementById("modal-resp-title").textContent = "Nuevo Responsable";
  _populateRolSelect("");

  if (id) {
    const r = getResponsable(id);
    if (!r) return;
    document.getElementById("modal-resp-title").textContent = "Editar Responsable";
    document.getElementById("resp-id").value = r.id;
    document.getElementById("resp-nombre").value = r.nombre;
    document.getElementById("resp-tel").value = r.tel || "";
    document.getElementById("resp-email").value = r.email || "";
    _populateRolSelect(r.rolId);
  }
  openModal("modal-responsable");
}

function saveResponsableHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  const id = document.getElementById("resp-id").value;
  const nombre = document.getElementById("resp-nombre").value.trim();
  if (!nombre) return;
  const data = {
    nombre,
    rolId: document.getElementById("resp-rol").value,
    tel:   document.getElementById("resp-tel").value.trim(),
    email: document.getElementById("resp-email").value.trim(),
  };

  if (id) {
    const r = getResponsable(id, bz);
    if (r) Object.assign(r, data);
  } else {
    bz.responsables.push({ id: `resp-${Date.now()}`, ...data });
  }
  saveState();
  renderResponsables();
  renderTareas();     // los selects de responsable pueden mostrar el nombre nuevo/editado
  renderCompras();
  renderMinuteByMinute();
  closeModal("modal-responsable");
  showToast(id ? "✅ Responsable actualizado" : "✅ Responsable agregado");
}

function deleteResponsable(id) {
  const bz = getActiveBazaar();
  if (!confirm("¿Eliminar este responsable? Las tareas, compras y actividades que tenía asignadas quedarán sin responsable.")) return;
  bz.responsables = bz.responsables.filter((r) => r.id !== id);
  bz.tareas.forEach((t) => { if (t.responsableId === id) t.responsableId = ""; });
  bz.compras.forEach((c) => { if (c.responsableId === id) c.responsableId = ""; });
  (bz.minuteByMinute || []).forEach((row) => { if (row.responsableId === id) row.responsableId = ""; });
  saveState();
  renderResponsables();
  renderTareas();
  renderCompras();
  renderMinuteByMinute();
  showToast("🗑️ Responsable eliminado");
}
