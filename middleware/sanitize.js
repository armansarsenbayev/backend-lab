const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');


// Remove $ and . operators from req.body, req.query, req.params
const sanitizeMongo = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized NoSQL operator: ${key} from IP: ${req.ip}`);
  }
});

// Strict string validation helper
const strictString = (value) => {
  if (typeof value !== 'string') {
    throw new Error('Expected string, received ' + typeof value);
    }
  // Remove null bytes and trim
  return value.replace(/\u0000/g, '').trim();
};


// XSS Clean middleware - strips script tags from req.body
const sanitizeXSS = xss();

module.exports = { sanitizeMongo, sanitizeXSS, strictString };
