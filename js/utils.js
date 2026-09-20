/**
 * EXPOSITORES.COM — utils.js
 * Helpers puros: escapeHTML, formatCurrency, showToast, _darkenHex
 * Dependencias: state.js (solo showToast usa el DOM)
 */

// 3. UTILIDADES GENERALES
// ==========================================
function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(val) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(val) || 0);
}

function showToast(message, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = message;
  t.style.background = type === "error" ? "var(--color-danger)" : "var(--color-text)";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ==========================================
// 4. NAVEGACIÓN / TABS
// [EDITABLE: para agregar un tab nuevo, agrega su ID aquí y el botón .nav-item en index.html]
// ==========================================
