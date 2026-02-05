const admin = require("firebase-admin");

function getDb(req) {
  return req.db || admin.firestore();
}

function jsonError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    const err = new Error("Forbidden");
    err.status = 403;
    err.code = "forbidden";
    throw err;
  }
}

function parseIntParam(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function safeJson(req) {
  if (req.body && typeof req.body !== "string") {
    return { ok: true, value: req.body };
  }
  if (!req.body) {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: JSON.parse(req.body) };
  } catch {
    return { ok: false };
  }
}

async function listAuctions(req, res) {
  const db = getDb(req);
  const user = req.user || {};
  const page = parseIntParam(req.query?.page, 1);
  const pageSize = parseIntParam(req.query?.page_size, 20);
  const offset = (page - 1) * pageSize;

  if (user.role === "AdminL1") {
    const snapshot = await db
      .collection("auctions")
      .orderBy("created_at", "desc")
      .offset(offset)
      .limit(pageSize)
      .get();
    const auctions = snapshot.docs.map((doc) => doc.data());
    return res.status(200).json({ auctions });
  }

  const membershipsSnapshot = await db
    .collection("users")
    .doc(user.uid)
    .collection("auction_memberships")
    .where("status", "==", "active")
    .get();

  if (membershipsSnapshot.empty) {
    return res.status(200).json({ auctions: [] });
  }

  const auctionRefs = membershipsSnapshot.docs.map((doc) =>
    db.collection("auctions").doc(doc.data().auction_id)
  );
  const auctionDocs = await db.getAll(...auctionRefs);
  const auctions = auctionDocs.filter((doc) => doc.exists).map((doc) => doc.data());
  return res.status(200).json({ auctions });
}

async function createAuction(req, res) {
  const db = getDb(req);
  const user = req.user || {};
  try {
    requireRole(user, ["AdminL1"]);
  } catch (err) {
    return jsonError(res, err.status || 403, err.code || "forbidden", err.message);
  }

  const parsed = safeJson(req);
  if (!parsed.ok) {
    return jsonError(res, 400, "invalid_json", "Invalid JSON body");
  }
  const { name, time_zone, phase_schedule, auction_code, payment_url } =
    parsed.value;

  if (!name || !time_zone || !phase_schedule || !auction_code) {
    return jsonError(res, 400, "invalid_request", "Missing required fields");
  }

  const docRef = db.collection("auctions").doc();
  const payload = {
    id: docRef.id,
    name,
    status: "Setup",
    time_zone,
    phase_schedule,
    auction_code,
    notification_settings: { in_app_enabled: true },
    payment_url: payment_url || null,
    created_by: user.uid,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  };

  await docRef.set(payload);
  const saved = await docRef.get();
  return res.status(201).json(saved.data());
}

module.exports = { listAuctions, createAuction };
