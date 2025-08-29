import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate a default JWT secret if not provided
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Basic JWT authentication middleware
 * For MVP - can be enhanced with user management later
 */
export const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // For MVP, allow unauthenticated requests with anonymous user
      req.user = {
        id: 'anonymous',
        role: 'guest'
      };
      return next();
    }

    // Extract token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user to request
    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {String} expiresIn - Token expiration (default: 7d)
 */
export const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * API Key authentication middleware
 * Simple key-based auth for MVP
 */
export const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    // For MVP, allow requests without API key
    req.apiKeyValid = false;
    return next();
  }

  // In production, validate against database
  // For MVP, check against environment variable
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
  
  if (validApiKeys.includes(apiKey)) {
    req.apiKeyValid = true;
    req.apiKey = apiKey;
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }
};

/**
 * Rate limiting middleware
 * Prevents API abuse
 */
const requestCounts = new Map();

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // max requests per window
    message = 'Too many requests, please try again later'
  } = options;

  return (req, res, next) => {
    // Get identifier (IP or user ID)
    const identifier = req.user?.id || req.ip;
    const now = Date.now();
    
    // Get or create request record
    if (!requestCounts.has(identifier)) {
      requestCounts.set(identifier, {
        count: 0,
        resetTime: now + windowMs
      });
    }
    
    const record = requestCounts.get(identifier);
    
    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    // Increment count
    record.count++;
    
    // Check limit
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    
    next();
  };
};

/**
 * Role-based access control
 * @param {Array} allowedRoles - Roles allowed to access the route
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

/**
 * Validate request body
 * @param {Object} schema - Validation schema
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      // Check required
      if (rules.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // Check type
      if (value && rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }
      
      // Check min length
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      
      // Check max length
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
      
      // Check pattern
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    next();
  };
};

/**
 * CORS middleware configuration
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check against allowed origins
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // CSP for API
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  );
  
  next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'anonymous',
      ip: req.ip
    });
  });
  
  next();
};

// Export all middleware
export default {
  authenticate,
  generateToken,
  authenticateApiKey,
  rateLimit,
  requireRole,
  validateBody,
  corsOptions,
  securityHeaders,
  requestLogger
};