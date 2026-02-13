export type ItemType = "silent" | "live";

export interface ItemImageVariant {
  width: number;
  url: string;
}

export interface ItemImage {
  id: string;
  url: string;
  variants: ItemImageVariant[];
}

export interface ItemRecord {
  id: string;
  auctionId: string;
  name: string;
  description?: string | null;
  type: ItemType;
  startingPrice: number;
  image?: ItemImage | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemInput {
  auctionId: string;
  name: string;
  description?: string | null;
  type: ItemType;
  startingPrice: number;
  image?: ItemImage | null;
}

export interface UpdateItemInput {
  name?: string;
  description?: string | null;
  type?: ItemType;
  startingPrice?: number;
  image?: ItemImage | null;
}

interface DocSnapshot<T> {
  exists: boolean;
  data(): T | undefined;
}

interface DocRef<T> {
  set(value: T): Promise<void>;
  get(): Promise<DocSnapshot<T>>;
  delete(): Promise<void>;
}

export interface CollectionRef<T> {
  doc(id: string): DocRef<T>;
}

export interface ItemsRepositoryOptions {
  now?: () => string;
  idGenerator?: () => string;
}

/**
 * Firestore-backed repository for auction items.
 */
export class ItemsRepository {
  private readonly now: () => string;
  private readonly idGenerator: () => string;

  /**
   * @param {CollectionRef<ItemRecord>} collection
   * @param {ItemsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<ItemRecord>,
    options: ItemsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => crypto.randomUUID());
  }

  /**
   * Creates an item with generated ID and timestamps.
   * @param {CreateItemInput} input
   * @return {Promise<ItemRecord>}
   */
  async createItem(input: CreateItemInput): Promise<ItemRecord> {
    const id = this.idGenerator();
    const now = this.now();
    const record: ItemRecord = {
      id,
      auctionId: input.auctionId,
      name: input.name,
      description: input.description || null,
      type: input.type,
      startingPrice: input.startingPrice,
      image: input.image || null,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(id).set(record);
    return record;
  }

  /**
   * Gets an item by ID.
   * @param {string} itemId
   * @return {Promise<ItemRecord|null>}
   */
  async getItemById(itemId: string): Promise<ItemRecord | null> {
    const snapshot = await this.collection.doc(itemId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates an existing item by ID.
   * @param {string} itemId
   * @param {UpdateItemInput} updates
   * @return {Promise<ItemRecord|null>}
   */
  async updateItem(
    itemId: string,
    updates: UpdateItemInput
  ): Promise<ItemRecord | null> {
    const existing = await this.getItemById(itemId);
    if (!existing) {
      return null;
    }

    const updated: ItemRecord = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };

    await this.collection.doc(itemId).set(updated);
    return updated;
  }

  /**
   * Deletes an item if it exists.
   * @param {string} itemId
   * @return {Promise<boolean>}
   */
  async deleteItem(itemId: string): Promise<boolean> {
    const existing = await this.getItemById(itemId);
    if (!existing) {
      return false;
    }

    await this.collection.doc(itemId).delete();
    return true;
  }
}
