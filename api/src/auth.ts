import {buildErrorResponse, type ApiErrorResponse} from "./errors.js";

export interface DecodedAuthToken {
  uid: string;
  email?: string;
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  token: string;
}

export type VerifyIdToken = (token: string) => Promise<DecodedAuthToken>;

/**
 * Parses an Authorization header and returns the bearer token if present.
 * @param {string|undefined} authorizationHeader
 * @return {string|null}
 */
export function extractBearerToken(
  authorizationHeader: string | undefined
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token;
}

/**
 * Validates an Authorization header and returns an authenticated user.
 * @param {string|undefined} authorizationHeader
 * @param {VerifyIdToken} verifyIdToken
 * @return {Promise<AuthenticatedUser>}
 */
export async function authenticateRequest(
  authorizationHeader: string | undefined,
  verifyIdToken: VerifyIdToken
): Promise<AuthenticatedUser> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    throw buildErrorResponse(401, "auth_required", "Missing or invalid token");
  }

  try {
    const decoded = await verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      token,
    };
  } catch (_error) {
    throw buildErrorResponse(401, "auth_required", "Missing or invalid token");
  }
}

/**
 * Type guard for API-style auth errors thrown by authenticateRequest.
 * @param {unknown} error
 * @return {boolean}
 */
export function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as Partial<ApiErrorResponse>;
  return typeof maybeError.status === "number" &&
    typeof maybeError.body === "object" &&
    maybeError.body !== null;
}
