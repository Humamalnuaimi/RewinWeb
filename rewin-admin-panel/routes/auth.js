const express = require('express');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Admin login endpoint
router.post('/login', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('Login attempt:', { email, password });

    // For now, we'll use a simple admin check
    // In production, you should implement proper admin authentication
    const ADMIN_EMAILS = [
      'alnuaimi.humam@gmail.com',
      'sicario0o0o@gmail.com',
      'admin@rewin.com'
    ];
    
    console.log('Admin emails:', ADMIN_EMAILS);
    console.log('Email check:', email, 'included:', ADMIN_EMAILS.includes(email));
    
    if (!ADMIN_EMAILS.includes(email)) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    // Create a simple JWT token (in production, use proper JWT library)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    
    const userData = {
      email: email,
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    };

    res.json({
      success: true,
      user: userData,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ valid: false, error: 'No token provided' });
    }

    // Simple token verification (in production, use proper JWT verification)
    const decoded = Buffer.from(token, 'base64').toString();
    const [email, timestamp] = decoded.split(':');
    
    // Check if token is not too old (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return res.json({ valid: false, error: 'Token expired' });
    }

    const ADMIN_EMAILS = [
      'alnuaimi.humam@gmail.com',
      'sicario0o0o@gmail.com',
      'admin@rewin.com'
    ];
    
    if (!ADMIN_EMAILS.includes(email)) {
      return res.json({ valid: false, error: 'Invalid token' });
    }

    const userData = {
      email: email,
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    };

    res.json({
      valid: true,
      user: userData
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a real implementation, you might want to blacklist the token
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router; 