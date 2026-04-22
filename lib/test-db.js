// File: lib/test-db.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    },
  },
});

async function resetDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();
}

module.exports = { prisma, resetDatabase };