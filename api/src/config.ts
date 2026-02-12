export type EnvironmentName = "development" | "production" | "test";

export interface CollectionNames {
  auctions: string;
  users: string;
  memberships: string;
  bidderCounters: string;
  items: string;
  bids: string;
  notifications: string;
  totals: string;
  auditLogs: string;
}

export interface AppConfig {
  environment: EnvironmentName;
  projectId: string;
  collections: CollectionNames;
}

export const DEFAULT_COLLECTIONS: CollectionNames = {
  auctions: "auctions",
  users: "users",
  memberships: "auction_memberships",
  bidderCounters: "auction_bidder_counters",
  items: "items",
  bids: "bids",
  notifications: "notifications",
  totals: "totals",
  auditLogs: "audit_logs",
};

/**
 * Resolves NODE_ENV into the supported environment enum.
 * @param {string|undefined} envValue
 * @return {EnvironmentName}
 */
function resolveEnvironment(envValue: string | undefined): EnvironmentName {
  if (envValue === "production") {
    return "production";
  }
  if (envValue === "test") {
    return "test";
  }
  return "development";
}

/**
 * Resolves the active Firebase project ID for local and deployed runtimes.
 * @return {string}
 */
function resolveProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    "local-dev";
}

/**
 * Returns shared app-level configuration values.
 * @return {AppConfig}
 */
export function getAppConfig(): AppConfig {
  return {
    environment: resolveEnvironment(process.env.NODE_ENV),
    projectId: resolveProjectId(),
    collections: DEFAULT_COLLECTIONS,
  };
}
