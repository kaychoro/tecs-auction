const { health } = require("./handlers/health");
const { listAuctions, createAuction } = require("./handlers/auctions");
const { requireAuth } = require("./auth");

function normalizePath(req) {
  const rawPath = req.path || new URL(req.url, "http://localhost").pathname;
  return rawPath.startsWith("/api/") ? rawPath.slice(4) : rawPath;
}

function jsonError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

async function route(req, res) {
  const path = normalizePath(req);
  const method = req.method || "GET";

  if (path === "/health") {
    if (method !== "GET") {
      return jsonError(res, 405, "method_not_allowed", "Method not allowed");
    }
    return health(req, res);
  }

  try {
    req.user = await requireAuth(req);
  } catch (err) {
    const status = err.status || 401;
    const code = err.code || "unauthorized";
    const message = err.message || "Unauthorized";
    return jsonError(res, status, code, message);
  }

  if (path === "/auctions") {
    if (method === "GET") {
      return listAuctions(req, res);
    }
    if (method === "POST") {
      return createAuction(req, res);
    }
    return jsonError(res, 405, "method_not_allowed", "Method not allowed");
  }

  return jsonError(res, 404, "not_found", "Not found");
}

module.exports = { route };
