import {type Request, type Response} from "express";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {authenticateRequest, isApiErrorResponse} from "./auth.js";
import {buildErrorResponse} from "./errors.js";
import {
  AuctionsRepository,
  type AuctionRecord,
} from "./repositories/auctions.js";
import {UsersRepository, type UserRecord} from "./repositories/users.js";

export interface ApiDependencies {
  authenticate:
    (authorizationHeader: string | undefined) => Promise<{uid: string}>;
  getUserById: (userId: string) => Promise<UserRecord | null>;
  createAuction: (
    input: {
      name: string;
      status: "Setup" | "Ready" | "Open" | "Pending" | "Complete" | "Closed";
      timeZone: string;
      auctionCode: string;
      paymentUrl?: string | null;
      createdBy: string;
    }
  ) => Promise<AuctionRecord>;
  updateAuction: (
    auctionId: string,
    updates: {name?: string; timeZone?: string; paymentUrl?: string | null}
  ) => Promise<AuctionRecord | null>;
  updateAuctionCode: (
    auctionId: string,
    auctionCode: string
  ) => Promise<AuctionRecord | null>;
  listAuctionsForActor: (actor: AuthenticatedActor) => Promise<AuctionRecord[]>;
  listJoinedAuctionsForUser: (userId: string) => Promise<AuctionRecord[]>;
  getAuctionById: (auctionId: string) => Promise<AuctionRecord | null>;
}

/**
 * Creates an HTTP API handler for the current function deployment.
 * @param {ApiDependencies=} providedDeps
 * @return {Function}
 */
export function createApiHandler(providedDeps?: ApiDependencies) {
  const deps = providedDeps || createDefaultDependencies();

  return async (req: Request, res: Response): Promise<void> => {
    if (req.method === "GET" && req.path === "/users/me") {
      await handleGetUsersMe(req, res, deps);
      return;
    }

    if (req.method === "POST" && req.path === "/auctions") {
      await handlePostAuctions(req, res, deps);
      return;
    }

    if (req.method === "GET" && req.path === "/auctions") {
      await handleGetAuctions(req, res, deps);
      return;
    }

    if (req.method === "GET" && req.path === "/auctions/joined") {
      await handleGetJoinedAuctions(req, res, deps);
      return;
    }

    const auctionCodeRoute = parseAuctionCodeRoute(req.path);
    if (req.method === "PATCH" && auctionCodeRoute) {
      await handlePatchAuctionCode(req, res, deps, auctionCodeRoute);
      return;
    }

    const auctionId = parseAuctionId(req.path);
    if (auctionId) {
      if (req.method === "PATCH") {
        await handlePatchAuction(req, res, deps, auctionId);
        return;
      }
      if (req.method === "GET") {
        await handleGetAuctionById(req, res, deps, auctionId);
        return;
      }
    }

    const notFound = buildErrorResponse(404, "not_found", "Endpoint not found");
    res.status(notFound.status).json(notFound.body);
  };
}

/**
 * Handles GET /users/me.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 */
async function handleGetUsersMe(
  req: Request,
  res: Response,
  deps: ApiDependencies
): Promise<void> {
  try {
    const authUser = await deps.authenticate(req.header("authorization"));
    const user = await deps.getUserById(authUser.uid);

    if (!user) {
      const notFound = buildErrorResponse(
        404,
        "user_not_found",
        "User profile not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    if (isApiErrorResponse(error)) {
      res.status(error.status).json(error.body);
      return;
    }

    const internalError = buildErrorResponse(
      500,
      "internal_error",
      "Unexpected server error"
    );
    res.status(internalError.status).json(internalError.body);
  }
}

/**
 * Handles POST /auctions.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 */
async function handlePostAuctions(
  req: Request,
  res: Response,
  deps: ApiDependencies
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageAuctions(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for auction management"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const name = normalizeRequiredString(body.name, "name");
    const timeZone = normalizeRequiredString(body.timeZone, "timeZone");
    const auctionCode = normalizeRequiredString(
      body.auctionCode,
      "auctionCode"
    );
    const paymentUrl = normalizeNullableString(body.paymentUrl);

    const auction = await deps.createAuction({
      name,
      status: "Setup",
      timeZone,
      auctionCode,
      paymentUrl,
      createdBy: actor.id,
    });
    res.status(200).json(auction);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles PATCH /auctions/:auctionId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePatchAuction(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageAuctions(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for auction management"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const updates = {
      name: normalizeOptionalString(body.name),
      timeZone: normalizeOptionalString(body.timeZone),
      paymentUrl: normalizeNullableString(body.paymentUrl),
    };

    if (!updates.name && !updates.timeZone &&
      !Object.prototype.hasOwnProperty.call(body, "paymentUrl")) {
      const validation = buildErrorResponse(
        400,
        "validation_error",
        "At least one updatable field is required"
      );
      res.status(validation.status).json(validation.body);
      return;
    }

    const updated = await deps.updateAuction(auctionId, updates);
    if (!updated) {
      const notFound = buildErrorResponse(
        404,
        "auction_not_found",
        "Auction not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    res.status(200).json(updated);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles PATCH /auctions/:auctionId/code.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePatchAuctionCode(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role !== "AdminL1") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for auction code changes"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const auctionCode = normalizeRequiredString(
      body.auctionCode,
      "auctionCode"
    );
    const updated = await deps.updateAuctionCode(auctionId, auctionCode);
    if (!updated) {
      const notFound = buildErrorResponse(
        404,
        "auction_not_found",
        "Auction not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    res.status(200).json(updated);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /auctions.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 */
async function handleGetAuctions(
  req: Request,
  res: Response,
  deps: ApiDependencies
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    const auctions = await deps.listAuctionsForActor(actor);
    res.status(200).json({
      data: auctions,
      page: 1,
      pageSize: auctions.length,
      total: auctions.length,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /auctions/joined.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 */
async function handleGetJoinedAuctions(
  req: Request,
  res: Response,
  deps: ApiDependencies
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    const auctions = await deps.listJoinedAuctionsForUser(actor.id);
    res.status(200).json({
      data: auctions,
      page: 1,
      pageSize: auctions.length,
      total: auctions.length,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /auctions/:auctionId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handleGetAuctionById(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role !== "AdminL1") {
      const visibleAuctions = await deps.listAuctionsForActor(actor);
      const isVisible = visibleAuctions
        .some((auction) => auction.id === auctionId);
      if (!isVisible) {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const auction = await deps.getAuctionById(auctionId);
    if (!auction) {
      const notFound = buildErrorResponse(
        404,
        "auction_not_found",
        "Auction not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    res.status(200).json(auction);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

interface AuthenticatedActor {
  id: string;
  role: "Bidder" | "AdminL3" | "AdminL2" | "AdminL1";
}

/**
 * Resolves the authenticated actor user profile for role checks.
 * @param {Request} req
 * @param {ApiDependencies} deps
 * @return {Promise<AuthenticatedActor>}
 */
async function getAuthenticatedActor(
  req: Request,
  deps: ApiDependencies
): Promise<AuthenticatedActor> {
  const authUser = await deps.authenticate(req.header("authorization"));
  const actorUser = await deps.getUserById(authUser.uid);
  if (!actorUser) {
    throw buildErrorResponse(404, "user_not_found", "User profile not found");
  }

  return {
    id: actorUser.id,
    role: actorUser.role,
  };
}

/**
 * Maps known API errors to HTTP responses; unknown errors become 500.
 * @param {Response} res
 * @param {unknown} error
 */
function respondWithApiError(res: Response, error: unknown): void {
  if (isApiErrorResponse(error)) {
    res.status(error.status).json(error.body);
    return;
  }

  const internalError = buildErrorResponse(
    500,
    "internal_error",
    "Unexpected server error"
  );
  res.status(internalError.status).json(internalError.body);
}

/**
 * Returns true if the role can create/update auctions.
 * @param {string} role
 * @return {boolean}
 */
function canManageAuctions(role: AuthenticatedActor["role"]): boolean {
  return role === "AdminL1" || role === "AdminL2";
}

/**
 * Parses auction ID from /auctions/:auctionId route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionId(path: string): string | null {
  const match = /^\/auctions\/([^/]+)$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses auction ID from /auctions/:auctionId/code route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionCodeRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/code$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Validates and returns a required string field.
 * @param {unknown} value
 * @param {string} fieldName
 * @return {string}
 */
function normalizeRequiredString(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw buildErrorResponse(
      400,
      "validation_error",
      `Field '${fieldName}' is required`
    );
  }
  return normalized;
}

/**
 * Normalizes an optional string field.
 * @param {unknown} value
 * @return {string|undefined}
 */
function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Normalizes a nullable string field.
 * @param {unknown} value
 * @return {string|null|undefined}
 */
function normalizeNullableString(
  value: unknown
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "undefined") {
    return undefined;
  }

  return normalizeOptionalString(value);
}

/**
 * Creates default production dependencies backed by Firebase Admin SDK.
 * @return {ApiDependencies}
 */
function createDefaultDependencies(): ApiDependencies {
  if (!getApps().length) {
    initializeApp();
  }

  const usersRepo = new UsersRepository(
    getFirestore().collection("users") as never
  );
  const auctionsRepo = new AuctionsRepository(
    getFirestore().collection("auctions") as never
  );

  return {
    authenticate: async (authorizationHeader: string | undefined) => {
      return authenticateRequest(
        authorizationHeader,
        (token) => getAuth().verifyIdToken(token)
      );
    },
    getUserById: (userId: string) => usersRepo.getUserById(userId),
    createAuction: (input) => auctionsRepo.createAuction(input),
    updateAuction: (auctionId, updates) =>
      auctionsRepo.updateAuction(auctionId, updates),
    updateAuctionCode: async (auctionId: string, auctionCode: string) => {
      const db = getFirestore();
      return db.runTransaction(async (tx) => {
        const auctionsRef = db.collection("auctions");
        const auctionRef = auctionsRef.doc(auctionId);
        const auctionSnapshot = await tx.get(auctionRef);
        if (!auctionSnapshot.exists) {
          return null;
        }

        const existingAuction = auctionSnapshot.data() as AuctionRecord;
        const oldCode = existingAuction.auctionCode;
        const codeIndexRef = db.collection("auction_code_index")
          .doc(auctionCode);
        const codeIndexSnapshot = await tx.get(codeIndexRef);
        const claimedBy = codeIndexSnapshot.data()?.auctionId as
          string |
          undefined;
        if (claimedBy && claimedBy !== auctionId) {
          throw buildErrorResponse(
            409,
            "auction_code_conflict",
            "Auction code already in use"
          );
        }

        const now = new Date().toISOString();
        const updatedAuction: AuctionRecord = {
          ...existingAuction,
          auctionCode,
          updatedAt: now,
        };

        tx.set(auctionRef, updatedAuction as never);
        tx.set(codeIndexRef, {auctionId, updatedAt: now} as never);
        if (oldCode && oldCode !== auctionCode) {
          tx.delete(db.collection("auction_code_index").doc(oldCode));
        }

        return updatedAuction;
      });
    },
    listAuctionsForActor: async (actor: AuthenticatedActor) => {
      if (actor.role === "AdminL1") {
        const snapshot = await getFirestore().collection("auctions").get();
        return snapshot.docs.map((doc) => doc.data() as AuctionRecord);
      }
      return [];
    },
    listJoinedAuctionsForUser: async (userId: string) => {
      const membershipsSnapshot = await getFirestore()
        .collection("auction_memberships")
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .get();

      const auctions = await Promise.all(
        membershipsSnapshot.docs.map(async (doc) => {
          const membership = doc.data() as {auctionId?: string};
          if (!membership.auctionId) {
            return null;
          }
          return auctionsRepo.getAuctionById(membership.auctionId);
        })
      );

      return auctions
        .filter((auction): auction is AuctionRecord => Boolean(auction));
    },
    getAuctionById: (auctionId: string) =>
      auctionsRepo.getAuctionById(auctionId),
  };
}
