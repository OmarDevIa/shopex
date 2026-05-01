const cors = require('cors');
const express = require('express');
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const userDB = require('./Tools/usersDB');
const ordersDB = require('./Tools/ordersDB');
app.use(express.json());
app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isLocalOrigin = (origin) => /^https?:\/\/localhost(?::\d+)?$/i.test(origin);

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server calls and local file:// (Origin: null) during development.
        if (!origin || origin === 'null') {
            return callback(null, true);
        }

        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isLocalOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin non autorisee par CORS'));
    },
    credentials: false
}));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes, veuillez patienter.' }
}));

app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
const WHATSAPP_SUPPORT_URL = process.env.WHATSAPP_SUPPORT_URL || 'https://wa.me/1234567890'; // Add to .env

const usageMetrics = {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    totalLlmCalls: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    sessions: new Map()
};

const estimateTokensFromText = (text) => {
    // Approximation conservative: ~1 token per 4 chars for latin text.
    const chars = String(text || '').length;
    return Math.ceil(chars / 4);
};

const estimatePromptTokensFromMessages = (messages) => {
    if (!Array.isArray(messages)) return 0;
    let totalChars = 0;
    for (const msg of messages) {
        totalChars += String(msg?.content || '').length + 12;
    }
    return Math.ceil(totalChars / 4);
};

const getSessionUsage = (sessionId) => {
    if (!usageMetrics.sessions.has(sessionId)) {
        usageMetrics.sessions.set(sessionId, {
            sessionId,
            requests: 0,
            llmCalls: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            updatedAt: new Date().toISOString()
        });
    }
    return usageMetrics.sessions.get(sessionId);
};

const FRENCH_STOP_WORDS = new Set([
    'a', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'elle', 'en', 'et',
    'eux', 'il', 'je', 'la', 'le', 'les', 'leur', 'lui', 'ma', 'mais', 'me', 'meme', 'mes',
    'moi', 'mon', 'ne', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'qu',
    'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tu',
    'un', 'une', 'vos', 'votre', 'vous', 'y', 'd', 'l'
]);

const normalizeText = (text) => (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text) => normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 1 && !FRENCH_STOP_WORDS.has(token));

const chunkDocumentation = (text, maxChunkSize = 700) => {
    const lines = String(text || '')
        .split(/\n{2,}|\r\n{2,}/)
        .map((line) => line.trim())
        .filter(Boolean);

    const chunks = [];
    let current = '';

    for (const line of lines) {
        const candidate = current ? `${current}\n${line}` : line;
        if (candidate.length <= maxChunkSize) {
            current = candidate;
        } else {
            if (current) chunks.push(current);
            if (line.length <= maxChunkSize) {
                current = line;
            } else {
                for (let i = 0; i < line.length; i += maxChunkSize) {
                    chunks.push(line.slice(i, i + maxChunkSize));
                }
                current = '';
            }
        }
    }

    if (current) chunks.push(current);
    return chunks;
};

const buildRagIndex = (documentationText) => {
    const chunks = chunkDocumentation(documentationText);
    return chunks.map((chunk, index) => {
        const tokens = tokenize(chunk);
        const frequency = new Map();
        for (const token of tokens) {
            frequency.set(token, (frequency.get(token) || 0) + 1);
        }
        return {
            id: index,
            chunk,
            tokenSet: new Set(tokens),
            frequency,
            length: Math.max(tokens.length, 1)
        };
    });
};

const retrieveRelevantChunks = (documentationText, query, topK = 4) => {
    const index = buildRagIndex(documentationText);
    const queryTokens = tokenize(query);
    if (!index.length || !queryTokens.length) {
        return index.slice(0, Math.min(topK, index.length)).map((entry) => entry.chunk);
    }

    const scored = index.map((entry) => {
        let overlap = 0;
        let tfScore = 0;
        for (const token of queryTokens) {
            if (entry.tokenSet.has(token)) {
                overlap += 1;
                tfScore += (entry.frequency.get(token) || 0) / entry.length;
            }
        }

        const positionBoost = 1 / (1 + entry.id * 0.015);
        const score = overlap * 2 + tfScore * 4 + positionBoost;
        return { score, chunk: entry.chunk };
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter((item) => item.score > 0)
        .map((item) => item.chunk);
};

const retrieveRelevantChunksFromIndex = (index, query, topK = 4) => {
    const queryTokens = tokenize(query);
    if (!index.length || !queryTokens.length) {
        return index.slice(0, Math.min(topK, index.length)).map((entry) => entry.chunk);
    }

    const scored = index.map((entry) => {
        let overlap = 0;
        let tfScore = 0;
        for (const token of queryTokens) {
            if (entry.tokenSet.has(token)) {
                overlap += 1;
                tfScore += (entry.frequency.get(token) || 0) / entry.length;
            }
        }

        const positionBoost = 1 / (1 + entry.id * 0.015);
        const score = overlap * 2 + tfScore * 4 + positionBoost;
        return { score, chunk: entry.chunk };
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter((item) => item.score > 0)
        .map((item) => item.chunk);
};

const documentationSignature = (text) => {
    const raw = String(text || '');
    return `${raw.length}:${raw.slice(0, 120)}`;
};

const ragCache = {
    signature: null,
    index: [],
    updatedAt: null
};

const ensureRagCache = (documentationText) => {
    const signature = documentationSignature(documentationText);
    if (ragCache.signature === signature && ragCache.index.length) {
        return ragCache;
    }

    ragCache.signature = signature;
    ragCache.index = buildRagIndex(documentationText);
    ragCache.updatedAt = new Date().toISOString();
    return ragCache;
};

const getUserIdFromToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !process.env.JWT_SECRET) return null;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.userId ? Number(payload.userId) : null;
    } catch {
        return null;
    }
};

const parseToolMessage = (raw) => {
    try {
        return JSON.parse(raw.replace(/'/g, '"'));
    } catch {
        return null;
    }
};

const detectPreToolFromUserMessage = (message) => {
    if (typeof message !== 'string') return null;
    const normalized = message
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Delivery must have priority when explicitly asked.
    const deliveryIntent = /(frais\s*de\s*livraison|tarif\s*livraison|cout\s*livraison|prix\s*livraison|livraison\s*gratuite)/i;
    if (deliveryIntent.test(normalized)) {
        return 'delivery';
    }

    const docIntent = /(creer\s*un\s*compte|ouvrir\s*un\s*compte|inscription|mon\s*compte|connexion|mot\s*de\s*passe|commande|paiement|adresse|navigation|suivre\s*ma\s*commande|retour|remboursement)/i;
    if (docIntent.test(normalized)) {
        return 'documentation';
    }

    return null;
};

const extractToolMessage = (raw) => {
    if (typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    const direct = parseToolMessage(trimmed);
    if (direct && direct.tool) return direct;

    // Try to extract a JSON object containing a tool declaration from mixed text.
    const match = trimmed.match(/\{[\s\S]*?["']tool["']\s*:\s*["'][^"']+["'][\s\S]*?\}/);
    if (!match) return null;

    const extracted = parseToolMessage(match[0]);
    return extracted && extracted.tool ? extracted : null;
};

// système de gestion des demandes incomplètes
const pendingRequests = new Map();

// Nettoyage automatique des demandes expirées (5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, request] of pendingRequests.entries()) {
        if (now - request.timestamp > 300000) { // 5 minutes
            pendingRequests.delete(sessionId);
        }
    }
}, 60000); // Vérification chaque minute

// Endpoint pour récupérer la documentation en ligne dynamiquement
app.get('/fetchDoc', (req, res) => {
    exec('node Tools/fetchDoc.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            res.status(500).send('Erreur lors de la récupération de la documentation');
            return;
        }
        res.send(stdout);
    })
});

// Endpoint pour servir les frais de livraison dynamiquement
app.get('/fetchDelivery', (req, res) => {
    exec('node Tools/fetchDeliveryPrices.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            res.status(500).send('Erreur lors de la récupération des frais de livraison');
            return;
        }
        res.send(stdout);
    });
});

app.post('/rag/rebuild', (req, res) => {
    const documentation = typeof req.body.documentation === 'string' ? req.body.documentation : '';
    if (!documentation.trim()) {
        return res.status(400).json({ error: 'Documentation manquante.' });
    }

    const cache = ensureRagCache(documentation);
    return res.json({
        message: 'Index RAG reconstruit',
        chunks: cache.index.length,
        updatedAt: cache.updatedAt
    });
});

app.get('/rag/status', (req, res) => {
    res.json({
        ready: ragCache.index.length > 0,
        chunks: ragCache.index.length,
        updatedAt: ragCache.updatedAt
    });
});

app.post('/rag/search', (req, res) => {
    const query = typeof req.body.query === 'string' ? req.body.query : '';
    const topK = Number.isInteger(req.body.topK) ? Math.min(Math.max(req.body.topK, 1), 8) : 4;

    if (!query.trim()) {
        return res.status(400).json({ error: 'Query manquante.' });
    }
    if (!ragCache.index.length) {
        return res.status(400).json({ error: 'Index RAG vide. Appelez /rag/rebuild d\'abord.' });
    }

    const chunks = retrieveRelevantChunksFromIndex(ragCache.index, query, topK);
    return res.json({ query, topK, chunks });
});

app.get('/metrics/llm-usage', (req, res) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : null;

    if (sessionId) {
        const session = usageMetrics.sessions.get(sessionId) || null;
        return res.json({
            startedAt: usageMetrics.startedAt,
            session
        });
    }

    const sessions = Array.from(usageMetrics.sessions.values())
        .sort((a, b) => b.totalTokens - a.totalTokens)
        .slice(0, 25);

    return res.json({
        startedAt: usageMetrics.startedAt,
        totals: {
            requests: usageMetrics.totalRequests,
            llmCalls: usageMetrics.totalLlmCalls,
            promptTokens: usageMetrics.totalPromptTokens,
            completionTokens: usageMetrics.totalCompletionTokens,
            totalTokens: usageMetrics.totalTokens
        },
        sessions
    });
});

// Route /chat pour générer les réponses du bot IA
app.post('/chat', async (req, res) => {
    const userMsg = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const sessionId = typeof req.body.sessionId === 'string' ? req.body.sessionId : 'default';
    const authenticatedUserId = getUserIdFromToken(req);
    const preTool = detectPreToolFromUserMessage(userMsg);
    const sessionUsage = getSessionUsage(sessionId);

    usageMetrics.totalRequests += 1;
    sessionUsage.requests += 1;
    sessionUsage.updatedAt = new Date().toISOString();
    
    if (!userMsg) return res.status(400).json({ error: 'Message manquant.' });
    if (userMsg.length > 2000) return res.status(400).json({ error: 'Message trop long (2000 caractères max).' });
    if (!/^[a-zA-Z0-9_-]{7,60}$/.test(sessionId)) return res.status(400).json({ error: 'Session invalide.' });
    
    try {
        // Deterministic routing for core intents so frontend always receives exact tool JSON.
        if (!req.body.documentation && !req.body.delivery && preTool === 'documentation') {
            return res.json({ reply: '{"tool":"documentation"}' });
        }
        if (!req.body.documentation && !req.body.delivery && preTool === 'delivery') {
            return res.json({ reply: '{"tool":"delivery"}' });
        }

        // Vérification des demandes en attente
        if (pendingRequests.has(sessionId)) {
            const pending = pendingRequests.get(sessionId);
            if (pending.type === 'invoice') {
                // L'utilisateur répond avec le numéro de commande
                const orderMatch = userMsg.match(/\d+/);
                if (orderMatch) {
                    const orderId = parseInt(orderMatch[0]);
                    pendingRequests.delete(sessionId); // Supprimer la demande en attente
                    
                    // Traiter la facture
                    try {
                        const order = ordersDB.getOrderById(orderId);
                        if (!order) {
                            return res.json({ reply: 'Commande introuvable.' });
                        }
                        if (!authenticatedUserId || order.userId !== authenticatedUserId) {
                            return res.status(403).json({ reply: 'Vous n\'êtes pas autorisé à accéder à cette facture.' });
                        }

                        const invoicesDir = path.join(__dirname, 'invoices');
                        if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);
                        const pdfPath = path.join(invoicesDir, `facture_${orderId}.pdf`);
                        ordersDB.generateInvoicePDF(orderId, pdfPath);
                        const url = `/invoices/facture_${orderId}.pdf`;
                        return res.json({ reply: `Votre facture est prête : <a href="${url}" target="_blank">Télécharger la facture PDF</a>` });
                    } catch (e) {
                        return res.json({ reply: 'Erreur lors de la génération de la facture. Vérifiez que le numéro de commande existe.' });
                    }
                } else {
                    return res.json({ reply: 'Je n\'ai pas trouvé de numéro dans votre message. Pouvez-vous me donner le numéro de votre commande ?' });
                }
            }
        }

        // Si pas de demande en attente, on continue avec la requête normale    
        let messages;
        
        if (req.body.documentation || req.body.useRag) {
            let retrievedChunks = [];

            if (req.body.documentation) {
                const cache = ensureRagCache(req.body.documentation);
                retrievedChunks = retrieveRelevantChunksFromIndex(cache.index, userMsg, 4);
            } else if (req.body.useRag && ragCache.index.length) {
                retrievedChunks = retrieveRelevantChunksFromIndex(ragCache.index, userMsg, 4);
            }

            // Si on utilise RAG et aucun extrait pertinent n'est trouvé, rediriger vers WhatsApp
            if ((req.body.useRag || req.body.documentation) && retrievedChunks.length === 0) {
                const whatsappMsg = `Je ne peux pas vous répondre car je n'ai pas accès à la documentation. Veuillez contacter l'assistance pour obtenir une réponse précise.<br><br><a href="${WHATSAPP_SUPPORT_URL}" target="_blank" style="display:inline-block;padding:10px 16px;background-color:#25D366;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">💬 Contacter via WhatsApp</a>`;
                
                usageMetrics.totalLlmCalls += 0; // No LLM call for fallback
                sessionUsage.llmCalls += 0;
                
                return res.json({ reply: whatsappMsg });
            }

            const ragContext = retrievedChunks.length
                ? retrievedChunks.map((chunk, idx) => `Extrait ${idx + 1}:\n${chunk}`).join('\n\n')
                : String(req.body.documentation || '').slice(0, 2500);

            messages = [
                { role: 'system', content:
                    'Tu es un assistant utile pour un site e-commerce. Tu dois répondre uniquement à partir des extraits de documentation fournis. Si l\'information n\'est pas dans les extraits, dis clairement que tu ne sais pas et propose de contacter le support. Ne propose pas d\'utiliser un outil, réponds directement.'
                },
                { role: 'system', content: 'Extraits de documentation pertinents (RAG) :\n' + ragContext },
                { role: 'user', content: userMsg }
            ];
        } else if (req.body.delivery) {
            messages = [
                { role: 'system', content:
                    'Tu es un assistant utile pour un site e-commerce. Utilise les informations sur les frais de livraison fournies pour répondre précisément à la question de l\'utilisateur. Ne propose pas d\'utiliser un outil, réponds directement.'
                },
                { role: 'system', content: 'Frais de livraison :\n' + req.body.delivery },
                { role: 'user', content: userMsg }
            ];
        } else {
            messages = [
                {
                    role: 'system',
                    content:
                        'Tu es un assistant utile pour un site e-commerce qui s appelle ShopEx et qui vend des produits high tech.\n\n' +
                        '- Si l\'utilisateur pose une question relative à la navigation sur le site, la création ou gestion de compte, l\'achat, la commande, le paiement ou la livraison, tu dois répondre exactement : {"tool":"documentation"} et rien d\'autre.\n\n' +
                        '- Si la question concerne les frais de livraison, tu dois répondre exactement : {"tool":"delivery"} et rien d\'autre.\n\n' +
                        '- Si l\'utilisateur demande à changer son adresse, tu dois répondre exactement : {"tool":"updateAddress", "userId":1, "value":"NOUVELLE_ADRESSE"} en adaptant la valeur.\n\n' +
                        '- Si l\'utilisateur demande la facture d\'une commande avec un numéro précis (ex: "envoie-moi la facture de la commande 101"), tu dois répondre exactement : {"tool":"invoice", "id":NUMERO_COMMANDE} en adaptant le numéro.\n\n' +
                        '- Si l\'utilisateur demande une facture sans préciser le numéro (ex: "je veux ma facture", "envoie-moi ma facture", "facture de ma dernière commande"), tu dois répondre exactement : {"tool":"askOrderId"} et rien d\'autre.\n\n' +
                        '- Si l\'utilisateur signale un bug, un problème technique, un dysfonctionnement ou une erreur sur le site, tu dois répondre exactement : {"tool":"bugReport", "message":"MESSAGE_UTILISATEUR"} en remplaçant MESSAGE_UTILISATEUR par le message complet de l\'utilisateur.\n\n' +
                        'Sinon, réponds normalement.'
                },
                { role: 'user', content: userMsg }
            ];
        }

        const response = await axios.post(GROQ_URL, {
            model: MODEL,
            messages
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const apiUsage = response.data?.usage || {};
        const promptTokens = Number.isFinite(apiUsage.prompt_tokens)
            ? apiUsage.prompt_tokens
            : estimatePromptTokensFromMessages(messages);
        const completionTokens = Number.isFinite(apiUsage.completion_tokens)
            ? apiUsage.completion_tokens
            : estimateTokensFromText(response.data?.choices?.[0]?.message?.content || '');
        const totalTokens = Number.isFinite(apiUsage.total_tokens)
            ? apiUsage.total_tokens
            : promptTokens + completionTokens;

        usageMetrics.totalLlmCalls += 1;
        usageMetrics.totalPromptTokens += promptTokens;
        usageMetrics.totalCompletionTokens += completionTokens;
        usageMetrics.totalTokens += totalTokens;

        sessionUsage.llmCalls += 1;
        sessionUsage.promptTokens += promptTokens;
        sessionUsage.completionTokens += completionTokens;
        sessionUsage.totalTokens += totalTokens;
        sessionUsage.updatedAt = new Date().toISOString();

        let botMsg = response.data.choices[0].message.content;
        let extraMsg = null;
        const extractedTool = extractToolMessage(botMsg);

        if (extractedTool?.tool === 'documentation') {
            botMsg = '{"tool":"documentation"}';
        }
        if (extractedTool?.tool === 'delivery') {
            botMsg = '{"tool":"delivery"}';
        }

        // Gestion des outils
        if ((extractedTool && extractedTool.tool === 'updateAddress') || botMsg.startsWith('{"tool":"updateAddress"')) {
            try {
                const toolObj = extractedTool || parseToolMessage(botMsg);
                if (toolObj && toolObj.tool === 'updateAddress' && toolObj.userId && toolObj.value) {
                    if (!authenticatedUserId || Number(toolObj.userId) !== authenticatedUserId) {
                        botMsg = 'Vous n\'êtes pas autorisé à modifier cette adresse.';
                    } else {
                        const ok = userDB.updateAddress(toolObj.userId, toolObj.value);
                        botMsg = ok ? `J'ai bien mis à jour votre adresse. Puis-je faire autre chose pour vous aider ?` : `Impossible de mettre à jour l'adresse.`;
                    }
                }
            } catch (e) {
                botMsg = 'Erreur lors du traitement de la demande.';
            }
        } else if ((extractedTool && extractedTool.tool === 'invoice') || botMsg.startsWith('{"tool":"invoice"')) {
            try {
                const toolObj = extractedTool || parseToolMessage(botMsg);
                if (toolObj && toolObj.tool === 'invoice' && toolObj.id) {
                    const order = ordersDB.getOrderById(toolObj.id);
                    if (!order) {
                        return res.json({ reply: 'Commande introuvable.' });
                    }
                    if (!authenticatedUserId || order.userId !== authenticatedUserId) {
                        return res.status(403).json({ reply: 'Vous n\'êtes pas autorisé à accéder à cette facture.' });
                    }

                    const invoicesDir = path.join(__dirname, 'invoices');
                    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);
                    const pdfPath = path.join(invoicesDir, `facture_${toolObj.id}.pdf`);
                    ordersDB.generateInvoicePDF(toolObj.id, pdfPath);
                    const url = `/invoices/facture_${toolObj.id}.pdf`;
                    botMsg = `Votre facture est prête : <a href="${url}" target="_blank">Télécharger la facture PDF</a>`;
                }  
            } catch (e) {
                botMsg = 'Erreur lors de la génération de la facture.';
            } 
        } else if ((extractedTool && extractedTool.tool === 'askOrderId') || botMsg.startsWith('{"tool":"askOrderId"')) {
            // Demande le numéro de commande pour générer la facture
            pendingRequests.set(sessionId, { type: 'invoice', timestamp: Date.now() });
            botMsg = 'Pour générer votre facture, merci de me donner le numéro de votre commande.';
        } else if ((extractedTool && extractedTool.tool === 'bugReport') || botMsg.startsWith('{"tool":"bugReport"')) {
            let toolObj;
            try {
                toolObj = extractedTool || parseToolMessage(botMsg);
            } catch (e) {
                // Extraction simple du message utilisateur si le JSON est mal formé
                const match = botMsg.match(/"message"\s*:\s*"([^"]+)"/);
                toolObj = { tool: 'bugReport', message: match ? match[1] : userMsg };
            }
            if (toolObj && toolObj.tool === 'bugReport' && toolObj.message) {
                const webhookUrl = process.env.BUG_REPORT_WEBHOOK_URL;
                // Nettoie le message pour éviter les problèmes avec Discord
                const cleanMessage = toolObj.message.replace(/```/g, '').replace(/`/g, '').substring(0, 1900);
                const payload = {
                    content: `🐛 **Nouveau rapport de bug**\n\`\`\`\n${cleanMessage}\n\`\`\``,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                try {
                    if (webhookUrl) {
                        await axios.post(webhookUrl, payload);
                        botMsg = 'Merci pour votre signalement ! Notre équipe technique a été notifiée et va examiner le problème rapidement.';
                    } else {
                        botMsg = 'Merci pour votre signalement ! Votre message a été enregistré côté support.';
                    }
                } catch (e) {
                    console.error('Erreur bugReport Discord:', e.message);
                    botMsg = 'Merci pour votre signalement ! J\'ai bien noté votre problème et notre équipe va s\'en occuper.';
                }
            }
        }
        // Injecter tuto vidéo si applicable
        const lowerMsg = userMsg.toLowerCase();
        const normalizedMsg = lowerMsg.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Strip accents for keyword checks
        if (/creer un compte|ouvrir un compte|inscription/.test(normalizedMsg)) {
            extraMsg = 'Cette vidéo pourrait vous intéresser :<br><video src="./videos/create-account.mp4" controls style="width:100%;max-width:320px;"></video>';
        } else if (/(changer|modifier|reinitialiser|reset)\s+(mon|le)?\s*mot\s*de\s*passe|changement\s+mot\s+de\s+passe|motdepasse|mot de passe oublie/.test(normalizedMsg)) {
            extraMsg = 'Cette vidéo pourrait vous intéresser :<br><video src="./videos/change-password.mp4" controls style="width:100%;max-width:320px;"></video>';
        }
        
        if (extraMsg) {
            res.json({ reply: botMsg, extra: extraMsg });
        } else {
            res.json({ reply: botMsg });
        }

    } catch (err) {
        console.error('Erreur détaillée:', err.response?.data || err.message);
        res.status(500).json({ 
            error: 'Erreur serveur ou API.',
            details: err.response?.data?.error?.message || err.message
        });
    }
});

app.listen(3001, () => {
    console.log('Serveur chatbot démarré sur http://localhost:3001');
});