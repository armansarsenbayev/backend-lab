// File: app.test.js
const express = require('express');
const app = express();

app.use(express.json());

const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/apiKeys');
const dataRoutes = require('./routes/data');

app.use('/api/auth', authRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/v1', dataRoutes);

module.exports = app;