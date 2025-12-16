import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { ZodSchema, ZodError } from 'zod';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { query } from '../config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: string;
      };
      session?: {
        id: string;
        companyId: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      // Verify user still exists and is active
      const result = await query(
        'SELECT id, email, company_id, role, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        companyId: result.rows[0].company_id,
        role: result.rows[0].role,
      };

      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional Authentication (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    const result = await query(
      'SELECT id, email, company_id, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        companyId: result.rows[0].company_id,
        role: result.rows[0].role,
      };
    }
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }

  next();
};

/**
 * Session Token Authentication
 */
export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string || req.query.sessionToken as string;

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const result = await query(
      'SELECT id, company_id, user_id FROM sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.session = {
      id: result.rows[0].id,
      companyId: result.rows[0].company_id,
    };

    // Also attach user if session has one
    if (result.rows[0].user_id) {
      const userResult = await query(
        'SELECT id, email, company_id, role FROM users WHERE id = $1',
        [result.rows[0].user_id]
      );

      if (userResult.rows.length > 0) {
        req.user = {
          id: userResult.rows[0].id,
          email: userResult.rows[0].email,
          companyId: userResult.rows[0].company_id,
          role: userResult.rows[0].role,
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Session authentication error', { error });
    return res.status(500).json({ error: 'Session authentication failed' });
  }
};

/**
 * Role-based Authorization
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Zod Validation Middleware
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = schema.parse(data);

      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        req.query = validated as any;
      } else {
        req.params = validated as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.log('Validation Error:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw error;
    }
  };
};

/**
 * Rate Limiting
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: { error: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true,
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: { error: 'Too many messages, please slow down' },
});

/**
 * Error Handling Middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Don't expose internal errors in production
  const message = config.isDev ? err.message : 'Internal server error';

  res.status(500).json({ error: message });
};

/**
 * Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
};

/**
 * Request Logging Middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};

/**
 * Company Context Middleware
 */
export const companyContext = async (req: Request, res: Response, next: NextFunction) => {
  const companySlug = req.params.companySlug || req.query.companySlug || req.body?.companySlug;

  if (!companySlug) {
    return next();
  }

  try {
    const result = await query(
      'SELECT id, name, settings FROM companies WHERE slug = $1',
      [companySlug]
    );

    if (result.rows.length > 0) {
      req.session = {
        ...req.session,
        companyId: result.rows[0].id,
      } as any;
    }

    next();
  } catch (error) {
    logger.error('Company context error', { error });
    next();
  }
};
