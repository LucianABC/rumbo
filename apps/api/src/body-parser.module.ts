import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { json, urlencoded } from 'express';

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
      .apply(json(), urlencoded({ extended: true }))
      .forRoutes({ path: '{/*splat}', method: RequestMethod.ALL });
  }
}
