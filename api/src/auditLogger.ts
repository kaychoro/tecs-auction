import {
  type AuditLogRecord,
  type CreateAuditLogInput,
} from "./repositories/auditLogs.js";

export interface AuditLogWriter {
  createAuditLog(input: CreateAuditLogInput): Promise<AuditLogRecord>;
}

export interface LogActionInput {
  auctionId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Shared helper for writing validated audit log entries.
 */
export class AuditLogger {
  /**
   * @param {AuditLogWriter} writer
   */
  constructor(private readonly writer: AuditLogWriter) {}

  /**
   * Validates required fields and writes an audit log entry.
   * @param {LogActionInput} input
   * @return {Promise<AuditLogRecord>}
   */
  async logAction(input: LogActionInput): Promise<AuditLogRecord> {
    this.assertNonEmpty(input.auctionId, "auctionId");
    this.assertNonEmpty(input.actorUserId, "actorUserId");
    this.assertNonEmpty(input.action, "action");
    this.assertNonEmpty(input.targetType, "targetType");
    this.assertNonEmpty(input.targetId, "targetId");

    return this.writer.createAuditLog({
      auctionId: input.auctionId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata || {},
    });
  }

  /**
   * Ensures a required field is present and non-empty.
   * @param {string} value
   * @param {string} fieldName
   */
  private assertNonEmpty(value: string, fieldName: string): void {
    if (!value || !value.trim()) {
      throw new Error(`Missing required audit field: ${fieldName}`);
    }
  }
}
