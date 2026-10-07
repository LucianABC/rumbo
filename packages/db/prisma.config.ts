import { defineConfig } from 'prisma/config';

// Local convenience: load the repo-root .env if present (Node's built-in loader, no dotenv).
try {
  process.loadEnvFile('../../.env');
} catch {
  // No .env file: DATABASE_URL must come from the environment (CI, Docker Compose).
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
