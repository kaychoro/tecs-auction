const test = require('node:test');
const assert = require('node:assert/strict');

const {createApiHandler} = require('../lib/api.js');

function createMockRequest(method, path, authorizationHeader, body = {}) {
  return {
    method,
    path,
    body,
    header(name) {
      if (name.toLowerCase() === 'authorization') {
        return authorizationHeader;
      }
      return undefined;
    },
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createBaseDeps(overrides = {}) {
  return {
    authenticate: async () => ({uid: 'admin-1'}),
    getUserById: async () => ({
      id: 'admin-1',
      role: 'AdminL1',
      email: 'admin1@example.com',
      phone: '555-0001',
      displayName: 'Admin One',
      createdAt: '2026-02-13T04:00:00.000Z',
      updatedAt: '2026-02-13T04:00:00.000Z',
    }),
    purgeAuctionPii: async () => 4,
    ...overrides,
  };
}

test('POST /admin/purge-pii purges auction PII for AdminL1', async () => {
  const handler = createApiHandler(createBaseDeps());
  const req = createMockRequest(
    'POST',
    '/admin/purge-pii',
    'Bearer token',
    {auctionId: 'auction-1'}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.auctionId, 'auction-1');
  assert.equal(res.body.redactedUsers, 4);
});

test('POST /admin/purge-pii returns 403 for non-L1 role', async () => {
  const handler = createApiHandler(createBaseDeps({
    getUserById: async () => ({
      id: 'admin-2',
      role: 'AdminL2',
      email: 'admin2@example.com',
      phone: '555-0002',
      displayName: 'Admin Two',
      createdAt: '2026-02-13T04:00:00.000Z',
      updatedAt: '2026-02-13T04:00:00.000Z',
    }),
  }));
  const req = createMockRequest(
    'POST',
    '/admin/purge-pii',
    'Bearer token',
    {auctionId: 'auction-1'}
  );
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, 'role_forbidden');
});
