const test = require('node:test');
const assert = require('node:assert/strict');

const {createApiHandler} = require('../lib/api.js');
const {runPhaseAutoAdvanceJob} = require('../lib/phaseAutoAdvance.js');

function createMockRequest(method, path, uid, body = {}) {
  return {
    method,
    path,
    body,
    query: {},
    header(name) {
      if (name.toLowerCase() === 'authorization') {
        return `Bearer ${uid}`;
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

test('integration: manual phase override takes precedence over auto-advance', async () => {
  const auction = {
    id: 'auction-1',
    name: 'Spring',
    status: 'Open',
    timeZone: 'America/New_York',
    phaseSchedule: {
      pendingAt: '2026-02-01T00:00:00.000Z',
      completeAt: '2026-02-02T00:00:00.000Z',
      closedAt: '2026-02-03T00:00:00.000Z',
    },
    auctionCode: 'SPRING1',
    notificationSettings: {inAppEnabled: true},
    paymentUrl: null,
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const handler = createApiHandler({
    authenticate: async () => ({uid: 'admin-1'}),
    getUserById: async () => ({
      id: 'admin-1',
      role: 'AdminL1',
      email: 'admin1@example.com',
      phone: '555-0001',
      displayName: 'Admin One',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
    updateAuctionPhase: async (_auctionId, updates) => {
      auction.status = updates.status;
      auction.updatedAt = '2026-02-10T00:00:00.000Z';
      return auction;
    },
    getAuctionById: async () => auction,
  });

  const patchReq = createMockRequest('PATCH', '/auctions/auction-1/phase', 'admin-1', {
    status: 'Closed',
  });
  const patchRes = createMockResponse();
  await handler(patchReq, patchRes);
  assert.equal(patchRes.statusCode, 200);
  assert.equal(auction.status, 'Closed');

  const staleSnapshot = {
    id: 'auction-1',
    status: 'Open',
    updatedAt: '2026-01-01T00:00:00.000Z',
    phaseSchedule: auction.phaseSchedule,
  };

  const result = await runPhaseAutoAdvanceJob(
    {
      listAuctionsForPhaseAdvance: async () => [staleSnapshot],
      advanceAuctionPhaseIfUnchanged: async (input) => {
        if (input.expectedUpdatedAt !== auction.updatedAt) {
          return false;
        }
        auction.status = input.toStatus;
        auction.updatedAt = input.nowIso;
        return true;
      },
    },
    new Date('2026-02-04T00:00:00.000Z')
  );

  assert.equal(result.advanced, 0);
  assert.equal(auction.status, 'Closed');
});
