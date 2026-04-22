// File: routes/uploads.js
const express = require('express');
const prisma = require('../lib/prisma');
const router = express.Router();
const { validateUpload } = require('../middleware/uploadSecurity'); //
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../lib/upload');

router.post('/avatar',
 requireAuth,
 upload.single('avatar'),
 validateUpload,
 async (req, res) => {
 try {
 if (!req.file) {
 return res.status(400).json({ error: 'No file uploaded' });
 }

 // Process image
 const thumbnailPath = await createThumbnail(req.file.path, 150, 150);

 // Update user avatar in database
 const user = await prisma.user.update({
 where: { id: req.user.sub },
 data: { avatar: req.file.filename },
 select: { id: true, name: true, email: true, avatar: true }
 });

 res.json({
 message: 'Avatar updated successfully',
 user
 });
 } catch (error) {
 console.error('Upload error:', error);
 res.status(500).json({ error: 'Upload failed' });
 }
 }
)
module.exports = router;