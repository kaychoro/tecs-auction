import {type Role} from "../roles.js";

export interface UserRecord {
  id: string;
  role: Role;
  email: string;
  phone: string;
  displayName: string;
  emailVerifiedAt?: string | null;
  lastAuctionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserInput {
  role?: Role;
  email?: string;
  phone?: string;
  displayName?: string;
  emailVerifiedAt?: string | null;
  lastAuctionId?: string | null;
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

export interface UsersRepositoryOptions {
  now?: () => string;
}

/**
 * Firestore-backed repository for users.
 */
export class UsersRepository {
  private readonly now: () => string;

  /**
   * @param {CollectionRef<UserRecord>} collection
   * @param {UsersRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<UserRecord>,
    options: UsersRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
  }

  /**
   * Creates or replaces a user record.
   * @param {UserRecord} record
   * @return {Promise<UserRecord>}
   */
  async upsertUser(record: UserRecord): Promise<UserRecord> {
    await this.collection.doc(record.id).set(record);
    return record;
  }

  /**
   * Gets a user by ID.
   * @param {string} userId
   * @return {Promise<UserRecord|null>}
   */
  async getUserById(userId: string): Promise<UserRecord | null> {
    const snapshot = await this.collection.doc(userId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates an existing user record.
   * @param {string} userId
   * @param {UpdateUserInput} updates
   * @return {Promise<UserRecord|null>}
   */
  async updateUser(
    userId: string,
    updates: UpdateUserInput
  ): Promise<UserRecord | null> {
    const existing = await this.getUserById(userId);
    if (!existing) {
      return null;
    }

    const updated: UserRecord = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    await this.collection.doc(userId).set(updated);
    return updated;
  }
}
