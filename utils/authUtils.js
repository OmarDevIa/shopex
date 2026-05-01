const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Génération de token JWT
const generateToken = (userId, email, role = 'user') => {
    return jwt.sign(
        {
            userId,
            email,
            role,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'ShopEx-Chatbot',
            audience: 'ShopEx-Client'
        }
    );
};

// Génération de token de rafraîchissement
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

// Vérification de token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Hashage de mot de passe
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

// Vérification de mot de passe
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Génération d'ID de session sécurisé
const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Génération de nonce pour CSP
const generateNonce = () => {
    return crypto.randomBytes(16).toString('base64');
};

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    hashPassword,
    verifyPassword,
    generateSessionId,
    generateNonce
};