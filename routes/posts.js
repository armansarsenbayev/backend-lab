const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { sanitizeContent } = require('../lib/sanitizer'); //
const { requireAuth } = require('../middleware/auth');

// GET /api/posts
router.get('/', async (req, res) => {
  try {
    const { published, authorId } = req.query;

    const where = {};
    if (published !== undefined) where.published = published === 'true';
    if (authorId) where.authorId = parseInt(authorId, 10);

    const posts = await prisma.post.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts
router.post('/', requireAuth, async (req, res) => { // 
  try { // 
    const { title, content, authorId } = req.body; // 
    
    // Очищаем контент и заголовок от XSS скриптов 
    const cleanContent = sanitizeContent(content); // 
    const cleanTitle = sanitizeContent(title); // 

    const post = await prisma.post.create({ // 
      data: { // 
        title: cleanTitle, // 
        content: cleanContent, // 
        authorId: parseInt(authorId) // 
      } // 
    }); // 
    
    res.status(201).json(post); // 
  } catch (error) { // 
    res.status(500).json({ error: 'Failed to create post' }); // 
  } // 
}); //
// PUT /api/posts/:id/publish
router.put('/:id/publish', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);

    const post = await prisma.post.update({
      where: { id: postId },
      data: { published: true },
      include: { author: { select: { id: true, name: true } } },
    });

    res.json(post);
  } catch (error) {
    res.status(404).json({ error: 'Post not found' });
  }
});

module.exports = router;