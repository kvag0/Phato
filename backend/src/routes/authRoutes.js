import express from 'express';
import crypto from 'crypto';
import { generateToken, validateBody } from '../middleware/auth.js';

const router = express.Router();

// In-memory user store for MVP (replace with database in production)
const users = new Map();

/**
 * @route POST /api/auth/register
 * @desc Register a new user (MVP version)
 * @body {string} email - User email
 * @body {string} password - User password
 * @body {string} name - User name (optional)
 */
router.post('/register', 
  validateBody({
    email: { 
      required: true, 
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: { 
      required: true, 
      type: 'string',
      minLength: 6
    },
    name: { 
      type: 'string',
      minLength: 2,
      maxLength: 50
    }
  }),
  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check if user exists
      if (users.has(email)) {
        return res.status(400).json({
          success: false,
          error: 'User already exists'
        });
      }

      // Hash password (use bcrypt in production)
      const passwordHash = crypto
        .createHash('sha256')
        .update(password + (process.env.SALT || 'phato'))
        .digest('hex');

      // Create user
      const userId = crypto.randomUUID();
      const user = {
        id: userId,
        email,
        passwordHash,
        name: name || email.split('@')[0],
        role: 'user',
        createdAt: new Date()
      };

      users.set(email, user);

      // Generate token
      const token = generateToken({
        id: userId,
        email,
        role: user.role
      });

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: userId,
            email,
            name: user.name,
            role: user.role
          }
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user'
      });
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @body {string} email - User email
 * @body {string} password - User password
 */
router.post('/login',
  validateBody({
    email: { 
      required: true, 
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: { 
      required: true, 
      type: 'string'
    }
  }),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user
      const user = users.get(email);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const passwordHash = crypto
        .createHash('sha256')
        .update(password + (process.env.SALT || 'phato'))
        .digest('hex');

      if (passwordHash !== user.passwordHash) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to login'
      });
    }
  }
);

/**
 * @route POST /api/auth/guest
 * @desc Get guest access token
 */
router.post('/guest', async (req, res) => {
  try {
    const guestId = `guest_${crypto.randomUUID()}`;
    
    // Generate guest token (expires in 24 hours)
    const token = generateToken({
      id: guestId,
      role: 'guest'
    }, '24h');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: guestId,
          role: 'guest'
        }
      }
    });

  } catch (error) {
    console.error('Guest token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate guest token'
    });
  }
});

/**
 * @route POST /api/auth/api-key
 * @desc Generate API key for user
 * @header {string} Authorization - Bearer token
 */
router.post('/api-key', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || req.user.role === 'guest') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Generate API key
    const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`;
    
    // In production, save to database
    // For MVP, just return it
    
    res.json({
      success: true,
      data: {
        apiKey,
        createdAt: new Date(),
        userId: req.user.id
      }
    });

  } catch (error) {
    console.error('API key generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API key'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @header {string} Authorization - Bearer token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Generate new token
    const token = generateToken({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    res.json({
      success: true,
      data: { token }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @header {string} Authorization - Bearer token
 */
router.get('/me', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

// Demo accounts for testing
if (process.env.NODE_ENV === 'development') {
  // Create demo users
  const demoUser = {
    id: 'demo-user-1',
    email: 'demo@phato.app',
    passwordHash: crypto
      .createHash('sha256')
      .update('demo123' + (process.env.SALT || 'phato'))
      .digest('hex'),
    name: 'Demo User',
    role: 'user',
    createdAt: new Date()
  };
  
  const adminUser = {
    id: 'admin-user-1',
    email: 'admin@phato.app',
    passwordHash: crypto
      .createHash('sha256')
      .update('admin123' + (process.env.SALT || 'phato'))
      .digest('hex'),
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date()
  };
  
  users.set(demoUser.email, demoUser);
  users.set(adminUser.email, adminUser);
  
  console.log('📧 Demo accounts created:');
  console.log('  - demo@phato.app / demo123');
  console.log('  - admin@phato.app / admin123');
}

export default router;