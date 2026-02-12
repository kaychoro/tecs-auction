import {type Request, type Response} from "express";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {authenticateRequest, isApiErrorResponse} from "./auth.js";
import {buildErrorResponse} from "./errors.js";
import {UsersRepository, type UserRecord} from "./repositories/users.js";

export interface ApiDependencies {
  authenticate:
    (authorizationHeader: string | undefined) => Promise<{uid: string}>;
  getUserById: (userId: string) => Promise<UserRecord | null>;
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

  return {
    authenticate: async (authorizationHeader: string | undefined) => {
      return authenticateRequest(
        authorizationHeader,
        (token) => getAuth().verifyIdToken(token)
      );
    },
    getUserById: (userId: string) => usersRepo.getUserById(userId),
  };
}
