const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// Configuration CORS sécurisée
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit'],
    maxAge: 86400 // 24 heures
};

// Configuration Helmet personnalisée
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.GROQ_URL || "https://api.groq.com"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
};

// Middleware de sécurité combiné
const securityMiddleware = [
    helmet(helmetConfig),
    cors(corsOptions),
    mongoSanitize(),
    xss(),
    hpp()
];

// Logger des tentatives suspectes
const securityLogger = (req, res, next) => {
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onload=/i,
        /SELECT.*FROM/i,
        /INSERT.*INTO/i,
        /DELETE.*FROM/i
    ];

    const checkSuspicious = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(obj[key])) {
                        console.warn(`[SECURITY] Tentative suspecte détectée: ${pattern} dans ${key}`);
                        console.warn(`[SECURITY] IP: ${req.ip}, User-Agent: ${req.headers['user-agent']}`);
                        return true;
                    }
                }
            }
        }
        return false;
    };

    if (checkSuspicious(req.body) || checkSuspicious(req.query)) {
        return res.status(400).json({ error: 'Requête invalide' });
    }

    next();
};

module.exports = {
    securityMiddleware,
    securityLogger,
    corsOptions
};