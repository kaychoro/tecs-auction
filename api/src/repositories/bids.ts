export interface BidRecord {
  id: string;
  auctionId: string;
  itemId: string;
  bidderId: string;
  amount: number;
  placedAt: string;
}

export interface CreateBidInput {
  auctionId: string;
  itemId: string;
  bidderId: string;
  amount: number;
}

interface DocRef<T> {
  set(value: T): Promise<void>;
}

export interface CollectionRef<T> {
  doc(id: string): DocRef<T>;
}

export interface TransactionContext {
  set<T>(docRef: DocRef<T>, value: T): void;
}

export type TransactionRunner = <T>(
  handler: (tx: TransactionContext) => Promise<T>
) => Promise<T>;

export interface BidsRepositoryOptions {
  now?: () => string;
  idGenerator?: () => string;
}

/**
 * Firestore-backed repository for bid writes.
 */
export class BidsRepository {
  private readonly now: () => string;
  private readonly idGenerator: () => string;

  /**
   * @param {CollectionRef<BidRecord>} collection
   * @param {TransactionRunner} runTransaction
   * @param {BidsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<BidRecord>,
    private readonly runTransaction: TransactionRunner,
    options: BidsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => crypto.randomUUID());
  }

  /**
   * Creates a bid record inside a transaction.
   * @param {CreateBidInput} input
   * @return {Promise<BidRecord>}
   */
  async createBid(input: CreateBidInput): Promise<BidRecord> {
    return this.runTransaction(async (tx) => {
      const record: BidRecord = {
        id: this.idGenerator(),
        auctionId: input.auctionId,
        itemId: input.itemId,
        bidderId: input.bidderId,
        amount: input.amount,
        placedAt: this.now(),
      };

      tx.set(this.collection.doc(record.id), record);
      return record;
    });
  }
}
