const express = require('express');
const router = express.Router();
const { requireApiKey } = require('../middleware/apiKeyAuth');
const rateLimit = require('express-rate-limit');

const dataRateLimit = (req, res, next) => {
  const limiter = rateLimit({ windowMs: 60 * 1000, max: req.apiKey.plan === 'pro' ? 100 : 10, keyGenerator: () => req.apiKey.keyHash });
  limiter(req, res, next);
};

// GET /api/v1/weather
router.get('/weather', requireApiKey, (req, res) => {
    res.json({
        temperature: 22,
        humidity: '60%',
        source: 'premium',
        plan: req.apiKey.plan,
        requestsRemaining: req.apiKey.monthlyQuota - req.apiKey.requestsThisMonth
    });
});

// GET /api/v1/stocks
router.get('/stocks', requireApiKey, (req, res) => {
    const { symbol } = req.query;
    const prices = { AAPL: 150, GOOGL: 2800, TSLA: 800 };
    
    res.json({
        symbol: symbol || 'UNKNOWN',
        price: prices[symbol] || 100,
        planUsed: req.apiKey.plan
    });
});

module.exports = router;