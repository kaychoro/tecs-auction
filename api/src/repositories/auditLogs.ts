export interface AuditLogRecord {
  id: string;
  auctionId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditLogInput {
  auctionId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
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

export interface AuditLogsRepositoryOptions {
  now?: () => string;
  idGenerator?: () => string;
}

/**
 * Firestore-backed repository for audit logs.
 */
export class AuditLogsRepository {
  private readonly now: () => string;
  private readonly idGenerator: () => string;

  /**
   * @param {CollectionRef<AuditLogRecord>} collection
   * @param {AuditLogsRepositoryOptions=} options
   */
  constructor(
    private readonly collection: CollectionRef<AuditLogRecord>,
    options: AuditLogsRepositoryOptions = {}
  ) {
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => crypto.randomUUID());
  }

  /**
   * Creates an audit log entry.
   * @param {CreateAuditLogInput} input
   * @return {Promise<AuditLogRecord>}
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: this.idGenerator(),
      auctionId: input.auctionId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata || {},
      createdAt: this.now(),
    };

    await this.collection.doc(record.id).set(record);
    return record;
  }

  /**
   * Gets an audit log by ID.
   * @param {string} auditLogId
   * @return {Promise<AuditLogRecord|null>}
   */
  async getAuditLogById(auditLogId: string): Promise<AuditLogRecord | null> {
    const snapshot = await this.collection.doc(auditLogId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() || null;
  }
}
