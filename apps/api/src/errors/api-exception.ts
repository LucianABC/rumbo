import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@rumbo/contracts';

/** One status per code, so a code and the status sent with it can never disagree (#23). */
export const ERROR_STATUS: Readonly<Record<ErrorCode, HttpStatus>> = {
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  METHOD_NOT_ALLOWED: HttpStatus.METHOD_NOT_ALLOWED,
  CONFLICT: HttpStatus.CONFLICT,
  PAYLOAD_TOO_LARGE: HttpStatus.PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  UNPROCESSABLE: HttpStatus.UNPROCESSABLE_ENTITY,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
  SERVICE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};

/**
 * The only way to put a custom message or details in an error response: the global filter answers
 * every other exception with a fixed message per code (#23). Message and details reach the client
 * as is, so they must not echo another user's data.
 */
export class ApiException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message, ERROR_STATUS[code]);
  }
}
