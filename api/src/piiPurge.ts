import {getFirestore} from "firebase-admin/firestore";
import {getAppConfig} from "./config.js";
import {type AuctionStatus} from "./repositories/auctions.js";

export interface AuctionPurgeCandidate {
  id: string;
  status: AuctionStatus;
  updatedAt: string;
}

export interface PiiPurgeDependencies {
  listAuctionsForPurge: () => Promise<AuctionPurgeCandidate[]>;
  purgeAuctionPii: (auctionId: string) => Promise<number>;
}

export interface PiiPurgeResult {
  scanned: number;
  purgedAuctions: number;
  redactedUsers: number;
}

const RETENTION_DAYS = 180;

/**
 * Returns true when an auction is in Closed phase and older than retention.
 * @param {AuctionPurgeCandidate} auction
 * @param {Date} now
 * @return {boolean}
 */
export function isAuctionEligibleForPurge(
  auction: AuctionPurgeCandidate,
  now: Date
): boolean {
  if (auction.status !== "Closed") {
    return false;
  }

  const updatedAtMs = Date.parse(auction.updatedAt);
  if (Number.isNaN(updatedAtMs)) {
    return false;
  }

  const ageMs = now.getTime() - updatedAtMs;
  const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return ageMs >= retentionMs;
}

/**
 * Executes scheduled PII purge for eligible auctions.
 * @param {PiiPurgeDependencies} deps
 * @param {Date=} now
 * @return {Promise<PiiPurgeResult>}
 */
export async function runPiiPurgeJob(
  deps: PiiPurgeDependencies,
  now: Date = new Date()
): Promise<PiiPurgeResult> {
  const auctions = await deps.listAuctionsForPurge();
  let purgedAuctions = 0;
  let redactedUsers = 0;

  for (const auction of auctions) {
    if (!isAuctionEligibleForPurge(auction, now)) {
      continue;
    }

    const redacted = await deps.purgeAuctionPii(auction.id);
    purgedAuctions += 1;
    redactedUsers += redacted;
  }

  return {
    scanned: auctions.length,
    purgedAuctions,
    redactedUsers,
  };
}

/**
 * Creates Firestore-backed dependencies for scheduled purge.
 * @return {PiiPurgeDependencies}
 */
export function createPiiPurgeDependencies(): PiiPurgeDependencies {
  const db = getFirestore();
  const auctionsCollection = db.collection(getAppConfig().collections.auctions);
  const usersCollection = db.collection(getAppConfig().collections.users);

  return {
    listAuctionsForPurge: async () => {
      const snapshot = await auctionsCollection.get();
      return snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: (data.id as string | undefined) || doc.id,
          status: (data.status as AuctionStatus) || "Setup",
          updatedAt:
            (data.updatedAt as string | undefined) ||
            new Date(0).toISOString(),
        };
      });
    },
    purgeAuctionPii: async (auctionId: string) => {
      const usersSnapshot = await usersCollection
        .where("lastAuctionId", "==", auctionId)
        .get();

      await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
          const user = doc.data() as Record<string, unknown>;
          const redacted = redactUserPii(user, new Date().toISOString());
          await doc.ref.set(
            redacted,
            {merge: true}
          );
        })
      );

      return usersSnapshot.docs.length;
    },
  };
}

/**
 * Redacts PII fields while preserving non-PII user fields.
 * @param {Record<string, unknown>} user
 * @param {string} nowIso
 * @return {Record<string, unknown>}
 */
export function redactUserPii(
  user: Record<string, unknown>,
  nowIso: string
): Record<string, unknown> {
  return {
    ...user,
    email: null,
    phone: null,
    displayName: "Redacted User",
    updatedAt: nowIso,
  };
}
