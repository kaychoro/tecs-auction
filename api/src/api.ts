import {type Request, type Response} from "express";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {authenticateRequest, isApiErrorResponse} from "./auth.js";
import {buildErrorResponse} from "./errors.js";
import {
  AuctionsRepository,
  type AuctionRecord,
  type AuctionStatus,
} from "./repositories/auctions.js";
import {
  MembershipsRepository,
  type MembershipRecord,
} from "./repositories/memberships.js";
import {BidderNumberCountersRepository} from
  "./repositories/bidderNumberCounters.js";
import {ImagesRepository, type ImageRecord} from "./repositories/images.js";
import {ItemsRepository, type ItemRecord} from "./repositories/items.js";
import {BidsRepository, type BidRecord} from "./repositories/bids.js";
import {BidViewsRepository} from "./repositories/bidViews.js";
import {
  AuditLogsRepository,
  type AuditLogRecord,
} from "./repositories/auditLogs.js";
import {
  NotificationsRepository,
  type NotificationRecord,
} from "./repositories/notifications.js";
import {TotalsRepository, type TotalsRecord} from "./repositories/totals.js";
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
  updateAuctionPhase: (
    auctionId: string,
    updates: {
      status: AuctionStatus;
      phaseSchedule?: Record<string, unknown> | null;
    }
  ) => Promise<AuctionRecord | null>;
  updateAuctionNotifications: (
    auctionId: string,
    updates: {inAppEnabled: boolean}
  ) => Promise<AuctionRecord | null>;
  findAuctionsByCode: (auctionCode: string) => Promise<AuctionRecord[]>;
  getMembership: (
    auctionId: string,
    userId: string
  ) => Promise<MembershipRecord | null>;
  createMembership: (input: {
    auctionId: string;
    userId: string;
    roleOverride?: "Bidder" | "AdminL3" | "AdminL2" | "AdminL1" | null;
    status?: "active" | "revoked";
    bidderNumber?: number | null;
  }) => Promise<MembershipRecord>;
  allocateBidderNumber: (auctionId: string) => Promise<number>;
  updateUserLastAuctionId: (
    userId: string,
    auctionId: string
  ) => Promise<UserRecord | null>;
  createItem: (input: {
    auctionId: string;
    name: string;
    description?: string | null;
    type: "silent" | "live";
    startingPrice: number;
  }) => Promise<ItemRecord>;
  getItemById: (itemId: string) => Promise<ItemRecord | null>;
  listItemsByAuction: (auctionId: string) => Promise<ItemRecord[]>;
  updateItem: (
    itemId: string,
    updates: {
      name?: string;
      description?: string | null;
      type?: "silent" | "live";
      startingPrice?: number;
      image?: {
        id: string;
        url: string;
        variants: Array<{width: number; url: string}>;
      } | null;
    }
  ) => Promise<ItemRecord | null>;
  deleteItem: (itemId: string) => Promise<boolean>;
  createImage: (input: {
    auctionId: string;
    itemId: string;
    storagePath: string;
    originalWidth: number;
    originalHeight: number;
    variants: Array<{width: number; url: string}>;
  }) => Promise<ImageRecord>;
  createBid: (input: {
    auctionId: string;
    itemId: string;
    bidderId: string;
    amount: number;
  }) => Promise<BidRecord>;
  listBidsForItem: (itemId: string) => Promise<BidRecord[]>;
  getBidById: (bidId: string) => Promise<BidRecord | null>;
  deleteBid: (bidId: string) => Promise<boolean>;
  getCurrentHighBid: (itemId: string) => Promise<BidRecord | null>;
  createAuditLog: (input: {
    auctionId: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }) => Promise<AuditLogRecord>;
  getTotals: (
    auctionId: string,
    bidderId: string
  ) => Promise<TotalsRecord | null>;
  upsertTotals: (input: {
    auctionId: string;
    bidderId: string;
    bidderNumber: number;
    displayName: string;
    subtotal: number;
    total: number;
    paid: boolean;
  }) => Promise<TotalsRecord>;
  listTotalsForAuction: (auctionId: string) => Promise<TotalsRecord[]>;
  createNotification: (input: {
    auctionId: string;
    userId: string;
    type: string;
    message: string;
    refType: string;
    refId: string;
  }) => Promise<NotificationRecord>;
  listNotificationsForUser: (input: {
    userId: string;
    page: number;
    pageSize: number;
  }) => Promise<NotificationRecord[]>;
  markNotificationRead: (
    notificationId: string,
    readAt: string
  ) => Promise<NotificationRecord | null>;
  markAllNotificationsRead: (
    userId: string,
    readAt: string
  ) => Promise<number>;
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
    if (req.method === "GET" && req.path === "/notifications") {
      await handleGetNotifications(req, res, deps);
      return;
    }
    if (req.method === "PATCH" && req.path === "/notifications/mark-all-read") {
      await handlePatchNotificationsMarkAllRead(req, res, deps);
      return;
    }

    const notificationIdRoute = parseNotificationId(req.path);
    if (req.method === "PATCH" && notificationIdRoute) {
      await handlePatchNotificationRead(req, res, deps, notificationIdRoute);
      return;
    }

    const auctionJoinRoute = parseAuctionJoinRoute(req.path);
    if (req.method === "POST" && auctionJoinRoute) {
      await handlePostAuctionJoin(req, res, deps, auctionJoinRoute);
      return;
    }

    const auctionTotalsMeRoute = parseAuctionTotalsMeRoute(req.path);
    if (req.method === "GET" && auctionTotalsMeRoute) {
      await handleGetAuctionTotalsMe(req, res, deps, auctionTotalsMeRoute);
      return;
    }
    const auctionTotalsRoute = parseAuctionTotalsRoute(req.path);
    if (req.method === "GET" && auctionTotalsRoute) {
      await handleGetAuctionTotals(req, res, deps, auctionTotalsRoute);
      return;
    }
    const auctionPaymentRoute = parseAuctionPaymentRoute(req.path);
    if (req.method === "PATCH" && auctionPaymentRoute) {
      await handlePatchAuctionPayment(
        req,
        res,
        deps,
        auctionPaymentRoute.auctionId,
        auctionPaymentRoute.bidderId
      );
      return;
    }

    const auctionSwitchRoute = parseAuctionSwitchRoute(req.path);
    if (req.method === "POST" && auctionSwitchRoute) {
      await handlePostAuctionSwitch(req, res, deps, auctionSwitchRoute);
      return;
    }

    const auctionItemsRoute = parseAuctionItemsRoute(req.path);
    if (req.method === "GET" && auctionItemsRoute) {
      await handleGetAuctionItems(req, res, deps, auctionItemsRoute);
      return;
    }
    if (req.method === "POST" && auctionItemsRoute) {
      await handlePostAuctionItems(req, res, deps, auctionItemsRoute);
      return;
    }

    const auctionCodeRoute = parseAuctionCodeRoute(req.path);
    if (req.method === "PATCH" && auctionCodeRoute) {
      await handlePatchAuctionCode(req, res, deps, auctionCodeRoute);
      return;
    }

    const auctionPhaseRoute = parseAuctionPhaseRoute(req.path);
    if (req.method === "PATCH" && auctionPhaseRoute) {
      await handlePatchAuctionPhase(req, res, deps, auctionPhaseRoute);
      return;
    }

    const auctionNotificationsRoute = parseAuctionNotificationsRoute(req.path);
    if (req.method === "PATCH" && auctionNotificationsRoute) {
      await handlePatchAuctionNotifications(
        req,
        res,
        deps,
        auctionNotificationsRoute
      );
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

    const itemId = parseItemId(req.path);
    if (itemId) {
      if (req.method === "POST" && req.path.endsWith("/bids")) {
        await handlePostItemBids(req, res, deps, itemId);
        return;
      }
      if (req.method === "GET" && req.path.endsWith("/bids")) {
        await handleGetItemBids(req, res, deps, itemId);
        return;
      }
      if (req.method === "POST" && req.path.endsWith("/image")) {
        await handlePostItemImage(req, res, deps, itemId);
        return;
      }
      if (req.method === "PATCH") {
        await handlePatchItem(req, res, deps, itemId);
        return;
      }
      if (req.method === "DELETE") {
        await handleDeleteItem(req, res, deps, itemId);
        return;
      }
      if (req.method === "GET") {
        await handleGetItem(req, res, deps, itemId);
        return;
      }
    }

    const bidId = parseBidId(req.path);
    if (bidId && req.method === "DELETE") {
      await handleDeleteBid(req, res, deps, bidId);
      return;
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
 * Handles PATCH /auctions/:auctionId/phase.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePatchAuctionPhase(
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
        "Insufficient role for auction phase overrides"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const status = normalizeRequiredAuctionStatus(body.status);
    const hasPhaseSchedule = Object.prototype.hasOwnProperty
      .call(body, "phaseSchedule");
    const phaseSchedule = normalizeNullableObject(body.phaseSchedule);
    if (hasPhaseSchedule && typeof phaseSchedule === "undefined") {
      const validation = buildErrorResponse(
        400,
        "validation_error",
        "Field 'phaseSchedule' must be an object or null"
      );
      res.status(validation.status).json(validation.body);
      return;
    }

    const updated = await deps.updateAuctionPhase(auctionId, {
      status,
      ...(hasPhaseSchedule ? {phaseSchedule} : {}),
    });
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
 * Handles PATCH /auctions/:auctionId/notifications.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePatchAuctionNotifications(
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
        "Insufficient role for auction notification changes"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const inAppEnabled = normalizeRequiredBoolean(
      body.inAppEnabled,
      "inAppEnabled"
    );

    const updated = await deps.updateAuctionNotifications(auctionId, {
      inAppEnabled,
    });
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
 * Handles GET /notifications.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 */
async function handleGetNotifications(
  req: Request,
  res: Response,
  deps: ApiDependencies
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = parsePositiveInt(req.query?.pageSize, 20);
    const notifications = await deps.listNotificationsForUser({
      userId: actor.id,
      page,
      pageSize,
    });
    const sorted = [...notifications].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
    res.status(200).json({
      data: sorted,
      page,
      pageSize,
      total: sorted.length,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles PATCH /notifications/:notificationId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} notificationId
 */
async function handlePatchNotificationRead(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  notificationId: string
): Promise<void> {
  try {
    await getAuthenticatedActor(req, deps);
    const updated = await deps.markNotificationRead(
      notificationId,
      new Date().toISOString()
    );
    if (!updated) {
      const notFound = buildErrorResponse(
        404,
        "notification_not_found",
        "Notification not found"
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
 * Handles PATCH /notifications/mark-all-read.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 */
async function handlePatchNotificationsMarkAllRead(
  req: Request,
  res: Response,
  deps: ApiDependencies
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    const updatedCount = await deps.markAllNotificationsRead(
      actor.id,
      new Date().toISOString()
    );
    res.status(200).json({updatedCount});
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles POST /auctions/:auctionId/join.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePostAuctionJoin(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role === "AdminL1") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for auction join"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const auctionCode = normalizeRequiredString(
      body.auctionCode,
      "auctionCode"
    );
    const matchedAuctions = await deps.findAuctionsByCode(auctionCode);
    if (matchedAuctions.length === 0) {
      const notFound = buildErrorResponse(
        404,
        "auction_not_found",
        "Auction not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }
    if (matchedAuctions.length > 1) {
      const conflict = buildErrorResponse(
        409,
        "auction_code_conflict",
        "Auction code is assigned to multiple auctions"
      );
      res.status(conflict.status).json(conflict.body);
      return;
    }

    const matchedAuction = matchedAuctions[0];
    if (matchedAuction.id !== auctionId) {
      const notFound = buildErrorResponse(
        404,
        "auction_not_found",
        "Auction not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    const existingMembership = await deps.getMembership(auctionId, actor.id);
    if (existingMembership) {
      const conflict = buildErrorResponse(
        409,
        "membership_exists",
        "User is already a member of this auction"
      );
      res.status(conflict.status).json(conflict.body);
      return;
    }

    const membership = await deps.createMembership({
      auctionId,
      userId: actor.id,
      roleOverride: null,
      status: "active",
      bidderNumber: await deps.allocateBidderNumber(auctionId),
    });
    await deps.updateUserLastAuctionId(actor.id, auctionId);

    res.status(200).json({
      auctionId: membership.auctionId,
      userId: membership.userId,
      bidderNumber: membership.bidderNumber || null,
      roleOverride: membership.roleOverride || null,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /auctions/:auctionId/totals/me.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handleGetAuctionTotalsMe(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role !== "AdminL1") {
      const membership = await deps.getMembership(auctionId, actor.id);
      if (!membership || membership.status !== "active") {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const totals = await deps.getTotals(auctionId, actor.id);
    res.status(200).json(
      totals || {
        auctionId,
        bidderId: actor.id,
        bidderNumber: 0,
        displayName: actor.displayName || actor.id,
        subtotal: 0,
        total: 0,
        paid: false,
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /auctions/:auctionId/totals.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handleGetAuctionTotals(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role === "Bidder") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for totals administration"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const membership = await deps.getMembership(auctionId, actor.id);
      if (!membership || membership.status !== "active") {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const totals = await deps.listTotalsForAuction(auctionId);
    res.status(200).json({
      data: totals,
      page: 1,
      pageSize: totals.length,
      total: totals.length,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles PATCH /auctions/:auctionId/payments/:bidderId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 * @param {string} bidderId
 */
async function handlePatchAuctionPayment(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string,
  bidderId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role === "Bidder") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for payment updates"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const membership = await deps.getMembership(auctionId, actor.id);
      if (!membership || membership.status !== "active") {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const paid = normalizeRequiredBoolean(body.paid, "paid");
    const existing = await deps.getTotals(auctionId, bidderId);
    if (!existing) {
      const notFound = buildErrorResponse(
        404,
        "totals_not_found",
        "Totals record not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    const updated = await deps.upsertTotals({
      auctionId: existing.auctionId,
      bidderId: existing.bidderId,
      bidderNumber: existing.bidderNumber,
      displayName: existing.displayName,
      subtotal: existing.subtotal,
      total: existing.total,
      paid,
    });
    res.status(200).json(updated);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles POST /auctions/:auctionId/switch.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePostAuctionSwitch(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role === "AdminL1") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for auction switch"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const membership = await deps.getMembership(auctionId, actor.id);
    if (!membership || membership.status !== "active") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "User does not have active membership for this auction"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    await deps.updateUserLastAuctionId(actor.id, auctionId);
    res.status(200).json({auctionId});
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles POST /auctions/:auctionId/items.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handlePostAuctionItems(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageItems(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for item management"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const visibleAuctions = await deps.listAuctionsForActor(actor);
      const canAccessAuction = visibleAuctions
        .some((auction) => auction.id === auctionId);
      if (!canAccessAuction) {
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

    const body = (req.body || {}) as Record<string, unknown>;
    const name = normalizeRequiredString(body.name, "name");
    const type = normalizeRequiredItemType(body.type);
    const startingPrice = normalizeRequiredMoneyNumber(
      body.startingPrice,
      "startingPrice"
    );
    const description = normalizeNullableString(body.description);

    const item = await deps.createItem({
      auctionId,
      name,
      description,
      type,
      startingPrice,
    });
    res.status(200).json(item);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /auctions/:auctionId/items.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} auctionId
 */
async function handleGetAuctionItems(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  auctionId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (actor.role !== "AdminL1") {
      const membership = await deps.getMembership(auctionId, actor.id);
      if (!membership || membership.status !== "active") {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const items = await deps.listItemsByAuction(auctionId);
    res.status(200).json({
      data: items,
      page: 1,
      pageSize: items.length,
      total: items.length,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles PATCH /items/:itemId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} itemId
 */
async function handlePatchItem(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  itemId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageItems(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for item management"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const item = await deps.getItemById(itemId);
    if (!item) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const visibleAuctions = await deps.listAuctionsForActor(actor);
      const canAccessAuction = visibleAuctions
        .some((auction) => auction.id === item.auctionId);
      if (!canAccessAuction) {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const updates = {
      name: normalizeOptionalString(body.name),
      description: normalizeNullableString(body.description),
      type: normalizeOptionalItemType(body.type),
      startingPrice: normalizeOptionalMoneyNumber(body.startingPrice),
    };
    const hasDescription = Object.prototype.hasOwnProperty
      .call(body, "description");
    if (!updates.name && !updates.type &&
      typeof updates.startingPrice === "undefined" &&
      !hasDescription) {
      const validation = buildErrorResponse(
        400,
        "validation_error",
        "At least one updatable field is required"
      );
      res.status(validation.status).json(validation.body);
      return;
    }

    if (hasDescription && typeof updates.description === "undefined") {
      const validation = buildErrorResponse(
        400,
        "validation_error",
        "Field 'description' must be a string or null"
      );
      res.status(validation.status).json(validation.body);
      return;
    }

    const updated = await deps.updateItem(itemId, {
      ...(updates.name ? {name: updates.name} : {}),
      ...(hasDescription ? {description: updates.description || null} : {}),
      ...(updates.type ? {type: updates.type} : {}),
      ...(typeof updates.startingPrice !== "undefined" ?
        {startingPrice: updates.startingPrice} :
        {}),
    });

    if (!updated) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
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
 * Handles GET /items/:itemId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} itemId
 */
async function handleGetItem(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  itemId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    const item = await deps.getItemById(itemId);
    if (!item) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const membership = await deps.getMembership(item.auctionId, actor.id);
      if (!membership || membership.status !== "active") {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this item"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    res.status(200).json(item);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles DELETE /items/:itemId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} itemId
 */
async function handleDeleteItem(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  itemId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageItems(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for item management"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const item = await deps.getItemById(itemId);
    if (!item) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const visibleAuctions = await deps.listAuctionsForActor(actor);
      const canAccessAuction = visibleAuctions
        .some((auction) => auction.id === item.auctionId);
      if (!canAccessAuction) {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const deleted = await deps.deleteItem(itemId);
    if (!deleted) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    res.status(200).json({deleted: true, itemId});
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles POST /items/:itemId/image.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} itemId
 */
async function handlePostItemImage(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  itemId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageItems(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for item image upload"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const item = await deps.getItemById(itemId);
    if (!item) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const contentType = normalizeRequiredString(
      body.contentType,
      "contentType"
    );
    const sizeBytes = normalizeRequiredMoneyNumber(body.sizeBytes, "sizeBytes");
    if (!isSupportedImageContentType(contentType)) {
      const validation = buildErrorResponse(
        400,
        "validation_error",
        "Unsupported image content type"
      );
      res.status(validation.status).json(validation.body);
      return;
    }
    if (sizeBytes > 10 * 1024 * 1024) {
      const validation = buildErrorResponse(
        400,
        "validation_error",
        "Image exceeds max allowed size"
      );
      res.status(validation.status).json(validation.body);
      return;
    }

    const storagePath = normalizeRequiredString(
      body.storagePath,
      "storagePath"
    );
    const originalWidth = normalizeRequiredMoneyNumber(
      body.originalWidth,
      "originalWidth"
    );
    const originalHeight = normalizeRequiredMoneyNumber(
      body.originalHeight,
      "originalHeight"
    );
    const image = await deps.createImage({
      auctionId: item.auctionId,
      itemId,
      storagePath,
      originalWidth,
      originalHeight,
      variants: buildImageVariants(storagePath),
    });
    await deps.updateItem(itemId, {
      image: {
        id: image.id,
        url: image.storagePath,
        variants: image.variants,
      },
    });

    res.status(200).json(image);
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles POST /items/:itemId/bids.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} itemId
 */
async function handlePostItemBids(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  itemId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    const item = await deps.getItemById(itemId);
    if (!item) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    const membership = await deps.getMembership(item.auctionId, actor.id);
    if (!membership || membership.status !== "active") {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "User does not have access to this auction"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const auction = await deps.getAuctionById(item.auctionId);
    if (!auction || auction.status !== "Open") {
      const phaseClosed = buildErrorResponse(
        409,
        "phase_closed",
        "Auction is not open for bidding"
      );
      res.status(phaseClosed.status).json(phaseClosed.body);
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const amount = normalizeRequiredMoneyNumber(body.amount, "amount");
    const currentBefore = await deps.getCurrentHighBid(itemId);
    if (currentBefore && amount <= currentBefore.amount) {
      const bidTooLow = buildErrorResponse(
        409,
        "bid_too_low",
        "Bid must be greater than the current high bid"
      );
      res.status(bidTooLow.status).json(bidTooLow.body);
      return;
    }

    const bid = await deps.createBid({
      auctionId: item.auctionId,
      itemId: item.id,
      bidderId: actor.id,
      amount,
    });
    const currentHighBid = await deps.getCurrentHighBid(itemId);
    if (!currentHighBid || currentHighBid.id !== bid.id) {
      const outbid = buildErrorResponse(
        409,
        "outbid",
        "A higher bid was placed before your bid was accepted"
      );
      res.status(outbid.status).json(outbid.body);
      return;
    }
    await deps.createAuditLog({
      auctionId: item.auctionId,
      actorUserId: actor.id,
      action: "bid_placed",
      targetType: "item",
      targetId: item.id,
      metadata: {
        bidId: bid.id,
        amount: bid.amount,
      },
    });
    const existingTotals = await deps.getTotals(item.auctionId, actor.id);
    await deps.upsertTotals({
      auctionId: item.auctionId,
      bidderId: actor.id,
      bidderNumber: membership.bidderNumber || 0,
      displayName: actor.displayName || actor.id,
      subtotal: (existingTotals?.subtotal || 0) + bid.amount,
      total: (existingTotals?.total || 0) + bid.amount,
      paid: existingTotals?.paid || false,
    });
    if (currentBefore &&
      currentBefore.bidderId !== actor.id &&
      auction.notificationSettings?.inAppEnabled !== false) {
      await deps.createNotification({
        auctionId: item.auctionId,
        userId: currentBefore.bidderId,
        type: "outbid",
        message: "Your bid is no longer the highest",
        refType: "item",
        refId: item.id,
      });
    }

    res.status(200).json({
      bid,
      currentHighBid,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles GET /items/:itemId/bids.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} itemId
 */
async function handleGetItemBids(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  itemId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageItems(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for bid administration"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const item = await deps.getItemById(itemId);
    if (!item) {
      const notFound = buildErrorResponse(
        404,
        "item_not_found",
        "Item not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const visibleAuctions = await deps.listAuctionsForActor(actor);
      const canAccessAuction = visibleAuctions
        .some((auction) => auction.id === item.auctionId);
      if (!canAccessAuction) {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const bids = await deps.listBidsForItem(itemId);
    const sorted = [...bids].sort((left, right) => {
      if (left.amount !== right.amount) {
        return right.amount - left.amount;
      }
      if (left.placedAt !== right.placedAt) {
        return left.placedAt.localeCompare(right.placedAt);
      }
      return left.id.localeCompare(right.id);
    });
    res.status(200).json({
      data: sorted,
      page: 1,
      pageSize: sorted.length,
      total: sorted.length,
    });
  } catch (error) {
    respondWithApiError(res, error);
  }
}

/**
 * Handles DELETE /bids/:bidId.
 * @param {Request} req
 * @param {Response} res
 * @param {ApiDependencies} deps
 * @param {string} bidId
 */
async function handleDeleteBid(
  req: Request,
  res: Response,
  deps: ApiDependencies,
  bidId: string
): Promise<void> {
  try {
    const actor = await getAuthenticatedActor(req, deps);
    if (!canManageItems(actor.role)) {
      const forbidden = buildErrorResponse(
        403,
        "role_forbidden",
        "Insufficient role for bid administration"
      );
      res.status(forbidden.status).json(forbidden.body);
      return;
    }

    const bid = await deps.getBidById(bidId);
    if (!bid) {
      const notFound = buildErrorResponse(
        404,
        "bid_not_found",
        "Bid not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }

    if (actor.role !== "AdminL1") {
      const visibleAuctions = await deps.listAuctionsForActor(actor);
      const canAccessAuction = visibleAuctions
        .some((auction) => auction.id === bid.auctionId);
      if (!canAccessAuction) {
        const forbidden = buildErrorResponse(
          403,
          "role_forbidden",
          "User does not have access to this auction"
        );
        res.status(forbidden.status).json(forbidden.body);
        return;
      }
    }

    const deleted = await deps.deleteBid(bidId);
    if (!deleted) {
      const notFound = buildErrorResponse(
        404,
        "bid_not_found",
        "Bid not found"
      );
      res.status(notFound.status).json(notFound.body);
      return;
    }
    await deps.createAuditLog({
      auctionId: bid.auctionId,
      actorUserId: actor.id,
      action: "bid_deleted",
      targetType: "bid",
      targetId: bidId,
      metadata: {
        itemId: bid.itemId,
        bidderId: bid.bidderId,
        amount: bid.amount,
      },
    });

    res.status(200).json({deleted: true, bidId});
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
  displayName?: string;
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
    displayName: actorUser.displayName,
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
 * Returns true if the role can create/update items.
 * @param {string} role
 * @return {boolean}
 */
function canManageItems(role: AuthenticatedActor["role"]): boolean {
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
 * Parses auction ID from /auctions/:auctionId/join route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionJoinRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/join$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses auction ID from /auctions/:auctionId/switch route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionSwitchRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/switch$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses auction ID from /auctions/:auctionId/totals/me.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionTotalsMeRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/totals\/me$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses auction ID from /auctions/:auctionId/totals.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionTotalsRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/totals$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses params from /auctions/:auctionId/payments/:bidderId.
 * @param {string} path
 * @return {{auctionId: string, bidderId: string}|null}
 */
function parseAuctionPaymentRoute(
  path: string
): {auctionId: string; bidderId: string} | null {
  const match = /^\/auctions\/([^/]+)\/payments\/([^/]+)$/.exec(path);
  if (!match) {
    return null;
  }
  return {auctionId: match[1], bidderId: match[2]};
}

/**
 * Parses auction ID from /auctions/:auctionId/items route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionItemsRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/items$/.exec(path);
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
 * Parses auction ID from /auctions/:auctionId/phase route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionPhaseRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/phase$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses auction ID from /auctions/:auctionId/notifications route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseAuctionNotificationsRoute(path: string): string | null {
  const match = /^\/auctions\/([^/]+)\/notifications$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses item ID from /items/:itemId route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseItemId(path: string): string | null {
  const match = /^\/items\/([^/]+)(?:\/image|\/bids)?$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses bid ID from /bids/:bidId route paths.
 * @param {string} path
 * @return {string|null}
 */
function parseBidId(path: string): string | null {
  const match = /^\/bids\/([^/]+)$/.exec(path);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Parses notification ID from /notifications/:notificationId.
 * @param {string} path
 * @return {string|null}
 */
function parseNotificationId(path: string): string | null {
  const match = /^\/notifications\/([^/]+)$/.exec(path);
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
 * Validates and returns a required AuctionStatus field.
 * @param {unknown} value
 * @return {AuctionStatus}
 */
function normalizeRequiredAuctionStatus(value: unknown): AuctionStatus {
  const normalized = normalizeRequiredString(value, "status");
  const statuses: AuctionStatus[] = [
    "Setup",
    "Ready",
    "Open",
    "Pending",
    "Complete",
    "Closed",
  ];
  if (!statuses.includes(normalized as AuctionStatus)) {
    throw buildErrorResponse(
      400,
      "validation_error",
      "Field 'status' must be one of Setup, Ready, Open, Pending, " +
      "Complete, Closed"
    );
  }
  return normalized as AuctionStatus;
}

/**
 * Validates and returns a required item type.
 * @param {unknown} value
 * @return {"silent"|"live"}
 */
function normalizeRequiredItemType(value: unknown): "silent" | "live" {
  const normalized = normalizeRequiredString(value, "type");
  if (normalized !== "silent" && normalized !== "live") {
    throw buildErrorResponse(
      400,
      "validation_error",
      "Field 'type' must be 'silent' or 'live'"
    );
  }
  return normalized;
}

/**
 * Normalizes optional item type.
 * @param {unknown} value
 * @return {"silent"|"live"|undefined}
 */
function normalizeOptionalItemType(
  value: unknown
): "silent" | "live" | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (value === "silent" || value === "live") {
    return value;
  }
  throw buildErrorResponse(
    400,
    "validation_error",
    "Field 'type' must be 'silent' or 'live'"
  );
}

/**
 * Validates and returns a required non-negative numeric field.
 * @param {unknown} value
 * @param {string} fieldName
 * @return {number}
 */
function normalizeRequiredMoneyNumber(
  value: unknown,
  fieldName: string
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw buildErrorResponse(
      400,
      "validation_error",
      `Field '${fieldName}' must be a non-negative number`
    );
  }
  return value;
}

/**
 * Normalizes an optional non-negative number.
 * @param {unknown} value
 * @return {number|undefined}
 */
function normalizeOptionalMoneyNumber(value: unknown): number | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw buildErrorResponse(
      400,
      "validation_error",
      "Field 'startingPrice' must be a non-negative number"
    );
  }
  return value;
}

/**
 * Returns true when content type is an accepted image format.
 * @param {string} contentType
 * @return {boolean}
 */
function isSupportedImageContentType(contentType: string): boolean {
  return contentType === "image/jpeg" ||
    contentType === "image/png" ||
    contentType === "image/webp";
}

/**
 * Builds standard image variant metadata for the configured widths.
 * @param {string} storagePath
 * @return {Array<Object>}
 */
function buildImageVariants(
  storagePath: string
): Array<{width: number; url: string}> {
  const widths = [320, 640, 1024];
  return widths.map((width) => ({
    width,
    url: `${storagePath}?w=${width}`,
  }));
}

/**
 * Validates and returns a required boolean field.
 * @param {unknown} value
 * @param {string} fieldName
 * @return {boolean}
 */
function normalizeRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw buildErrorResponse(
      400,
      "validation_error",
      `Field '${fieldName}' must be a boolean`
    );
  }
  return value;
}

/**
 * Parses a positive integer query value with fallback.
 * @param {unknown} value
 * @param {number} fallback
 * @return {number}
 */
function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
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
 * Normalizes a nullable object field.
 * @param {unknown} value
 * @return {Record<string, unknown>|null|undefined}
 */
function normalizeNullableObject(
  value: unknown
): Record<string, unknown> | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
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
  const membershipsRepo = new MembershipsRepository(
    getFirestore().collection("auction_memberships") as never
  );
  const itemsRepo = new ItemsRepository(
    getFirestore().collection("items") as never
  );
  const imagesRepo = new ImagesRepository(
    getFirestore().collection("images") as never
  );
  const bidsRepo = new BidsRepository(
    getFirestore().collection("bids") as never,
    (handler) => getFirestore().runTransaction(async (tx) => {
      return handler({
        set: (docRef, value) => tx.set(docRef as never, value as never),
      });
    })
  );
  const bidViewsRepo = new BidViewsRepository({
    listBids: async (itemId: string) => {
      const snapshot = await getFirestore()
        .collection("bids")
        .where("itemId", "==", itemId)
        .get();
      return snapshot.docs.map((doc) => doc.data() as BidRecord);
    },
  });
  const auditLogsRepo = new AuditLogsRepository(
    getFirestore().collection("audit_logs") as never
  );
  const totalsRepo = new TotalsRepository(
    getFirestore().collection("totals") as never
  );
  const notificationsRepo = new NotificationsRepository(
    getFirestore().collection("notifications") as never
  );
  const bidderNumberRepo = new BidderNumberCountersRepository(
    getFirestore() as never,
    getFirestore().collection("auction_bidder_counters") as never
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
    updateAuctionPhase: (auctionId, updates) =>
      auctionsRepo.updateAuction(auctionId, updates),
    updateAuctionNotifications: (auctionId, updates) =>
      auctionsRepo.updateAuction(auctionId, {
        notificationSettings: {inAppEnabled: updates.inAppEnabled},
      }),
    findAuctionsByCode: async (auctionCode: string) => {
      const snapshot = await getFirestore()
        .collection("auctions")
        .where("auctionCode", "==", auctionCode)
        .get();
      return snapshot.docs.map((doc) => doc.data() as AuctionRecord);
    },
    getMembership: (auctionId, userId) =>
      membershipsRepo.getMembership(auctionId, userId),
    createMembership: (input) =>
      membershipsRepo.createMembership(input),
    allocateBidderNumber: (auctionId) =>
      bidderNumberRepo.allocateNextBidderNumber(auctionId),
    updateUserLastAuctionId: (userId, auctionId) =>
      usersRepo.updateUser(userId, {lastAuctionId: auctionId}),
    createItem: (input) => itemsRepo.createItem(input),
    getItemById: (itemId) => itemsRepo.getItemById(itemId),
    listItemsByAuction: async (auctionId) => {
      const snapshot = await getFirestore()
        .collection("items")
        .where("auctionId", "==", auctionId)
        .get();
      return snapshot.docs.map((doc) => doc.data() as ItemRecord);
    },
    updateItem: (itemId, updates) => itemsRepo.updateItem(itemId, updates),
    deleteItem: (itemId) => itemsRepo.deleteItem(itemId),
    createImage: (input) => imagesRepo.createImage(input),
    createBid: (input) => bidsRepo.createBid(input),
    listBidsForItem: async (itemId) => {
      const snapshot = await getFirestore()
        .collection("bids")
        .where("itemId", "==", itemId)
        .get();
      return snapshot.docs.map((doc) => doc.data() as BidRecord);
    },
    getBidById: async (bidId) => {
      const snapshot = await getFirestore().collection("bids").doc(bidId).get();
      if (!snapshot.exists) {
        return null;
      }
      return snapshot.data() as BidRecord;
    },
    deleteBid: async (bidId) => {
      const ref = getFirestore().collection("bids").doc(bidId);
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return false;
      }
      await ref.delete();
      return true;
    },
    getCurrentHighBid: (itemId) => bidViewsRepo.getCurrentHighBid(itemId),
    createAuditLog: (input) => auditLogsRepo.createAuditLog(input),
    getTotals: (auctionId, bidderId) =>
      totalsRepo.getTotals(auctionId, bidderId),
    upsertTotals: (input) => totalsRepo.upsertTotals(input),
    listTotalsForAuction: async (auctionId) => {
      const snapshot = await getFirestore()
        .collection("totals")
        .where("auctionId", "==", auctionId)
        .get();
      return snapshot.docs.map((doc) => doc.data() as TotalsRecord);
    },
    createNotification: (input) => notificationsRepo.createNotification(input),
    listNotificationsForUser: async (input) => {
      const snapshot = await getFirestore()
        .collection("notifications")
        .where("userId", "==", input.userId)
        .get();
      const records = snapshot.docs
        .map((doc) => doc.data() as NotificationRecord);
      const start = (input.page - 1) * input.pageSize;
      return records.slice(start, start + input.pageSize);
    },
    markNotificationRead: (notificationId, readAt) =>
      notificationsRepo.updateNotification(notificationId, {readAt}),
    markAllNotificationsRead: async (userId, readAt) => {
      const snapshot = await getFirestore()
        .collection("notifications")
        .where("userId", "==", userId)
        .get();
      await Promise.all(snapshot.docs.map((doc) =>
        doc.ref.set({...doc.data(), readAt})
      ));
      return snapshot.docs.length;
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
