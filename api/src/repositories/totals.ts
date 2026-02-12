export interface TotalsRecord {
  auctionId: string;
  bidderId: string;
  bidderNumber: number;
  displayName: string;
  subtotal: number;
  total: number;
  paid: boolean;
  updatedAt: string;
}

export interface UpsertTotalsInput {
  auctionId: string;
  bidderId: string;
  bidderNumber: number;
  displayName: string;
  subtotal: number;
  total: number;
  paid: boolean;
}

export interface UpdateTotalsInput {
  bidderNumber?: number;
  displayName?: string;
  subtotal?: number;
  total?: number;
  paid?: boolean;
}

interface DocSnapshot<T> {
  exists: boolean;
  data(): T | undefined;
}

interface DocRef<T> {
  set(value: T): Promise<void>;
  get(): Promise<DocSnapshot<T>>;
}

export interface CollectionRef<T> {
  doc(id: string): DocRef<T>;
}

export interface TotalsRepositoryOptions {
  now?: () => string;
}

/**
 * Firestore-backed repository for bidder totals records.
 */
export class TotalsRepository {
  private readonly now: () => string;

  /**
   * @param {CollectionRef<TotalsRecord>} collection
   * @param {TotalsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<TotalsRecord>,
    options: TotalsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
  }

  /**
   * Creates or replaces totals for a bidder.
   * @param {UpsertTotalsInput} input
   * @return {Promise<TotalsRecord>}
   */
  async upsertTotals(input: UpsertTotalsInput): Promise<TotalsRecord> {
    const record: TotalsRecord = {
      ...input,
      updatedAt: this.now(),
    };

    await this.collection.doc(this.getDocId(input.auctionId, input.bidderId))
      .set(record);
    return record;
  }

  /**
   * Gets totals by auction and bidder.
   * @param {string} auctionId
   * @param {string} bidderId
   * @return {Promise<TotalsRecord|null>}
   */
  async getTotals(
    auctionId: string,
    bidderId: string
  ): Promise<TotalsRecord | null> {
    const docRef = this.collection.doc(this.getDocId(auctionId, bidderId));
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates existing totals.
   * @param {string} auctionId
   * @param {string} bidderId
   * @param {UpdateTotalsInput} updates
   * @return {Promise<TotalsRecord|null>}
   */
  async updateTotals(
    auctionId: string,
    bidderId: string,
    updates: UpdateTotalsInput
  ): Promise<TotalsRecord | null> {
    const existing = await this.getTotals(auctionId, bidderId);
    if (!existing) {
      return null;
    }

    const updated: TotalsRecord = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    await this.collection.doc(this.getDocId(auctionId, bidderId)).set(updated);
    return updated;
  }

  /**
   * Builds a stable totals document ID.
   * @param {string} auctionId
   * @param {string} bidderId
   * @return {string}
   */
  private getDocId(auctionId: string, bidderId: string): string {
    return `${auctionId}:${bidderId}`;
  }
}
