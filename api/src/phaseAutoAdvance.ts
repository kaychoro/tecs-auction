import {getFirestore} from "firebase-admin/firestore";
import {getAppConfig} from "./config.js";
import {
  type AuctionRecord,
  type AuctionStatus,
} from "./repositories/auctions.js";

export interface AuctionPhaseCandidate {
  id: string;
  status: AuctionStatus;
  updatedAt: string;
  phaseSchedule?: Record<string, unknown> | null;
}

export interface PhaseAutoAdvanceDependencies {
  listAuctionsForPhaseAdvance: () => Promise<AuctionPhaseCandidate[]>;
  advanceAuctionPhaseIfUnchanged: (input: {
    auctionId: string;
    expectedUpdatedAt: string;
    toStatus: AuctionStatus;
    nowIso: string;
  }) => Promise<boolean>;
}

export interface PhaseAutoAdvanceResult {
  scanned: number;
  advanced: number;
}

const STATUS_ORDER: AuctionStatus[] = [
  "Setup",
  "Ready",
  "Open",
  "Pending",
  "Complete",
  "Closed",
];

const SCHEDULE_KEY_BY_STATUS: Record<string, string> = {
  Ready: "readyAt",
  Open: "openAt",
  Pending: "pendingAt",
  Complete: "completeAt",
  Closed: "closedAt",
};

/**
 * Evaluates scheduled phase transitions and applies safe, idempotent updates.
 * @param {PhaseAutoAdvanceDependencies} deps
 * @param {Date=} now
 * @return {Promise<PhaseAutoAdvanceResult>}
 */
export async function runPhaseAutoAdvanceJob(
  deps: PhaseAutoAdvanceDependencies,
  now: Date = new Date()
): Promise<PhaseAutoAdvanceResult> {
  const candidates = await deps.listAuctionsForPhaseAdvance();
  let advanced = 0;

  for (const auction of candidates) {
    const target = resolveTargetStatus(auction.phaseSchedule, now);
    if (!target) {
      continue;
    }

    if (getStatusRank(target) <= getStatusRank(auction.status)) {
      continue;
    }

    const changed = await deps.advanceAuctionPhaseIfUnchanged({
      auctionId: auction.id,
      expectedUpdatedAt: auction.updatedAt,
      toStatus: target,
      nowIso: now.toISOString(),
    });

    if (changed) {
      advanced += 1;
    }
  }

  return {
    scanned: candidates.length,
    advanced,
  };
}

/**
 * Creates default Firestore-backed dependencies for phase auto-advance.
 * @return {PhaseAutoAdvanceDependencies}
 */
export function createPhaseAutoAdvanceDependencies():
PhaseAutoAdvanceDependencies {
  const db = getFirestore();
  const auctionsCollection = db.collection(getAppConfig().collections.auctions);

  return {
    listAuctionsForPhaseAdvance: async () => {
      const snapshot = await auctionsCollection.get();
      return snapshot.docs.map((doc) => {
        const data = doc.data() as AuctionRecord;
        return {
          id: data.id || doc.id,
          status: data.status,
          updatedAt: data.updatedAt,
          phaseSchedule: data.phaseSchedule,
        };
      });
    },
    advanceAuctionPhaseIfUnchanged: async (input) => {
      const auctionRef = auctionsCollection.doc(input.auctionId);
      return db.runTransaction(async (tx) => {
        const currentSnapshot = await tx.get(auctionRef);
        if (!currentSnapshot.exists) {
          return false;
        }

        const current = currentSnapshot.data() as AuctionRecord;
        if (current.updatedAt !== input.expectedUpdatedAt) {
          return false;
        }

        if (getStatusRank(input.toStatus) <= getStatusRank(current.status)) {
          return false;
        }

        const updated: AuctionRecord = {
          ...current,
          status: input.toStatus,
          updatedAt: input.nowIso,
        };
        tx.set(auctionRef, updated as never);
        return true;
      });
    },
  };
}

/**
 * Resolves the furthest phase that should be active based on schedule
 * timestamps.
 * @param {Record<string, unknown>|null|undefined} phaseSchedule
 * @param {Date} now
 * @return {AuctionStatus|null}
 */
export function resolveTargetStatus(
  phaseSchedule: Record<string, unknown> | null | undefined,
  now: Date
): AuctionStatus | null {
  if (!phaseSchedule) {
    return null;
  }

  let target: AuctionStatus | null = null;
  for (const status of STATUS_ORDER) {
    const scheduleKey = SCHEDULE_KEY_BY_STATUS[status];
    if (!scheduleKey) {
      continue;
    }

    const rawTime = phaseSchedule[scheduleKey];
    if (typeof rawTime !== "string") {
      continue;
    }

    const scheduledTime = Date.parse(rawTime);
    if (Number.isNaN(scheduledTime)) {
      continue;
    }

    if (scheduledTime <= now.getTime()) {
      target = status;
    }
  }

  return target;
}

/**
 * Returns sortable rank for AuctionStatus values.
 * @param {AuctionStatus} status
 * @return {number}
 */
export function getStatusRank(status: AuctionStatus): number {
  return STATUS_ORDER.indexOf(status);
}
