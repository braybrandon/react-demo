import express, { Request, Response } from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import jwt from 'jsonwebtoken';
import authRouter from './controllers/auth';
import usersRouter from './controllers/users';
import { authLimiter } from './middleware/rateLimit';
import requireCsrfHeader from './middleware/requireCsrfHeader';
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const prisma = new PrismaClient();

app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Serve static files from the public folder (demo.html is served at /demo.html)
app.use(express.static(path.join(process.cwd(), 'public')));

// CSRF protection using double submit (csrf secret in cookie)
const csrfProtection = csurf({ cookie: true });

// Enable CSRF only in production (or when explicitly enabled). For local
// development we disable csurf so that Swagger / local testing can use cookie
// flows without the extra double-submit requirement. You may also set
// DISABLE_CSRF=true in your environment to force-disable CSRF.
const csrfEnabled = process.env.NODE_ENV === 'production' && process.env.DISABLE_CSRF !== 'true';

// Diagnostic startup log to make it explicit when CSRF is enabled/disabled
console.log('Startup env:', { NODE_ENV: process.env.NODE_ENV, DISABLE_CSRF: process.env.DISABLE_CSRF, csrfEnabled });

if (csrfEnabled) {
  // Apply CSRF protection conditionally: skip specific whitelist routes (login/register etc.)
  // Note: we must NOT skip the /auth/csrf-token route so csurf can attach req.csrfToken()
  app.use((req, res, next) => {
    // Only skip CSRF for public, non-mutating, or explicitly allowed endpoints.
    // Keep /auth/csrf-token NOT whitelisted so csurf can attach req.csrfToken().
    // We intentionally do NOT whitelist /auth/refresh or /auth/logout so that
    // cookie-based refresh/logout flows require a valid CSRF token.
    const whitelist = ['/docs', '/auth/login', '/auth/register'];
    // Skip whitelisted paths which should be able to run without CSRF (e.g. initial login/register)
    if (whitelist.includes(req.path)) return next();

    // If the request uses Authorization: Bearer <token> we assume it's an API token
    // flow (no cookies) and bypass CSRF protection. Cookie-based requests still
    // require a valid CSRF token.
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.startsWith('Bearer ')) return next();

    return csrfProtection(req, res, next);
  });

  // CSRF error handler (returns 403 for invalid tokens)
  app.use((err: any, req: any, res: any, next: any) => {
    if (err && err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return next(err);
  });

  // Enforce presence of X-CSRF-Token header for cookie-based mutating requests
  app.use(requireCsrfHeader);
} else {
  console.log('CSRF protection disabled for local/development environment');
}


// CORS policy: allow configured FRONTEND_ORIGIN plus common dev origins (Vite)
const configured = process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : ['http://localhost:3000'];
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = Array.from(new Set([...configured, ...devOrigins]));
console.log('CORS allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/health', (req: Request, res: Response) => res.json({ status: 'ok' }));

/**
 * Swagger setup using swagger-jsdoc that scans this file for JSDoc @openapi blocks
 */
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'My Demo WebAPI', version: '0.1.0' },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints (register, login) and token issuance' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Permissions', description: 'Permission management endpoints' },
      { name: 'Roles', description: 'Role management endpoints' },
      { name: 'Features', description: 'Feature management endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        // Allow documenting cookie-based access as well (name 'access')
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        UserCreate: {
          type: 'object',
          required: ['name', 'email'],
          properties: { name: { type: 'string' }, email: { type: 'string' } },
        },
        Permission: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            key: { type: 'string' },
            name: { type: 'string' },
            value: { type: 'integer' },
            featureId: { type: 'integer' },
          },
        },
        RolePermission: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            roleId: { type: 'integer' },
            permissionId: { type: 'integer' },
            permission: { $ref: '#/components/schemas/Permission' },
          },
        },
      },
    },
  },
  // Use absolute paths so swagger-jsdoc can locate controller files reliably at runtime
  apis: [__filename, `${process.cwd().replace(/\\\\/g, '/')}/src/controllers/*.ts`],
});

// Protect Swagger UI in non-development environments
if (process.env.NODE_ENV === 'development') {
  // In development, expose Swagger UI without custom helper scripts
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} else {
  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPass = process.env.SWAGGER_PASS;
  // swaggerUi.serve may be an array of middlewares; normalize to array
  const serveMiddleware = Array.isArray((swaggerUi as any).serve) ? (swaggerUi as any).serve : [(swaggerUi as any).serve];

  app.use(
    '/docs',
    (req, res, next) => {
      if (!swaggerUser || !swaggerPass) return res.status(503).send('Swagger not configured');
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
        return res.status(401).send('Authorization required');
      }
      const creds = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
      const [user, pass] = creds.split(':');
      if (user !== swaggerUser || pass !== swaggerPass) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
        return res.status(401).send('Invalid credentials');
      }
      next();
    },
    ...serveMiddleware,
    (swaggerUi as any).setup(swaggerSpec)
  );
}

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
// GET /users moved to src/controllers/users.ts


// User creation is handled via POST /auth/register. The direct POST /users
// endpoint was removed to centralize registration and ensure password hashing
// and other registration logic is applied consistently.

// Apply rate limiter to auth endpoints
app.use('/auth', authLimiter, authRouter);
app.use('/users', usersRouter);
import rolesRouter from './controllers/roles';
app.use('/roles', rolesRouter);
import featuresRouter from './controllers/features';
app.use('/features', featuresRouter);
import permissionsRouter from './controllers/permissions';
app.use('/permissions', permissionsRouter);

async function start() {
  // Ensure a strong JWT secret is configured
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Set JWT_SECRET in your .env before starting the server.');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('Prisma connected to database');
  } catch (err) {
    console.error('Prisma connection error:', err);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
