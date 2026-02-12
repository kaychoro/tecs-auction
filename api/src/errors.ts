export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export interface ApiErrorResponse {
  status: number;
  body: ApiErrorPayload;
}

/**
 * Builds the standardized API error response payload.
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>=} details
 * @return {ApiErrorPayload}
 */
export function buildErrorPayload(
  code: string,
  message: string,
  details: Record<string, unknown> = {}
): ApiErrorPayload {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Builds an API error response with HTTP status and standard body.
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>=} details
 * @return {ApiErrorResponse}
 */
export function buildErrorResponse(
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
): ApiErrorResponse {
  return {
    status,
    body: buildErrorPayload(code, message, details),
  };
}
