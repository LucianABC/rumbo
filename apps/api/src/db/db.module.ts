import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createPrisma, PrismaClient } from '@rumbo/db';

import { APP_CONFIG, type AppConfig } from '../config.js';

@Injectable()
class PrismaShutdown implements OnApplicationShutdown {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createPrisma(config.databaseUrl),
    },
    PrismaShutdown,
  ],
  exports: [PrismaClient],
})
export class DbModule {}
