import path from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://127.0.0.1:27017/helpdesk',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // When set, the API also serves the built React app (used by the Docker image).
  clientDist: process.env.CLIENT_DIST ? path.resolve(process.env.CLIENT_DIST) : undefined,
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('Set JWT_SECRET in production');
}
