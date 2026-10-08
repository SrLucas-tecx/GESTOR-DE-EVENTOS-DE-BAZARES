/**
 * EXPOSITORES.COM — modales.js
 * Apertura/cierre de modales, formulario de expositor, CRUD categorías
 * Dependencias: state.js, utils.js
 */

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

  const bz = getActiveBazaar();
  let exp = null;
  if (id) {
    exp = bz.expositores.find((e) => e.id === id);
    if (exp) {
      document.getElementById("modal-exp-title").textContent = "Editar Expositor";
      document.getElementById("exp-id").value           = exp.id;
      document.getElementById("exp-nombre").value        = exp.nombre;
      document.getElementById("exp-negocio").value       = exp.negocio;
      document.getElementById("exp-categoria").value     = exp.categoria;
      document.getElementById("exp-mesas-cantidad").value = exp.mesasCantidad || "1";
      document.getElementById("exp-mesas-otro").value = exp.mesasCantidadOtro || "";
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
  populateExpositorAssignmentSelects(bz, exp);
  openModal("modal-expositor");
}

function populateExpositorAssignmentSelects(bz, exp = null) {
  const tableList = document.getElementById("exp-ubicacion");
  const areaSelect = document.getElementById("exp-area-encargada");
  if (!tableList || !areaSelect) return;

  const floors = bz.floors || [];
  const tables = floors.flatMap((floor) => (floor.tables || []).map((table) => ({ floor, table })));
  const selectedTableIds = getExpositorTableIds(exp, bz);
  const legacyLocation = exp?.ubicacion?.trim() || "";
  const requested = getExpositorRequestedTableCount(exp);
  const hasLegacyLocation = legacyLocation && selectedTableIds.length === 0
    && !tables.some(({ table }) => table.name.trim().toLowerCase() === legacyLocation.toLowerCase());
  tableList.innerHTML = tables.length
    ? tables.map(({ floor, table }) => {
      const owner = bz.expositores.find((item) => item.id === table.exhibitorId);
      const selected = selectedTableIds.includes(table.id);
      const ownedByOther = owner && owner.id !== exp?.id;
      return `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;${ownedByOther ? "opacity:.65;" : ""}">
        <input type="checkbox" class="exp-table-option" value="${escapeHTML(table.id)}"
          ${selected ? "checked" : ""} onchange="updateExpositorTableSelection(this)">
        <span>${escapeHTML(floor.name)} · ${escapeHTML(table.name)}${ownedByOther ? ` — asignada a ${escapeHTML(owner.negocio)}` : ""}</span>
      </label>`;
    }).join("")
    : `<span class="form-hint">No hay mesas en el plano. Agrega mesas en la sección Plano del Evento.</span>`;
  if (hasLegacyLocation) {
    tableList.insertAdjacentHTML("beforeend", `<p class="form-hint">Ubicación anterior conservada: ${escapeHTML(legacyLocation)}</p>`);
  }
  renderExpositorTableAssignmentHint(exp, requested, selectedTableIds.length, tables.length);

  const roles = bz.roles || [];
  const selectedRoleId = exp?.areaRolId && roles.some((role) => role.id === exp.areaRolId)
    ? exp.areaRolId
    : roles.find((role) => role.nombre.trim().toLowerCase() === (exp?.areaEncargada || "").trim().toLowerCase())?.id || "";
  const legacyArea = exp?.areaEncargada?.trim() || "";
  const selectedRoleExists = roles.some((role) => role.id === selectedRoleId);
  areaSelect.innerHTML = `<option value="">Por asignar</option>` + roles.map((role) =>
    `<option value="${escapeHTML(role.id)}" ${role.id === selectedRoleId ? "selected" : ""}>${escapeHTML(role.nombre)}</option>`
  ).join("");
  if (legacyArea && !selectedRoleExists && !roles.some((role) => role.nombre.trim().toLowerCase() === legacyArea.toLowerCase())) {
    areaSelect.insertAdjacentHTML("beforeend", `<option value="__legacy_area" selected>${escapeHTML(legacyArea)} (área anterior)</option>`);
  }
  areaSelect.value = selectedRoleExists ? selectedRoleId
    : legacyArea && !roles.some((role) => role.nombre.trim().toLowerCase() === legacyArea.toLowerCase()) ? "__legacy_area" : "";
  const responsibleSelect = document.getElementById("exp-encargado");
  if (responsibleSelect) responsibleSelect.dataset.selectedId = exp?.encargadoId || "";
  updateExpositorAreaStaff();
  updateExpositorTableSelection();
}

function getExpositorTableIds(exp, bz = getActiveBazaar()) {
  if (!exp || !bz) return [];
  const tables = (bz.floors || []).flatMap((floor) => floor.tables || []);
  const ids = new Set(Array.isArray(exp.tableIds) ? exp.tableIds : []);
  if (exp.tableId) ids.add(exp.tableId);
  tables.forEach((table) => {
    if (table.exhibitorId === exp.id) ids.add(table.id);
  });
  if (!ids.size && exp.ubicacion) {
    exp.ubicacion.split(",").map((name) => name.trim().toLowerCase()).forEach((name) => {
      const table = tables.find((item) => item.name.trim().toLowerCase() === name
        && (!item.exhibitorId || item.exhibitorId === exp.id));
      if (table) ids.add(table.id);
    });
  }
  return [...ids].filter((id) => tables.some((table) => table.id === id));
}

function getExpositorTableId(exp, bz = getActiveBazaar()) {
  return getExpositorTableIds(exp, bz)[0] || "";
}

function getExpositorRequestedTableCount(exp) {
  if (!exp) return 1;
  const raw = exp.mesasCantidad === "otro" ? exp.mesasCantidadOtro : exp.mesasCantidad;
  return Math.max(1, Math.floor(Number(raw) || 1));
}

function renderExpositorTableAssignmentHint(exp, requested, selectedCount, totalTables) {
  const hint = document.getElementById("exp-table-assignment-hint");
  if (!hint) return;
  hint.textContent = totalTables
    ? `${selectedCount} de ${requested} mesa(s) seleccionada(s). ${selectedCount < requested ? "Puedes dejar mesas por asignar." : "Cantidad solicitada completada."}`
    : `${requested} mesa(s) solicitada(s); agrega mesas al plano para asignarlas.`;
}

function updateExpositorTableSelection(changedCheckbox = null) {
  const checkboxes = [...document.querySelectorAll("#exp-ubicacion .exp-table-option")];
  const requested = getExpositorRequestedTableCount({
    mesasCantidad: document.getElementById("exp-mesas-cantidad")?.value,
    mesasCantidadOtro: document.getElementById("exp-mesas-otro")?.value
  });
  const selected = checkboxes.filter((checkbox) => checkbox.checked);
  if (selected.length > requested && changedCheckbox) {
    changedCheckbox.checked = false;
    showToast(`Este expositor solicitó ${requested} mesa(s).`, "error");
  } else if (selected.length > requested) {
    selected.slice(requested).forEach((checkbox) => { checkbox.checked = false; });
    showToast(`Se ajustó la asignación al nuevo límite de ${requested} mesa(s).`);
  }
  const count = checkboxes.filter((checkbox) => checkbox.checked).length;
  checkboxes.forEach((checkbox) => {
    checkbox.disabled = !checkbox.checked && count >= requested;
  });
  const expId = document.getElementById("exp-id")?.value;
  const exp = getActiveBazaar()?.expositores.find((item) => item.id === expId) || null;
  renderExpositorTableAssignmentHint(exp, requested, count, checkboxes.length);
}

function getExpositorLocation(exp, bz = getActiveBazaar()) {
  if (!exp || !bz) return "Por asignar";
  const ids = getExpositorTableIds(exp, bz);
  const names = ids.map((id) => (bz.floors || []).flatMap((floor) => floor.tables || [])
    .find((table) => table.id === id)?.name).filter(Boolean);
  return names.length ? names.join(", ") : exp.ubicacion || "Por asignar";
}

function updateExpositorAreaStaff() {
  const select = document.getElementById("exp-area-encargada");
  const personSelect = document.getElementById("exp-encargado");
  const bz = getActiveBazaar();
  if (!select || !personSelect || !bz) return;
  const role = bz.roles.find((item) => item.id === select.value);
  const selectedId = personSelect.value || personSelect.dataset.selectedId || "";
  const people = role ? bz.responsables.filter((person) => person.rolId === role.id) : [];
  personSelect.disabled = !role || people.length === 0;
  personSelect.innerHTML = !role
    ? `<option value="">Elige un área primero</option>`
    : people.length
      ? `<option value="">Elegir persona encargada</option>${people.map((person) =>
        `<option value="${escapeHTML(person.id)}">${escapeHTML(person.nombre)}</option>`
      ).join("")}`
      : `<option value="">No hay personas asignadas a esta área</option>`;
  personSelect.value = people.some((person) => person.id === selectedId) ? selectedId : "";
  personSelect.dataset.selectedId = personSelect.value;
}

function getExpositorAreaName(exp, bz = getActiveBazaar()) {
  return bz?.roles?.find((role) => role.id === exp.areaRolId)?.nombre || exp.areaEncargada || "";
}

function getExpositorResponsibleName(exp, bz = getActiveBazaar()) {
  return bz?.responsables?.find((person) => person.id === exp.encargadoId)?.nombre || "";
}

function toggleOtherTableCount() {
  const select = document.getElementById("exp-mesas-cantidad");
  const input = document.getElementById("exp-mesas-otro");
  if (!select || !input) return;
  const custom = select.value === "otro";
  input.style.display = custom ? "block" : "none";
  input.required = custom;
  updateExpositorTableSelection();
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

async function saveExpositorHandler(e) {
  e.preventDefault();
  const bz = getActiveBazaar();
  const id = document.getElementById("exp-id").value;
  const existing = id ? bz.expositores.find((x) => x.id === id) : null;
  if (id && !existing) {
    showToast("No se encontró el expositor que intentas editar", "error");
    return;
  }
  const tableIds = [...new Set([...document.querySelectorAll("#exp-ubicacion .exp-table-option:checked")]
    .map((checkbox) => checkbox.value))];
  const requestedTableCount = getExpositorRequestedTableCount({
    mesasCantidad: document.getElementById("exp-mesas-cantidad").value,
    mesasCantidadOtro: document.getElementById("exp-mesas-otro").value
  });
  if (tableIds.length > requestedTableCount) {
    showToast(`No puedes asignar más de ${requestedTableCount} mesa(s) a este expositor.`, "error");
    return;
  }
  const allTables = (bz.floors || []).flatMap((floor) => floor.tables || []);
  if (tableIds.some((tableId) => !allTables.some((table) => table.id === tableId))) {
    showToast("No se encontró una de las mesas seleccionadas en el plano", "error");
    return;
  }
  const conflictingTables = tableIds.map((tableId) => allTables.find((table) => table.id === tableId))
    .filter((table) => table.exhibitorId && table.exhibitorId !== id);
  if (conflictingTables.length && !await appConfirm(
    `${conflictingTables.map((table) => table.name).join(", ")} ya tienen otro expositor. Se moverán a ${document.getElementById("exp-negocio").value.trim() || "este expositor"}. ¿Continuar?`,
    "Reasignar mesas",
    "Reasignar"
  )) return;
  let areaRoleId = document.getElementById("exp-area-encargada").value;
  let areaRole = bz.roles.find((role) => role.id === areaRoleId);
  if (areaRoleId === "__legacy_area") {
    const legacyArea = existing?.areaEncargada?.trim() || "";
    areaRole = bz.roles.find((role) => role.nombre.trim().toLowerCase() === legacyArea.toLowerCase());
    if (!areaRole && legacyArea) {
      areaRole = { id: `rol-${Date.now()}`, nombre: legacyArea, color: "#0d9488" };
      bz.roles.push(areaRole);
    }
    areaRoleId = areaRole?.id || "";
  }
  const expData = {
    ...(existing || {}),   // conserva campos que el formulario no maneja (historial, etc.)
    id:             id || "exp-" + Date.now(),
    nombre:         document.getElementById("exp-nombre").value.trim(),
    negocio:        document.getElementById("exp-negocio").value.trim(),
    categoria:      document.getElementById("exp-categoria").value,
    ubicacion:      existing?.ubicacion || "",
    tableId:        "",
    tableIds:       [],
    mesasCantidad:  document.getElementById("exp-mesas-cantidad").value,
    mesasCantidadOtro: document.getElementById("exp-mesas-otro").value.trim(),
    areaRolId:      areaRoleId,
    areaEncargada:  areaRole?.nombre || "",
    encargadoId:   document.getElementById("exp-encargado").value,
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
    historial:      existing?.historial || [],
  };
  if (expData.encargadoId && !bz.responsables.some((person) =>
    person.id === expData.encargadoId && person.rolId === areaRoleId
  )) {
    showToast("El encargado debe pertenecer al área seleccionada.", "error");
    return;
  }

  if (id) {
    const idx = bz.expositores.findIndex((e) => e.id === id);
    if (idx !== -1) {
      const changes = describeExpositorChanges(bz.expositores[idx], expData);
      bz.expositores[idx] = expData;
      if (changes.length) registrarHistorial(expData.id, `Editado — ${changes.join("; ")}`, bz);
    }
  } else {
    bz.expositores.push(expData);
    registrarHistorial(expData.id, "Expositor registrado", bz);
  }

  if (!applyExpositorTableAssignments(bz, expData, tableIds)) return;
  if (!tableIds.length && existing && !getExpositorTableIds(existing, bz).length) {
    expData.ubicacion = existing.ubicacion || "";
  }
  saveState();
  renderAll();
  closeModal("modal-expositor");
  showToast(id ? "✅ Expositor actualizado" : "✅ Expositor registrado");
}

function syncExpositorTableAssignment(bz, exp) {
  const entries = (bz.floors || []).flatMap((floor) => (floor.tables || []).map((table) => ({ floor, table })));
  const linkedTables = entries.map(({ table }) => table).filter((table) => table.exhibitorId === exp.id);
  exp.tableIds = linkedTables.map((table) => table.id);
  exp.tableId = exp.tableIds[0] || "";
  exp.ubicacion = linkedTables.map((table) => table.name).join(", ");
}

function applyExpositorTableAssignments(bz, exp, tableIds) {
  const entries = (bz.floors || []).flatMap((floor) => (floor.tables || []).map((table) => ({ floor, table })));
  const desiredIds = new Set(tableIds);
  const targets = entries.filter(({ table }) => desiredIds.has(table.id));
  if (targets.length !== desiredIds.size) {
    showToast("No se encontró una de las mesas seleccionadas en el plano", "error");
    return false;
  }

  entries.forEach(({ table }) => {
    const desired = desiredIds.has(table.id);
    if (desired) {
      const previousOwner = bz.expositores.find((item) => item.id === table.exhibitorId && item.id !== exp.id);
      if (previousOwner) {
        table.exhibitorId = "";
        syncExpositorTableAssignment(bz, previousOwner);
      }
      table.exhibitorId = exp.id;
    } else if (table.exhibitorId === exp.id) {
      table.exhibitorId = "";
    }
  });
  syncExpositorTableAssignment(bz, exp);
  return true;
}

async function applyExpositorTableAssignment(bz, exp, tableId) {
  const currentIds = getExpositorTableIds(exp, bz);
  const requestedCount = getExpositorRequestedTableCount(exp);
  if (tableId && !currentIds.includes(tableId) && currentIds.length >= requestedCount) {
    showToast(`${exp.negocio} solicitó ${requestedCount} mesa(s); no se puede asignar otra desde el plano.`, "error");
    return false;
  }
  const owner = tableId
    ? bz.expositores.find((item) => item.id !== exp.id
      && (item.id === (bz.floors || []).flatMap((floor) => floor.tables || []).find((table) => table.id === tableId)?.exhibitorId))
    : null;
  if (owner && !await appConfirm(`Esta mesa se moverá de ${owner.negocio} a ${exp.negocio}. ¿Continuar?`, "Reasignar mesa", "Reasignar")) {
    return false;
  }
  return applyExpositorTableAssignments(bz, exp, tableId ? [...currentIds, tableId] : currentIds);
}

function removeTableFromExpositorAssignment(bz, table) {
  const owner = bz.expositores.find((exp) => exp.id === table.exhibitorId
    || (Array.isArray(exp.tableIds) && exp.tableIds.includes(table.id))
    || exp.tableId === table.id);
  table.exhibitorId = "";
  if (owner) syncExpositorTableAssignment(bz, owner);
}

function togglePaymentStatus(id) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === id);
  if (exp) {
    exp.pagado = !exp.pagado;
    registrarHistorial(exp.id, exp.pagado ? "Marcado como pagado" : "Marcado como pendiente de pago");
    saveState();
    renderAll();
    showToast(`${exp.negocio}: marcado como ${exp.pagado ? "pagado ✅" : "pendiente ⏳"}`);
  }
}

async function deleteExpositor(id) {
  if (!await appConfirm("¿Eliminar este expositor del bazar?", "Eliminar expositor")) return;
  const bz = getActiveBazaar();
  (bz.floors || []).forEach((floor) => {
    (floor.tables || []).forEach((table) => {
      if (table.exhibitorId === id) table.exhibitorId = "";
    });
  });
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
      document.getElementById("cat-descripcion").value = cat.descripcion || "";
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
    color:  document.getElementById("cat-color").value,
    descripcion: document.getElementById("cat-descripcion").value.trim()
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

async function deleteCategoria(id) {
  const enUso = Object.values(AppState.bazaars).reduce((n, bz) => n + (bz.expositores || []).filter((e) => e.categoria === id).length, 0);
  const aviso = enUso ? `\n\n${enUso} expositor(es) de tus bazares usan esta categoría y quedarán sin categoría.` : "";
  if (!await appConfirm(`¿Eliminar esta categoría?${aviso}`, "Eliminar categoría")) return;
  AppState.categorias = AppState.categorias.filter((c) => c.id !== id);
  saveState();
  renderAll();
  showToast("🗑️ Categoría eliminada");
}

// ==========================================
