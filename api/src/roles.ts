export type Role = "Bidder" | "AdminL3" | "AdminL2" | "AdminL1";

const ROLE_RANK: Record<Role, number> = {
  Bidder: 0,
  AdminL3: 1,
  AdminL2: 2,
  AdminL1: 3,
};

/**
 * Resolves the effective role for an auction.
 * L1 remains global; membership overrides can only down-scope privileges.
 * @param {Role} globalRole
 * @param {Role|null|undefined} roleOverride
 * @return {Role}
 */
export function resolveEffectiveRole(
  globalRole: Role,
  roleOverride?: Role | null
): Role {
  if (!roleOverride) {
    return globalRole;
  }

  if (globalRole === "AdminL1") {
    return "AdminL1";
  }

  const globalRank = ROLE_RANK[globalRole];
  const overrideRank = ROLE_RANK[roleOverride];
  return overrideRank <= globalRank ? roleOverride : globalRole;
}
