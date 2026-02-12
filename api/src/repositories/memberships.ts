import {type Role} from "../roles.js";

export interface MembershipRecord {
  auctionId: string;
  userId: string;
  roleOverride?: Role | null;
  status: "active" | "revoked";
  bidderNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipInput {
  auctionId: string;
  userId: string;
  roleOverride?: Role | null;
  status?: "active" | "revoked";
  bidderNumber?: number | null;
}

export interface UpdateMembershipInput {
  roleOverride?: Role | null;
  status?: "active" | "revoked";
  bidderNumber?: number | null;
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

export interface MembershipsRepositoryOptions {
  now?: () => string;
}

/**
 * Firestore-backed repository for auction memberships.
 */
export class MembershipsRepository {
  private readonly now: () => string;

  /**
   * @param {CollectionRef<MembershipRecord>} collection
   * @param {MembershipsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<MembershipRecord>,
    options: MembershipsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
  }

  /**
   * Creates a membership using auctionId:userId as the document key.
   * @param {CreateMembershipInput} input
   * @return {Promise<MembershipRecord>}
   */
  async createMembership(
    input: CreateMembershipInput
  ): Promise<MembershipRecord> {
    const now = this.now();
    const record: MembershipRecord = {
      auctionId: input.auctionId,
      userId: input.userId,
      roleOverride: input.roleOverride || null,
      status: input.status || "active",
      bidderNumber: input.bidderNumber || null,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(this.getDocId(input.auctionId, input.userId))
      .set(record);
    return record;
  }

  /**
   * Gets a membership by auction and user IDs.
   * @param {string} auctionId
   * @param {string} userId
   * @return {Promise<MembershipRecord|null>}
   */
  async getMembership(
    auctionId: string,
    userId: string
  ): Promise<MembershipRecord | null> {
    const snapshot = await this.collection.doc(this.getDocId(auctionId, userId))
      .get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates an existing membership.
   * @param {string} auctionId
   * @param {string} userId
   * @param {UpdateMembershipInput} updates
   * @return {Promise<MembershipRecord|null>}
   */
  async updateMembership(
    auctionId: string,
    userId: string,
    updates: UpdateMembershipInput
  ): Promise<MembershipRecord | null> {
    const existing = await this.getMembership(auctionId, userId);
    if (!existing) {
      return null;
    }

    const updated: MembershipRecord = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    await this.collection.doc(this.getDocId(auctionId, userId)).set(updated);
    return updated;
  }

  /**
   * Builds a stable membership document ID.
   * @param {string} auctionId
   * @param {string} userId
   * @return {string}
   */
  private getDocId(auctionId: string, userId: string): string {
    return `${auctionId}:${userId}`;
  }
}
