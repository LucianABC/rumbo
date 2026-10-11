import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { DynamicModule } from '@nestjs/common';
import { createLogger, REDACTED } from '@rumbo/logger';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

import type { AppConfig } from '../config.js';

export const REQUEST_ID_HEADER = 'x-request-id';
// Accept a caller's id (e.g. from the web proxy) only if it cannot smuggle data or break log lines.
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;
const HEALTHZ_PATH = '/api/v1/healthz';

export function requestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/** Path plus query keys only: query values may carry emails or tokens (#26). */
export function safeUrl(url: string | undefined): string {
  if (!url) return '';
  const [path = '', query] = url.split('?', 2);
  if (!query) return path;
  const keys = [...new URLSearchParams(query).keys()];
  return `${path}?${keys.map((key) => `${key}=${REDACTED}`).join('&')}`;
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
      serializers: {
        req: (req: IncomingMessage) => ({ method: req.method, url: safeUrl(req.url) }),
        res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        if (req.url?.startsWith(HEALTHZ_PATH)) return 'silent';
        return 'info';
      },
    },
  });
}
