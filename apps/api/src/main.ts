import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule, APP_OPTIONS, configureApp } from './app.module.js';
import { loadConfig } from './config.js';

const config = loadConfig();
// bufferLogs: bootstrap messages wait for the JSON logger instead of printing in Nest's format (#26).
const app = configureApp(
  // Nest types its options bag as a class but takes plain literals (#187).
  // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
  await NestFactory.create(AppModule.forRoot(config), {
    ...APP_OPTIONS,
    bufferLogs: true,
  }),
);
await app.listen(config.port, config.host);
