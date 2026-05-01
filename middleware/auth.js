const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide ou expiré' });
        }
        req.user = user;
        next();
    });
};

// Rate Limiting pour les requêtes chat
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requêtes par minute
    message: {
        error: 'Trop de requêtes. Veuillez patienter.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiting strict pour les endpoints sensibles
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requêtes par 15 min
    message: {
        error: 'Trop de tentatives. Réessayez plus tard.'
    }
});

module.exports = {
    authenticateToken,
    chatLimiter,
    strictLimiter
};