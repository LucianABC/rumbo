import { type DynamicModule, type INestApplication, Module } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from './config.js';
import { DbModule } from './db/db.module.js';
import { HealthModule } from './health/health.module.js';

@Module({})
export class AppModule {
  /** Config is passed in rather than read here so tests can build the app with their own. */
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [DbModule, HealthModule],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}

/** HTTP setup shared by main.ts and the e2e tests. */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  return app;
}
