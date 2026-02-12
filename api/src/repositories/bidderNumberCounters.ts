export interface BidderNumberCounterRecord {
  auctionId: string;
  nextBidderNumber: number;
  updatedAt: string;
}

interface TxSnapshot<T> {
  exists: boolean;
  data(): T | undefined;
}

interface TxDocRef<T = unknown> {
  id: string;
  __type?: T;
}

interface Tx {
  get<T>(ref: TxDocRef<T>): Promise<TxSnapshot<T>>;
  set<T>(ref: TxDocRef<T>, value: T): void;
}

export interface CounterCollectionRef<T> {
  doc(id: string): TxDocRef<T>;
}

export interface TransactionRunner {
  runTransaction<T>(updateFn: (tx: Tx) => Promise<T>): Promise<T>;
}

export interface BidderNumberCountersRepositoryOptions {
  now?: () => string;
}

/**
 * Allocates unique bidder numbers per auction using a transaction counter.
 */
export class BidderNumberCountersRepository {
  private readonly now: () => string;

  /**
   * @param {TransactionRunner} db
   * @param {CounterCollectionRef<BidderNumberCounterRecord>} collection
   * @param {BidderNumberCountersRepositoryOptions=} options
   */
  constructor(
    private readonly db: TransactionRunner,
    private readonly collection:
      CounterCollectionRef<BidderNumberCounterRecord>,
    options: BidderNumberCountersRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
  }

  /**
   * Atomically allocates the next bidder number for a specific auction.
   * @param {string} auctionId
   * @return {Promise<number>}
   */
  async allocateNextBidderNumber(auctionId: string): Promise<number> {
    return this.db.runTransaction(async (tx) => {
      const counterRef = this.collection.doc(auctionId);
      const snapshot = await tx.get<BidderNumberCounterRecord>(counterRef);
      const existing = snapshot.data();
      const next = existing?.nextBidderNumber || 1;

      tx.set(counterRef, {
        auctionId,
        nextBidderNumber: next + 1,
        updatedAt: this.now(),
      });

      return next;
    });
  }
}
