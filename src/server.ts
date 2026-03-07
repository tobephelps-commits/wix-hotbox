import 'dotenv/config';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { createDatabase, runMigrations, closeDatabase } from './db/index.js';

async function main() {
  const config = loadConfig();

  // Open database and run migrations
  console.log('Opening database...');
  const db = createDatabase(config);
  console.log(`Database opened at ${config.dataDir}/hotbox.db`);

  console.log('Running migrations...');
  runMigrations(db);

  // Build app with database
  const app = await buildApp(config, db);

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`HotBox server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    closeDatabase(db);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('App closed.');
    closeDatabase(db);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
