const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// VULNERABLE: Raw SQL query (for SQL injection demo)
router.get('/vulnerable/users/search', async (req, res) => {
  const { name } = req.query;
  // DANGER: String concatenation in SQL
  const result = await prisma.$queryRawUnsafe(
    `SELECT * FROM users WHERE name LIKE '%${name}%'`
  );
  res.json(result);
});

// VULNERABLE: No input validation (Mass Assignment)
router.put('/vulnerable/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  // DANGER: Spreads entire body without filtering
  const user = await prisma.user.update({
    where: { id },
    data: req.body  // Attacker can inject role: "admin"
  });
  res.json(user);
});

// VULNERABLE: No XSS protection (accepts raw HTML/JS)
router.post('/vulnerable/posts', async (req, res) => {
  const { title, content, authorId } = req.body;
  // DANGER: Stores raw HTML/JS without sanitization
  const post = await prisma.post.create({
    data: {
      title,
      content,  // Will contain <script>alert('xss')</script>
      authorId: parseInt(authorId)
    }
  });
  res.json(post);
});

router.post('/vulnerable/login', async (req, res) => {
  const { email, password } = req.body;

  // DANGER: If req.body = { email: { $gt: "" }, password: { $gt: "" } }
  // This bypasses authentication in MongoDB-style databases
  const user = await prisma.user.findFirst({
    where: {
      email: email,  // Could be { $gt: "" } - matches any email
      passwordHash: password
    }
  });

  if (user) {
    res.json({ message: 'Logged in', user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});


module.exports = router;
