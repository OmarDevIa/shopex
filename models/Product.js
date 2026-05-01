const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nom du produit requis'],
        trim: true,
        maxlength: [200, 'Maximum 200 caractères']
    },
    description: {
        type: String,
        required: true,
        maxlength: [2000, 'Maximum 2000 caractères']
    },
    shortDescription: {
        type: String,
        maxlength: [300, 'Maximum 300 caractères']
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Prix ne peut être négatif']
    },
    comparePrice: {
        type: Number,
        min: 0
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    category: {
        type: String,
        required: true,
        enum: ['electronics', 'fashion', 'home', 'sports', 'books', 'other']
    },
    subcategory: String,
    tags: [String],
    images: [{
        url: String,
        alt: String,
        isMain: Boolean
    }],
    stock: {
        quantity: { type: Number, default: 0, min: 0 },
        reserved: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['in_stock', 'low_stock', 'out_of_stock'],
            default: 'in_stock'
        }
    },
    attributes: [{
        name: String,
        value: String
    }],
    ratings: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    weight: Number,
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    }
}, {
    timestamps: true
});

// Index pour la recherche texte
productSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text',
    category: 'text'
});

// Index pour les filtres
productSchema.index({ category: 1, price: 1 });
productSchema.index({ 'stock.status': 1 });

module.exports = mongoose.model('Product', productSchema);