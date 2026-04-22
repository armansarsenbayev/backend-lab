require('dotenv').config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const allowedOrigins = [
  'http://localhost:5173',  // Your frontend dev server
  'http://localhost:3000',
  'https://your-production-app.com'
];


// Импорты роутов
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const authRoutes = require("./routes/auth");
const uploadRoutes = require('./routes/uploads');
const oauthRoutes = require('./routes/oauth');
const apiKeyRoutes = require('./routes/apiKeys');
const dataRoutes = require('./routes/data');
const vulnerableRoutes = require('./routes/vulnerable');

const app = express();
const PORT = 3000;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,  // Allow cookies
  maxAge: 86400  // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// 1. БЕЗОПАСНОСТЬ (Важен порядок!)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles if needed
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:5173']
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year HTTPS enforcement
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
}));

// Custom headers for API
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');  // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '0');  // Disabled in favor of CSP
  next();
});
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); 
app.use(express.json());
  


// 2. Статика
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Логирование

// 4. Подключение роутов
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);     // ОAuth
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/api-keys', apiKeyRoutes); // Управление ключами
app.use('/api/v1', dataRoutes);         // Платные API
app.use('/api/vulnerable', vulnerableRoutes);

// 5. Обработчик ошибок (всегда в самом конце)
app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));