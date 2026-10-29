/**
 * BAZARIX — auth.js (Sprint 4A)
 * Puerta de acceso: la app no se muestra hasta confirmar la sesión.
 *  - initAuth(): al abrir, intenta renovar la sesión con la cookie; si no hay, muestra el login.
 *  - Invitaciones: ?invitacion=<token> → vista previa → crear cuenta o iniciar sesión y aceptar.
 *  - logout() y aviso cuando la sesión expira.
 * Dependencias: api.js (y sync.js si existe: loadServerData/clearServerData). Usa showToast (utils.js) y bazaarCanvas (canvas.js) si existen.
 * Cargar DESPUÉS de api.js y ANTES de init.js (init.js llama a initAuth()).
 */

const AuthState = { user: null, invitation: null, invitationToken: null, pendingUser: null };
const _auth = (id) => document.getElementById(id);

// ── Utilidades de pantalla ─────────────────────────────────────
function authSetView(name) {
  ["auth-loading", "auth-login", "auth-invite"].forEach((id) => { _auth(id).hidden = id !== `auth-${name}`; });
}

function authShowMsg(id, text) {
  const el = _auth(id);
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
}

function authBusy(buttonId, busy) {
  const btn = _auth(buttonId);
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = "Un momento…"; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  btn.disabled = busy;
}

function authErrorText(err, context = "") {
  if (err.status === 0) return "No se pudo conectar con el servidor. Revisa tu conexión y que el API esté encendido.";
  if (err.code === "ACCOUNT_LOCKED") return err.message;
  if (err.status === 429) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (err.status === 401 && context === "login") return "Correo o contraseña incorrectos.";
  if (err.status === 400 && err.details?.length) return err.details.map((d) => d.mensaje).join(" ");
  return err.message || "Ocurrió un error inesperado.";
}

function clearInvitationFromUrl() {
  const url = new URL(location.href);
  if (!url.searchParams.has("invitacion")) return;
  url.searchParams.delete("invitacion");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

// ── Entrar / salir de la app ───────────────────────────────────
async function enterApp(user) {
  AuthState.user = user;
  const name = _auth("auth-user-name");
  if (name) name.textContent = user.name;
  const btn = _auth("btn-logout");
  if (btn) btn.title = `Cerrar sesión (${user.name})`;
  if (typeof loadServerData === "function") { // Sprint 4B: se cargan los datos del servidor antes de mostrar la app
    authSetView("loading");
    _auth("auth-loading-text").textContent = "Cargando tus bazares…";
    _auth("auth-load-retry").hidden = true;
    try {
      await loadServerData();
    } catch (err) {
      if (err.status === 401) return; // la sesión expiró: el evento ya mostró el login
      _auth("auth-loading-text").textContent = `No se pudieron cargar tus datos. ${authErrorText(err)}`;
      _auth("auth-load-retry").hidden = false;
      return;
    }
  }
  document.body.classList.remove("auth-locked");
  if (typeof bazaarCanvas !== "undefined" && bazaarCanvas.ctx) bazaarCanvas.render(); // el plano estaba oculto
}

function retryLoad() {
  if (AuthState.user) enterApp(AuthState.user);
}

function showLogin(message = "", note = "") {
  AuthState.user = null;
  setAccessToken(null);
  if (typeof clearServerData === "function") clearServerData(); // no dejar datos del usuario anterior en memoria
  document.body.classList.add("auth-locked");
  _auth("auth-password").value = "";
  authShowMsg("auth-login-msg", message);
  const noteEl = _auth("auth-login-note");
  noteEl.textContent = note;
  noteEl.hidden = !note;
  authSetView("login");
  setTimeout(() => _auth(_auth("auth-email").value ? "auth-password" : "auth-email").focus(), 0);
}

/** Arranque: pase lo que pase, la pantalla termina en la app o en el login (nunca se queda en "Verificando…"). */
async function initAuth() {
  try {
    await _initAuth();
  } catch (err) {
    console.error("initAuth:", err);
    showLogin(`No se pudo iniciar: ${err.message || err}`);
  }
}

async function _initAuth() {
  authSetView("loading");
  _auth("auth-loading-text").textContent = "Verificando tu sesión…";
  const token = new URLSearchParams(location.search).get("invitacion");
  let session = null;
  let offline = false;
  try { session = await refreshSession(); } catch (err) { offline = err.status === 0; }

  if (token) {
    try {
      AuthState.invitation = await apiFetch(`/invitations/${encodeURIComponent(token)}`, { auth: false });
      AuthState.invitationToken = token;
    } catch (err) {
      if (err.status === 0) return showLogin(authErrorText(err)); // se conserva el enlace para reintentar al recargar
      clearInvitationFromUrl();
      if (session) return enterApp(session.user);
      return showLogin("La invitación no es válida o ya venció. Pide una nueva al líder del bazar.");
    }
    return showInvite(session ? session.user : null);
  }
  if (session) return enterApp(session.user);
  showLogin(offline ? authErrorText({ status: 0 }) : "");
}

async function logout() {
  let warning = "";
  try { await apiFetch("/auth/logout", { method: "POST", auth: false }); }
  catch { warning = "No se pudo avisar al servidor: tu sesión podría seguir activa en este navegador."; }
  _auth("backup-menu")?.classList.remove("open");
  _auth("settings-menu")?.classList.remove("open");
  showLogin(warning);
}

window.addEventListener("bazarix:session-expired", () => {
  if (AuthState.user) showLogin("Tu sesión expiró. Inicia sesión de nuevo.");
});

// ── Login ──────────────────────────────────────────────────────
async function submitLogin(event) {
  event.preventDefault();
  authShowMsg("auth-login-msg", "");
  authBusy("auth-login-btn", true);
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST", auth: false,
      body: { email: _auth("auth-email").value.trim(), password: _auth("auth-password").value },
    });
    setAccessToken(data.accessToken);
    _auth("auth-password").value = "";
    if (AuthState.invitationToken) { AuthState.pendingUser = data.user; await acceptInvitationLogged(); }
    else enterApp(data.user);
  } catch (err) {
    authShowMsg("auth-login-msg", authErrorText(err, "login"));
  } finally {
    authBusy("auth-login-btn", false);
  }
}

// ── Invitaciones ───────────────────────────────────────────────
function showInvite(user) {
  const inv = AuthState.invitation;
  AuthState.pendingUser = user;
  const role = inv.roleName || { coordinador: "Coordinador", lider: "Líder" }[inv.role] || inv.role;
  _auth("auth-invite-text").textContent =
    `Te invitaron a colaborar en “${inv.bazaarName}” con el rol de ${role}.` +
    (!user && inv.emailRestringido ? " Esta invitación es para un correo específico: usa ese correo." : "");
  _auth("auth-invite-logged").hidden = !user;
  _auth("auth-register").hidden = Boolean(user);
  if (user) _auth("auth-invite-accept").textContent = `Unirme como ${user.name}`;
  authShowMsg("auth-invite-msg", "");
  authSetView("invite");
}

function showLoginForInvite() {
  showLogin("", `Inicia sesión para aceptar la invitación a “${AuthState.invitation?.bazaarName ?? ""}”.`);
}

async function switchInviteAccount() {
  try { await apiFetch("/auth/logout", { method: "POST", auth: false }); } catch { /* se pide iniciar sesión igual */ }
  showLoginForInvite();
}

async function finishInvitation(user, message) {
  clearInvitationFromUrl();
  AuthState.invitation = null;
  AuthState.invitationToken = null;
  AuthState.pendingUser = null;
  await enterApp(user);
  if (typeof showToast === "function") showToast(message);
}

async function acceptInvitationLogged() {
  const user = AuthState.pendingUser;
  const name = AuthState.invitation?.bazaarName ?? "el bazar";
  if (!user || !AuthState.invitationToken) return;
  authBusy("auth-invite-accept", true);
  try {
    await apiFetch(`/invitations/${encodeURIComponent(AuthState.invitationToken)}/accept`, { method: "POST", body: {} });
    finishInvitation(user, `✅ Te uniste a “${name}”`);
  } catch (err) {
    if (err.code === "ALREADY_MEMBER") return finishInvitation(user, `Ya eras miembro de “${name}”`);
    showInvite(user);
    authShowMsg("auth-invite-msg", authErrorText(err));
  } finally {
    authBusy("auth-invite-accept", false);
  }
}

async function submitRegister(event) {
  event.preventDefault();
  authShowMsg("auth-invite-msg", "");
  authBusy("auth-register-btn", true);
  try {
    const data = await apiFetch(`/invitations/${encodeURIComponent(AuthState.invitationToken)}/accept`, {
      method: "POST", auth: false,
      body: { name: _auth("auth-reg-name").value.trim(), email: _auth("auth-reg-email").value.trim(), password: _auth("auth-reg-password").value },
    });
    setAccessToken(data.accessToken); // cuenta nueva: el servidor ya devuelve la sesión
    _auth("auth-reg-password").value = "";
    finishInvitation(data.user, `✅ Cuenta creada. Te uniste a “${data.bazaar?.name ?? "el bazar"}”`);
  } catch (err) {
    authShowMsg("auth-invite-msg", authErrorText(err));
  } finally {
    authBusy("auth-register-btn", false);
  }
}