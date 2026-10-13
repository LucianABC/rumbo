import { ErrorEnvelope, HealthReport } from '@rumbo/contracts';
import { createZodDto } from 'nestjs-zod';

// OpenAPI schemas are generated from the contracts, never redefined in the API (ADR 0006, #25).
export class HealthReportDto extends createZodDto(HealthReport) {}
export class ErrorEnvelopeDto extends createZodDto(ErrorEnvelope) {}
