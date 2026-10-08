/**
 * EXPOSITORES.COM — categorias.js
 * Render de categorías y chips de filtro
 * Dependencias: state.js, utils.js
 */

function renderCategorias() {
  const container = document.getElementById("categorias-grid");
  if (!container) return;
  // Las categorías son globales: el contador suma los expositores de TODOS los bazares.
  const bazaars = Object.values(AppState.bazaars);
  if (!AppState.categorias.length) {
    container.innerHTML = `<div class="catalog-empty"><span class="catalog-empty-icon">🏷️</span><h3>Sin categorías</h3><p>Crea la primera para clasificar a tus expositores.</p></div>`;
    return;
  }
  container.innerHTML = AppState.categorias.map((cat) => {
    const total = bazaars.reduce((n, bz) => n + (bz.expositores || []).filter((e) => e.categoria === cat.id).length, 0);
    return `
      <div class="expositor-card" style="border-left: 5px solid ${cat.color};">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div class="card-name">${cat.emoji} ${escapeHTML(cat.nombre)}</div>
            ${cat.descripcion ? `<div class="card-contact" style="margin-top:4px;">${escapeHTML(cat.descripcion)}</div>` : ""}
          </div>
          <span class="card-category" style="background:${cat.color}20; color:${cat.color};">${total} en total</span>
        </div>
        <div class="card-actions" style="border-top:none;margin-top:14px;padding-top:0;">
          <button class="btn-secondary btn-sm" onclick="openModalCategoria('${cat.id}')">✏️ Editar</button>
          <button class="btn-danger btn-sm" onclick="deleteCategoria('${cat.id}')">🗑️ Eliminar</button>
        </div>
      </div>`;
  }).join("");
}

function renderCategoryChips() {
  const container = document.getElementById("category-chips-container");
  if (!container) return;
  container.innerHTML = AppState.categorias.map((cat) => `
    <button class="filter-chip" onclick="setFilterCategory('${cat.id}', this)">
      ${cat.emoji} ${escapeHTML(cat.nombre)}
    </button>`).join("");
}

// ==========================================
// 11. FINANZAS
// ==========================================
