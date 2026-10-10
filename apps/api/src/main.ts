import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule, configureApp } from './app.module.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = configureApp(await NestFactory.create(AppModule.forRoot(config)));
await app.listen(config.port);
