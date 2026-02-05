const { test } = require("node:test");
const assert = require("node:assert/strict");
const { listAuctions, createAuction } = require("../src/handlers/auctions");

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createDb({ auctions = [], memberships = [] }) {
  return {
    _auctions: auctions,
    _memberships: memberships,
    collection(name) {
      if (name === "auctions") {
        return {
          orderBy: () => ({
            offset: () => ({
              limit: () => ({
                get: async () => ({
                  docs: this._auctions.map((doc) => ({
                    data: () => doc
                  }))
                })
              })
            })
          }),
          doc: (id) => ({
            id: id || `auto_${this._auctions.length + 1}`,
            set: async (data) => {
              this._auctions.push(data);
            },
            get: async () => ({
              data: () =>
                this._auctions.find(
                  (doc) => doc.id === (id || `auto_${this._auctions.length}`)
                )
            })
          })
        };
      }
      if (name === "users") {
        return {
          doc: () => ({
            collection: () => ({
              where: () => ({
                get: async () => ({
                  empty: this._memberships.length === 0,
                  docs: this._memberships.map((doc) => ({
                    data: () => doc
                  }))
                })
              })
            })
          })
        };
      }
      throw new Error("Unknown collection");
    },
    getAll: async (...refs) =>
      refs.map((ref) => ({
        exists: true,
        data: () => this._auctions.find((doc) => doc.id === ref.id)
      }))
  };
}

test("listAuctions returns all auctions for L1", async () => {
  const db = createDb({
    auctions: [{ id: "a1" }, { id: "a2" }]
  });
  const req = {
    user: { uid: "u1", role: "AdminL1" },
    query: {},
    db
  };
  const res = createRes();
  await listAuctions(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { auctions: [{ id: "a1" }, { id: "a2" }] });
});

test("listAuctions returns joined auctions for non-L1", async () => {
  const db = createDb({
    auctions: [{ id: "a1" }, { id: "a2" }],
    memberships: [{ auction_id: "a2", status: "active" }]
  });
  const req = {
    user: { uid: "u2", role: "AdminL2" },
    query: {},
    db
  };
  const res = createRes();
  await listAuctions(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { auctions: [{ id: "a2" }] });
});

test("createAuction forbids non-L1", async () => {
  const db = createDb({ auctions: [] });
  const req = {
    user: { uid: "u2", role: "AdminL2" },
    body: {},
    db
  };
  const res = createRes();
  await createAuction(req, res);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: { code: "forbidden", message: "Forbidden" }
  });
});

test("createAuction creates auction for L1", async () => {
  const db = createDb({ auctions: [] });
  const req = {
    user: { uid: "u1", role: "AdminL1" },
    body: {
      name: "Test Auction",
      time_zone: "America/Denver",
      phase_schedule: { Setup: { starts_at: "t1", ends_at: "t2" } },
      auction_code: "CODE1"
    },
    db
  };
  const res = createRes();
  await createAuction(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.name, "Test Auction");
  assert.equal(res.body.auction_code, "CODE1");
});

test("createAuction rejects invalid JSON", async () => {
  const db = createDb({ auctions: [] });
  const req = {
    user: { uid: "u1", role: "AdminL1" },
    body: "{not-json}",
    db
  };
  const res = createRes();
  await createAuction(req, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: { code: "invalid_json", message: "Invalid JSON body" }
  });
});
