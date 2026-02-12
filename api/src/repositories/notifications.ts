export interface NotificationRecord {
  id: string;
  auctionId: string;
  userId: string;
  type: string;
  message: string;
  refType: string;
  refId: string;
  createdAt: string;
  readAt?: string | null;
}

export interface CreateNotificationInput {
  auctionId: string;
  userId: string;
  type: string;
  message: string;
  refType: string;
  refId: string;
}

export interface UpdateNotificationInput {
  readAt?: string | null;
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

export interface NotificationsRepositoryOptions {
  now?: () => string;
  idGenerator?: () => string;
}

/**
 * Firestore-backed repository for notifications.
 */
export class NotificationsRepository {
  private readonly now: () => string;
  private readonly idGenerator: () => string;

  /**
   * @param {CollectionRef<NotificationRecord>} collection
   * @param {NotificationsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<NotificationRecord>,
    options: NotificationsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => crypto.randomUUID());
  }

  /**
   * Creates a notification record.
   * @param {CreateNotificationInput} input
   * @return {Promise<NotificationRecord>}
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      id: this.idGenerator(),
      auctionId: input.auctionId,
      userId: input.userId,
      type: input.type,
      message: input.message,
      refType: input.refType,
      refId: input.refId,
      createdAt: this.now(),
      readAt: null,
    };

    await this.collection.doc(record.id).set(record);
    return record;
  }

  /**
   * Gets a notification by ID.
   * @param {string} notificationId
   * @return {Promise<NotificationRecord|null>}
   */
  async getNotificationById(
    notificationId: string
  ): Promise<NotificationRecord | null> {
    const snapshot = await this.collection.doc(notificationId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }

  /**
   * Updates an existing notification.
   * @param {string} notificationId
   * @param {UpdateNotificationInput} updates
   * @return {Promise<NotificationRecord|null>}
   */
  async updateNotification(
    notificationId: string,
    updates: UpdateNotificationInput
  ): Promise<NotificationRecord | null> {
    const existing = await this.getNotificationById(notificationId);
    if (!existing) {
      return null;
    }

    const updated: NotificationRecord = {
      ...existing,
      ...updates,
    };

    await this.collection.doc(notificationId).set(updated);
    return updated;
  }
}
