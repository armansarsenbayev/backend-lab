const bcrypt = require("bcryptjs")
const express = require("express")
const prisma = require("../lib/prisma")
const { requireAuth } = require('../middleware/auth');
const router = express.Router()
const zxcvbn = require('zxcvbn');
const { signAccessToken, signRefreshToken } = require('../lib/jwt');

router.get("/ping", (req, res) => res.json({ ok: true }));
const crypto = require('crypto');

// Helper function to hash refresh tokens before saving them
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const SALT_ROUNDS = 12; // Обязательно убедись, что это есть перед роутом!

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // 1. Базовая валидация
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // 2. Проверка zxcvbn
    const strength = zxcvbn(password);
    if (strength.score < 3) {
      return res.status(400).json({
        error: 'Password too weak',
        score: strength.score,
        crackTime: strength.crack_times_display ? strength.crack_times_display.online_no_throttling_10_per_second : 'unknown',
        warning: strength.feedback.warning,
        suggestions: strength.feedback.suggestions
      });
    }

    // 3. Проверка на существующего юзера
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email exists' });
    }

    // 4. Хеширование и создание
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        provider: 'local' // Важное поле из Lab 6
      },
      select: { id: true, email: true, name: true, role: true }
    });

    res.status(201).json({ message: 'User created', user });

  } catch (error) {
    // 🔥 ТЕПЕРЬ ОШИБКА БУДЕТ ВИДНА В ТЕРМИНАЛЕ VS CODE!
    console.error("🔥 ОШИБКА РЕГИСТРАЦИИ:", error);
    res.status(500).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// Secure Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // 1. CHECK LOCKOUT: Is the account currently locked?
    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.status(423).json({
        error: 'Account locked',
        lockedUntil: user.lockedUntil,
        retryAfter: `${remainingMin} minutes`,
        attemptsRemaining: 0
      });
    }

    // 2. CHECK CREDENTIALS
    const isPasswordValid = user && user.passwordHash 
      ? await bcrypt.compare(password, user.passwordHash) 
      : false;

    if (!isPasswordValid) {
      // Increment failed count safely
      const newCount = (user?.failedLoginCount || 0) + 1;

      if (user && newCount >= 5) {
        // LOCK the account for 15 minutes
        await prisma.user.update({
          where: { email },
          data: {
            failedLoginCount: newCount,
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000)
          }
        });
        return res.status(423).json({
          error: 'Account locked due to too many failed attempts',
          retryAfter: '15 minutes',
          attemptsRemaining: 0
        });
      }

      if (user) {
        await prisma.user.update({
          where: { email },
          data: { failedLoginCount: newCount }
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        attemptsRemaining: user ? 5 - newCount : 0
      });
    }

    // 3. SUCCESS: Reset lockout counter
    await prisma.user.update({
      where: { email },
      data: { failedLoginCount: 0, lockedUntil: null }
    });

    // 4. GENERATE TOKENS
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user); // Ensure this function is imported from lib/jwt.js

    // 5. SECURE REFRESH TOKEN: Hash and store in DB
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    res.json({ accessToken, refreshToken, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Secure Logout: Revokes a specific refresh token
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const tokenHash = hashToken(refreshToken);

    // Delete the token if it exists (idempotent action)
    await prisma.refreshToken.deleteMany({
      where: { 
        token: tokenHash,
        userId: req.user.sub // Ensures they can only delete their own token
      }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Bonus: Logout-All (Revokes all sessions across all devices)
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.sub }
    });
    res.json({ message: 'Logged out of all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to log out of all devices' });
  }
});
module.exports = router