const Joi = require('joi');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Schéma de validation pour les messages chat
const chatMessageSchema = Joi.object({
    message: Joi.string()
        .min(1)
        .max(2000)
        .required()
        .custom((value, helpers) => {
            const sanitized = DOMPurify.sanitize(value, {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: []
            });
            if (sanitized !== value) {
                console.warn('Tentative XSS détectée et nettoyée');
            }
            return sanitized;
        }),
    sessionId: Joi.string()
        .alphanum()
        .min(10)
        .max(50)
        .required(),
    documentation: Joi.string().optional(),
    delivery: Joi.string().optional()
});

// Schéma pour les requêtes utilisateur
const userUpdateSchema = Joi.object({
    address: Joi.string().min(5).max(500).required(),
    userId: Joi.number().integer().positive().required()
});

// Schéma pour les requêtes de facture
const invoiceSchema = Joi.object({
    orderId: Joi.number().integer().positive().required()
});

// Middleware de validation générique
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).json({
                error: 'Données invalides',
                details: errorMessages
            });
        }

        req.body = value;
        next();
    };
};

// Validation des tools retournés par l'IA
const validateToolResponse = (toolResponse) => {
    const validTools = ['documentation', 'delivery', 'updateAddress', 'invoice', 'askOrderId', 'bugReport', 'searchProduct'];

    try {
        const parsed = JSON.parse(toolResponse);
        if (!parsed.tool || !validTools.includes(parsed.tool)) {
            return null;
        }
        return parsed;
    } catch (e) {
        return null;
    }
};

module.exports = {
    chatMessageSchema,
    userUpdateSchema,
    invoiceSchema,
    validate,
    validateToolResponse
};