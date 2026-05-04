// ==UserScript==
// @name         TW Auto-Builder
// @namespace    https://github.com/fil7rms-gif/filrms
// @version      8.1.0
// @description  Gestor automático de construção com suporte a atualizações automáticas
// @author       quesalhas
// @match        *://*.tribalwars.com.pt/*
// @match        *://*.tribalwars.com/*
// @match        *://*.tribalwars.net/*
// @match        *://*.tribalwars.pl/*
// @match        *://*.tribalwars.org/*
// @match        *://*.plemiona.pl/*
// @match        *://*.die-staemme.de/*
// @include      *://*.tribalwars.com.pt/*
// @updateURL    https://raw.githubusercontent.com/fil7rms-gif/filrms/main/TW_AutoBuilder.user.js
// @downloadURL  https://raw.githubusercontent.com/fil7rms-gif/filrms/main/TW_AutoBuilder.user.js
// @grant        none
// ==/UserScript==

/*
 * Changelog:
 * v8.1.0 - Remoção de painel e ações fora da página Principal. Limites de espera (max 24h).
 * v8.0.2 - URLs de atualização alteradas para GitHub raw. Correção de limites de espera anormal.
 * v8.0.0 - Sistema anti-deteção v8.0, humanização melhorada, suporte a estratégias.
 */

(function () {
    'use strict';

    // Detectar versão actualizada
    // ========================================================================
    // O script vai ler de cima para baixo. Se um edifício já estiver no nível
    // desejado, ele passa para o próximo da lista.
    // Podes editar à vontade! Nomes: main, wood, stone, iron, farm, storage, 
    // barracks, smith, stable, wall, garage, market, hide, academy, snob.
    // CONFIGURAÇÕES GLOBAIS v4.0
    const AUTO_NEXT_VILLAGE = true; 

    const STRATEGIES = {
        agressivo: {
            STORAGE_THRESHOLD: 80,
            POPULATION_THRESHOLD: 85,
            FOCO: 'militar'
        },
        economico: {
            STORAGE_THRESHOLD: 95,
            POPULATION_THRESHOLD: 95,
            FOCO: 'recursos'
        },
        hibrido: {
            STORAGE_THRESHOLD: 90,
            POPULATION_THRESHOLD: 90,
            FOCO: 'equilibrado'
        }
    };

    let STRATEGY = localStorage.getItem('tw_autobuilder_strategy') || 'hibrido';
    if (!STRATEGIES[STRATEGY]) {
        STRATEGY = 'hibrido';
        localStorage.setItem('tw_autobuilder_strategy', STRATEGY);
    }
    let CURRENT_STRATEGY = STRATEGIES[STRATEGY];

    let STORAGE_THRESHOLD = CURRENT_STRATEGY.STORAGE_THRESHOLD;
    let POPULATION_THRESHOLD = CURRENT_STRATEGY.POPULATION_THRESHOLD;

    const MAX_WAIT_SECONDS = 24 * 3600; // limitar esperas anormais a 24h
    const MAX_PURGE_MATCH_SECONDS = 7 * 24 * 3600; // ignorar timers impossíveis acima de 7 dias

    // CONFIGURAÇÕES DE HUMANIZAÇÃO (Protocolo Biológico)
    const HORA_DORMIR = 1;  // Começa a dormir às 01:xx
    const HORA_ACORDAR = 7; // Acorda às 07:xx
    const CHANCE_MICRO_BREAK = 0.15; // 15% de chance de "ignorar" uma construção para parecer humano

    const buildOrder = [
        ['main',1],['wood',1],['stone',1],['iron',1],
        ['wood',2],['stone',2],['iron',2],
        ['main',2],['main',3],
        ['barracks',1],
        ['wood',3],['stone',3],['iron',3],
        ['storage',2],['farm',2],
        ['wood',4],['stone',4],['iron',4],
        ['wood',5],['stone',5],['iron',5],
        ['main',4],['main',5],
        ['barracks',2],['barracks',3],
        ['storage',3],['farm',3],
        ['wood',6],['stone',6],['iron',6],
        ['wall',1],
        ['hide',1],['hide',2],['hide',3],['hide',4],['hide',5],
        ['main',6],['main',7],
        ['barracks',4],['barracks',5],
        ['smith',1],
        ['wood',7],['stone',7],['iron',7],
        ['wood',8],['stone',8],['iron',8],
        ['wood',9],['stone',9],['iron',9],
        ['wood',10],['stone',10],['iron',10],
        ['storage',4],['storage',5],
        ['farm',4],['farm',5],
        ['main',8],['main',9],['main',10],
        ['smith',2],['smith',3],['smith',4],['smith',5],
        ['stable',1],
        ['market',1],
        ['statue',1],
        ['wood',11],['stone',11],['iron',11],
        ['wood',12],['stone',12],['iron',12],
        ['wood',13],['stone',13],['iron',13],
        ['wood',14],['stone',14],['iron',14],
        ['wood',15],['stone',15],['iron',15],
        ['farm',6],['farm',7],['farm',8],['farm',9],['farm',10],
        ['storage',6],['storage',7],['storage',8],['storage',9],['storage',10],
        ['stable',2],['stable',3],['stable',4],['stable',5],
        ['main',11],['main',12],['main',13],['main',14],['main',15],
        ['barracks',6],['barracks',7],['barracks',8],['barracks',9],['barracks',10],
        ['wall',2],['wall',3],['wall',4],['wall',5],['wall',6],['wall',7],['wall',8],['wall',9],['wall',10],
        ['wood',16],['stone',16],['iron',16],
        ['wood',17],['stone',17],['iron',17],
        ['wood',18],['stone',18],['iron',18],
        ['wood',19],['stone',19],['iron',19],
        ['wood',20],['stone',20],['iron',20],
        ['farm',11],['farm',12],['farm',13],['farm',14],['farm',15],
        ['storage',11],['storage',12],['storage',13],['storage',14],['storage',15],
        ['main',16],['main',17],['main',18],['main',19],['main',20],
        ['smith',6],['smith',7],['smith',8],['smith',9],['smith',10],
        ['smith',11],['smith',12],['smith',13],['smith',14],['smith',15],
        ['market',2],['market',3],['market',4],['market',5],
        ['stable',6],['stable',7],['stable',8],['stable',9],['stable',10],
        ['garage',1],
        ['smith',16],['smith',17],['smith',18],['smith',19],['smith',20],
        ['academy',1],
        ['wood',21],['stone',21],['iron',21],
        ['wood',22],['stone',22],['iron',22],
        ['wood',23],['stone',23],['iron',23],
        ['wood',24],['stone',24],['iron',24],
        ['wood',25],['stone',25],['iron',25],
        ['farm',16],['farm',17],['farm',18],['farm',19],['farm',20],
        ['storage',16],['storage',17],['storage',18],['storage',19],['storage',20],
        ['barracks',11],['barracks',12],['barracks',13],['barracks',14],['barracks',15],
        ['barracks',16],['barracks',17],['barracks',18],['barracks',19],['barracks',20],
        ['stable',11],['stable',12],['stable',13],['stable',14],['stable',15],
        ['wall',11],['wall',12],['wall',13],['wall',14],['wall',15],
        ['market',6],['market',7],['market',8],['market',9],['market',10],
        ['market',11],['market',12],['market',13],['market',14],['market',15],
        ['garage',2],['garage',3],['garage',4],['garage',5],
        ['wood',26],['stone',26],['iron',26],
        ['wood',27],['stone',27],['iron',27],
        ['wood',28],['stone',28],['iron',28],
        ['wood',29],['stone',29],['iron',29],
        ['wood',30],['stone',30],['iron',30],
        ['storage',21],['storage',22],['storage',23],['storage',24],['storage',25],
        ['storage',26],['storage',27],['storage',28],['storage',29],['storage',30],
        ['farm',21],['farm',22],['farm',23],['farm',24],['farm',25],
        ['farm',26],['farm',27],['farm',28],['farm',29],['farm',30],
        ['barracks',21],['barracks',22],['barracks',23],['barracks',24],['barracks',25],
        ['stable',16],['stable',17],['stable',18],['stable',19],['stable',20],
        ['garage',6],['garage',7],['garage',8],['garage',9],['garage',10],
        ['market',16],['market',17],['market',18],['market',19],['market',20],
        ['wall',16],['wall',17],['wall',18],['wall',19],['wall',20]
    ];

    // Versao centralizada para facil atualizacao
    const VERSION_ATUAL = '8.1.0';
    const LOG_PREFIX = `[Auto-Builder v${VERSION_ATUAL}]`;

    // Detectar versao actualizada
    const VERSION_ANTERIOR = localStorage.getItem('tw_autobuilder_version');
    if (VERSION_ANTERIOR && VERSION_ANTERIOR !== VERSION_ATUAL) {
        console.log(`${LOG_PREFIX} Versao atualizada: ${VERSION_ANTERIOR} -> ${VERSION_ATUAL}. Atualizacoes aplicadas!`);
        localStorage.removeItem('twAutoBuilder_hist');
    }
    localStorage.setItem('tw_autobuilder_version', VERSION_ATUAL);

    // ========================================================================
    // SISTEMA ANTI-DETEÇÃO v8.0
    // ========================================================================
    const ANTI_BOT = {
        enabled: true,
        mouseJitter: true,
        randomDelays: true,
        patternBreak: true,
        lastAction: Date.now(),
        actionCount: 0,
        sessionStart: Date.now()
    };

    // Randomização avançada - distribuição normal mais realista
    function randomNormal(mean, stdDev) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.abs(mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v));
    }

    // Delay humanizado com padrões irregulares
    function humanizedDelay(baseMs, variance = 0.3) {
        if (!ANTI_BOT.randomDelays) return baseMs;
        const variation = baseMs * variance;
        const delay = randomNormal(baseMs, variation);
        // Adicionar "micro-pausas" ocasionais (pensamento humano)
        if (Math.random() < 0.05) {
            return delay + randomNormal(500, 200);
        }
        return delay;
    }

    const nomesPt = {
        'main':'Edifício Principal','wood':'Bosque','stone':'Poço de Argila','iron':'Mina de Ferro',
        'farm':'Fazenda','storage':'Armazém','barracks':'Quartel','smith':'Ferreiro',
        'stable':'Estábulo','wall':'Muralha','market':'Mercado','academy':'Academia',
        'statue':'Estátua','hide':'Esconderijo','garage':'Oficina'
    };

    const REQUISITOS_TW = {
        'barracks': { 'main': 3 },
        'smith': { 'main': 5, 'barracks': 1 },
        'market': { 'main': 3, 'storage': 2 },
        'stable': { 'main': 10, 'barracks': 5, 'smith': 5 },
        'garage': { 'main': 10, 'smith': 10 },
        'academy': { 'main': 20, 'smith': 20, 'market': 10 },
        'wall': { 'barracks': 1 },
        'snob': { 'academy': 1 }
    };

    // (humanizar movido para depois da verificação de sono)

    // ========================================================================
    // ========================================================================
    // ESTADO E PAINEL VISUAL
    // (definidos ANTES da verificação de sono para que o painel apareça sempre)
    // ========================================================================
    let _intervalId = null;
    let estadoAtual = {
        status: 'A inicializar...', timer: '--', proximo: 'A calcular...',
        populacao: null, armazem: null, aldeia: null, obraRecente: null, minimizado: false,
        antiBot: true, acoes: 0
    };

    function atualizarPainel() {
        let p = document.getElementById('twBuilderPanel');
        if (!p) {
            p = document.createElement('div');
            p.id = 'twBuilderPanel';
            Object.assign(p.style, {
                position:'fixed', bottom:'70px', right:'20px',
                backgroundColor:'rgba(15,20,30,0.93)', color:'#fff',
                fontSize:'14px', fontFamily:'Arial,sans-serif',
                border:'2px solid #3a4a5a', borderRadius:'8px',
                zIndex:'99999', boxShadow:'0 4px 15px rgba(0,0,0,0.6)',
                minWidth:'260px'
            });
            document.body && document.body.appendChild(p);
        }
        let popHtml = '', popCritica = false;
        if (estadoAtual.populacao) {
            const { atual, max } = estadoAtual.populacao;
            const pct = Math.min(100, Math.round((atual / max) * 100));
            popCritica = pct >= POPULATION_THRESHOLD;
            const cor = pct >= POPULATION_THRESHOLD ? '#ff6644' : pct >= 70 ? '#ffbb44' : '#88ee88';
            popHtml = `<div style="margin-top:6px;border-top:1px solid #444;padding-top:6px;"><strong>👥 Pop:</strong> <span style="color:${cor};">${atual}/${max} (${pct}%)</span><div style="background:#333;border-radius:4px;height:6px;margin-top:3px;"><div style="background:${cor};width:${pct}%;height:6px;border-radius:4px;"></div></div></div>`;
        }
        let armHtml = '';
        if (estadoAtual.armazem) {
            const pctA = Math.round(estadoAtual.armazem.pct);
            const cor = pctA >= STORAGE_THRESHOLD ? '#ff6644' : pctA >= 70 ? '#ffbb44' : '#88ee88';
            armHtml = `<div style="margin-top:4px;"><strong>📦 Arm:</strong> <span style="color:${cor};">${pctA}%</span><div style="background:#333;border-radius:4px;height:6px;margin-top:3px;"><div style="background:${cor};width:${pctA}%;height:6px;border-radius:4px;"></div></div></div>`;
        }
        let recenteHtml = '';
        if (estadoAtual.obraRecente) {
            const { nome, tempo } = estadoAtual.obraRecente;
            recenteHtml = `<div style="margin-top:4px;"><strong>Fila recente:</strong> <span style="color:#ffd37a;">${nome}</span> <span style="color:#aaa;">${tempo}</span></div>`;
        }
        p.style.borderColor = popCritica ? '#ff6644' : '#3a4a5a';
        const aldeiaHtml = estadoAtual.aldeia ? `<div style="font-size:11px;color:#999;margin-bottom:4px;">🏠 ${estadoAtual.aldeia}</div>` : '';
        if (estadoAtual.minimizado) {
            p.style.padding = '8px 14px';
            p.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#00ff88;font-weight:bold;">🤖 Auto-Builder v${VERSION_ATUAL}</span><button id="twBtnToggle" style="background:none;border:none;color:#aaa;cursor:pointer;padding:0 0 0 12px;font-size:13px;">▲</button></div>`;
        } else {
            p.style.padding = '12px 18px';
            const antiBotStatus = estadoAtual.antiBot ? '<span style="color:#00ff88;">🛡️ ON</span>' : '<span style="color:#ff6644;">🛡️ OFF</span>';
            p.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #555;padding-bottom:5px;"><span style="font-weight:bold;font-size:16px;color:#00ff88;">🤖 Auto-Builder v${VERSION_ATUAL}</span><button id="twBtnToggle" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;">▼</button></div>${aldeiaHtml}<div style="margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;"><strong>Estratégia:</strong> <select id="twStrategySelect" style="background:#222;color:#00ff88;border:1px solid #555;border-radius:4px;padding:2px 4px;font-size:12px;cursor:pointer;outline:none;"><option value="agressivo" ${STRATEGY==='agressivo'?'selected':''}>Agressivo ⚔️</option><option value="economico" ${STRATEGY==='economico'?'selected':''}>Económico 🌾</option><option value="hibrido" ${STRATEGY==='hibrido'?'selected':''}>Híbrido ⚖️</option></select></div><div style="margin-bottom:5px;"><strong>Status:</strong> <span style="color:#aaddff;">${estadoAtual.status}</span></div><div style="margin-bottom:5px;"><strong>Ação em:</strong> <span style="color:#ff7777;font-weight:bold;">${estadoAtual.timer}</span></div><div style="margin-bottom:5px;"><strong>Próximo:</strong> <span style="color:#aaffaa;">${estadoAtual.proximo}</span></div><div style="margin-bottom:5px;"><strong>Anti-Bot:</strong> ${antiBotStatus}</div>${popHtml}${armHtml}`;
            if (recenteHtml) {
                p.innerHTML += recenteHtml;
            }
        }
        const btn = document.getElementById('twBtnToggle');
        if (btn) btn.onclick = () => { estadoAtual.minimizado = !estadoAtual.minimizado; atualizarPainel(); };
        const sel = document.getElementById('twStrategySelect');
        if (sel) {
            sel.onchange = (e) => {
                STRATEGY = e.target.value;
                localStorage.setItem('tw_autobuilder_strategy', STRATEGY);
                CURRENT_STRATEGY = STRATEGIES[STRATEGY];
                STORAGE_THRESHOLD = CURRENT_STRATEGY.STORAGE_THRESHOLD;
                POPULATION_THRESHOLD = CURRENT_STRATEGY.POPULATION_THRESHOLD;
                atualizarPainel();
            };
        }
    }

    function setStatus(s)       { estadoAtual.status    = s;               atualizarPainel(); }
    function setTimerText(t)    { estadoAtual.timer     = t;               atualizarPainel(); }
    function setProximo(pr)     { estadoAtual.proximo   = pr;              atualizarPainel(); }
    function setPopulacao(a, m) { estadoAtual.populacao = {atual:a,max:m}; atualizarPainel(); }
    function setArmazem(pct)    { estadoAtual.armazem   = {pct};           atualizarPainel(); }
    function setAldeia(nome)    { estadoAtual.aldeia    = nome;            atualizarPainel(); }
    function setObraRecente(o)  { estadoAtual.obraRecente = o;             atualizarPainel(); }

    function registarHistorico(msg) {
        try {
            const key = 'twAutoBuilder_hist';
            let h = JSON.parse(localStorage.getItem(key) || '[]');
            const d = new Date();
            const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            h.unshift(`[${ts}] ${msg}`);
            if (h.length > 20) h = h.slice(0, 20);
            localStorage.setItem(key, JSON.stringify(h));
        } catch(e) {}
    }

    function getTribalWarsUrl(screen) {
        if (typeof TribalWars !== 'undefined' && typeof TribalWars.buildURL === 'function') {
            return TribalWars.buildURL(screen);
        }
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('screen', screen);
            return url.toString();
        } catch(e) {
            return null;
        }
    }

    function irParaScreen(screen, status) {
        const url = getTribalWarsUrl(screen);
        if (!url) {
            setStatus('Nao foi possivel navegar automaticamente.');
            return false;
        }
        if (status) setStatus(status);
        window.location.href = url;
        return true;
    }

    function irParaProximaAldeia(atraso = 0) {
        if (!AUTO_NEXT_VILLAGE || !game_data || !game_data.player || !game_data.player.villages || game_data.player.villages <= 1) return false;
        const navegar = () => {
            const seta = document.querySelector('a.arrowRight[href], .arrowRight a[href]');
            const link = seta?.tagName === 'A' ? seta : seta?.closest('a[href]');
            if (link && link.href) {
                window.location.href = link.href;
                return true;
            }
            console.log(`${LOG_PREFIX} Nao encontrei link valido para a proxima aldeia.`);
            return false;
        };
        if (atraso > 0) {
            setTimeout(navegar, atraso);
            return true;
        }
        return navegar();
    }

    function encontrarContainerFila() {
        const seletoresEstritos = [
            '#buildqueue',
            '#build_queue',
            '#buildings_queue',
            '#buildqueue_wrap',
            '#buildqueue_wrap_inner',
            '.build-queue-wrapper',
            '#build_queue_container',
            '.buildqueue',
            '.build_queue',
            '.build_queue_box',
            '.queue_outer_wrap'
        ];
        for (const seletor of seletoresEstritos) {
            const el = document.querySelector(seletor);
            if (el) return el;
        }

        const candidatos = Array.from(document.querySelectorAll('[id*="queue"], [class*="queue"]'));
        return candidatos.find(el => {
            const texto = el.textContent || '';
            const temTimer = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/.test(texto);
            const temEdificio = !!el.querySelector('[data-building], img[src*="/buildings/"]');
            const pareceConstrucao = /build|constru|edif|building/i.test(`${el.id} ${el.className} ${texto}`);
            return (temTimer || temEdificio) && pareceConstrucao;
        }) || null;
    }

    function confirmarPopupConstrucao() {
        const candidatos = Array.from(document.querySelectorAll('.btn-confirm-yes, .confirmation-buttons .btn, .popup_box .btn'));
        const btn = candidatos.find(el => {
            const visivel = el.offsetParent !== null;
            const texto = `${el.textContent || ''} ${el.title || ''}`.toLowerCase();
            return visivel && /(sim|yes|confirm|confirmar|ok)/i.test(texto);
        });
        if (btn) {
            console.log(`${LOG_PREFIX} Popup de confirmacao de construcao detetado.`);
            btn.click();
            return true;
        }
        return false;
    }

    function estaNoEcraMain() {
        try {
            return new URL(window.location.href).searchParams.get('screen') === 'main';
        } catch(e) {
            return window.location.href.includes('screen=main');
        }
    }

    function parseTempoParaSegundos(texto) {
        const match = String(texto || '').match(/\b(?:(\d{1,3}):)?(\d{1,2}):(\d{2})\b/);
        if (!match) return null;
        return (match[1] ? parseInt(match[1], 10) : 0) * 3600 +
            parseInt(match[2], 10) * 60 +
            parseInt(match[3], 10);
    }

    function formatarSegundos(segundos) {
        if (!Number.isFinite(segundos)) return '--';
        const total = Math.max(0, Math.floor(segundos));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        return `${m}m ${String(s).padStart(2, '0')}s`;
    }

    function lerTempoDeAtributos(el) {
        const agoraMs = Date.now();
        const attrs = ['data-endtime', 'data-end-time', 'data-finish', 'data-time', 'data-duration'];
        for (const attr of attrs) {
            const valor = el.getAttribute && el.getAttribute(attr);
            if (!valor) continue;
            const n = parseFloat(valor);
            if (!Number.isFinite(n)) continue;
            if (n > 100000000000) return Math.max(0, Math.ceil((n - agoraMs) / 1000));
            if (n > 1000000000) return Math.max(0, Math.ceil(n - (agoraMs / 1000)));
            if (n >= 0 && n < 10000000) return Math.ceil(n);
        }
        return null;
    }

    function extrairTempoDeItemFila(item) {
        const candidatos = [item, ...item.querySelectorAll('.timer, .countdown, [id*="timer"], [data-endtime], [data-end-time], [data-finish], [data-time], [data-duration]')];
        for (const el of candidatos) {
            const porAttr = lerTempoDeAtributos(el);
            if (porAttr !== null) return porAttr;
            const porTexto = parseTempoParaSegundos(el.textContent || '');
            if (porTexto !== null) return porTexto;
        }
        return parseTempoParaSegundos(item.textContent || '');
    }

    function extrairEdificioDeItemFila(item) {
        const el = item.querySelector('[data-building]');
        const nomeData = el && el.getAttribute('data-building');
        if (nomeData && nomeData in nomesPt) return nomeData;

        const img = item.querySelector('img[src*="/buildings/"]');
        if (img) {
            const match = img.src.match(/\/buildings\/([a-z_]+)\.png/i);
            if (match && match[1] in nomesPt) return match[1];
        }
        return null;
    }

    function obterItensFila(container) {
        if (!container) return [];
        const linhas = Array.from(container.querySelectorAll('tr')).filter(linha => {
            if (linha.querySelector('th')) return false;
            return !!extrairEdificioDeItemFila(linha) || extrairTempoDeItemFila(linha) !== null;
        });
        if (linhas.length) return linhas;

        const items = Array.from(container.querySelectorAll('li, .queue-item, .buildorder, [id^="buildorder_"]')).filter(el => {
            return !!extrairEdificioDeItemFila(el) || extrairTempoDeItemFila(el) !== null;
        });
        if (items.length) return items;

        const directos = Array.from(container.children || []).filter(el => {
            return !!extrairEdificioDeItemFila(el) || extrairTempoDeItemFila(el) !== null;
        });
        return directos;
    }

    function lerFilaConstrucao(container = encontrarContainerFila()) {
        return obterItensFila(container).map((el, index) => ({
            el,
            index,
            nome: extrairEdificioDeItemFila(el),
            segundos: extrairTempoDeItemFila(el)
        })).filter(item => item.nome || item.segundos !== null);
    }

    function lerConstrucaoMaisRecente(container = encontrarContainerFila()) {
        const fila = lerFilaConstrucao(container);
        for (let i = fila.length - 1; i >= 0; i--) {
            if (fila[i].segundos !== null) return fila[i];
        }
        return fila.length ? fila[fila.length - 1] : null;
    }

    function extrairNumero(texto) {
        return parseInt(String(texto || '').replace(/\D/g, ''), 10) || 0;
    }

    function extrairCustoRow(row, seletor) {
        const el = row && row.querySelector(seletor);
        if (!el && seletor === '.cost_pop') {
            const iconPop = row && row.querySelector('[src*="pop.png"]');
            if (iconPop && iconPop.nextElementSibling) return extrairNumero(iconPop.nextElementSibling.textContent);
        }
        return el ? extrairNumero(el.textContent) : 0;
    }

    function obterProducao(village, recurso) {
        // TW moderno: produção está em game_data.village[`${recurso}_prod`] ou pode ser calculada
        const candidatos = [
            `${recurso}_prod`,
            `${recurso}_production`,
            `${recurso}Prod`,
            `${recurso}Production`
        ];
        for (const key of candidatos) {
            const valor = parseFloat(village[key]);
            if (Number.isFinite(valor) && valor > 0) return valor;
        }
        // Fallback: procurar na DOM elementos de produção
        try {
            const prodEl = document.querySelector(`#${recurso}_prod, [data-resource="${recurso}"] .production, .res-${recurso} .production`);
            if (prodEl) {
                const texto = prodEl.textContent || prodEl.innerText || '';
                const match = texto.match(/(\d+)/);
                if (match) return parseFloat(match[1]);
            }
        } catch(e) {}
        // Se não encontrar, estimar com base no nível do edifício
        const nivel = parseInt(village[`${recurso}`] || 0);
        if (nivel > 0) {
            // Produção base aproximada por nível no TW
            const producaoBase = recurso === 'wood' ? 30 : recurso === 'stone' ? 30 : 30;
            const multiplicador = Math.pow(1.1631, nivel - 1);
            return Math.floor(producaoBase * multiplicador);
        }
        return 30; // Produção mínima padrão
    }

    function calcularEsperaRecursos(row, village) {
        if (!row || !village) return null;
        const recursos = ['wood', 'stone', 'iron'];
        let maiorEspera = 0;
        for (const recurso of recursos) {
            const custo = extrairCustoRow(row, `.cost_${recurso}`);
            const atual = parseFloat(village[recurso]) || 0;
            const falta = custo - atual;
            if (falta <= 0) continue;
            const prodHora = obterProducao(village, recurso);
            if (!prodHora) return null;
            maiorEspera = Math.max(maiorEspera, Math.ceil((falta / prodHora) * 3600));
        }
        return maiorEspera;
    }

    // ========================================================================
    // FUNÇÃO AGENDAR REFRESH (definida antes de ser usada)
    // Agenda refresh com variação aleatória e sem memory leak (clearInterval) - v8.0: humanizedDelay
    function agendarRefresh(segundosBase) {
        if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
        // Usar humanizedDelay para variação mais realista
        let tempoRestante = Math.floor(humanizedDelay(segundosBase, 0.3));
        if (tempoRestante > MAX_WAIT_SECONDS) {
            console.warn(`${LOG_PREFIX} Tempo de espera anormal detectado: ${formatarSegundos(tempoRestante)}. Limitando a ${formatarSegundos(MAX_WAIT_SECONDS)}.`);
            tempoRestante = MAX_WAIT_SECONDS;
        }

        _intervalId = setInterval(() => {
            tempoRestante--;
            if (tempoRestante < 0) tempoRestante = 0;
            
            let min = Math.floor(tempoRestante / 60);
            let seg = tempoRestante % 60;
            setTimerText(`${min}m ${seg < 10 ? '0' : ''}${seg}s`);

            if (tempoRestante <= 0) {
                // Mantem o bot no Edificio Principal.
                if (!window.location.href.includes("screen=main")) {
                    setStatus("A voltar ao trabalho...");
                    irParaScreen('main');
                } else {
                    location.reload();
                }
            }
        }, 1000);
    }

    // Painel visível apenas na página do Edifício Principal
    if (estaNoEcraMain()) {
        atualizarPainel();
    } else {
        // Remover painel se existir fora da página main
        const painel = document.getElementById('twBuilderPanel');
        if (painel) painel.remove();
        return;
    }

    // ========================================================================
    // VERIFICAÇÃO DE PROTOCOLO BIOLÓGICO (Modo Dormir + Insónia)
    // =======================================================================
    const agora = new Date();
    const hora = agora.getHours();
    const min  = agora.getMinutes();
    const seed = agora.getDate();
    const minAcordar      = 30 + (seed % 60);
    const duracaoAcordado = 20 + (seed % 15);

    let estaDormindo = (hora >= HORA_DORMIR && hora < HORA_ACORDAR);
    if (estaDormindo && hora >= 2 && hora <= 4) {
        if (min >= minAcordar && min <= (minAcordar + duracaoAcordado)) {
            estaDormindo = false;
            console.log(`${LOG_PREFIX} 🌙 Insónia: acordei a meio da noite.`);
        }
    }

    if (estaDormindo) {
        setStatus('💤 A dormir... (Protocolo Biológico)');
        setProximo('Nenhum (A dormir)');
        console.log(`${LOG_PREFIX} 💤 A dormir. Próximo reload em ~30 min.`);
        agendarRefresh(1800);
        return;
    }

    // ========================================================================
    // HUMANIZAÇÃO — só inicia quando acordado e na página main (melhorado v8.0)
    // ========================================================================
    function humanizar() {
        if (!ANTI_BOT.enabled) return;
        if (!estaNoEcraMain()) return;
        
        // Controle de taxa de ações - evitar padrões
        const agora = Date.now();
        const tempoUltimaAcao = agora - ANTI_BOT.lastAction;
        ANTI_BOT.actionCount++;
        ANTI_BOT.lastAction = agora;
        
        // Scroll aleatório com movimento natural
        if (Math.random() > 0.7) {
            const scrollAmount = randomNormal(50, 150);
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
        
        // Movimento de rato simulado (hover em elementos aleatórios)
        if (Math.random() > 0.85) {
            const elementosInterativos = document.querySelectorAll('a, button, .btn, [onclick]');
            if (elementosInterativos.length > 0) {
                const el = elementosInterativos[Math.floor(Math.random() * elementosInterativos.length)];
                if (el && !el.disabled) {
                    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                }
            }
        }
        
        // Pausas aleatórias para quebrar padrões
        if (ANTI_BOT.patternBreak && Math.random() < 0.03) {
            console.log(`${LOG_PREFIX} Pattern break: pausa de ${Math.floor(randomNormal(2000, 1000))}ms`);
        }
    }
    if (estaNoEcraMain()) {
        setInterval(humanizar, humanizedDelay(8000, 0.4));
    }

    // Atraso inicial (2-5 s) simulando leitura humana (v8.0: humanizedDelay)
    if (estaNoEcraMain()) {
        setTimeout(iniciarGestor, humanizedDelay(3500, 0.3));
    }


    function iniciarGestor() {
        // ==========================================
        // Conclusão Grátis (< 3 minutos) - Múltiplos métodos de deteção
        // ==========================================
        let botaoGratis = null;
        
        // Método 1: Seletor original
        botaoGratis = document.querySelector('.btn-instant-free');
        
        // Método 2: Procurar por texto/content
        if (!botaoGratis) {
            const botoes = document.querySelectorAll('button, a, .btn');
            for (const btn of botoes) {
                const texto = (btn.textContent || btn.innerText || '').toLowerCase();
                const title = (btn.title || '').toLowerCase();
                if ((texto.includes('grátis') || texto.includes('gratis') || texto.includes('free') || 
                     texto.includes('concluir') || texto.includes('terminar')) && 
                    (texto.includes('instant') || texto.includes('agora') || title.includes('gratis'))) {
                    botaoGratis = btn;
                    break;
                }
            }
        }
        
        // Método 3: Procurar na fila de construção por botões de conclusão
        if (!botaoGratis) {
            const containerFilaTemp = encontrarContainerFila();
            if (containerFilaTemp) {
                const btnFila = containerFilaTemp.querySelector('.btn-instant-free, [data-action="instant_finish"], .finish-free, .btn-finish');
                if (btnFila) botaoGratis = btnFila;
            }
        }
        
        if (botaoGratis && botaoGratis.offsetParent !== null) {
            // Verificar se está realmente disponível (não desativado)
            const estaDisponivel = !botaoGratis.classList.contains('btn-disabled') && 
                                   !botaoGratis.classList.contains('disabled') &&
                                   !botaoGratis.disabled &&
                                   botaoGratis.style.display !== 'none';
            
            if (!estaDisponivel) {
                setStatus('Botão grátis a preparar...');
                agendarRefresh(3);
                return;
            }
            
            console.log(`${LOG_PREFIX} Botão grátis encontrado! A clicar...`);
            setStatus('A concluir edifício grátis...');

            
            // Evitar que um alerta nativo prenda apenas esta acao de construcao.
            const confirmOriginal = window.confirm;
            window.confirm = function(msg) {
                const texto = String(msg || '').toLowerCase();
                if (texto.includes('constru') || texto.includes('build') || texto.includes('terminar') || texto.includes('complete')) {
                    return true;
                }
                return confirmOriginal.call(window, msg);
            };

            setTimeout(() => {
                botaoGratis.click();
                
                // O TW muitas vezes abre um popup do jogo a pedir confirmação ("Tens a certeza?")
                // Procuramos e clicamos nesse botão de confirmação 1 segundo depois
                setTimeout(() => {
                    if (confirmarPopupConstrucao()) return;
                    let btnConfirmarPopup = document.querySelector('.btn-confirm-yes, .btn-yes, [data-confirm="yes"]');
                    if (btnConfirmarPopup && btnConfirmarPopup.offsetParent !== null) {
                        console.log("[Auto-Builder] Popup de confirmação detetado! A confirmar...");
                        btnConfirmarPopup.click();
                    }
                }, humanizedDelay(1000, 0.2));

                // Reload global depois de tudo processar
                setTimeout(() => {
                    setStatus("A recarregar página...");
                    window.confirm = confirmOriginal;
                    window.location.reload();
                }, humanizedDelay(5000, 0.4));
            }, humanizedDelay(800, 0.3)); 
            
            return; 
        }

        if (typeof game_data === 'undefined') {
            setStatus('Erro: Dados do jogo não encontrados.');
            return;
        }
        // Mostrar nome da aldeia no painel
        setAldeia(game_data?.village?.name || '');

        if (!estaNoEcraMain()) {
            irParaScreen('main', 'A abrir Edificio Principal...');
            return;
        }

        // ===================================================================
        // LEITURA DA FILA DE CONSTRUÇÃO
        // Estratégia: Procurar APENAS dentro do container da fila (build_queue).
        // Nunca procurar na tabela principal para evitar contar botões de build.
        // ===================================================================
        const edificiosAtuais = game_data.village.buildings;
        let niveisNaFila = {};
        let itensNaFila = 0;

        // O TW coloca a fila de construção num elemento com id especifico.
        // Dentro desse container, cada item tem um botão de cancelar com data-building.
        let containerFila = encontrarContainerFila();

        if (containerFila) {
            // Método A: Ler via atributo data-building nos botões de cancelar
            let botoesCancel = containerFila.querySelectorAll('[data-building]');
            botoesCancel.forEach(el => {
                let nome = el.getAttribute('data-building');
                if (nome && nome in nomesPt) {
                    niveisNaFila[nome] = (niveisNaFila[nome] || 0) + 1;
                    itensNaFila++;
                }
            });

            // Método B: Fallback via imagens dentro do container da fila
            if (itensNaFila === 0) {
                containerFila.querySelectorAll('img').forEach(img => {
                    // Regex mais estrita: só letras no nome (sem números) para evitar falsos positivos
                    let match = img.src.match(/\/buildings\/([a-z_]+)\.png/i);
                    if (match && match[1] && match[1] in nomesPt) {
                        niveisNaFila[match[1]] = (niveisNaFila[match[1]] || 0) + 1;
                        itensNaFila++;
                    }
                });
            }

            // Método C: Fallback via texto
            if (itensNaFila === 0) {
                // Contar linhas de dados (tr sem th) como aproximação
                let linhasDados = Array.from(containerFila.querySelectorAll('tr')).filter(linha => !linha.querySelector('th'));
                linhasDados.forEach(linha => {
                    if (linha.textContent.trim().length > 10) {
                        itensNaFila++;
                    }
                });
            }
        }

        const detalhesFila = lerFilaConstrucao(containerFila);
        if (containerFila) {
            niveisNaFila = {};
            detalhesFila.forEach(item => {
                if (item.nome && item.nome in nomesPt) {
                    niveisNaFila[item.nome] = (niveisNaFila[item.nome] || 0) + 1;
                }
            });
            itensNaFila = detalhesFila.length;
        }

        const obraMaisRecente = lerConstrucaoMaisRecente(containerFila);
        if (obraMaisRecente) {
            setObraRecente({
                nome: nomesPt[obraMaisRecente.nome] || obraMaisRecente.nome || 'Construcao',
                tempo: obraMaisRecente.segundos !== null ? formatarSegundos(obraMaisRecente.segundos) : '--'
            });
        } else {
            setObraRecente(null);
        }

        console.log(`${LOG_PREFIX} Fila: ${itensNaFila} itens.`, JSON.stringify(niveisNaFila));

        let edificioAConstruir = null;
        let alvoNivel = null;

        // ===================================================================
        // GESTÃO DE ARMAZÉM (Storage Protection)
        // ===================================================================
        const maxStorageRaw = parseInt(game_data.village.storage_max, 10);
        const maxStorage   = Number.isFinite(maxStorageRaw) && maxStorageRaw > 0 ? maxStorageRaw : 1;
        const woodAtual = parseInt(game_data.village.wood, 10) || 0;
        const stoneAtual = parseInt(game_data.village.stone, 10) || 0;
        const ironAtual = parseInt(game_data.village.iron, 10) || 0;
        const currentWood  = (woodAtual / maxStorage) * 100;
        const currentStone = (stoneAtual / maxStorage) * 100;
        const currentIron  = (ironAtual / maxStorage) * 100;
        const maxPctStorage = Math.max(currentWood, currentStone, currentIron);
        const popAtualGlobal  = parseInt(game_data.village.pop,     10) || 0;
        const popMaximaGlobal = parseInt(game_data.village.pop_max, 10) || 1;

        setArmazem(maxPctStorage);
        setPopulacao(popAtualGlobal, popMaximaGlobal);

        // ===================================================================
        // NOVA LÓGICA V6.0: Injeção de Requisitos e Previsão de Custos
        // ===================================================================
        
        function getAlvoComRequisitos(alvo) {
            let reqs = REQUISITOS_TW[alvo];
            if (reqs) {
                for (let [reqNome, reqNivel] of Object.entries(reqs)) {
                    let nAtual = parseInt(edificiosAtuais[reqNome] || 0, 10);
                    let nFila = niveisNaFila[reqNome] || 0;
                    if ((nAtual + nFila) < reqNivel) {
                        return getAlvoComRequisitos(reqNome); // Resolve recursivamente
                    }
                }
            }
            return alvo;
        }

        // 1. Detetar se estamos na janela de Obras Noturnas (1.5 horas antes de dormir)
        let janelaNoturna = false;
        let horaAtualDecimal = new Date().getHours() + (new Date().getMinutes() / 60);
        let horaDormirDecimal = HORA_DORMIR;
        if (horaDormirDecimal <= horaAtualDecimal) horaDormirDecimal += 24; // Lida com a meia-noite
        let horasAteDormir = horaDormirDecimal - horaAtualDecimal;
        
        if (horasAteDormir > 0 && horasAteDormir <= 1.5) {
            janelaNoturna = true;
        }

        // 2. Encontrar Candidatos Válidos
        let candidatos = [];
        for (let [nome, alvo] of buildOrder) {
            let nivelAtual = parseInt(edificiosAtuais[nome] || 0, 10);
            let naFila = niveisNaFila[nome] || 0;
            if ((nivelAtual + naFila) < alvo) {
                let alvoReal = getAlvoComRequisitos(nome);
                
                // === NOVIDADE V7.0: OTIMIZAÇÃO DO EDIFÍCIO PRINCIPAL ===
                if (alvoReal !== 'main') {
                    let nMain = parseInt(edificiosAtuais['main'] || 0, 10) + (niveisNaFila['main'] || 0);
                    if (alvo >= 20 && nMain < 20) {
                        alvoReal = 'main';
                        console.log(`${LOG_PREFIX} Otimizacao de Tempo: Obra pesada (Nivel ${alvo}). Forcar Ed. Principal para 20.`);
                    } else if (alvo >= 15 && nMain < 15) {
                        alvoReal = 'main';
                        console.log(`${LOG_PREFIX} Otimizacao de Tempo: Obra pesada (Nivel ${alvo}). Forcar Ed. Principal para 15.`);
                    }
                }

                let nRealAtual = parseInt(edificiosAtuais[alvoReal] || 0, 10);
                let nRealFila = niveisNaFila[alvoReal] || 0;
                let nRealAlvo = nRealAtual + nRealFila + 1;
                if (candidatos.some(c => c.nome === alvoReal)) continue;

                let prioridadeBonus = 0;

                // Estratégia agressiva → militar
                if (CURRENT_STRATEGY.FOCO === 'militar') {
                    if (['barracks','stable','smith','garage','wall'].includes(alvoReal)) {
                        prioridadeBonus += 50;
                    }
                }

                // Estratégia económica → recursos
                if (CURRENT_STRATEGY.FOCO === 'recursos') {
                    if (['wood','stone','iron','storage'].includes(alvoReal)) {
                        prioridadeBonus += 50;
                    }
                }

                // Estratégia híbrida → equilíbrio
                if (CURRENT_STRATEGY.FOCO === 'equilibrado') {
                    if (['wood','stone','iron'].includes(alvoReal)) prioridadeBonus += 20;
                    if (['barracks','stable'].includes(alvoReal)) prioridadeBonus += 20;
                }

                candidatos.push({
                    nome: alvoReal,
                    alvo: nRealAlvo,
                    original: nome,
                    score: prioridadeBonus
                });
                
                // Juntar até 3 candidatos para Otimização Noturna ou Equilíbrio de Silo
                if (candidatos.length >= 3) break;
            }
        }

        // NOVIDADE V7.0: CÁLCULO DE ASSIMETRIA DO ARMAZÉM
        let minPctStorage = Math.min(currentWood, currentStone, currentIron);
        let assimetria = maxPctStorage - minPctStorage;
        let modoEquilibrio = (assimetria > 40 && maxPctStorage > 50);

        if (candidatos.length > 0) {
            let extrairCusto = (row, seletor) => {
                let el = row.querySelector(seletor);
                if (!el && seletor === '.cost_pop') {
                    // Fallback para apanhar pop nalguns temas antigos
                    let iconPop = row.querySelector('[src*="pop.png"]');
                    if (iconPop && iconPop.nextElementSibling) return parseInt(iconPop.nextElementSibling.textContent.replace(/\D/g, ''), 10) || 0;
                }
                return el ? parseInt(el.textContent.replace(/\D/g, ''), 10) : 0;
            };

            // 3. Otimização da Fila Noturna ou Equilíbrio de Silo
            if (janelaNoturna && candidatos.length > 1) {
                let melhorCandidato = candidatos[0];
                let maiorTempo = -1;
                candidatos.forEach(c => {
                    let row = document.getElementById('main_buildrow_' + c.nome);
                    if (row) {
                        let tEl = row.querySelector('.build_time');
                        if (tEl) {
                            let m = tEl.textContent.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
                            if (m) {
                                let t = (m[1]?parseInt(m[1],10):0)*3600 + parseInt(m[2],10)*60 + parseInt(m[3],10);
                                if (t > maiorTempo) {
                                    maiorTempo = t;
                                    melhorCandidato = c;
                                }
                            }
                        }
                    }
                });
                edificioAConstruir = melhorCandidato.nome;
                alvoNivel = melhorCandidato.alvo;
                if (melhorCandidato.nome !== candidatos[0].nome) {
                    console.log(`${LOG_PREFIX} Obras Noturnas: Escolhido ${edificioAConstruir} pelo maior tempo de construção.`);
                }
            } else if (modoEquilibrio && candidatos.length > 1) {
                // NOVIDADE V7.0: EQUILÍBRIO DE SILO
                let melhorCandidato = candidatos[0];
                let maiorScore = -Infinity;
                candidatos.forEach(c => {
                    let row = document.getElementById('main_buildrow_' + c.nome);
                    if (row) {
                        let cW = extrairCusto(row, '.cost_wood');
                        let cS = extrairCusto(row, '.cost_stone');
                        let cI = extrairCusto(row, '.cost_iron');
                        let score = (cW * currentWood) + (cS * currentStone) + (cI * currentIron);
                        if (score > maiorScore) {
                            maiorScore = score;
                            melhorCandidato = c;
                        }
                    }
                });
                edificioAConstruir = melhorCandidato.nome;
                alvoNivel = melhorCandidato.alvo;
                if (melhorCandidato.nome !== candidatos[0].nome) {
                    console.log(`${LOG_PREFIX} Silo Protection: Escolhido ${edificioAConstruir} para equilibrar recursos (Diferença ${assimetria.toFixed(0)}%).`);
                }
            } else {
                candidatos.sort((a, b) => (b.score || 0) - (a.score || 0));
                edificioAConstruir = candidatos[0].nome;
                alvoNivel = candidatos[0].alvo;
            }

            // 4. Previsão de Custo e População Futura
            let row = document.getElementById('main_buildrow_' + edificioAConstruir);
            if (row) {
                let costWood = extrairCusto(row, '.cost_wood');
                let costStone = extrairCusto(row, '.cost_stone');
                let costIron = extrairCusto(row, '.cost_iron');
                let costPop = extrairCusto(row, '.cost_pop');
                let maxCustoRes = Math.max(costWood, costStone, costIron);
                
                let popEstimadaFila = itensNaFila * 5; 
                let popNecessaria = popAtualGlobal + popEstimadaFila + costPop;
                
                if (maxCustoRes > maxStorage && maxStorage > 0) {
                    let nArmazem = parseInt(edificiosAtuais['storage'] || 0, 10);
                    let nFilaArmazem = niveisNaFila['storage'] || 0;
                    if (nArmazem < 30) {
                        console.log(`${LOG_PREFIX} Previsão: Custo (${maxCustoRes}) excede Armazém. Injetando Armazém!`);
                        edificioAConstruir = 'storage';
                        alvoNivel = nArmazem + nFilaArmazem + 1;
                    }
                } else if (popNecessaria > popMaximaGlobal && popMaximaGlobal > 1) {
                    let nFazenda = parseInt(edificiosAtuais['farm'] || 0, 10);
                    let nFilaFazenda = niveisNaFila['farm'] || 0;
                    if (nFazenda < 30) {
                        console.log(`${LOG_PREFIX} Previsão PopFutura: ${popNecessaria}/${popMaximaGlobal}. Injetando Fazenda!`);
                        edificioAConstruir = 'farm';
                        alvoNivel = nFazenda + nFilaFazenda + 1;
                    }
                }
            }
        }

        // ===================================================================
        // Barreiras de Segurança Originais (Thresholds)
        // ===================================================================
        // Prioridade Absoluta ao Armazém se estiver quase a transbordar (> THRESHOLD)
        if (maxPctStorage > STORAGE_THRESHOLD) {
            let nivelArmazem  = parseInt(edificiosAtuais['storage'] || 0, 10);
            let naFilaArmazem = parseInt(niveisNaFila['storage']    || 0, 10);
            if (naFilaArmazem === 0 && nivelArmazem < 30) {
                console.log(`${LOG_PREFIX} Armazém em ${maxPctStorage.toFixed(0)}%. Priorizando Armazém!`);
                edificioAConstruir = 'storage';
                alvoNivel = nivelArmazem + 1;
            }
        }

        // Prioridade à Fazenda se estiver muito cheia (> THRESHOLD)
        const percentPop = (popAtualGlobal / popMaximaGlobal) * 100;
        if (percentPop >= POPULATION_THRESHOLD) {
            let nivelFazenda  = parseInt(edificiosAtuais['farm'] || 0, 10);
            let naFilaFazenda = parseInt(niveisNaFila['farm']    || 0, 10);
            if (naFilaFazenda === 0 && nivelFazenda < 30) {
                console.log(`${LOG_PREFIX} ⚠️ Pop. ${popAtualGlobal}/${popMaximaGlobal} (${percentPop.toFixed(1)}%). Priorizando Fazenda!`);
                setStatus(`⚠️ Pop. alta (${percentPop.toFixed(0)}%) – Priorizando Fazenda!`);
                edificioAConstruir = 'farm';
                alvoNivel = nivelFazenda + 1;
            }
        }

        // Micro-break (15% de chance) - v8.0: humanizedDelay
        if (edificioAConstruir && Math.random() < CHANCE_MICRO_BREAK) {
            setStatus('☕ Pausa rápida... (humanização)');
            agendarRefresh(humanizedDelay(600, 0.5));
            return;
        }

        if (!edificioAConstruir) {
            setStatus('Todas as construções terminadas!');
            setProximo('Nenhum');
            if (AUTO_NEXT_VILLAGE && game_data && game_data.player && game_data.player.villages > 1) {
                setStatus('Todas as construções terminadas! A passar para próxima aldeia...');
                irParaProximaAldeia(humanizedDelay(6000, 0.3));
            }
            return;
        }

        let nomeVisual = nomesPt[edificioAConstruir] || edificioAConstruir;
        let nivelA = parseInt(edificiosAtuais[edificioAConstruir] || 0, 10);
        let nivelF = niveisNaFila[edificioAConstruir] || 0;
        setProximo(`${nomeVisual} (Alvo: ${alvoNivel} | Atual: ${nivelA}+${nivelF})`);

        // Deteção inteligente de Conta Premium (múltiplos métodos)
        let temPremium = false;
        if (game_data && game_data.features) {
            // Método 1: Verificar objeto Premium
            if (game_data.features.Premium && game_data.features.Premium.active) {
                temPremium = true;
            }
            // Método 2: Verificar se AccountBenefits existe (versões mais recentes do TW)
            if (game_data.features.AccountBenefits || game_data.features.account_benefits) {
                temPremium = true;
            }
        }
        // Método 3: Verificar na DOM se existe indicador premium
        if (!temPremium) {
            const indicadorPremium = document.querySelector('.premium-indicator, .premium-active, .account-status-premium, .premium-label');
            if (indicadorPremium) temPremium = true;
        }
        let limiteFila = temPremium ? 5 : 2;

        if (itensNaFila >= limiteFila) {
            setStatus(`Fila cheia (${itensNaFila}/${limiteFila}). A aguardar...`);
            let s = lerMenorTimer(containerFila);
            if (s < 60) s = 60;
            agendarRefresh(humanizedDelay(s + 20, 0.2));
            return;
        }

        // ===================================================================
        // ENCONTRAR O BOTÃO DE BUILD NA TABELA PRINCIPAL
        // Procuramos especificamente o botão de upgrade ATIVO, não elementos da fila.
        // A tabela principal tem a class 'main-table' ou os botões têm href com 'action=build'
        // ===================================================================
        
        // Procurar botão de build: procurar em múltiplos seletores possíveis
        let botaoBuild = null;
        
        // Método 1: Procurar na linha específica do edifício
        const buildRow = document.getElementById('main_buildrow_' + edificioAConstruir);
        if (buildRow) {
            // Procurar botão ativo na linha
            const btnAtivo = buildRow.querySelector('.btn-build:not(.disabled):not(.inactive):not([disabled]), .btn-build-confirm, a[href*="action=build"]:not(.disabled)');
            if (btnAtivo && (!containerFila || !containerFila.contains(btnAtivo))) {
                botaoBuild = btnAtivo;
            }
            
            // Se não encontrou ativo, procurar qualquer botão (mesmo inativo) para verificar estado
            if (!botaoBuild) {
                const btnQualquer = buildRow.querySelector('.btn-build, .btn-build-confirm, a[href*="action=build"], button[onclick*="build"], a[onclick*="build"]');
                if (btnQualquer && (!containerFila || !containerFila.contains(btnQualquer))) {
                    botaoBuild = btnQualquer;
                }
            }
        }
        
        // Método 2: Procurar globalmente se não encontrou na linha
        if (!botaoBuild) {
            let todosBotoes = document.querySelectorAll(`a[data-building="${edificioAConstruir}"], button[data-building="${edificioAConstruir}"], #main_buildrow_${edificioAConstruir} a, #main_buildrow_${edificioAConstruir} button`);
            todosBotoes.forEach(btn => {
                let dentroFila = containerFila && containerFila.contains(btn);
                let temHrefBuild = btn.href && btn.href.includes('action=build');
                let temOnclickBuild = btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('build');
                let eBotaoBuild = btn.classList.contains('btn-build') || btn.classList.contains('btn-build-confirm') || btn.classList.contains('btn-build-inactive');
                
                if (!dentroFila && (temHrefBuild || temOnclickBuild || eBotaoBuild)) {
                    botaoBuild = btn;
                }
            });
        }
        
        // Método 3: Procurar por texto na tabela
        if (!botaoBuild) {
            const tabela = document.querySelector('.main-table, .buildings-table, #buildings_table');
            if (tabela) {
                const linhas = tabela.querySelectorAll('tr');
                for (const linha of linhas) {
                    const nomeEl = linha.querySelector('.building-name, .build_label, td:first-child');
                    if (nomeEl && nomeEl.textContent.toLowerCase().includes(nomeVisual.toLowerCase())) {
                        const btn = linha.querySelector('.btn-build, .btn-build-confirm, a[href*="action=build"], button');
                        if (btn && (!containerFila || !containerFila.contains(btn))) {
                            botaoBuild = btn;
                            break;
                        }
                    }
                }
            }
        }

        if (botaoBuild) {
            // Verificar se está inativo por falta de recursos
            let estaInativo = botaoBuild.classList.contains('inactive') || 
                              botaoBuild.classList.contains('btn-build-inactive') ||
                              botaoBuild.classList.contains('btn-disabled') ||
                              botaoBuild.classList.contains('disabled') ||
                              botaoBuild.getAttribute('aria-disabled') === 'true' ||
                              botaoBuild.disabled ||
                              botaoBuild.style.display === 'none' ||
                              botaoBuild.style.visibility === 'hidden';

            if (estaInativo) {
                // PASSO CRÍTICO: distinguir "fila cheia" de "falta de recursos".
                // Se houver 2 ou mais itens na fila, a fila está cheia (limite padrão sem CP).
                // Se houver 1 item e o botão estiver inativo, pode ser falta de recursos.
                
                let timersNaPagina = document.querySelectorAll('.timer, .countdown, [id*="timer"]');
                let temTimer = Array.from(timersNaPagina).some(t => /\d:\d{2}/.test(t.textContent.trim()));
                
                // Procurar por textos de erro comuns no botão ou perto dele
                let textoErro = (botaoBuild.title || botaoBuild.innerText || "").toLowerCase();
                let msgFilaCheia = textoErro.includes("cheia") || textoErro.includes("full");
                let msgRecursos = textoErro.includes("recursos") || textoErro.includes("resources") || textoErro.includes("disponíveis");

                // Decisão inteligente:
                let filaRealmenteCheia = (itensNaFila >= limiteFila) || (temTimer && msgFilaCheia);
                let faltaRecursosReal = msgRecursos || (!filaRealmenteCheia && !temTimer);

                if (filaRealmenteCheia) {
                    setStatus(`Fila cheia (${itensNaFila} itens). A aguardar...`);
                    let s = lerMenorTimer(containerFila);
                    const ESPERA_MINIMA = 2 * 60;
                    if (s < ESPERA_MINIMA) s = ESPERA_MINIMA;
                    agendarRefresh(humanizedDelay(s + 25, 0.2));
                } else if (faltaRecursosReal) {
                    setStatus(`Sem recursos para ${nomeVisual}.`);
                    const rowSelecionada = document.getElementById('main_buildrow_' + edificioAConstruir);
                    const esperaRecursos = calcularEsperaRecursos(rowSelecionada, game_data.village);
                    if (AUTO_NEXT_VILLAGE && game_data && game_data.player && game_data.player.villages > 1) {
                        setStatus(`Sem recursos. A saltar para a próxima aldeia...`);
                        irParaProximaAldeia(humanizedDelay(4000, 0.3));
                    } else if (Number.isFinite(esperaRecursos) && esperaRecursos > 0) {
                        if (esperaRecursos > MAX_WAIT_SECONDS) {
                            console.warn(`${LOG_PREFIX} Espera de recursos anormal detectada: ${formatarSegundos(esperaRecursos)}. Limitando a ${formatarSegundos(MAX_WAIT_SECONDS)}.`);
                            esperaRecursos = MAX_WAIT_SECONDS;
                        }
                        setStatus(`Sem recursos para ${nomeVisual}. A aguardar ${formatarSegundos(esperaRecursos)}.`);
                        agendarRefresh(humanizedDelay(Math.max(60, esperaRecursos + 70), 0.2));
                    } else {
                        agendarRefresh(humanizedDelay(20 * 60, 0.3));
                    }
                } else {
                    // Requisitos não cumpridos (edifício dependente em falta)
                    setStatus(`Requisitos em falta para ${nomeVisual}.`);
                    agendarRefresh(humanizedDelay(10 * 60, 0.3));
                }
            } else {
                setStatus(`A construir ${nomeVisual}...`);
                registarHistorico(`${nomeVisual} → nível ${alvoNivel}`);
                console.log(`${LOG_PREFIX} Construir ${nomeVisual} → nível ${alvoNivel}`);
                let tempoAteClicar = humanizedDelay(3000, 0.4);

                setTimeout(() => {
                    if (botaoBuild.href && botaoBuild.href.includes('action=build')) {
                        window.location.href = botaoBuild.href; 
                    } else {
                        botaoBuild.click();
                        // Humanização: após clicar, não recarregar logo, esperar um pouco
                        setTimeout(() => {
                            if (AUTO_NEXT_VILLAGE && game_data && game_data.player && game_data.player.villages > 1 && itensNaFila >= 1) {
                                irParaProximaAldeia();
                            } else {
                                location.reload();
                            }
                        }, humanizedDelay(3500, 0.5)); 
                    }
                }, tempoAteClicar);
            }
        } else {
            setStatus(`Tudo construído ou requisitos em falta.`);
            if (AUTO_NEXT_VILLAGE && game_data && game_data.player && game_data.player.villages > 1) {
                irParaProximaAldeia(humanizedDelay(6000, 0.3));
            }
        }
    }

    function lerMenorTimer(container = encontrarContainerFila()) {
        try {
            const tempos = lerFilaConstrucao(container)
                .map(item => item.segundos)
                .filter(segundos => Number.isFinite(segundos) && segundos >= 10 && segundos <= MAX_PURGE_MATCH_SECONDS);
            if (tempos.length) return Math.min(...tempos);
        } catch(e) {
            console.log(`${LOG_PREFIX} Erro ao ler timer:`, e);
        }

        let menor = Infinity;
        try {
            // Apenas os containers estritos da fila de construção (nunca o ecrã todo)
            const queueContainers = [
                document.getElementById('buildqueue'), document.getElementById('build_queue'),
                document.querySelector('#buildings_queue'), document.querySelector('.build-queue-wrapper')
            ].filter(Boolean);
            
            queueContainers.forEach(container => {
                // Apanha qualquer texto no formato HH:MM:SS ou MM:SS dentro do elemento da fila
                let matches = container.innerText.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g);
                if (matches) {
                    matches.forEach(tempoTxt => {
                        let partes = tempoTxt.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
                        if (partes) {
                            let total = (partes[1] ? parseInt(partes[1],10) : 0)*3600 + parseInt(partes[2],10)*60 + parseInt(partes[3],10);
                            // Ignorar timers impossíveis ou valores errados acima de 7 dias
                            if (total >= 10 && total <= MAX_PURGE_MATCH_SECONDS && total < menor) menor = total;
                        }
                    });
                }
            });
        } catch(e) { console.log(`${LOG_PREFIX} Erro ao ler timer:`, e); }
        
        if (menor === Infinity) {
            console.warn(`${LOG_PREFIX} Nenhum timer válido encontrado na fila. Usando padrão de 5 minutos.`);
            return 5 * 60;
        }
        return menor;
    }

})();
