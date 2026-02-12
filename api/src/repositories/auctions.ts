import {randomUUID} from "node:crypto";

export type AuctionStatus =
  "Setup" | "Ready" | "Open" | "Pending" | "Complete" | "Closed";

export interface AuctionNotificationSettings {
  inAppEnabled: boolean;
}

export interface AuctionRecord {
  id: string;
  name: string;
  status: AuctionStatus;
  timeZone: string;
  auctionCode: string;
  phaseSchedule?: Record<string, unknown> | null;
  notificationSettings: AuctionNotificationSettings;
  paymentUrl?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuctionInput {
  name: string;
  status: AuctionStatus;
  timeZone: string;
  auctionCode: string;
  notificationSettings?: AuctionNotificationSettings;
  paymentUrl?: string | null;
  createdBy: string;
}

export interface UpdateAuctionInput {
  name?: string;
  status?: AuctionStatus;
  timeZone?: string;
  auctionCode?: string;
  phaseSchedule?: Record<string, unknown> | null;
  notificationSettings?: AuctionNotificationSettings;
  paymentUrl?: string | null;
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

export interface AuctionsRepositoryOptions {
  now?: () => string;
  idGenerator?: () => string;
}

/**
 * Firestore-backed repository for auction records.
 */
export class AuctionsRepository {
  private readonly now: () => string;
  private readonly idGenerator: () => string;

  /**
   * @param {CollectionRef<AuctionRecord>} collection
   * @param {AuctionsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<AuctionRecord>,
    options: AuctionsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => randomUUID());
  }

  /**
   * Creates an auction with generated ID and timestamps.
   * @param {CreateAuctionInput} input
   * @return {Promise<AuctionRecord>}
   */
  async createAuction(input: CreateAuctionInput): Promise<AuctionRecord> {
    const id = this.idGenerator();
    const now = this.now();
    const record: AuctionRecord = {
      id,
      name: input.name,
      status: input.status,
      timeZone: input.timeZone,
      auctionCode: input.auctionCode,
      notificationSettings: input.notificationSettings || {inAppEnabled: true},
      paymentUrl: input.paymentUrl || null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(id).set(record);
    return record;
  }

  /**
   * Gets an auction by ID.
   * @param {string} auctionId
   * @return {Promise<AuctionRecord|null>}
   */
  async getAuctionById(auctionId: string): Promise<AuctionRecord | null> {
    const snapshot = await this.collection.doc(auctionId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates an auction if present.
   * @param {string} auctionId
   * @param {UpdateAuctionInput} updates
   * @return {Promise<AuctionRecord|null>}
   */
  async updateAuction(
    auctionId: string,
    updates: UpdateAuctionInput
  ): Promise<AuctionRecord | null> {
    const existing = await this.getAuctionById(auctionId);
    if (!existing) {
      return null;
    }

    const updated: AuctionRecord = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    await this.collection.doc(auctionId).set(updated);
    return updated;
  }
}
