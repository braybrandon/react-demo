import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';

// Treat non-production environments as development for local testing. Many
// `npm run dev` setups do not set NODE_ENV, so default to non-production
// behavior unless explicitly running in 'production'.
const isDev = process.env.NODE_ENV !== 'production';

export const authLimiter: RequestHandler = isDev
  ? ((req, _res, next) => next()) as RequestHandler
  : rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    });
