// Widget Chatbot IA - Design premium 2026
(function () {
    const colorThemes = {
        blue: {
            primary: '#2563eb',
            secondary: '#1d4ed8',
            surface: '#eff6ff',
            panel: '#ffffff',
            text: '#0f172a',
            muted: '#475569',
            lightText: '#f8fafc',
            bubbleBot: '#ffffff',
            bubbleUser: '#2563eb',
            border: 'rgba(37,99,235,0.18)',
            glow: 'rgba(37,99,235,0.3)'
        },
        orange: {
            primary: '#ea580c',
            secondary: '#0f766e',
            surface: '#fff8f0',
            panel: '#ffffff',
            text: '#1f1a17',
            muted: '#5a4a3f',
            lightText: '#fff7ed',
            bubbleBot: '#ffffff',
            bubbleUser: '#ea580c',
            border: 'rgba(74,52,40,0.14)',
            glow: 'rgba(234,88,12,0.3)'
        },
        green: {
            primary: '#16a34a',
            secondary: '#15803d',
            surface: '#f0fdf4',
            panel: '#ffffff',
            text: '#052e16',
            muted: '#166534',
            lightText: '#f0fdf4',
            bubbleBot: '#ffffff',
            bubbleUser: '#16a34a',
            border: 'rgba(22,163,74,0.2)',
            glow: 'rgba(22,163,74,0.28)'
        },
        dark: {
            primary: '#d4af37',
            secondary: '#0d9488',
            surface: '#17130f',
            panel: '#221b16',
            text: '#f5efe8',
            muted: '#d0bfae',
            lightText: '#111827',
            bubbleBot: '#2b231c',
            bubbleUser: '#d4af37',
            border: 'rgba(212,175,55,0.24)',
            glow: 'rgba(212,175,55,0.34)'
        }
    };

    const currentScript = document.currentScript;
    const requestedTheme = currentScript?.getAttribute('theme') || 'orange';
    const apiBase = currentScript?.getAttribute('data-api-base') || 'http://localhost:3001';
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);

    const resolveThemeName = () => {
        if (requestedTheme === 'auto') {
            return mediaDark.matches ? 'dark' : 'orange';
        }
        return colorThemes[requestedTheme] ? requestedTheme : 'orange';
    };

    const applyThemeVars = (name) => {
        const colors = colorThemes[name] || colorThemes.orange;
        const root = document.documentElement;
        root.style.setProperty('--sx-primary', colors.primary);
        root.style.setProperty('--sx-secondary', colors.secondary);
        root.style.setProperty('--sx-surface', colors.surface);
        root.style.setProperty('--sx-panel', colors.panel);
        root.style.setProperty('--sx-text', colors.text);
        root.style.setProperty('--sx-muted', colors.muted);
        root.style.setProperty('--sx-light-text', colors.lightText);
        root.style.setProperty('--sx-bubble-bot', colors.bubbleBot);
        root.style.setProperty('--sx-bubble-user', colors.bubbleUser);
        root.style.setProperty('--sx-border', colors.border);
        root.style.setProperty('--sx-glow', colors.glow);
    };

    applyThemeVars(resolveThemeName());

    const style = document.createElement('style');
    style.textContent = `
        .sx-chat-btn {
            position: fixed;
            right: 24px;
            bottom: 24px;
            width: 66px;
            height: 66px;
            border-radius: 22px;
            border: none;
            cursor: pointer;
            z-index: 9999;
            background: linear-gradient(135deg, var(--sx-primary), var(--sx-secondary));
            color: var(--sx-light-text);
            box-shadow: 0 16px 34px var(--sx-glow);
            display: grid;
            place-items: center;
            font-size: 28px;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            animation: sxPulse 2.8s ease-in-out infinite;
        }

        .sx-chat-btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 22px 42px var(--sx-glow);
        }

        .sx-chat-window {
            position: fixed;
            right: 24px;
            bottom: 102px;
            width: min(390px, calc(100vw - 20px));
            height: min(630px, calc(100vh - 126px));
            border-radius: 24px;
            border: 1px solid var(--sx-border);
            overflow: hidden;
            background: var(--sx-surface);
            backdrop-filter: blur(8px);
            box-shadow: 0 24px 54px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            display: none;
            flex-direction: column;
            transform-origin: bottom right;
        }

        .sx-chat-window.open {
            display: flex;
            animation: sxEnter 0.24s ease;
        }

        .sx-head {
            background: linear-gradient(125deg, var(--sx-primary), var(--sx-secondary));
            color: var(--sx-light-text);
            padding: 14px 14px 12px;
        }

        .sx-head-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .sx-title-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sx-avatar {
            width: 34px;
            height: 34px;
            border-radius: 12px;
            background: rgba(255,255,255,0.15);
            display: grid;
            place-items: center;
            font-size: 13px;
            font-weight: 700;
        }

        .sx-title {
            font-family: 'Sora', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            margin: 0;
        }

        .sx-status {
            margin: 2px 0 0;
            font-size: 0.76rem;
            opacity: 0.92;
        }

        .sx-close {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            color: var(--sx-light-text);
            background: rgba(255,255,255,0.16);
            font-size: 18px;
            font-weight: 700;
        }

        .sx-quick {
            margin-top: 10px;
            display: flex;
            gap: 7px;
            overflow-x: auto;
            scrollbar-width: none;
        }

        .sx-quick::-webkit-scrollbar {
            display: none;
        }

        .sx-chip {
            border: 1px solid rgba(255,255,255,0.28);
            background: rgba(255,255,255,0.16);
            color: var(--sx-light-text);
            border-radius: 999px;
            font-size: 0.75rem;
            padding: 0.35rem 0.6rem;
            white-space: nowrap;
            cursor: pointer;
        }

        .sx-messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 9px;
            background:
                radial-gradient(circle at 10% 5%, rgba(255,255,255,0.55), transparent 36%),
                var(--sx-surface);
        }

        .sx-row {
            display: flex;
            width: 100%;
        }

        .sx-row.user {
            justify-content: flex-end;
        }

        .sx-row.enter {
            animation: sxMessageIn 0.26s ease both;
        }

        .sx-bubble {
            max-width: 83%;
            border-radius: 16px;
            padding: 10px 12px;
            line-height: 1.45;
            font-size: 0.95rem;
            word-wrap: break-word;
            white-space: pre-wrap;
            box-shadow: 0 8px 16px rgba(0,0,0,0.08);
        }

        .sx-row.bot .sx-bubble {
            background: var(--sx-bubble-bot);
            color: var(--sx-text);
            border: 1px solid var(--sx-border);
        }

        .sx-row.user .sx-bubble {
            background: var(--sx-bubble-user);
            color: var(--sx-light-text);
            border: 1px solid transparent;
        }

        .sx-extra {
            margin-top: 8px;
            border-radius: 12px;
            overflow: hidden;
        }

        .sx-video-card {
            border: 1px solid var(--sx-border);
            background: color-mix(in srgb, var(--sx-panel) 92%, #ffffff 8%);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 10px 18px rgba(0, 0, 0, 0.08);
        }

        .sx-video-head {
            padding: 8px 10px;
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--sx-text);
            background: linear-gradient(90deg, color-mix(in srgb, var(--sx-primary) 18%, #fff 82%), color-mix(in srgb, var(--sx-secondary) 14%, #fff 86%));
            border-bottom: 1px solid var(--sx-border);
        }

        .sx-video-card video {
            width: 100%;
            max-width: 320px;
            display: block;
            margin: 0 auto;
            background: #000;
        }

        .sx-input-wrap {
            border-top: 1px solid var(--sx-border);
            padding: 10px;
            background: var(--sx-panel);
        }

        .sx-input-box {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .sx-input {
            flex: 1;
            border: 1px solid var(--sx-border);
            border-radius: 12px;
            padding: 0.76rem 0.9rem;
            font-size: 0.93rem;
            outline: none;
            color: var(--sx-text);
            background: var(--sx-panel);
        }

        .sx-input::placeholder {
            color: var(--sx-muted);
        }

        .sx-input:focus {
            border-color: var(--sx-primary);
            box-shadow: 0 0 0 3px rgba(255,255,255,0), 0 0 0 2px var(--sx-border);
        }

        .sx-send {
            border: none;
            border-radius: 12px;
            min-width: 44px;
            height: 44px;
            cursor: pointer;
            background: linear-gradient(135deg, var(--sx-primary), var(--sx-secondary));
            color: var(--sx-light-text);
            font-size: 18px;
            box-shadow: 0 8px 18px var(--sx-glow);
        }

        .sx-typing {
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }

        .sx-typing span {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #94a3b8;
            animation: sxDot 1s infinite ease-in-out;
        }

        .sx-typing span:nth-child(2) {
            animation-delay: 0.15s;
        }

        .sx-typing span:nth-child(3) {
            animation-delay: 0.3s;
        }

        @keyframes sxEnter {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes sxMessageIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes sxPulse {
            0%, 100% { box-shadow: 0 16px 34px var(--sx-glow); }
            50% { box-shadow: 0 20px 42px var(--sx-glow); }
        }

        @keyframes sxDot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
            40% { transform: translateY(-3px); opacity: 1; }
        }

        @media (max-width: 540px) {
            .sx-chat-btn {
                right: 14px;
                bottom: 14px;
                width: 60px;
                height: 60px;
                border-radius: 18px;
            }

            .sx-chat-window {
                right: 10px;
                bottom: 82px;
                border-radius: 18px;
                width: calc(100vw - 20px);
                height: calc(100vh - 98px);
            }
        }
    `;
    document.head.appendChild(style);

    const chatBtn = document.createElement('button');
    chatBtn.className = 'sx-chat-btn';
    chatBtn.type = 'button';
    chatBtn.setAttribute('aria-label', 'Open chatbot');
    chatBtn.textContent = '?';
    document.body.appendChild(chatBtn);

    const chatWindow = document.createElement('section');
    chatWindow.className = 'sx-chat-window';
    chatWindow.innerHTML = `
        <header class="sx-head">
            <div class="sx-head-top">
                <div class="sx-title-wrap">
                    <div class="sx-avatar">AI</div>
                    <div>
                        <p class="sx-title">Assistant ShopEx</p>
                        <p class="sx-status">En ligne maintenant</p>
                    </div>
                </div>
                <button type="button" class="sx-close" aria-label="Fermer le chatbot">x</button>
            </div>
            <div class="sx-quick">
                <button class="sx-chip" type="button" data-quick="Suivre ma commande">Suivre ma commande</button>
                <button class="sx-chip" type="button" data-quick="Quels sont les frais de livraison ?">Livraison</button>
                <button class="sx-chip" type="button" data-quick="Je veux ma facture">Facture</button>
            </div>
        </header>
        <div class="sx-messages" id="sx-chat-messages"></div>
        <div class="sx-input-wrap">
            <div class="sx-input-box">
                <input class="sx-input" type="text" placeholder="Ecrivez votre message..." maxlength="1500" />
                <button class="sx-send" type="button" aria-label="Envoyer le message">&gt;</button>
            </div>
        </div>
    `;
    document.body.appendChild(chatWindow);

    if (requestedTheme === 'auto') {
        const onModeChange = () => applyThemeVars(resolveThemeName());
        if (mediaDark.addEventListener) {
            mediaDark.addEventListener('change', onModeChange);
        } else if (mediaDark.addListener) {
            mediaDark.addListener(onModeChange);
        }
    }

    const messages = chatWindow.querySelector('#sx-chat-messages');
    const input = chatWindow.querySelector('.sx-input');
    const sendBtn = chatWindow.querySelector('.sx-send');
    const closeBtn = chatWindow.querySelector('.sx-close');
    const chips = Array.from(chatWindow.querySelectorAll('.sx-chip'));

    function openChat() {
        chatWindow.classList.add('open');
        chatBtn.style.display = 'none';
        if (!messages.childElementCount) {
            addTextMessage('Bonjour, je suis votre assistant ShopEx. Je peux vous aider pour vos commandes, livraisons ou factures.', 'bot');
        }
        input.focus();
    }

    function closeChat() {
        chatWindow.classList.remove('open');
        chatBtn.style.display = 'grid';
    }

    function scrollToBottom() {
        messages.scrollTop = messages.scrollHeight;
    }

    function animateMessageRow(row) {
        row.classList.add('enter');
        row.style.animationDelay = `${Math.min(messages.childElementCount * 35, 180)}ms`;
    }

    function addTextMessage(text, from) {
        const row = document.createElement('div');
        row.className = 'sx-row ' + (from === 'user' ? 'user' : 'bot');
        const bubble = document.createElement('div');
        bubble.className = 'sx-bubble';
        bubble.textContent = text;
        row.appendChild(bubble);
        animateMessageRow(row);
        messages.appendChild(row);
        scrollToBottom();
        return row;
    }

    function addRichMessage(text) {
        const row = document.createElement('div');
        row.className = 'sx-row bot';
        const bubble = document.createElement('div');
        bubble.className = 'sx-bubble';

        const hasVideoTag = /<video[\s\S]*<\/video>/i.test(text);
        const hasWhatsappButton = /<a[^>]*href=["']https:\/\/wa\.me\/[^"']*["'][^>]*>.*?<\/a>/i.test(text);

        if (hasVideoTag) {
            const videoSrcMatch = String(text).match(/<video[^>]*src=["']([^"']+)["'][^>]*>/i);
            const videoSrc = videoSrcMatch ? videoSrcMatch[1] : null;
            const label = String(text).split('<br>')[0] || 'Tutoriel vidéo';

            if (videoSrc) {
                const safeWrapper = document.createElement('div');
                safeWrapper.className = 'sx-extra sx-video-card';

                const head = document.createElement('div');
                head.className = 'sx-video-head';
                head.textContent = label.replace(/<[^>]+>/g, '').trim() || 'Tutoriel vidéo';

                const video = document.createElement('video');
                video.setAttribute('controls', 'controls');
                video.setAttribute('preload', 'metadata');
                video.src = videoSrc;

                safeWrapper.appendChild(head);
                safeWrapper.appendChild(video);
                bubble.appendChild(safeWrapper);
            } else {
                bubble.textContent = text;
            }
        } else if (hasWhatsappButton) {
            // Parse WhatsApp message safely using DOMPurify
            const cleanHtml = DOMPurify.sanitize(text, {
                ALLOWED_TAGS: ['a', 'br', 'strong', 'em'],
                ALLOWED_ATTR: ['href', 'target', 'style'],
                ALLOW_DATA_ATTR: false
            });
            bubble.innerHTML = cleanHtml;
        } else {
            bubble.textContent = text;
        }

        row.appendChild(bubble);
        animateMessageRow(row);
        messages.appendChild(row);
        scrollToBottom();
    }

    function createTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'sx-row bot';
        const bubble = document.createElement('div');
        bubble.className = 'sx-bubble';
        bubble.innerHTML = '<span class="sx-typing"><span></span><span></span><span></span></span>';
        row.appendChild(bubble);
        animateMessageRow(row);
        messages.appendChild(row);
        scrollToBottom();
        return row;
    }

    async function callChat(payload) {
        const response = await fetch(`${apiBase}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    }

    function detectToolReply(replyText) {
        if (typeof replyText !== 'string') {
            return null;
        }

        const trimmed = replyText.trim();

        try {
            const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
            if (parsed && typeof parsed.tool === 'string') {
                return parsed.tool;
            }
        } catch {
            // Continue with extraction from mixed text.
        }

        const toolMatch = trimmed.match(/[\{][\s\S]*?["']tool["']\s*:\s*["']([^"']+)["'][\s\S]*?[\}]/i);
        if (!toolMatch) {
            return null;
        }

        return toolMatch[1] || null;
    }

    async function botReply(userText) {
        const typing = createTypingIndicator();

        try {
            const data = await callChat({ message: userText, sessionId });
            typing.remove();
            const detectedTool = detectToolReply(data.reply);

            if (detectedTool === 'documentation') {
                let doc = localStorage.getItem('shopDoc');
                if (!doc) {
                    const docRes = await fetch(`${apiBase}/fetchDoc`);
                    doc = await docRes.text();
                    localStorage.setItem('shopDoc', doc);
                }

                try {
                    await fetch(`${apiBase}/rag/rebuild`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentation: doc })
                    });
                } catch {
                    // Fallback on legacy mode with full documentation payload.
                }

                const data2 = await callChat({ message: userText, useRag: true, documentation: doc, sessionId });
                addRichMessage(data2.reply || 'Reponse indisponible.');
                if (data2.extra) {
                    addRichMessage(data2.extra);
                }
                return;
            }

            if (detectedTool === 'delivery') {
                let delivery = localStorage.getItem('shopDelivery');
                if (!delivery) {
                    const deliveryRes = await fetch(`${apiBase}/fetchDelivery`);
                    delivery = await deliveryRes.text();
                    localStorage.setItem('shopDelivery', delivery);
                }

                const data2 = await callChat({ message: userText, delivery, sessionId });
                addRichMessage(data2.reply || 'Reponse indisponible.');
                if (data2.extra) {
                    addRichMessage(data2.extra);
                }
                return;
            }

            addRichMessage(data.reply || 'Reponse indisponible.');
            if (data.extra) {
                addRichMessage(data.extra);
            }
        } catch (error) {
            typing.remove();
            addTextMessage('Serveur indisponible. Veuillez reessayer.', 'bot');
        }
    }

    async function sendMessage(prefilledText) {
        const text = typeof prefilledText === 'string' ? prefilledText.trim() : input.value.trim();
        if (!text) {
            return;
        }

        addTextMessage(text, 'user');
        input.value = '';
        await botReply(text);
    }

    chatBtn.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);
    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const q = chip.getAttribute('data-quick');
            sendMessage(q);
        });
    });
})();
