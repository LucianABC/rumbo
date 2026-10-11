import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  type CanActivate,
  type DynamicModule,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { createLogger, serializeError } from '@rumbo/logger';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

import type { AppConfig } from '../config.js';

export const REQUEST_ID_HEADER = 'x-request-id';
// A caller's id (e.g. the web proxy's) is kept only if it is a canonical UUID: free-form ids are
// client-chosen text and could carry a name into every log line, which redaction cannot catch (#26).
const VALID_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEALTHZ_PATH = '/api/v1/healthz';

export function requestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

const ROUTE_PATTERN = Symbol('routePattern');

interface RoutedRequest extends IncomingMessage {
  route?: { readonly path?: unknown };
  [ROUTE_PATTERN]?: string;
}

/**
 * Records the matched route pattern (`/api/v1/people/:name`) on the request so the request log can
 * use it instead of the URL the client sent: path segments and query come from the client and may
 * carry names, which no pattern can detect (#26). It must run inside the handler: by the time the
 * response is logged, Express has moved `req.route` back to the logger middleware's route.
 * Registered as the first global guard so it also covers requests later rejected by auth guards.
 */
@Injectable()
export class RoutePatternGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RoutedRequest>();
    const path = req.route?.path;
    if (typeof path === 'string') req[ROUTE_PATTERN] = path;
    return true;
  }
}

/** Requests that match no route (404) log `null`. */
export function routePattern(req: RoutedRequest): string | null {
  return req[ROUTE_PATTERN] ?? null;
}

/**
 * JSON request logs with a request id on every line, including the ones services write while
 * handling the request (#26). Successful health checks are not logged: Docker and the load
 * balancer poll them every few seconds.
 */
export function loggingModule(config: AppConfig, destination?: DestinationStream): DynamicModule {
  return LoggerModule.forRoot({
    pinoHttp: {
      logger: createLogger({
        service: 'api',
        level: config.logLevel,
        ...(destination ? { destination } : {}),
      }),
      genReqId: requestId,
      quietReqLogger: true,
      customAttributeKeys: { reqId: 'reqId' },
      // pino-http serializes `req` when the request starts, before routing, so the route
      // pattern is added to the completion line instead (customSuccessObject/customErrorObject) (#26).
      serializers: {
        req: (req: IncomingMessage) => ({ method: req.method }),
        res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
        // pino-http brings its own err serializer, which would log the message (#26).
        err: serializeError,
      },
      customSuccessObject: (req, _res, value: object) => ({ ...value, route: routePattern(req) }),
      customErrorObject: (req, _res, _error, value: object) => ({
        ...value,
        route: routePattern(req),
      }),
      customLogLevel: (req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        if (req.url?.startsWith(HEALTHZ_PATH)) return 'silent';
        return 'info';
      },
    },
  });
}
