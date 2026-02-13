const test = require('node:test');
const assert = require('node:assert/strict');

const {createApiHandler} = require('../lib/api.js');

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

test('integration: totals update with payment and pickup status changes', async () => {
  const users = new Map([
    ['bidder-1', {
      id: 'bidder-1',
      role: 'Bidder',
      email: 'b1@example.com',
      phone: '555-0001',
      displayName: 'Bidder One',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    ['admin-3', {
      id: 'admin-3',
      role: 'AdminL3',
      email: 'a3@example.com',
      phone: '555-0003',
      displayName: 'Admin Three',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  ]);

  const auction = {
    id: 'auction-1',
    name: 'Spring',
    status: 'Open',
    timeZone: 'America/New_York',
    phaseSchedule: null,
    auctionCode: 'SPRING1',
    notificationSettings: {inAppEnabled: true},
    paymentUrl: null,
    createdBy: 'admin-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const item = {
    id: 'item-1',
    auctionId: 'auction-1',
    name: 'Gift Basket',
    description: null,
    type: 'silent',
    startingPrice: 50,
    image: null,
    pickedUp: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const memberships = new Map([
    ['auction-1:bidder-1', {
      auctionId: 'auction-1',
      userId: 'bidder-1',
      roleOverride: null,
      status: 'active',
      bidderNumber: 7,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    ['auction-1:admin-3', {
      auctionId: 'auction-1',
      userId: 'admin-3',
      roleOverride: null,
      status: 'active',
      bidderNumber: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  ]);
  const bids = [];
  const totals = new Map();

  const handler = createApiHandler({
    authenticate: async (authorizationHeader) => ({
      uid: (authorizationHeader || '').replace('Bearer ', ''),
    }),
    getUserById: async (userId) => users.get(userId) || null,
    getMembership: async (auctionId, userId) =>
      memberships.get(`${auctionId}:${userId}`) || null,
    getItemById: async (itemId) => (itemId === item.id ? item : null),
    getAuctionById: async (auctionId) => (auctionId === auction.id ? auction : null),
    createBid: async (input) => {
      const record = {
        id: `bid-${bids.length + 1}`,
        auctionId: input.auctionId,
        itemId: input.itemId,
        bidderId: input.bidderId,
        amount: input.amount,
        placedAt: new Date().toISOString(),
      };
      bids.push(record);
      return record;
    },
    getCurrentHighBid: async (itemId) =>
      bids.filter((bid) => bid.itemId === itemId).sort((a, b) => b.amount - a.amount)[0] || null,
    createAuditLog: async () => ({id: 'audit-1'}),
    getTotals: async (auctionId, bidderId) => totals.get(`${auctionId}:${bidderId}`) || null,
    upsertTotals: async (input) => {
      const record = {...input, updatedAt: new Date().toISOString()};
      totals.set(`${input.auctionId}:${input.bidderId}`, record);
      return record;
    },
    updateItem: async (_itemId, updates) => {
      Object.assign(item, updates);
      return item;
    },
    createNotification: async () => ({id: 'n1'}),
  });

  const bidReq = createMockRequest('POST', '/items/item-1/bids', 'bidder-1', {amount: 120});
  const bidRes = createMockResponse();
  await handler(bidReq, bidRes);
  assert.equal(bidRes.statusCode, 200);

  const paymentReq = createMockRequest(
    'PATCH',
    '/auctions/auction-1/payments/bidder-1',
    'admin-3',
    {paid: true}
  );
  const paymentRes = createMockResponse();
  await handler(paymentReq, paymentRes);
  assert.equal(paymentRes.statusCode, 200);
  assert.equal(paymentRes.body.paid, true);

  const pickupReq = createMockRequest(
    'PATCH',
    '/auctions/auction-1/pickup/item-1',
    'admin-3',
    {pickedUp: true}
  );
  const pickupRes = createMockResponse();
  await handler(pickupReq, pickupRes);
  assert.equal(pickupRes.statusCode, 200);
  assert.equal(pickupRes.body.pickedUp, true);
});
