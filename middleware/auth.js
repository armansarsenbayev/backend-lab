const zxcvbn = require('zxcvbn');
const crypto = require('crypto');

// Helper function to hash refresh tokens before saving them
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
const { verifyAccessToken } = require('../lib/jwt');
const prisma = require('../lib/prisma');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Format: Bearer <token>' });
    }
    
    const token = authHeader.slice('Bearer '.length);
    const payload = verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      ...user
    };
    next();
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };