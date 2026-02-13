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

function sortBids(bids) {
  return [...bids].sort((left, right) => {
    if (left.amount !== right.amount) {
      return right.amount - left.amount;
    }
    if (left.placedAt !== right.placedAt) {
      return left.placedAt.localeCompare(right.placedAt);
    }
    return left.id.localeCompare(right.id);
  });
}

test('integration: join -> bid -> outbid -> notification', async () => {
  const users = new Map([
    ['bidder-1', {
      id: 'bidder-1',
      role: 'Bidder',
      email: 'b1@example.com',
      phone: '555-0001',
      displayName: 'Bidder One',
      lastAuctionId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    ['bidder-2', {
      id: 'bidder-2',
      role: 'Bidder',
      email: 'b2@example.com',
      phone: '555-0002',
      displayName: 'Bidder Two',
      lastAuctionId: null,
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const memberships = new Map();
  const bids = [];
  const notifications = [];
  const totals = new Map();
  let bidCounter = 0;
  let bidderNumber = 0;

  const handler = createApiHandler({
    authenticate: async (authorizationHeader) => ({
      uid: (authorizationHeader || '').replace('Bearer ', ''),
    }),
    getUserById: async (userId) => users.get(userId) || null,
    getMembership: async (auctionId, userId) =>
      memberships.get(`${auctionId}:${userId}`) || null,
    findAuctionsByCode: async (code) => (code === auction.auctionCode ? [auction] : []),
    allocateBidderNumber: async () => {
      bidderNumber += 1;
      return bidderNumber;
    },
    createMembership: async (input) => {
      const record = {
        auctionId: input.auctionId,
        userId: input.userId,
        roleOverride: null,
        status: 'active',
        bidderNumber: input.bidderNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memberships.set(`${input.auctionId}:${input.userId}`, record);
      return record;
    },
    updateUserLastAuctionId: async (userId, auctionId) => {
      const current = users.get(userId);
      if (!current) {
        return null;
      }
      const updated = {...current, lastAuctionId: auctionId};
      users.set(userId, updated);
      return updated;
    },
    getItemById: async (itemId) => (itemId === item.id ? item : null),
    getAuctionById: async (auctionId) => (auctionId === auction.id ? auction : null),
    createBid: async (input) => {
      bidCounter += 1;
      const record = {
        id: `bid-${bidCounter}`,
        auctionId: input.auctionId,
        itemId: input.itemId,
        bidderId: input.bidderId,
        amount: input.amount,
        placedAt: new Date().toISOString(),
      };
      bids.push(record);
      return record;
    },
    getCurrentHighBid: async (itemId) => {
      const current = sortBids(bids.filter((bid) => bid.itemId === itemId));
      return current[0] || null;
    },
    getTotals: async (auctionId, bidderId) => totals.get(`${auctionId}:${bidderId}`) || null,
    upsertTotals: async (input) => {
      const record = {...input, updatedAt: new Date().toISOString()};
      totals.set(`${input.auctionId}:${input.bidderId}`, record);
      return record;
    },
    createAuditLog: async () => ({id: 'audit-1'}),
    createNotification: async (input) => {
      const record = {...input, id: `n-${notifications.length + 1}`};
      notifications.push(record);
      return record;
    },
  });

  const joinOneReq = createMockRequest('POST', '/auctions/auction-1/join', 'bidder-1', {
    auctionCode: 'SPRING1',
  });
  const joinOneRes = createMockResponse();
  await handler(joinOneReq, joinOneRes);
  assert.equal(joinOneRes.statusCode, 200);

  const joinTwoReq = createMockRequest('POST', '/auctions/auction-1/join', 'bidder-2', {
    auctionCode: 'SPRING1',
  });
  const joinTwoRes = createMockResponse();
  await handler(joinTwoReq, joinTwoRes);
  assert.equal(joinTwoRes.statusCode, 200);

  const bidOneReq = createMockRequest('POST', '/items/item-1/bids', 'bidder-1', {amount: 100});
  const bidOneRes = createMockResponse();
  await handler(bidOneReq, bidOneRes);
  assert.equal(bidOneRes.statusCode, 200);

  const bidTwoReq = createMockRequest('POST', '/items/item-1/bids', 'bidder-2', {amount: 120});
  const bidTwoRes = createMockResponse();
  await handler(bidTwoReq, bidTwoRes);
  assert.equal(bidTwoRes.statusCode, 200);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, 'bidder-1');
  assert.equal(notifications[0].refId, 'item-1');
});
