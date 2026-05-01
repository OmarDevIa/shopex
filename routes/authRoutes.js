const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/authUtils');
const { strictLimiter } = require('../middleware/auth');

// Inscription
router.post('/register', strictLimiter, async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        // Vérifier si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Créer l'utilisateur
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            phone
        });

        // Générer les tokens
        const token = generateToken(user._id, user.email, user.role);
        const refreshToken = generateRefreshToken(user._id);

        res.status(201).json({
            message: 'Compte créé avec succès',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            },
            token,
            refreshToken
        });
    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// Connexion
router.post('/login', strictLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Récupérer l'utilisateur avec le mot de passe
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Vérifier le mot de passe
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Mettre à jour la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        // Générer les tokens
        const token = generateToken(user._id, user.email, user.role);
        const refreshToken = generateRefreshToken(user._id);

        res.json({
            message: 'Connexion réussie',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                addresses: user.addresses
            },
            token,
            refreshToken
        });
    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

module.exports = router;