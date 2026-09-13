/**
 * EXPOSITORES.COM — pdf.js
 * Generación de comprobante PDF por expositor (html2pdf)
 * Dependencias: state.js, utils.js
 */

// 15. PDF — Comprobante con adelanto y saldo
// ==========================================
function generatePDFInvoice(id) {
  const exp = getActiveBazaar().expositores.find((e) => e.id === id);
  if (!exp) return;
  const template = document.getElementById("invoice-template");
  if (!template) return;

  const adelanto   = Number(exp.adelanto || 0);
  const saldo      = Number(exp.costo || 0) - adelanto;
  const pagoTotal  = exp.pagado && saldo <= 0;

  const set = (sid, html) => { const el = document.getElementById(sid); if (el) el.innerHTML = html; };

  set("pdf-invoice-id",    `FOLIO #${String(exp.id).slice(-4).toUpperCase()}`);
  set("pdf-invoice-date",  `Fecha: ${new Date().toLocaleDateString("es-MX")}`);
  set("pdf-exp-negocio",   `<strong>Marca / Negocio:</strong> ${escapeHTML(exp.negocio)}`);
  set("pdf-exp-nombre",    `<strong>Titular:</strong> ${escapeHTML(exp.nombre)}`);
  set("pdf-exp-contact",   `<strong>Contacto:</strong> ${escapeHTML(exp.tel || "")} | ${escapeHTML(exp.email || "")}`);
  set("pdf-exp-mesa",      `<strong>Ubicación:</strong> ${escapeHTML(exp.ubicacion)}`);
  set("pdf-exp-costo",     `<strong>Costo Total de Mesa:</strong> ${formatCurrency(exp.costo)}`);
  set("pdf-exp-adelanto",  `<strong>Adelanto Entregado:</strong> ${formatCurrency(adelanto)}`);
  set("pdf-exp-saldo",     `<strong>Saldo Restante:</strong> ${formatCurrency(saldo <= 0 ? 0 : saldo)}`);
  if (exp.fechaLimitePago) {
    set("pdf-exp-fecha-limite", `<strong>Fecha Límite de Pago:</strong> ${escapeHTML(exp.fechaLimitePago)}`);
  } else {
    const el = document.getElementById("pdf-exp-fecha-limite");
    if (el) el.innerHTML = "";
  }
  set("pdf-exp-status",
    exp.pagado
      ? `<strong>Estado:</strong> <span style="color:#10b981;font-weight:800;">✅ PAGO COMPLETO</span>`
      : adelanto > 0
        ? `<strong>Estado:</strong> <span style="color:#f59e0b;font-weight:800;">🕐 CON ADELANTO — SALDO PENDIENTE</span>`
        : `<strong>Estado:</strong> <span style="color:#ef4444;font-weight:800;">⏳ PENDIENTE DE PAGO</span>`
  );

  // Monto principal: si pagó todo = costo total; si no = saldo
  const montoEl = document.getElementById("pdf-exp-monto");
  if (montoEl) {
    montoEl.textContent = pagoTotal || exp.pagado ? formatCurrency(exp.costo) : formatCurrency(saldo > 0 ? saldo : exp.costo);
    montoEl.title = pagoTotal ? "Pago total" : "Saldo pendiente";
  }

  template.style.display = "block";
  const opt = {
    margin: 10,
    filename: `Comprobante_${exp.negocio.replace(/\s+/g, "_")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  if (window.html2pdf) {
    window.html2pdf().set(opt).from(template).save().then(() => { template.style.display = "none"; });
  } else {
    alert("Librería html2pdf no disponible.");
    template.style.display = "none";
  }
}

// ==========================================
// 16. CHECKLIST DEL EXPOSITOR (editar texto + eliminar + agregar)
