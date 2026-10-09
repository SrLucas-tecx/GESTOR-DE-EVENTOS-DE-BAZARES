/**
 * EXPOSITORES.COM — modales.js
 * Apertura/cierre de modales, formulario de expositor, CRUD categorías
 * Dependencias: state.js, utils.js
 */

// 13. MODALES Y FORMULARIO DE EXPOSITOR
// ==========================================
let formData = {};
let currentStep = 1;
let _expositorFormInitialSnapshot = "";
let _expositorCloseConfirmationPending = false;
window.formData = formData;
window.currentStep = currentStep;

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === "modal-expositor" && el.classList.contains("open")) {
    syncExpositorFormData();
    if (JSON.stringify(formData) !== _expositorFormInitialSnapshot) {
      if (_expositorCloseConfirmationPending) return;
      _expositorCloseConfirmationPending = true;
      appConfirm("Hay cambios sin guardar. ¿Quieres descartarlos?", "Descartar cambios", "Descartar")
        .then((confirmed) => {
          _expositorCloseConfirmationPending = false;
          if (confirmed) finishCloseExpositorModal(el);
        });
      return;
    }
  }
  el.classList.remove("open");
  if (id === "modal-expositor") setExpositorWizardStep(1);
}

function finishCloseExpositorModal(modal = document.getElementById("modal-expositor")) {
  modal?.classList.remove("open");
  setExpositorWizardStep(1);
}

function syncExpositorFormData() {
  const form = document.getElementById("form-expositor");
  if (!form) return formData;
  const fields = {};
  [...form.querySelectorAll("input:not([type='file']), select, textarea")].forEach((control) => {
    if (control.classList.contains("exp-table-option")) return;
    if (!control.id && !control.name) return;
    const key = control.id || control.name;
    fields[key] = control.type === "checkbox" ? control.checked : control.value;
  });
  formData = {
    ...fields,
    tableIds: [...form.querySelectorAll("#exp-ubicacion .exp-table-option:checked")].map((checkbox) => checkbox.value),
    sillasAsignadas: document.getElementById("exp-sillas-total")?.textContent || ""
  };
  window.formData = formData;
  renderExpositorWizardSummary();
  return formData;
}

function prepareExpositorWizard() {
  const form = document.getElementById("form-expositor");
  if (!form) return;
  if (form.dataset.wizardInitialized !== "true") {
    const sync = () => syncExpositorFormData();
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    form.dataset.wizardInitialized = "true";
  }
  setExpositorWizardStep(1);
  syncExpositorFormData();
  _expositorFormInitialSnapshot = JSON.stringify(formData);
  document.querySelector(".expositor-wizard-modal")?.scrollTo({ top: 0 });
}

function setExpositorWizardStep(step) {
  if (!Number.isInteger(step) || step < 1 || step > 4) return;
  currentStep = step;
  window.currentStep = currentStep;
  document.querySelectorAll("#form-expositor [data-wizard-step]").forEach((panel) => {
    panel.hidden = Number(panel.dataset.wizardStep) !== step;
  });
  document.querySelectorAll("#form-expositor [data-wizard-indicator]").forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.wizardIndicator);
    indicator.classList.toggle("is-current", indicatorStep === step);
    indicator.classList.toggle("is-complete", indicatorStep < step);
    if (indicatorStep === step) indicator.setAttribute("aria-current", "step");
    else indicator.removeAttribute("aria-current");
  });
  const cancel = document.getElementById("exp-wizard-cancel");
  const previous = document.getElementById("exp-wizard-previous");
  const next = document.getElementById("exp-wizard-next");
  const submit = document.getElementById("exp-wizard-submit");
  if (cancel) cancel.hidden = step !== 1;
  if (previous) previous.hidden = step === 1;
  if (next) {
    next.hidden = step === 4;
    next.textContent = [
      "",
      "Siguiente: Detalles Logísticos",
      "Siguiente: Costos y Pagos",
      "Siguiente: Notas y Confirmación"
    ][step];
  }
  if (submit) submit.hidden = step !== 4;
}

function validateExpositorStep(step) {
  const panel = document.querySelector(`#form-expositor [data-wizard-step="${step}"]`);
  if (!panel) return false;
  const invalidControl = [...panel.querySelectorAll("input, select, textarea")]
    .find((control) => !control.checkValidity());
  if (invalidControl) {
    invalidControl.reportValidity();
    return false;
  }
  return true;
}

function nextExpositorStep() {
  if (!validateExpositorStep(currentStep)) return;
  syncExpositorFormData();
  setExpositorWizardStep(Math.min(4, currentStep + 1));
  document.querySelector(`#form-expositor [data-wizard-step="${currentStep}"] .exp-wizard-title`)?.focus();
  document.querySelector(".expositor-wizard-modal")?.scrollTo({ top: 0, behavior: "smooth" });
}

function previousExpositorStep() {
  setExpositorWizardStep(Math.max(1, currentStep - 1));
  syncExpositorFormData();
  document.querySelector(`#form-expositor [data-wizard-step="${currentStep}"] .exp-wizard-title`)?.focus();
  document.querySelector(".expositor-wizard-modal")?.scrollTo({ top: 0, behavior: "smooth" });
}

function renderExpositorWizardSummary() {
  const box = document.getElementById("exp-wizard-summary");
  if (!box) return;
  const name = formData["exp-nombre"] || "Sin nombre";
  const business = formData["exp-negocio"] || "Sin marca";
  const chairs = formData.sillasAsignadas || document.getElementById("exp-sillas-total")?.textContent || "0";
  const tableCount = formData["exp-mesas-cantidad"] === "otro"
    ? formData["exp-mesas-otro"] || "0"
    : formData["exp-mesas-cantidad"] || "1";
  const total = Math.max(0, Number(formData["exp-costo"]) || 0);
  const discount = Math.max(0, Number(formData["exp-descuento"]) || 0);
  const advance = Math.max(0, Number(formData["exp-adelanto"]) || 0);
  const balance = formData["exp-pagado"] ? 0 : Math.max(0, total - discount - advance);
  box.innerHTML = `
    <div><span>Nombre</span><strong>${escapeHTML(String(name))}</strong></div>
    <div><span>Marca</span><strong>${escapeHTML(String(business))}</strong></div>
    <div><span>Mesas / sillas</span><strong>${escapeHTML(String(tableCount))} / ${escapeHTML(String(chairs))}</strong></div>
    <div><span>Saldo pendiente</span><strong>${formatCurrency(balance)}</strong></div>`;
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
      document.getElementById("exp-tel").value           = exp.tel || "";
      document.getElementById("exp-email").value         = exp.email || "";
      document.getElementById("exp-costo-base").value    = Math.max(0, Number(exp.costoBase ?? (Number(exp.costo || 0) - Number(exp.costoExtraSillas || 0))));
      document.getElementById("exp-sillas-extra-enabled").checked = Number(exp.sillasExtraCantidad || 0) > 0;
      document.getElementById("exp-sillas-extra-cantidad").value = exp.sillasExtraCantidad || 1;
      document.getElementById("exp-costo-silla-extra").value = bz.costsConfig.chairExtraUnitPrice || 0;
      document.getElementById("exp-adelanto").value      = exp.adelanto || 0;
      document.getElementById("exp-fecha-limite").value  = exp.fechaLimitePago || "";
      document.getElementById("exp-pagado").checked      = exp.pagado;
      document.getElementById("exp-descuento").value     = exp.descuento || 0;
      document.getElementById("exp-notas-credito").value = exp.notaCredito || "";
      document.getElementById("exp-sillas-por-mesa").value = exp.sillasPorMesa ?? bz.costsConfig.chairsPerTable ?? 2;
      document.getElementById("exp-notas").value         = exp.notas || "";
      document.getElementById("exp-foto-base64").value   = exp.foto || "";
      if (exp.foto && box) box.innerHTML = `<img src="${exp.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
  } else {
    document.getElementById("modal-exp-title").textContent = "Nuevo Expositor";
    document.getElementById("exp-sillas-por-mesa").value = bz.costsConfig.chairsPerTable ?? 2;
    document.getElementById("exp-sillas-extra-enabled").checked = false;
    document.getElementById("exp-sillas-extra-cantidad").value = 1;
    document.getElementById("exp-costo-silla-extra").value = bz.costsConfig.chairExtraUnitPrice || 0;
    if (categoryId && AppState.categorias.some((category) => category.id === categoryId)) {
      document.getElementById("exp-categoria").value = categoryId;
    }
  }
  populateExpositorAssignmentSelects(bz, exp);
  toggleOtherTableCount();
  updateExpositorExtraChairFields();
  updateExpositorCostPreview();
  updateExpositorPaymentFields();
  prepareExpositorWizard();
  openModal("modal-expositor");
}

function setExpositorConditionalVisibility(element, visible) {
  if (!element) return;
  clearTimeout(element._visibilityTimer);
  if (visible) {
    element.hidden = false;
    element.inert = false;
    element.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => element.classList.remove("is-collapsed"));
  } else {
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
    element.classList.add("is-collapsed");
    element._visibilityTimer = setTimeout(() => { element.hidden = true; }, 220);
  }
}

function updateExpositorPaymentFields() {
  const isPaidFull = document.getElementById("exp-pagado")?.checked || false;
  const hasDiscount = Number(document.getElementById("exp-descuento")?.value || 0) > 0;
  const paymentDetails = document.getElementById("exp-payment-details");
  const creditNote = document.getElementById("exp-credit-note-wrap");
  const balance = document.getElementById("exp-payment-balance");
  const paidBadge = document.getElementById("exp-payment-paid-badge");

  setExpositorConditionalVisibility(paymentDetails, !isPaidFull);
  setExpositorConditionalVisibility(creditNote, hasDiscount);
  setExpositorConditionalVisibility(balance, !isPaidFull);
  setExpositorConditionalVisibility(paidBadge, isPaidFull);
  updateExpositorPaymentPreview();
}

function updateExpositorPaymentPreview() {
  const balance = document.getElementById("exp-payment-balance");
  if (!balance || document.getElementById("exp-pagado")?.checked) return;
  const total = Math.max(0, Number(document.getElementById("exp-costo")?.value || 0));
  const discount = Math.max(0, Number(document.getElementById("exp-descuento")?.value || 0));
  const advance = Math.max(0, Number(document.getElementById("exp-adelanto")?.value || 0));
  const pending = Math.max(0, total - discount - advance);
  balance.innerHTML = `<span>Saldo pendiente</span><strong>${formatCurrency(pending)}</strong>`;
}

function updateExpositorExtraChairFields(clearWhenDisabled = true) {
  const enabled = document.getElementById("exp-sillas-extra-enabled")?.checked || false;
  const details = document.getElementById("exp-sillas-extra-details");
  const countInput = document.getElementById("exp-sillas-extra-cantidad");
  const costInput = document.getElementById("exp-costo-silla-extra");
  countInput.required = false;
  countInput.disabled = !enabled;
  costInput.required = false;
  costInput.disabled = !enabled;
  if (!enabled && clearWhenDisabled) {
    countInput.value = "";
    costInput.value = "";
  }
  setExpositorConditionalVisibility(details, enabled);
  updateExpositorCostPreview();
}

function updateExpositorCostPreview() {
  const baseInput = document.getElementById("exp-costo-base");
  const totalInput = document.getElementById("exp-costo");
  const extraSummary = document.getElementById("exp-sillas-extra-total");
  if (!baseInput || !totalInput || !extraSummary) return;
  const baseCost = Math.max(0, Number(baseInput.value) || 0);
  const hasExtraChairs = document.getElementById("exp-sillas-extra-enabled")?.checked || false;
  const extraCount = hasExtraChairs
    ? Math.max(0, Math.floor(Number(document.getElementById("exp-sillas-extra-cantidad")?.value) || 0))
    : 0;
  const bz = getActiveBazaar();
  const unitCost = hasExtraChairs ? Math.max(0, Number(bz?.costsConfig?.chairExtraUnitPrice) || 0) : 0;
  const unitInput = document.getElementById("exp-costo-silla-extra");
  if (unitInput) unitInput.value = unitCost;
  const extraCost = extraCount * unitCost;
  const finalCost = Math.round((baseCost + extraCost) * 100) / 100;
  totalInput.value = Number.isFinite(finalCost) ? finalCost.toFixed(2) : "";
  extraSummary.textContent = extraCount
    ? `${extraCount} silla(s) extra × ${formatCurrency(unitCost)} = ${formatCurrency(extraCost)}`
    : "Sin cargo de sillas extra.";
  updateExpositorPaymentPreview();
}

function getExpositorPendingBalance(exp) {
  if (!exp || exp.pagado) return 0;
  return Math.max(0,
    Number(exp.costo || 0) - Number(exp.descuento || 0) - Number(exp.adelanto || 0)
  );
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
      const ariaLabel = `${floor.name} · ${table.name}${ownedByOther ? ` · Asignada a ${owner.negocio}` : ""}`;
      return `<label class="exp-table-tile${ownedByOther ? " is-assigned" : ""}" title="${escapeHTML(ariaLabel)}">
        <input type="checkbox" class="exp-table-option" value="${escapeHTML(table.id)}"
          aria-label="${escapeHTML(ariaLabel)}" ${selected ? "checked" : ""}
          onchange="updateExpositorTableSelection(this)">
        <span class="exp-table-tile-name">${escapeHTML(table.name)}</span>
        <span class="exp-table-tile-floor">${escapeHTML(floor.name)}</span>
        ${ownedByOther ? `<span class="exp-table-tile-status">Asignada</span>` : ""}
      </label>`;
    }).join("")
    : `<span class="form-hint">No hay mesas en el plano. La asignación es opcional; puedes agregar o asignar mesas después.</span>`;
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
  updateExpositorChairPreview();
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

function updateExpositorChairPreview() {
  const output = document.getElementById("exp-sillas-total");
  if (!output) return;
  const tables = getExpositorRequestedTableCount({
    mesasCantidad: document.getElementById("exp-mesas-cantidad")?.value,
    mesasCantidadOtro: document.getElementById("exp-mesas-otro")?.value
  });
  const chairsPerTable = Math.max(0, Math.floor(Number(document.getElementById("exp-sillas-por-mesa")?.value) || 0));
  const totalChairs = tables * chairsPerTable;
  output.textContent = Number.isSafeInteger(totalChairs) ? String(totalChairs) : "Revisa la cantidad";
}

function renderExpositorTableAssignmentHint(exp, requested, selectedCount, totalTables) {
  const hint = document.getElementById("exp-table-assignment-hint");
  if (!hint) return;
  hint.textContent = totalTables
    ? `${selectedCount} de ${requested} mesa(s) seleccionada(s). ${selectedCount < requested ? "Puedes dejar mesas por asignar." : "Cantidad solicitada completada."}`
    : `${requested} mesa(s) solicitada(s). La asignación en el plano es opcional y puedes hacerla después.`;
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
    checkbox.closest(".exp-table-tile")?.classList.toggle("is-selected", checkbox.checked);
    checkbox.closest(".exp-table-tile")?.classList.toggle("is-disabled", checkbox.disabled);
  });
  const expId = document.getElementById("exp-id")?.value;
  const exp = getActiveBazaar()?.expositores.find((item) => item.id === expId) || null;
  renderExpositorTableAssignmentHint(exp, requested, count, checkboxes.length);
  updateExpositorChairPreview();
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
  if (!custom) input.value = "";   // un valor inválido oculto bloqueaba el envío en silencio
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
    const img = new Image();
    img.onload = () => {
      // Se reduce la foto: una imagen original llena el localStorage (~5 MB) y el guardado falla.
      const MAX = 400;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL("image/jpeg", 0.8);
      document.getElementById("exp-foto-base64").value = b64;
      const box = document.getElementById("avatar-preview-box");
      if (box) box.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      syncExpositorFormData();
    };
    img.onerror = () => showToast("No se pudo leer la imagen", "error");
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveExpositorHandler(e, submittedFormData = null) {
  e.preventDefault();
  if (currentStep < 4) {
    nextExpositorStep();
    return;
  }
  const data = submittedFormData || syncExpositorFormData();
  const bz = getActiveBazaar();
  const id = document.getElementById("exp-id").value;
  const existing = id ? bz.expositores.find((x) => x.id === id) : null;
  if (id && !existing) {
    showToast("No se encontró el expositor que intentas editar", "error");
    return;
  }
  const tableIds = [...new Set(data.tableIds)];
  const requestedTableCount = getExpositorRequestedTableCount({
    mesasCantidad: data["exp-mesas-cantidad"],
    mesasCantidadOtro: data["exp-mesas-otro"]
  });
  if (!Number.isSafeInteger(requestedTableCount) || requestedTableCount < 1) {
    showToast("La cantidad de mesas compradas debe ser un número entero válido.", "error");
    return;
  }
  if (tableIds.length > requestedTableCount) {
    showToast(`No puedes asignar más de ${requestedTableCount} mesa(s) a este expositor.`, "error");
    return;
  }
  const chairsPerTable = Math.floor(Number(data["exp-sillas-por-mesa"]));
  const chairCount = requestedTableCount * chairsPerTable;
  if (!Number.isSafeInteger(chairsPerTable) || chairsPerTable < 0 || !Number.isSafeInteger(chairCount)) {
    showToast("Revisa la cantidad de sillas por mesa; debe ser un número entero válido.", "error");
    return;
  }
  const baseCost = Number(data["exp-costo-base"]);
  const hasExtraChairs = data["exp-sillas-extra-enabled"];
  const hasExtraChairDetails = hasExtraChairs && data["exp-sillas-extra-cantidad"] !== "";
  const extraChairCount = hasExtraChairDetails ? Number(data["exp-sillas-extra-cantidad"]) : 0;
  const extraChairUnitCost = Math.max(0, Number(bz.costsConfig.chairExtraUnitPrice) || 0);
  const extraChairCost = extraChairCount * extraChairUnitCost;
  const finalCost = Math.round((baseCost + extraChairCost) * 100) / 100;
  if (!Number.isFinite(baseCost) || baseCost < 0
      || (hasExtraChairDetails && (!Number.isSafeInteger(extraChairCount) || extraChairCount < 1
        || !Number.isFinite(extraChairUnitCost) || extraChairUnitCost < 0))
      || !Number.isSafeInteger(chairCount + extraChairCount)
      || !Number.isFinite(extraChairCost) || !Number.isFinite(finalCost)) {
    showToast("Revisa el costo base y los datos de las sillas extra.", "error");
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
    `${conflictingTables.map((table) => table.name).join(", ")} ya tienen otro expositor. Se moverán a ${String(data["exp-negocio"]).trim() || "este expositor"}. ¿Continuar?`,
    "Reasignar mesas",
    "Reasignar"
  )) return;
  let areaRoleId = data["exp-area-encargada"];
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
    ...(existing || {}),   // conserva campos que el formulario no maneja
    id:             id || "exp-" + Date.now(),
    nombre:         String(data["exp-nombre"]).trim(),
    negocio:        String(data["exp-negocio"]).trim(),
    categoria:      data["exp-categoria"],
    ubicacion:      existing?.ubicacion || "",
    tableId:        "",
    tableIds:       [],
    mesasCantidad:  data["exp-mesas-cantidad"],
    mesasCantidadOtro: String(data["exp-mesas-otro"]).trim(),
    sillasPorMesa: chairsPerTable,
    sillasIncluidas: chairCount,
    sillasExtraCantidad: extraChairCount,
    sillasCantidad: chairCount + extraChairCount,
    costoBase: baseCost,
    costoSillaExtra: extraChairUnitCost,
    costoExtraSillas: Math.round(extraChairCost * 100) / 100,
    areaRolId:      areaRoleId,
    areaEncargada:  areaRole?.nombre || "",
    encargadoId:   data["exp-encargado"],
    tel:            String(data["exp-tel"]).trim(),
    email:          String(data["exp-email"]).trim(),
    costo:          finalCost,
    adelanto:       Number(data["exp-adelanto"] || 0),
    descuento:      Math.max(0, Number(data["exp-descuento"] || 0)),
    notaCredito:    String(data["exp-notas-credito"]).trim(),
    fechaLimitePago: data["exp-fecha-limite"] || "",
    pagado:         data["exp-pagado"],
    notas:          String(data["exp-notas"]).trim(),
    foto:           data["exp-foto-base64"],
    publicationStatus: existing?.publicationStatus || "pendiente",
    banned:         existing?.banned || false,
    checklist:      existing ? existing.checklist : defaultChecklistItems(),
    historial:      [...(existing?.historial || [])],   // copia: si algo falla, el original queda intacto
  };
  if (expData.encargadoId && !bz.responsables.some((person) =>
    person.id === expData.encargadoId && person.rolId === areaRoleId
  )) {
    showToast("El encargado debe pertenecer al área seleccionada.", "error");
    return;
  }

  // ── Instantánea para deshacer si algo falla (asignación de mesas o guardado) ──
  const prevList = bz.expositores.slice();
  const prevTables = allTables.map((table) => ({ table, exhibitorId: table.exhibitorId }));
  const prevOwners = bz.expositores.map((item) => ({
    item, tableId: item.tableId, tableIds: [...(item.tableIds || [])], ubicacion: item.ubicacion
  }));
  const rollback = () => {
    bz.expositores = prevList;
    prevTables.forEach(({ table, exhibitorId }) => { table.exhibitorId = exhibitorId; });
    prevOwners.forEach(({ item, tableId, tableIds: ids, ubicacion }) => {
      item.tableId = tableId; item.tableIds = ids; item.ubicacion = ubicacion;
    });
  };

  if (id) {
    const idx = bz.expositores.findIndex((x) => x.id === id);
    if (idx !== -1) {
      const changes = describeExpositorChanges(bz.expositores[idx], expData);
      bz.expositores[idx] = expData;
      if (changes.length) registrarHistorial(expData.id, `Editado — ${changes.join("; ")}`, bz);
    }
  } else {
    bz.expositores.push(expData);
    registrarHistorial(expData.id, "Expositor registrado", bz);
  }

  if (!applyExpositorTableAssignments(bz, expData, tableIds)) { rollback(); return; }
  if (!tableIds.length && existing && !getExpositorTableIds(existing, bz).length) {
    expData.ubicacion = existing.ubicacion || "";
  }
  if (!saveState()) {
    rollback();   // no se pudo guardar: no dejar al expositor "fantasma" en pantalla
    renderAll();
    showToast("⚠️ No se guardó: el almacenamiento está lleno. Quita la foto o exporta un respaldo y libera espacio.", "error");
    return;
  }
  renderAll();
  _expositorFormInitialSnapshot = JSON.stringify(syncExpositorFormData());
  closeModal("modal-expositor");
  const savedMessage = id ? "✅ Expositor actualizado" : "✅ Expositor registrado";
  showToast(hasExtraChairs && !hasExtraChairDetails
    ? `${savedMessage}. Indica cuántas sillas extra requiere para calcular el cargo.`
    : savedMessage);
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
