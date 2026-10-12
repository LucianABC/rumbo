import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule, APP_OPTIONS, configureApp } from './app.module.js';
import { loadConfig } from './config.js';

const config = loadConfig();
// bufferLogs: bootstrap messages wait for the JSON logger instead of printing in Nest's format (#26).
const app = configureApp(
  await NestFactory.create(AppModule.forRoot(config), {
    ...APP_OPTIONS,
    bufferLogs: true,
  }),
);
await app.listen(config.port);
