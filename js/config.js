/**
 * BAZARIX — config.js
 * Interruptor entre los dos modos de la app:
 *
 *   window.BAZARIX_API_URL = "";                       → MODO LOCAL: como antes. Sin login, los datos viven en este
 *                                                         navegador (localStorage). Es lo que debe tener la rama que publica GitHub Pages.
 *   window.BAZARIX_API_URL = "http://localhost:4000";  → MODO NUBE: login y datos del servidor (Sprint 4 en adelante).
 *
 * Se carga ANTES de api.js. Cuando el API esté publicado, aquí va su dirección https.
 */
window.BAZARIX_API_URL = "http://localhost:4000";
