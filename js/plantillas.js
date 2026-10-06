/**
 * EXPOSITORES.COM — plantillas.js
 * Guardar y reutilizar expositores como plantillas entre bazares
 * Dependencias: state.js, utils.js
 */

// 17. PLANTILLAS DE EXPOSITORES (guardar y reutilizar)
// ==========================================
async function guardarComoPlantilla(expId) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === expId);
  if (!exp) return;

  // Evita duplicados por negocio+nombre
  const yaExiste = AppState.expositorPlantillas.some(
    (p) => p.negocio === exp.negocio && p.nombre === exp.nombre
  );
  if (yaExiste) {
    if (!await appConfirm(`"${exp.negocio}" ya está guardado como plantilla. ¿Sobreescribir?`, "Sobrescribir plantilla", "Sobrescribir")) return;
    AppState.expositorPlantillas = AppState.expositorPlantillas.filter(
      (p) => !(p.negocio === exp.negocio && p.nombre === exp.nombre)
    );
  }

  AppState.expositorPlantillas.push({
    id:        "plt-" + Date.now(),
    nombre:    exp.nombre,
    negocio:   exp.negocio,
    categoria: exp.categoria,
    tel:       exp.tel,
    email:     exp.email,
    foto:      exp.foto,
    notas:     exp.notas
  });

  saveState();
  renderPlantillas();
  showToast(`💾 "${exp.negocio}" guardado como plantilla`);
}

function renderPlantillas() {
  const container = document.getElementById("plantillas-grid");
  if (!container) return;
  const list = AppState.expositorPlantillas;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">💾</span>
        <h3>Sin plantillas guardadas</h3>
        <p>Usa el botón 💾 en la tarjeta de un expositor para guardarlo aquí.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map((plt) => {
    const cat = AppState.categorias.find((c) => c.id === plt.categoria);
    const catName = cat ? `${cat.emoji} ${cat.nombre}` : "Sin Categoría";
    return `
      <div class="expositor-card" style="border-top-color:var(--color-accent2);">
        <div class="card-top">
          <div class="expositor-avatar" style="width:48px;height:48px;font-size:1.1rem;">
            ${plt.foto ? `<img src="${plt.foto}" alt="${escapeHTML(plt.negocio)}">` : escapeHTML((plt.negocio || "?").charAt(0))}
          </div>
          <div class="card-info">
            <div class="card-name">${escapeHTML(plt.negocio)}</div>
            <span class="card-category">${escapeHTML(catName)}</span>
            <div class="card-contact">${escapeHTML(plt.nombre)}</div>
          </div>
        </div>
        <div class="card-contact" style="margin-bottom:10px;">
          📞 ${escapeHTML(plt.tel || "—")} &nbsp;·&nbsp; ✉️ ${escapeHTML(plt.email || "—")}
        </div>
        <div class="card-actions">
          <button class="btn-primary btn-sm" onclick="usarPlantilla('${plt.id}')">➕ Usar en este Bazar</button>
          <button class="btn-danger btn-sm" onclick="eliminarPlantilla('${plt.id}')">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

function usarPlantilla(pltId) {
  const plt = AppState.expositorPlantillas.find((p) => p.id === pltId);
  if (!plt) return;

  populateCategoriaSelect();
  const form = document.getElementById("form-expositor");
  form.reset();
  document.getElementById("exp-id").value           = "";
  document.getElementById("exp-foto-base64").value  = plt.foto || "";
  document.getElementById("modal-exp-title").textContent = "Nuevo Expositor (desde plantilla)";
  document.getElementById("exp-nombre").value        = plt.nombre;
  document.getElementById("exp-negocio").value       = plt.negocio;
  document.getElementById("exp-categoria").value     = plt.categoria;
  document.getElementById("exp-tel").value           = plt.tel || "";
  document.getElementById("exp-email").value         = plt.email || "";
  document.getElementById("exp-notas").value         = plt.notas || "";

  const box = document.getElementById("avatar-preview-box");
  if (box && plt.foto) box.innerHTML = `<img src="${plt.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  else if (box) box.innerHTML = "📷";

  openModal("modal-expositor");
}

async function eliminarPlantilla(pltId) {
  if (!await appConfirm("¿Eliminar esta plantilla?", "Eliminar plantilla")) return;
  AppState.expositorPlantillas = AppState.expositorPlantillas.filter((p) => p.id !== pltId);
  saveState();
  renderPlantillas();
  showToast("🗑️ Plantilla eliminada");
}

// ==========================================
