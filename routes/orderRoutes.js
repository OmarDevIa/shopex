const express = require('express');
const Order = require('../models/Order');

const router = express.Router();

router.get('/my', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ items: orders, count: orders.length });
    } catch (error) {
        console.error('[ORDER ERROR]', error.message);
        res.status(500).json({ error: 'Erreur récupération commandes' });
    }
});

module.exports = router;
