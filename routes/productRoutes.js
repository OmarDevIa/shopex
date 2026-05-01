const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const category = req.query.category;

        const filter = { isActive: true };
        if (category) filter.category = category;

        const products = await Product.find(filter).limit(limit).sort({ createdAt: -1 });
        res.json({ items: products, count: products.length });
    } catch (error) {
        console.error('[PRODUCT ERROR]', error.message);
        res.status(500).json({ error: 'Erreur récupération produits' });
    }
});

module.exports = router;
