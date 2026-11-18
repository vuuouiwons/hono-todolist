import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createContainer } from './container.js';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 8080);
  const container = await createContainer({
    dbStorage: process.env.DB_STORAGE ?? './data/todo.sqlite',
    jwtSecret: process.env.JWT_SECRET,
  });

  const app = createApp(container);

  const server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`Hono Todo API listening on http://localhost:${info.port}`);
      console.log(`Scalar Docs:   http://localhost:${info.port}/docs`);
      console.log(`Swagger UI:    http://localhost:${info.port}/swagger`);
      console.log(`OpenAPI JSON:  http://localhost:${info.port}/openapi.json`);
    },
  );

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await container.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
