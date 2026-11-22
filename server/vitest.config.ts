import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://root:password@localhost:3306/cafe_qr',
      JWT_ACCESS_SECRET: 'test-jwt-access-secret-key-at-least-32-chars',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-at-least-32-chars',
      TABLE_TOKEN_SECRET: 'test-table-token-secret-at-least-16-chars',
      API_BASE_URL: 'http://localhost:3000',
      UPLOAD_DIR: './uploads',
      INTERNAL_CRON_KEY: 'test-cron-key',
    },
  },
});

