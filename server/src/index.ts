import { createApp } from './app.js';
import { env } from './config/index.js';
import prisma from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`
  🚀 Cafe QR Server running!
  📡 URL: ${env.API_BASE_URL}
  🔧 Environment: ${env.NODE_ENV}
  📁 Uploads: ${env.UPLOAD_DIR}
  `);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Server and database disconnected.');
    process.exit(0);
  });

  // Force exit after 10s if hanging
  setTimeout(() => {
    console.error('⚠️ Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

