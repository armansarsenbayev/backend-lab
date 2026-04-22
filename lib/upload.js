// File: lib/upload.js (updated with validation)
const multer = require('multer');
const path = require('path');
// Allowed file types
const ALLOWED_TYPES = /jpeg|jpg|png|gif|webp/;
// Max file size: 5MB
const MAX_SIZE = 5 * 1024 * 1024;
const storage = multer.diskStorage({
 destination: (req, file, cb) => {
 cb(null, 'uploads/avatars/');
 },
 filename: (req, file, cb) => {
 const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
 const ext = path.extname(file.originalname).toLowerCase();
 cb(null, `avatar-${uniqueSuffix}${ext}`);
 }
});
// File filter for type validation
const fileFilter = (req, file, cb) => {
 const extname = ALLOWED_TYPES.test(
 path.extname(file.originalname).toLowerCase()
 );
 const mimetype = ALLOWED_TYPES.test(file.mimetype);

 if (extname && mimetype) {
 return cb(null, true);
 } else {
 cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
 }
};
const upload = multer({
    storage,
 fileFilter,
 limits: { fileSize: MAX_SIZE }
});
module.exports = { upload };