require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');

const { securityMiddleware, securityLogger } = require('./middleware/security');
const { authenticateToken, chatLimiter, strictLimiter } = require('./middleware/auth');
const { chatMessageSchema, validate } = require('./middleware/validation');

const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopchat', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// Middleware globaux
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(securityMiddleware);
app.use(securityLogger);

// Routes publiques
app.use('/api/auth', authRoutes);

// Routes protégées
app.use('/api/chat', authenticateToken, chatLimiter, chatRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Erreur serveur'
            : err.message
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur sécurisé démarré sur http://localhost:${PORT}`);
    console.log(`🔒 Mode: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;