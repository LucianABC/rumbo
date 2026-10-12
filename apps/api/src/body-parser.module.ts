import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { json, type NextFunction, type Request, type Response, urlencoded } from 'express';

// multipart is parsed later by the upload interceptor, so it is let through here.
const ACCEPTED_TYPES = ['json', 'urlencoded', 'multipart'];

/**
 * A body neither parser accepted would reach the validation pipe as `undefined` and fail as a
 * schema error (400 invalid_type), which hides the real problem: the content type (#24).
 */
export function rejectUnparsedBody(req: Request, _res: Response, next: NextFunction): void {
  const hasBody =
    req.headers['transfer-encoding'] !== undefined || Number(req.headers['content-length']) > 0;
  if (req.body === undefined && hasBody && !req.is(ACCEPTED_TYPES)) {
    next(new UnsupportedMediaTypeException());
    return;
  }
  next();
}

/**
 * Replaces Nest's built-in body parser (disabled in APP_OPTIONS), which runs before any module
 * middleware: a body it rejected never reached pino-http, so the request went unlogged and its
 * request id matched no log line (#23). Nest applies global modules' middleware (LoggerModule)
 * before non-global ones like this, so parsing now happens inside the logged request.
 */
@Module({})
export class BodyParserModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(json(), urlencoded({ extended: true }), rejectUnparsedBody)
      .forRoutes({ path: '{/*splat}', method: RequestMethod.ALL });
  }
}
