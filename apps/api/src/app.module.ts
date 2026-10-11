import { type DynamicModule, type INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

import { APP_CONFIG, type AppConfig } from './config.js';
import { DbModule } from './db/db.module.js';
import { HealthModule } from './health/health.module.js';
import { loggingModule, RoutePatternGuard } from './logging/logging.module.js';

export interface AppModuleOptions {
  /** Where logs go; tests pass a stream to assert on them. Defaults to stdout. */
  readonly logDestination?: DestinationStream;
}

@Module({})
export class AppModule {
  /** Config is passed in rather than read here so tests can build the app with their own. */
  static forRoot(config: AppConfig, options: AppModuleOptions = {}): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [loggingModule(config, options.logDestination), DbModule, HealthModule],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        // First global guard, so the route is recorded even for requests other guards reject (#26).
        { provide: APP_GUARD, useClass: RoutePatternGuard },
      ],
      exports: [APP_CONFIG],
    };
  }
}

/** HTTP setup shared by main.ts and the e2e tests. */
export function configureApp<T extends INestApplication>(app: T): T {
  // Nest's own logs (bootstrap, unhandled exceptions) go through the same redacting logger (#26).
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  return app;
}
