import {type Role} from "./roles.js";
import {buildErrorResponse, type ApiErrorResponse} from "./errors.js";

export interface MembershipRecord {
  auctionId: string;
  userId: string;
  status: "active" | "revoked";
  roleOverride?: Role | null;
}

/**
 * Enforces auction membership for non-L1 users.
 * @param {Role} role
 * @param {MembershipRecord|null|undefined} membership
 * @return {MembershipRecord|undefined}
 */
export function requireAuctionMembership(
  role: Role,
  membership?: MembershipRecord | null
): MembershipRecord | undefined {
  if (role === "AdminL1") {
    return undefined;
  }

  if (!membership || membership.status !== "active") {
    throw buildErrorResponse(
      403,
      "role_forbidden",
      "User is not an active member of this auction"
    );
  }

  return membership;
}

/**
 * Type guard for membership guard error results.
 * @param {unknown} error
 * @return {boolean}
 */
export function isMembershipError(error: unknown): error is ApiErrorResponse {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as Partial<ApiErrorResponse>;
  return maybeError.status === 403 &&
    maybeError.body?.error?.code === "role_forbidden";
}
