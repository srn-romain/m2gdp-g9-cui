export const ERROR_CODES = [
  'VALIDATION_ERROR', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND',
  'TABLE_FULL', 'TABLE_CLOSED', 'TABLE_PASSED', 'ALREADY_PARTICIPATING',
  'HOST_CANNOT_LEAVE', 'RATE_LIMITED', 'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export function apiError(code: ErrorCode, message: string, details?: Record<string, unknown>, status?: number) {
  return Response.json({ error: { code, message, details: details ?? {} } }, { status: status ?? statusFor(code) });
}

export function statusFor(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR': return 422;
    case 'UNAUTHENTICATED': return 401;
    case 'FORBIDDEN': return 403;
    case 'NOT_FOUND': return 404;
    case 'TABLE_FULL':
    case 'TABLE_CLOSED':
    case 'TABLE_PASSED':
    case 'ALREADY_PARTICIPATING':
    case 'HOST_CANNOT_LEAVE': return 409;
    case 'RATE_LIMITED': return 429;
    default: return 500;
  }
}
