/**
 * BAZARIX — alertas.js
 * Sprint 1: Notificaciones de fechas límite de pago
 * Badge en tarjetas, alerta en sidebar, panel de alertas activas
 * Dependencias: state.js, utils.js
 */

// ==========================================
// ALERTAS Y FECHAS LÍMITE
// ==========================================

// Días de anticipación para mostrar alerta
const ALERT_DAYS_AHEAD = 3;

/**
 * Devuelve los expositores con fecha límite en los próximos N días
 * o ya vencida, que no han pagado.
 */
function getExpositorAlerts(bz = getActiveBazaar()) {
  if (!bz) return [];
  const now   = new Date(); now.setHours(0,0,0,0);
  const ahead = new Date(now); ahead.setDate(now.getDate() + ALERT_DAYS_AHEAD);

  return bz.expositores
    .filter((exp) => {
      if (exp.pagado || !exp.fechaLimitePago) return false;
      const limit = new Date(exp.fechaLimitePago); limit.setHours(0,0,0,0);
      return limit <= ahead; // vencida o dentro de N días
    })
    .map((exp) => {
      const limit    = new Date(exp.fechaLimitePago); limit.setHours(0,0,0,0);
      const diffMs   = limit - now;
      const diffDays = Math.ceil(diffMs / 86400000);
      return {
        exp,
        diffDays,
        isOverdue: diffDays < 0,
        label: diffDays < 0
          ? `Venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? "s" : ""}`
          : diffDays === 0
            ? "Vence hoy"
            : `Vence en ${diffDays} día${diffDays !== 1 ? "s" : ""}`
      };
    })
    .sort((a, b) => a.diffDays - b.diffDays);
}

/** Actualiza el badge de alertas en el sidebar */
function updateAlertBadge() {
  const alerts = getExpositorAlerts();
  const badge  = document.getElementById("alert-badge");
  if (!badge) return;
  if (alerts.length === 0) {
    badge.style.display = "none";
  } else {
    badge.style.display = "inline-flex";
    badge.textContent   = alerts.length;
  }
}

/** Renderiza el panel de alertas (sec-alertas o modal) */
function renderAlertas() {
  const container = document.getElementById("alertas-list");
  if (!container) return;
  const alerts = getExpositorAlerts();

  updateAlertBadge();

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty" style="padding:var(--space-8);">
        <span class="catalog-empty-icon">✅</span>
        <h3>Sin alertas</h3>
        <p>Todos los pagos están al día o sin fecha límite asignada.</p>
      </div>`;
    return;
  }

  container.innerHTML = alerts.map(({ exp, label, isOverdue }) => {
    const saldo    = Number(exp.costo || 0) - Number(exp.adelanto || 0);
    const color    = isOverdue ? "var(--color-danger)" : "var(--color-accent2)";
    const bg       = isOverdue ? "var(--color-danger-soft)" : "var(--color-accent2-soft)";
    const icon     = isOverdue ? "🚨" : "⚠️";
    return `
      <div class="card-meta-item" style="
          display:flex;justify-content:space-between;align-items:center;gap:12px;
          border-left:4px solid ${color};padding:10px 14px;border-radius:var(--radius-md);
          background:${bg};margin-bottom:8px;">
        <div style="min-width:0;">
          <div style="font-weight:800;font-size:var(--fs-sm);">
            ${icon} ${escapeHTML(exp.negocio)}
          </div>
          <div style="font-size:var(--fs-xs);color:var(--color-text-muted);">
            ${escapeHTML(exp.nombre)} · ${escapeHTML(exp.ubicacion)}
          </div>
          <div style="font-size:var(--fs-xs);font-weight:700;color:${color};margin-top:2px;">
            ${label} · Saldo: ${formatCurrency(saldo)}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn-secondary btn-sm" onclick="togglePaymentStatus('${exp.id}')">
            💰 Marcar Pagado
          </button>
          <button class="btn-secondary btn-sm" onclick="openModalExpositor('${exp.id}')">
            ✏️ Editar
          </button>
        </div>
      </div>`;
  }).join("");
}

// ==========================================