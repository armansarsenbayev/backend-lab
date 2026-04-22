// File: lib/imageProcessor.js
const sharp = require('sharp');
const path = require('path');
async function createThumbnail(inputPath, width = 200, height = 200) {
 const filename = path.basename(inputPath, path.extname(inputPath));
 const outputPath = `uploads/thumbnails/${filename}-thumb.jpg`;

 await sharp(inputPath)
 .resize(width, height, {
 fit: 'cover',
 position: 'center'
 })
 .jpeg({ quality: 80 })
 .toFile(outputPath);

 return outputPath;
}
async function resizeImage(inputPath, maxWidth = 1200) {
 const filename = path.basename(inputPath);
 const outputPath = `uploads/avatars/resized-${filename}`;

 await sharp(inputPath)
 .resize(maxWidth, null, {
 withoutEnlargement: true
 })
 .jpeg({ quality: 85 })
 .toFile(outputPath);

 return outputPath;
}
module.exports = { createThumbnail, resizeImage };