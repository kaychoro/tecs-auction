export interface ImageVariant {
  width: number;
  url: string;
}

export interface ImageRecord {
  id: string;
  auctionId: string;
  itemId: string;
  storagePath: string;
  originalWidth: number;
  originalHeight: number;
  variants: ImageVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateImageInput {
  auctionId: string;
  itemId: string;
  storagePath: string;
  originalWidth: number;
  originalHeight: number;
  variants: ImageVariant[];
}

export interface UpdateImageInput {
  storagePath?: string;
  originalWidth?: number;
  originalHeight?: number;
  variants?: ImageVariant[];
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

export interface ImagesRepositoryOptions {
  now?: () => string;
  idGenerator?: () => string;
}

/**
 * Firestore-backed repository for item images.
 */
export class ImagesRepository {
  private readonly now: () => string;
  private readonly idGenerator: () => string;

  /**
   * @param {CollectionRef<ImageRecord>} collection
   * @param {ImagesRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<ImageRecord>,
    options: ImagesRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => crypto.randomUUID());
  }

  /**
   * Creates an image record with generated ID and timestamps.
   * @param {CreateImageInput} input
   * @return {Promise<ImageRecord>}
   */
  async createImage(input: CreateImageInput): Promise<ImageRecord> {
    const id = this.idGenerator();
    const now = this.now();
    const record: ImageRecord = {
      id,
      auctionId: input.auctionId,
      itemId: input.itemId,
      storagePath: input.storagePath,
      originalWidth: input.originalWidth,
      originalHeight: input.originalHeight,
      variants: input.variants,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(id).set(record);
    return record;
  }

  /**
   * Gets an image record by ID.
   * @param {string} imageId
   * @return {Promise<ImageRecord|null>}
   */
  async getImageById(imageId: string): Promise<ImageRecord | null> {
    const snapshot = await this.collection.doc(imageId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates an existing image record.
   * @param {string} imageId
   * @param {UpdateImageInput} updates
   * @return {Promise<ImageRecord|null>}
   */
  async updateImage(
    imageId: string,
    updates: UpdateImageInput
  ): Promise<ImageRecord | null> {
    const existing = await this.getImageById(imageId);
    if (!existing) {
      return null;
    }

    const updated: ImageRecord = {
      ...existing,
      ...updates,
      updatedAt: this.now(),
    };
    await this.collection.doc(imageId).set(updated);
    return updated;
  }
}
