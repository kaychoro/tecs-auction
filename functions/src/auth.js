const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

async function verifyIdToken(token) {
  return admin.auth().verifyIdToken(token);
}

async function requireAuth(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || !header.startsWith("Bearer ")) {
    const err = new Error("Missing bearer token");
    err.status = 401;
    err.code = "unauthorized";
    throw err;
  }
  const token = header.slice(7);
  const verifier = req.authVerifier || verifyIdToken;
  const decoded = await verifier(token);
  return decoded;
}

module.exports = { requireAuth, verifyIdToken };
