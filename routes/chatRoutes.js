const express = require('express');
const axios = require('axios');
const { chatMessageSchema, validate } = require('../middleware/validation');

const router = express.Router();
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

router.post('/', validate(chatMessageSchema), async (req, res) => {
    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un assistant e-commerce fiable, clair et concis.'
                    },
                    { role: 'user', content: req.body.message }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const reply = response?.data?.choices?.[0]?.message?.content || 'Réponse indisponible.';
        res.json({ reply });
    } catch (error) {
        console.error('[CHAT ERROR]', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur chatbot' });
    }
});

module.exports = router;
