const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Email invalide']
    },
    password: {
        type: String,
        required: [true, 'Mot de passe requis'],
        minlength: [8, 'Minimum 8 caractères'],
        select: false
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Maximum 50 caractères']
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Maximum 50 caractères']
    },
    phone: {
        type: String,
        match: [/^0[1-9](\d{8})$/, 'Numéro français invalide']
    },
    addresses: [{
        label: { type: String, default: 'Principale' },
        street: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, default: 'France' },
        isDefault: { type: Boolean, default: false }
    }],
    role: {
        type: String,
        enum: ['user', 'admin', 'support'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    preferences: {
        newsletter: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true },
        language: { type: String, default: 'fr' }
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);