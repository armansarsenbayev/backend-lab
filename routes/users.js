const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
let users = [
    { id: 1, name: 'Alice', role: 'student' },
    { id: 2, name: 'Bob', role: 'instructor' }
];

router.get('/', (req, res) => res.json({ count: users.length, data: users }));

router.get('/secure/users/search', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.length > 50) {
      return res.status(400).json({ error: 'Invalid search term' });
    }

    // SAFE: Prisma automatically parameterizes this
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
        // NEVER select passwordHash
      }
    });

    res.json({ count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});


router.get('/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
});

router.post('/', (req, res) => {
    const { name, role } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Missing fields' });
    const newUser = { id: users.length + 1, name, role };
    users.push(newUser);
    res.status(201).json(newUser);
});

const { strictString } = require('../middleware/sanitize');

router.post('/login', async (req, res) => {
  try {
    // Force string type - rejects objects
    const email = strictString(req.body.email);
    const password = strictString(req.body.password);

    // Now safe to query
    const user = await prisma.user.findUnique({ where: { email } });
    // ... bcrypt comparison ...
  } catch (error) {
    if (error.message.includes('Expected string')) {
      return res.status(400).json({ error: 'Invalid input format' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});


// Явно определяем, какие поля можно обновлять [cite: 1205]
// SECURE: Explicitly define allowed fields
const ALLOWED_UPDATE_FIELDS = ['name', 'email', 'avatar'];  // NO role, NO passwordHash

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.sub;
    const currentRole = req.user.role;

    // Authorization check
    if (currentUserId !== targetId && currentRole !== 'admin') {
      return res.status(403).json({ error: 'Can only update own profile' });
    }

    // WHITELIST: Only accept specific fields
    const updateData = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Admin-only fields (separate check)
    if (currentRole === 'admin' && req.body.role) {
      updateData.role = req.body.role;
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, avatar: true }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});


router.delete('/:id', (req, res) => {
    const index = users.findIndex(u => u.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    users.splice(index, 1);
    res.status(204).send();
});

module.exports = router;

// File: routes/users.js
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// Helper to add avatar URL
function addAvatarUrl(user) {
 return {
 ...user,
 avatarUrl: user.avatar ? `${BASE_URL}/uploads/avatars/${user.avatar}` : null
 };
}
// In GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
 const user = await prisma.user.findUnique({
 where: { id: parseInt(req.params.id) },
 select: { id: true, name: true, email: true, avatar: true, role: true }
 });

 if (!user) {
 return res.status(404).json({ error: 'User not found' });
 }

 res.json(addAvatarUrl(user));
});
