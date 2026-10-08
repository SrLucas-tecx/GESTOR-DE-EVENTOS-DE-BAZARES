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
    ...(existing || {}),   // conserva campos que el formulario no maneja (historial, etc.)
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
    historial:      existing?.historial || [],
  };

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

  saveState();
  renderAll();
  closeModal("modal-expositor");
  showToast(id ? "✅ Expositor actualizado" : "✅ Expositor registrado");
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
