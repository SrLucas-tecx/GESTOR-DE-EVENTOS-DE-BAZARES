/**
 * BAZARIX — main.js
 * Orquestador: carga js/modules/*.js en orden de dependencias.
 * Sin lógica propia — todo el código vive en js/modules/
 *
 * Para agregar un módulo: créalo en js/modules/ y agrégalo al array MODULES.
 */

const MODULES = [
  "state.js",           // 1. Estado global y persistencia
  "utils.js",           // 2. Helpers puros
  "bazaars.js",         // 3. CRUD de bazares y pisos
  "eventos.js",         // 4. Publicación, ban, minuto a minuto
  "expositores.js",     // 5. Render de tarjetas
  "categorias.js",      // 6. Categorías y chips
  "finanzas.js",        // 7. Tabla de pagos
  "costos.js",          // 8. Costos del evento
  "modales.js",         // 9. Formularios y CRUD
  "checklist.js",       // 10. Checklist por expositor
  "plantillas.js",      // 11. Expositores guardados
  "invitados.js",       // 12. Lista de invitados
  "asistencia.js",      // 13. Asistencia del mapa
  "pdf.js",             // 14. Comprobantes PDF
  "canvas.js",          // 15. BazaarCanvasManager
  "canvas_helpers.js",  // 16. Zoom, mesas, zonas, PDF del mapa
  "charts.js",          // 17. Gráficas Chart.js
  "ui.js",              // 18. Navegación, FAB, dark mode
  "init.js",            // 19. window.* + DOMContentLoaded (siempre al final)
];

// Carga síncrona: cada módulo espera al anterior antes de ejecutarse.
// Se usa createElement en vez de document.write para compatibilidad con Live Server.
(function loadModules(index) {
  if (index >= MODULES.length) return;
  const script = document.createElement("script");
  script.src = "js/modules/" + MODULES[index];
  script.onload  = function () { loadModules(index + 1); };
  script.onerror = function () {
    console.error("❌ Error cargando módulo:", MODULES[index]);
    loadModules(index + 1); // continúa aunque uno falle
  };
  document.head.appendChild(script);
})(0);