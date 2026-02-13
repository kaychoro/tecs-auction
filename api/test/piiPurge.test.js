const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isAuctionEligibleForPurge,
  redactUserPii,
  runPiiPurgeJob,
} = require('../lib/piiPurge.js');

test('isAuctionEligibleForPurge selects closed auctions older than 180 days', () => {
  const now = new Date('2026-08-01T00:00:00.000Z');

  const eligible = isAuctionEligibleForPurge(
    {
      id: 'auction-old',
      status: 'Closed',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    now
  );
  const ineligibleOpen = isAuctionEligibleForPurge(
    {
      id: 'auction-open',
      status: 'Open',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    now
  );
  const ineligibleRecent = isAuctionEligibleForPurge(
    {
      id: 'auction-recent',
      status: 'Closed',
      updatedAt: '2026-07-15T00:00:00.000Z',
    },
    now
  );

  assert.equal(eligible, true);
  assert.equal(ineligibleOpen, false);
  assert.equal(ineligibleRecent, false);
});

test('runPiiPurgeJob purges only eligible auctions', async () => {
  const purged = [];
  const result = await runPiiPurgeJob(
    {
      listAuctionsForPurge: async () => [
        {
          id: 'auction-old',
          status: 'Closed',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'auction-open',
          status: 'Open',
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
      ],
      purgeAuctionPii: async (auctionId) => {
        purged.push(auctionId);
        return auctionId === 'auction-old' ? 3 : 0;
      },
    },
    new Date('2026-08-01T00:00:00.000Z')
  );

  assert.deepEqual(purged, ['auction-old']);
  assert.equal(result.scanned, 2);
  assert.equal(result.purgedAuctions, 1);
  assert.equal(result.redactedUsers, 3);
});

test('redactUserPii clears PII and keeps non-PII fields', () => {
  const redacted = redactUserPii(
    {
      id: 'user-1',
      role: 'Bidder',
      email: 'user@example.com',
      phone: '555-123-9999',
      displayName: 'Pat',
      lastAuctionId: 'auction-9',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    '2026-08-01T00:00:00.000Z'
  );

  assert.equal(redacted.email, null);
  assert.equal(redacted.phone, null);
  assert.equal(redacted.displayName, 'Redacted User');
  assert.equal(redacted.role, 'Bidder');
  assert.equal(redacted.lastAuctionId, 'auction-9');
  assert.equal(redacted.createdAt, '2025-01-01T00:00:00.000Z');
});
