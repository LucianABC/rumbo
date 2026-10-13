import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, getSchemaPath, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { APP_CONFIG, type AppConfig } from '../config.js';
import { ErrorEnvelopeDto } from './schemas.js';

export const DOCS_PATH = 'api/docs';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

/**
 * Every operation gets the error envelope as its default response, so a new endpoint documents
 * the shared error format without its own decorators (#25). Explicit responses (healthz's 503)
 * take precedence.
 */
export function withDefaultErrorResponse(document: OpenAPIObject): OpenAPIObject {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!operation || 'default' in operation.responses) continue;
      operation.responses.default = {
        description: 'Error in the standard envelope',
        content: {
          'application/json': { schema: { $ref: getSchemaPath(ErrorEnvelopeDto) } },
        },
      };
    }
  }
  return document;
}

/** Serves Swagger UI at /api/docs and the document at /api/docs/openapi.json (#25). */
export function setupOpenApi(app: INestApplication): void {
  const config = app.get<AppConfig>(APP_CONFIG);
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('rumbo API').setVersion(config.version).build(),
    { extraModels: [ErrorEnvelopeDto] },
  );
  SwaggerModule.setup(DOCS_PATH, app, withDefaultErrorResponse(cleanupOpenApiDoc(document)), {
    jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
  });
}
