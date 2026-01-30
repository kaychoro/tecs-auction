const { health } = require("./handlers/health");

function normalizePath(req) {
  const rawPath = req.path || new URL(req.url, "http://localhost").pathname;
  return rawPath.startsWith("/api/") ? rawPath.slice(4) : rawPath;
}

function jsonError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

function route(req, res) {
  const path = normalizePath(req);
  const method = req.method || "GET";

  if (path === "/health") {
    if (method !== "GET") {
      return jsonError(res, 405, "method_not_allowed", "Method not allowed");
    }
    return health(req, res);
  }

  return jsonError(res, 404, "not_found", "Not found");
}

module.exports = { route };
