import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

import { HealthService, type HealthReport } from './health.service.js';

@Controller('healthz')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** 200 when the database answers, 503 otherwise; the body is the same report in both cases. */
  @Get()
  async get(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const report = await this.health.check();
    if (report.db === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
