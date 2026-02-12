import {type BidRecord} from "./bids.js";

export interface BidViewsRepositoryOptions {
  listBids: (itemId: string) => Promise<BidRecord[]>;
}

/**
 * Read-model query helpers for current item bid state.
 */
export class BidViewsRepository {
  /**
   * @param {BidViewsRepositoryOptions} options
   */
  constructor(private readonly options: BidViewsRepositoryOptions) {}

  /**
   * Returns the current highest bid for an item using deterministic ordering:
   * amount desc, placedAt asc, bidId asc.
   * @param {string} itemId
   * @return {Promise<BidRecord|null>}
   */
  async getCurrentHighBid(itemId: string): Promise<BidRecord | null> {
    const bids = await this.options.listBids(itemId);
    if (!bids.length) {
      return null;
    }

    const sorted = [...bids].sort((left, right) => {
      if (left.amount !== right.amount) {
        return right.amount - left.amount;
      }

      if (left.placedAt !== right.placedAt) {
        return left.placedAt.localeCompare(right.placedAt);
      }

      return left.id.localeCompare(right.id);
    });

    return sorted[0];
  }
}
