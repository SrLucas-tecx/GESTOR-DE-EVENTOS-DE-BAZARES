/**
 * EXPOSITORES.COM — init.js
 * Exposición global (window.*) e inicialización (DOMContentLoaded). Carga al final del <body>.
 * Dependencias: TODOS los módulos anteriores
 */

// ==========================================
// 23. EXPOSICIÓN GLOBAL DE FUNCIONES (window.*) + INIT
// [EDITABLE: si agregas una función llamada desde onclick en HTML, expórtala aquí]
// ==========================================
window.bazaarCanvas                 = bazaarCanvas;
window.switchTab                     = switchTab;
window.toggleFabMenu                 = toggleFabMenu;
window.toggleSocialFabMenu           = toggleSocialFabMenu;
window.runFabAction                  = runFabAction;
window.toggleDarkMode                = toggleDarkMode;
window.toggleBackupMenu              = toggleBackupMenu;
window.exportarJSON                  = exportarJSON;
window.exportarJSONCompleto           = exportarJSONCompleto;
window.exportarCSV                   = exportarCSV;
window.handleImportJSON              = handleImportJSON;
window.handleSearch                  = handleSearch;
window.setFilterCategory             = setFilterCategory;
window.setFilterStatus               = setFilterStatus;
window.openModalExpositor            = openModalExpositor;
window.openModalExpositorForCurrentCategory = openModalExpositorForCurrentCategory;
window.closeModal                    = closeModal;
window.handleFotoUpload              = handleFotoUpload;
window.saveExpositorHandler          = saveExpositorHandler;
window.togglePaymentStatus           = togglePaymentStatus;
window.deleteExpositor               = deleteExpositor;
window.openModalCategoria            = openModalCategoria;
window.saveCategoriaHandler          = saveCategoriaHandler;
window.deleteCategoria               = deleteCategoria;
window.generatePDFInvoice            = generatePDFInvoice;
window.updateEventCostsUI            = updateEventCostsUI;
window.addExtraCostRow               = addExtraCostRow;
window.updateExtraCost               = updateExtraCost;
window.removeExtraCostRow            = removeExtraCostRow;
window.switchBazaar                  = switchBazaar;
window.switchFloor                   = switchFloor;
window.addFloor                      = addFloor;
window.deleteCurrentFloor            = deleteCurrentFloor;
window.createBazaar                  = createBazaar;
window.deleteBazaarById              = deleteBazaarById;
window.switchBazaarAndGo             = switchBazaarAndGo;
window.renameBazaar                  = renameBazaar;
window.renderBazaresTabla            = renderBazaresTabla;
window.openLogoUploadModal           = openLogoUploadModal;
window.handleLogoUpload              = handleLogoUpload;
window.saveLogoHandler               = saveLogoHandler;
window.removeLogoHandler             = removeLogoHandler;
window.zoomBazaar                    = zoomBazaar;
window.resetBazaarZoom               = resetBazaarZoom;
window.resetBazaarCanvas             = resetBazaarCanvas;
window.setCanvasMode                 = setCanvasMode;
window.openModalZoneEdit              = openModalZoneEdit;
window.saveZoneEdit                   = saveZoneEdit;
window.deleteZoneFromModal            = deleteZoneFromModal;
window.exportZonesJSON               = exportZonesJSON;
window.clearAllZones                 = clearAllZones;
window.exportarMapaPDF               = exportarMapaPDF;
window.updateMapScale                = updateMapScale;
window.handleFloorPlanUpload         = handleFloorPlanUpload;
window.addTableToCore                = addTableToCore;
window.deleteTable                   = deleteTable;
window.deleteSelectedMapObject       = deleteSelectedMapObject;
window.saveTableEdit                 = saveTableEdit;
window.rotateEditingTable             = rotateEditingTable;
window.rotateSelectedTable             = rotateSelectedTable;
window.updateFloorPlanOpacity          = updateFloorPlanOpacity;
window.updateFloorPlanScale            = updateFloorPlanScale;
window.moveFloorPlan                   = moveFloorPlan;
window.rotateFloorPlan                 = rotateFloorPlan;
window.addMapElement                   = addMapElement;
window.updateNewElementEmoji            = updateNewElementEmoji;
window.saveNewMapElement                = saveNewMapElement;
window.openModalMapElementEdit         = openModalMapElementEdit;
window.saveMapElementEdit              = saveMapElementEdit;
window.deleteMapElementFromModal       = deleteMapElementFromModal;
window.toggleOtherTableCount           = toggleOtherTableCount;
window.toggleAttendance              = toggleAttendance;
window.openExpositorChecklist        = openExpositorChecklist;
window.toggleExpositorChecklistItem  = toggleExpositorChecklistItem;
window.editChecklistItemLabel        = editChecklistItemLabel;
window.addExpositorChecklistItem     = addExpositorChecklistItem;
window.removeExpositorChecklistItem  = removeExpositorChecklistItem;
window.guardarComoPlantilla          = guardarComoPlantilla;
window.renderPlantillas              = renderPlantillas;
window.usarPlantilla                 = usarPlantilla;
window.eliminarPlantilla             = eliminarPlantilla;
window.openModalInvitado             = openModalInvitado;
window.saveInvitadoHandler           = saveInvitadoHandler;
window.toggleInvConfirmado           = toggleInvConfirmado;
window.toggleInvAsistio              = toggleInvAsistio;
window.deleteInvitado                = deleteInvitado;
window.cyclePublicationStatus          = cyclePublicationStatus;
window.toggleExpositorBan              = toggleExpositorBan;
window.addMinuteRow                    = addMinuteRow;
window.updateMinuteRow                 = updateMinuteRow;
window.deleteMinuteRow                 = deleteMinuteRow;
window.exportarMinutoAMinutoCSV        = exportarMinutoAMinutoCSV;
window.exportarMinutoAMinutoPDF        = exportarMinutoAMinutoPDF;
window.updateCharts                   = updateCharts;

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderFabMenu("expositores");
  bazaarCanvas.init();

  // Cierra modales al hacer clic en el fondo oscuro
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Cierra el menú de respaldo al hacer clic fuera de él
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("backup-menu");
    if (!menu) return;
    if (!menu.contains(e.target) && !e.target.closest('[onclick="toggleBackupMenu()"]')) {
      menu.classList.remove("open");
    }
  });

  // [NUEVO] Cierra el menú del botón flotante (FAB) al hacer clic fuera de él
  document.addEventListener("click", (e) => {
    const fabMenu = document.getElementById("fab-add-menu");
    if (!fabMenu) return;
    if (!fabMenu.contains(e.target) && !e.target.closest(".fab")) {
      fabMenu.classList.remove("open");
      fabMenu.setAttribute("aria-hidden", "true");
    }
  });

  document.addEventListener("click", (e) => {
    const socialMenu = document.getElementById("fab-social-menu");
    if (!socialMenu) return;
    if (!socialMenu.contains(e.target) && !e.target.closest(".fab-social")) {
      socialMenu.classList.remove("open");
      socialMenu.setAttribute("aria-hidden", "true");
    }
  });

  // Hamburguesa en móvil
  document.querySelector("#btn-toggle-sidebar")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("open");
  });
});