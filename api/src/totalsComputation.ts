import {type BidRecord} from "./repositories/bids.js";

export interface BidderComputedTotals {
  bidderId: string;
  subtotal: number;
  total: number;
}

/**
 * Computes bidder totals from the winning (current high) bid per item.
 * @param {BidRecord[]} bids
 * @return {BidderComputedTotals[]}
 */
export function computeBidderTotalsFromBids(
  bids: BidRecord[]
): BidderComputedTotals[] {
  const currentHighByItem = new Map<string, BidRecord>();

  for (const bid of bids) {
    const current = currentHighByItem.get(bid.itemId);
    if (!current) {
      currentHighByItem.set(bid.itemId, bid);
      continue;
    }

    if (bid.amount > current.amount) {
      currentHighByItem.set(bid.itemId, bid);
      continue;
    }

    if (bid.amount === current.amount) {
      if (bid.placedAt < current.placedAt) {
        currentHighByItem.set(bid.itemId, bid);
        continue;
      }

      if (bid.placedAt === current.placedAt && bid.id < current.id) {
        currentHighByItem.set(bid.itemId, bid);
      }
    }
  }

  const totalsByBidder = new Map<string, number>();
  for (const highBid of currentHighByItem.values()) {
    totalsByBidder.set(
      highBid.bidderId,
      (totalsByBidder.get(highBid.bidderId) || 0) + highBid.amount
    );
  }

  return [...totalsByBidder.entries()]
    .map(([bidderId, subtotal]) => ({
      bidderId,
      subtotal,
      total: subtotal,
    }))
    .sort((left, right) => left.bidderId.localeCompare(right.bidderId));
}
