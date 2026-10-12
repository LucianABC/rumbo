import type { IncomingMessage } from 'node:http';

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ErrorCode, ErrorEnvelope } from '@rumbo/contracts';
import type { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { ApiException, ERROR_STATUS } from './api-exception.js';

const CODES: ReadonlyMap<number, ErrorCode> = new Map(
  Object.entries(ERROR_STATUS).map(([code, status]) => [status, code as ErrorCode]),
);

const MESSAGES: Readonly<Record<ErrorCode, string>> = {
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  METHOD_NOT_ALLOWED: 'Method not allowed',
  CONFLICT: 'Conflict',
  PAYLOAD_TOO_LARGE: 'Payload too large',
  UNSUPPORTED_MEDIA_TYPE: 'Unsupported media type',
  UNPROCESSABLE: 'Unprocessable request',
  RATE_LIMITED: 'Too many requests',
  INTERNAL: 'Internal error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
};

interface ResolvedError {
  readonly status: number;
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * Answers every error with the standard envelope (#23). Messages are fixed per code: Nest's and
 * Express's own messages can echo client input (the requested path, JSON parser output), and
 * unknown errors may carry anything. Custom messages go through ApiException.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    // pino-http runs before any parser or handler (BodyParserModule), so the id is always set (#23).
    const req = http.getRequest<IncomingMessage & { id: string }>();
    const res = http.getResponse<Response>();
    const { status, code, message, details } = resolve(exception);

    // Replaces Nest's default filter, which logged these; 4xx are on the request log line (#26).
    // code and status come from fixed lists, so they are safe to log.
    if (status >= 500) this.logger.error({ err: exception, code, status }, 'request failed');

    // A streamed response cannot switch to an error body; end it as Nest's default filter does (#23).
    if (res.headersSent) {
      res.end();
      return;
    }

    const body: ErrorEnvelope = {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        requestId: req.id,
      },
    };
    res.status(status).json(body);
  }
}

function resolve(exception: unknown): ResolvedError {
  if (exception instanceof ApiException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }
  const status = errorStatus(exception);
  // A non-error status thrown as an exception is a bug, not something to send the client (#23).
  if (status === undefined || status < 400) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: MESSAGES.INTERNAL,
    };
  }
  // Statuses without a code keep their status, so HTTP semantics such as 406 or 502 survive (#23).
  const code = CODES.get(status) ?? (status < 500 ? 'BAD_REQUEST' : 'INTERNAL');
  return { status, code, message: MESSAGES[code] };
}

/**
 * Status of a Nest HttpException, or of an http-errors client error such as the body parser's 413
 * and 415, which Nest does not convert to HttpException (#23). `expose` marks them as client errors.
 */
function errorStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) return exception.getStatus();
  if (!(exception instanceof Error)) return undefined;
  const { status, expose } = exception as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && expose === true ? status : undefined;
}
