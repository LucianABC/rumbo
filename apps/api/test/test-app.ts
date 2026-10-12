import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';

import { APP_OPTIONS, AppModule, configureApp } from '../src/app.module.js';
import type { AppConfig } from '../src/config.js';
import type { captureLogs } from './log-capture.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** For tests whose requests never reach a handler that queries the database. */
export const UNUSED_DATABASE_URL = 'postgresql://unused@127.0.0.1:1/unused';

interface TestAppOptions {
  readonly logs: ReturnType<typeof captureLogs>;
  readonly databaseUrl?: string;
  /** Stand-ins for future endpoints. */
  readonly controllers?: Type[];
}

/** The app as main.ts builds it, with test config and logs captured. Call init() on it. */
export async function createTestApp({
  logs,
  databaseUrl = UNUSED_DATABASE_URL,
  controllers = [],
}: TestAppOptions): Promise<INestApplication<App>> {
  const config: AppConfig = {
    port: 0,
    databaseUrl,
    version: 'test',
    commit: 'test',
    logLevel: 'info',
  };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config, { logDestination: logs.destination })],
    controllers,
  }).compile();
  return configureApp(moduleRef.createNestApplication<INestApplication<App>>(APP_OPTIONS));
}
