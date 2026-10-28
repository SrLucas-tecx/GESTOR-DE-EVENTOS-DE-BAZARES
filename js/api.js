/**
 * BAZARIX — api.js (Sprint 4A)
 * Cliente HTTP del backend. El access token vive SOLO en memoria (nunca en localStorage);
 * la sesión larga es la cookie httpOnly "bzx_refresh", que el navegador envía a /auth/*.
 *
 *  - apiFetch(path, opts)  → JSON de la respuesta, o lanza ApiError.
 *  - Si el access token venció (401 TOKEN_EXPIRED) renueva con /auth/refresh y repite la petición UNA vez.
 *  - Si /auth/refresh responde RETRY (otra pestaña acaba de renovar) espera y reintenta.
 *  - Si la sesión ya no existe dispara el evento "bazarix:session-expired".
 *
 * API_BASE: por defecto http://localhost:4000. Para cambiarlo antes de cargar este archivo:
 *   <script>window.BAZARIX_API_URL = "https://mi-api.onrender.com";</script>
 * Dependencias: ninguna.
 */

const API_BASE = String(window.BAZARIX_API_URL || "http://localhost:4000").replace(/\/+$/, "");

let _accessToken = null;
let _refreshing = null; // promesa compartida: varias peticiones vencidas a la vez renuevan una sola vez

class ApiError extends Error {
  constructor(status, body, fallback) {
    super((body && body.error) || fallback || "Error desconocido");
    this.name = "ApiError";
    this.status = status; // 0 = sin conexión con el servidor
    this.code = (body && body.code) || (status === 0 ? "NETWORK" : "");
    this.details = (body && body.details) || null; // [{ campo, mensaje }] en errores 400
  }
}

const setAccessToken = (token) => { _accessToken = token || null; };
const getAccessToken = () => _accessToken;
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function _request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (auth && _accessToken) headers.Authorization = `Bearer ${_accessToken}`;
  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: payload, credentials: "include" });
  } catch {
    throw new ApiError(0, null, "No se pudo conectar con el servidor");
  }
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw ? { error: raw } : null; } // un 429 llega como texto plano
  if (!res.ok) throw new ApiError(res.status, data, `Error ${res.status}`);
  return data;
}

/** Renueva la sesión con la cookie. Devuelve { accessToken, user }. Lanza ApiError si no hay sesión. */
function refreshSession() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await _request("/auth/refresh", { method: "POST", auth: false });
        _accessToken = data.accessToken;
        return data;
      } catch (err) {
        if (err.code === "RETRY" && attempt < 2) { await _sleep(500); continue; }
        if (err.status === 401) _accessToken = null; // sin conexión (0) NO borra el token
        throw err;
      }
    }
  })().finally(() => { _refreshing = null; });
  return _refreshing;
}

/** Petición con renovación automática del token. opts: { method, body, auth } (auth:false = sin token). */
async function apiFetch(path, opts = {}) {
  try {
    return await _request(path, opts);
  } catch (err) {
    if (!(err.status === 401 && err.code === "TOKEN_EXPIRED" && opts.auth !== false)) throw err;
    try {
      await refreshSession();
    } catch (refreshErr) {
      if (refreshErr.status === 401) window.dispatchEvent(new CustomEvent("bazarix:session-expired"));
      throw refreshErr.status === 401 ? err : refreshErr;
    }
    return _request(path, opts); // un solo reintento
  }
}

const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: body ?? {} }),
  put: (path, body) => apiFetch(path, { method: "PUT", body: body ?? {} }),
  patch: (path, body) => apiFetch(path, { method: "PATCH", body: body ?? {} }),
  del: (path) => apiFetch(path, { method: "DELETE" }),
};
