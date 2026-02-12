import {
  buildErrorResponse,
  type ApiErrorResponse,
} from "./errors.js";

export type ErrorReason =
  | "auth_required"
  | "role_forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited";

const STATUS_BY_REASON: Record<ErrorReason, number> = {
  auth_required: 401,
  role_forbidden: 403,
  not_found: 404,
  validation: 400,
  conflict: 409,
  rate_limited: 429,
};

/**
 * Maps a domain-level reason and API code into a standard HTTP error response.
 * @param {ErrorReason} reason
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>=} details
 * @return {ApiErrorResponse}
 */
export function mapHttpError(
  reason: ErrorReason,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
): ApiErrorResponse {
  return buildErrorResponse(STATUS_BY_REASON[reason], code, message, details);
}
