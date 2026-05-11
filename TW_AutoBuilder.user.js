// ==UserScript==
// @name         TW Auto-Builder
// @namespace    https://github.com/fil7rms-gif/filrms
// @version      8.2.4
// @description  Gestor automático de construção com suporte a atualizações automáticas
// @author       quesalhas
// @homepageURL  https://github.com/fil7rms-gif/filrms
// @supportURL   https://github.com/fil7rms-gif/filrms/issues
// @match        *://*.tribalwars.com.pt/*
// @match        *://*.tribalwars.com/*
// @match        *://*.tribalwars.net/*
// @match        *://*.tribalwars.pl/*
// @match        *://*.tribalwars.org/*
// @match        *://*.plemiona.pl/*
// @match        *://*.die-staemme.de/*
// @include      *://*.tribalwars.com.pt/*
// @installURL   https://cdn.jsdelivr.net/gh/fil7rms-gif/filrms@main/TW_AutoBuilder.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/fil7rms-gif/filrms@main/TW_AutoBuilder.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/fil7rms-gif/filrms@main/TW_AutoBuilder.user.js
// @grant        none
// ==/UserScript==

/*
 * Changelog:
 * v8.2.4 - Correção crítica na contagem de níveis na fila: Agora detecta corretamente múltiplos níveis do mesmo edifício (ex: Estábulo 9,10,11,12). Painel atualizado para mostrar informação mais clara (Próximo | Atual + Fila).
 * v8.2.3 - Correção crítica de timer: Usa Date.now() para calcular tempo real, eliminando atrasos em abas inativas/minimizadas (throttling).
 * v8.2.2 - Correção de renderização parcial: percentagem do armazém arredondada e fila recente sem [object Object].
 * v8.2.1 - Otimização de UI: Atualização de elementos específicos para evitar fecho do dropdown de estratégia.
 * v8.2.0 - UI atualizada: Substituída info "Anti-Bot" por "Sessão" e "Conta". Contador de obras persistente.
 * v8.1.9 - Melhoria na detecção de timers da fila e status detalhado em fila cheia.
 * v8.1.8 - Corrigido erro de escala na humanização que causava esperas de minutos em vez de segundos.
 * v8.1.7 - Detecção de Conta Premium reforçada para permitir 5 construções na fila.
 * v8.1.6 - Correção de "Double Humanization" no timer e melhoria na detecção de produção decimal.
 * v8.1.5 - Otimização de cálculos de tempo e correção definitiva de esperas anormais.
 * v8.1.4 - Corrige esperas gigantes por leitura incorreta de recursos/producao e limita esperas anormais.
 * v8.1.3 - URLs de instalação/atualização alteradas para jsDelivr para evitar falhas no raw.githubusercontent.com.
 * v8.1.2 - Metadados reforçados para atualizações automáticas via GitHub/Tampermonkey.
 * v8.1.1 - Interface atualizada para compatibilidade com a versão atual do Tribal Wars.
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

    const MAX_WAIT_SECONDS = 4 * 3600; // limitar esperas anormais a 4h (era 24h, mas 24h sugere erro de cálculo)
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
    const VERSION_ATUAL = '8.2.4';
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
    function humanizedDelay(base, variance = 0.3) {
        if (!ANTI_BOT.randomDelays) return base;
        const variation = base * variance;
        const delay = randomNormal(base, variation);
        // Adicionar "micro-pausas" proporcionais para evitar saltos de escala (s vs ms)
        if (Math.random() < 0.05) {
            const extra = base * 0.15; // Adiciona 15% extra como "reflexão"
            return delay + randomNormal(extra, extra * 0.2);
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
        temPremium: false, acoes: parseInt(localStorage.getItem('tw_autobuilder_session_actions') || '0', 10)
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
            const premiumStatus = estadoAtual.temPremium ? '<span style="color:#00ff88;">Ativa 💎</span>' : '<span style="color:#aaa;">Normal</span>';
            
            p.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #555;padding-bottom:5px;">
                    <span style="font-weight:bold;font-size:16px;color:#00ff88;">🤖 Auto-Builder v${VERSION_ATUAL}</span>
                    <button id="twBtnToggle" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;">▼</button>
                </div>
                ${aldeiaHtml}
                <div style="margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;">
                    <strong>Estratégia:</strong> 
                    <select id="twStrategySelect" style="background:#222;color:#00ff88;border:1px solid #555;border-radius:4px;padding:2px 4px;font-size:12px;cursor:pointer;outline:none;">
                        <option value="agressivo" ${STRATEGY==='agressivo'?'selected':''}>Agressivo ⚔️</option>
                        <option value="economico" ${STRATEGY==='economico'?'selected':''}>Económico 🌾</option>
                        <option value="hibrido" ${STRATEGY==='hibrido'?'selected':''}>Híbrido ⚖️</option>
                    </select>
                </div>
                <div style="margin-bottom:5px;"><strong>Status:</strong> <span id="twStatusText" style="color:#aaddff;">${estadoAtual.status}</span></div>
                <div style="margin-bottom:5px;"><strong>Ação em:</strong> <span id="twTimerText" style="color:#ff7777;font-weight:bold;">${estadoAtual.timer}</span></div>
                <div style="margin-bottom:5px;"><strong>Próximo:</strong> <span id="twProximoText" style="color:#aaffaa;">${estadoAtual.proximo}</span></div>
                <div style="margin-bottom:5px;display:flex;justify-content:space-between;">
                    <span><strong>Conta:</strong> <span id="twPremiumText">${premiumStatus}</span></span>
                    <span><strong>Sessão:</strong> <span id="twAcoesText" style="color:#ffd37a;">${estadoAtual.acoes} obras</span></span>
                </div>
                <div id="twPopText">${popHtml}</div>
                <div id="twArmText">${armHtml}</div>
                <div id="twRecenteText">${recenteHtml}</div>
            `;
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

    function setStatus(txt) {
        estadoAtual.status = txt;
        const el = document.getElementById('twStatusText');
        if (el) el.innerText = txt;
        else atualizarPainel();
    }

    function setTimerText(txt) {
        estadoAtual.timer = txt;
        const el = document.getElementById('twTimerText');
        if (el) el.innerText = txt;
        else atualizarPainel();
    }

    function setProximo(txt) {
        estadoAtual.proximo = txt;
        const el = document.getElementById('twProximoText');
        if (el) el.innerText = txt;
        else atualizarPainel();
    }
    
    function setPopulacao(a, m) {
        estadoAtual.populacao = {atual:a, max:m};
        const el = document.getElementById('twPopText');
        if (el) {
            const pct = Math.min(100, Math.round((a / m) * 100));
            const cor = pct > 90 ? '#ff4444' : (pct > 70 ? '#ffaa00' : '#44ff44');
            el.innerHTML = `<div style="display:flex;align-items:center;margin-bottom:3px;"><span style="font-size:18px;margin-right:8px;">👥</span> <strong>Pop:</strong> <span style="margin-left:5px;color:${cor}">${a}/${m} (${pct}%)</span></div><div style="width:100%;background:#333;border-radius:10px;height:8px;margin-bottom:8px;overflow:hidden;"><div style="width:${pct}%;background:${cor};height:100%;transition:width 0.5s ease;"></div></div>`;
        } else atualizarPainel();
    }

    function setArmazem(pct) {
        const pctSeguro = Number.isFinite(Number(pct)) ? Math.max(0, Math.min(100, Number(pct))) : 0;
        const pctVisual = Math.round(pctSeguro);
        estadoAtual.armazem = {pct: pctVisual};
        const el = document.getElementById('twArmText');
        if (el) {
            const cor = pctVisual > 90 ? '#ff4444' : (pctVisual > 75 ? '#ffaa00' : '#88cc88');
            el.innerHTML = `<div style="display:flex;align-items:center;margin-bottom:3px;"><span style="font-size:18px;margin-right:8px;">📦</span> <strong>Arm:</strong> <span style="margin-left:5px;color:${cor}">${pctVisual}%</span></div><div style="width:100%;background:#333;border-radius:10px;height:8px;margin-bottom:12px;overflow:hidden;"><div style="width:${pctVisual}%;background:${cor};height:100%;transition:width 0.5s ease;"></div></div>`;
        } else atualizarPainel();
    }

    function setAldeia(nome) {
        estadoAtual.aldeia = nome;
        atualizarPainel();
    }

    function setObraRecente(obra) {
        estadoAtual.obraRecente = obra;
        const el = document.getElementById('twRecenteText');
        if (el) {
            if (!obra) {
                el.innerHTML = '';
                return;
            }
            const nome = typeof obra === 'object' ? obra.nome : obra;
            const tempo = typeof obra === 'object' && obra.tempo ? ` <span style="color:#aaa;">${obra.tempo}</span>` : '';
            el.innerHTML = `<div style="border-top:1px solid #555;padding-top:8px;font-size:12px;color:#ccc;"><strong>Fila recente:</strong> <span style="color:#ffd37a;">${nome}</span>${tempo}</div>`;
        }
        else atualizarPainel();
    }

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
            '.queue_outer_wrap',
            '#queue',
            '.queue',
            '.construction_queue',
            '.construction_queue_container',
            '.queue-list',
            '.build-queue',
            '.tw-buildqueue'
        ];
        for (const seletor of seletoresEstritos) {
            const el = document.querySelector(seletor);
            if (el) return el;
        }

        const candidatos = Array.from(document.querySelectorAll('[id*="queue"], [class*="queue"], [class*="build-order"], [class*="construction"], [class*="build-queue"]'));
        return candidatos.find(el => {
            const texto = el.textContent || '';
            const temTimer = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/.test(texto);
            const temEdificio = !!el.querySelector('[data-building], img[src*="/buildings/"]');
            const pareceConstrucao = /build|constru|edif|building|fila|queue/i.test(`${el.id} ${el.className} ${texto}`);
            return (temTimer || temEdificio) && pareceConstrucao;
        }) || null;
    }

    function confirmarPopupConstrucao() {
        const candidatos = Array.from(document.querySelectorAll('.btn-confirm-yes, .btn-confirm, .btn-yes, .confirmation-buttons .btn, .popup_box .btn, .confirm-dialog button, .popup button, [data-confirm="yes"], [data-action="confirm"]'));
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
        // Método 1: data-building attribute
        const el = item.querySelector('[data-building]');
        const nomeData = el && el.getAttribute('data-building');
        if (nomeData && nomeData in nomesPt) return nomeData;

        // Método 2: imagem do edifício
        const img = item.querySelector('img[src*="/buildings/"]');
        if (img) {
            const match = img.src.match(/\/buildings\/([a-z_]+)\.png/i);
            if (match && match[1] in nomesPt) return match[1];
        }
        
        // Método 3: procurar por texto do nome do edifício na linha
        const texto = item.textContent || '';
        for (const [key, nome] of Object.entries(nomesPt)) {
            if (texto.toLowerCase().includes(nome.toLowerCase()) || 
                texto.toLowerCase().includes(key.toLowerCase())) {
                return key;
            }
        }
        
        return null;
    }

    function obterItensFila(container) {
        if (!container) return [];
        
        // Método 1: Procurar todas as linhas da tabela (tr) que têm timer ou data-building
        const linhas = Array.from(container.querySelectorAll('tr')).filter(linha => {
            if (linha.querySelector('th')) return false;
            const temTimer = linha.querySelector('.timer, .countdown, [id*="timer"], [data-endtime], [data-end-time]');
            const temEdificio = extrairEdificioDeItemFila(linha);
            return !!(temTimer || temEdificio);
        });
        if (linhas.length) {
            console.log(`${LOG_PREFIX} Fila: ${linhas.length} itens encontrados (método tabela)`);
            return linhas;
        }

        // Método 2: Procurar por itens de lista
        const items = Array.from(container.querySelectorAll('li, .queue-item, .buildorder, [id^="buildorder_"], .build-entry, .queue-entry, .construction-entry, .build-item')).filter(el => {
            return !!extrairEdificioDeItemFila(el) || extrairTempoDeItemFila(el) !== null;
        });
        if (items.length) {
            console.log(`${LOG_PREFIX} Fila: ${items.length} itens encontrados (método lista)`);
            return items;
        }

        // Método 3: Filhos diretos do container
        const directos = Array.from(container.children || []).filter(el => {
            return !!extrairEdificioDeItemFila(el) || extrairTempoDeItemFila(el) !== null;
        });
        if (directos.length) {
            console.log(`${LOG_PREFIX} Fila: ${directos.length} itens encontrados (método direto)`);
        }
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

    function extrairNumeroTW(valor) {
        if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
        let s = String(valor || '').trim();
        if (!s) return 0;
        
        // Se houver pontos E vírgulas, ou apenas vírgula que parece decimal
        // No TW PT: 1.234 é mil duzentos e trinta e quatro.
        // No TW EN: 1,234 é mil duzentos e trinta e quatro.
        
        // Estratégia robusta: remover separadores de milhar comuns
        // Se houver apenas um '.' e ele estiver na posição de decimal (ex: 0.008), mantemos.
        // Mas recursos no TW são sempre inteiros. Produção pode ser decimal.
        
        if (s.includes('.') && s.includes(',')) {
            // Caso 1.234,56 -> 1234.56
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes(',')) {
            // Caso 1,234 (pode ser milhar EN ou decimal PT)
            // Se tiver 3 dígitos depois da vírgula e nada antes que impeça, tratamos como milhar.
            // No TW, recursos nunca têm decimais na barra de topo.
            if (/^\d+,\d{3}$/.test(s)) s = s.replace(',', '');
            else s = s.replace(',', '.');
        } else if (s.includes('.')) {
            // Caso 1.234 (milhar PT) ou 1.23 (decimal EN)
            // Só removemos o ponto se for claramente um separador de milhar (3 dígitos depois e valor >= 1)
            if (/^[1-9]\d*\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
        }

        const limpo = s.replace(/[^\d.]/g, '');
        const numero = parseFloat(limpo);
        return Number.isFinite(numero) ? numero : 0;
    }

    function extrairCustoRow(row, seletor) {
        const el = row && row.querySelector(seletor);
        if (!el && seletor === '.cost_pop') {
            const iconPop = row && row.querySelector('[src*="pop.png"]');
            if (iconPop && iconPop.nextElementSibling) {
                const valor = extrairNumero(iconPop.nextElementSibling.textContent);
                console.log(`${LOG_PREFIX} [DEBUG] Custo POP encontrado no ícone: ${valor}`);
                return valor;
            }
        }
        const valor = el ? extrairNumero(el.textContent) : 0;
        if (valor > 0) {
            console.log(`${LOG_PREFIX} [DEBUG] Custo para seletor ${seletor}: ${valor}`);
        }
        return valor;
    }

    function obterRecursoAtual(village, recurso) {
        const el = document.getElementById(recurso);
        const valorDom = el ? extrairNumeroTW(el.textContent || el.innerText) : 0;
        if (valorDom > 0) {
            console.log(`${LOG_PREFIX} [DEBUG] Recurso atual ${recurso}: ${valorDom} (do DOM)`);
            return valorDom;
        }
        const valorVillage = extrairNumeroTW(village && village[recurso]);
        console.log(`${LOG_PREFIX} [DEBUG] Recurso atual ${recurso}: ${valorVillage} (de village)`);
        return valorVillage;
    }

    function obterProducao(village, recurso) {
        const candidatos = [`${recurso}_prod`, `${recurso}_production`, `${recurso}Prod`, `${recurso}Production` ];
        let prodDetectada = 0;

        for (const key of candidatos) {
            const valor = extrairNumeroTW(village && village[key]);
            if (Number.isFinite(valor) && valor > 0) {
                prodDetectada = valor;
                break;
            }
        }

        if (prodDetectada <= 0) {
            try {
                const prodEl = document.querySelector(`#${recurso}_prod, [data-resource="${recurso}"] .production, .res-${recurso} .production`);
                if (prodEl) prodDetectada = extrairNumeroTW(prodEl.textContent);
            } catch(e) {}
        }

        // Sanity Check: No TW, a produção por hora raramente é < 30 (nível 1).
        // Se for um decimal muito pequeno (ex: 0.008), provavelmente é produção por segundo.
        if (prodDetectada > 0 && prodDetectada < 5) {
            console.log(`${LOG_PREFIX} [DEBUG] Producao detectada muito baixa (${prodDetectada}). Assumindo producao por segundo e convertendo para hora.`);
            prodDetectada *= 3600;
        }

        if (prodDetectada >= 5) {
            console.log(`${LOG_PREFIX} [DEBUG] Produção confirmada: ${recurso} = ${prodDetectada}/h`);
            return prodDetectada;
        }

        // Fallback: estimar por nível
        const buildings = village && village.buildings ? village.buildings : {};
        const nivel = parseInt(buildings[recurso] || 0, 10);
        const estimada = Math.floor(30 * Math.pow(1.163118, Math.max(0, nivel - 1)));
        console.log(`${LOG_PREFIX} [DEBUG] Produção usando fallback nível ${nivel}: ${estimada}/h`);
        return estimada;
    }

    function calcularEsperaRecursos(row, village) {
        if (!row || !village) return null;
        const recursos = ['wood', 'stone', 'iron'];
        let maiorEspera = 0;
        for (const recurso of recursos) {
            const custo = extrairCustoRow(row, `.cost_${recurso}`);
            const atual = obterRecursoAtual(village, recurso);
            const falta = custo - atual;
            if (falta <= 0) continue;
            
            const prodHora = obterProducao(village, recurso);
            const espera = Math.ceil((falta / Math.max(5, prodHora)) * 3600);
            maiorEspera = Math.max(maiorEspera, espera);
        }
        return Math.min(maiorEspera, MAX_WAIT_SECONDS);
    }

    // ========================================================================
    // FUNÇÃO AGENDAR REFRESH (definida antes de ser usada)
    // Agenda refresh com variação aleatória e sem memory leak (clearInterval) - v8.0: humanizedDelay
    // v8.2.3: Correção de throttling em abas inativas usando Date.now() para tempo real
    function agendarRefresh(segundosBase) {
        if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
        // Usar humanizedDelay para variação mais realista
        let tempoTotal = Math.floor(humanizedDelay(segundosBase, 0.3));
        if (tempoTotal > MAX_WAIT_SECONDS) {
            console.warn(`${LOG_PREFIX} Tempo de espera anormal detectado: ${formatarSegundos(tempoTotal)}. Limitando a ${formatarSegundos(MAX_WAIT_SECONDS)}.`);
            tempoTotal = MAX_WAIT_SECONDS;
        }

        const tempoInicio = Date.now();
        const tempoFim = tempoInicio + (tempoTotal * 1000);

        _intervalId = setInterval(() => {
            const agora = Date.now();
            const tempoRestante = Math.max(0, Math.ceil((tempoFim - agora) / 1000));
            
            let min = Math.floor(tempoRestante / 60);
            let seg = tempoRestante % 60;
            setTimerText(`${min}m ${seg < 10 ? '0' : ''}${seg}s`);

            if (agora >= tempoFim) {
                clearInterval(_intervalId);
                _intervalId = null;
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
                    let btnConfirmarPopup = document.querySelector('.btn-confirm-yes, .btn-confirm, .btn-yes, [data-confirm="yes"], [data-action="confirm"], .confirm-dialog button, .popup button');
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
            // Agrupar por nome e contar quantos de cada edifício existem na fila
            detalhesFila.forEach(item => {
                if (item.nome && item.nome in nomesPt) {
                    niveisNaFila[item.nome] = (niveisNaFila[item.nome] || 0) + 1;
                }
            });
            itensNaFila = detalhesFila.length;
            console.log(`${LOG_PREFIX} Níveis na fila:`, JSON.stringify(niveisNaFila));
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
            agendarRefresh(600);
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
        let nivelTotal = nivelA + nivelF;
        setProximo(`${nomeVisual} (Próximo: ${nivelTotal + 1} | Atual: ${nivelA} + Fila: ${nivelF})`);

        // Deteção inteligente de Conta Premium (múltiplos métodos)
        let temPremium = false;
        if (typeof game_data !== 'undefined') {
            // Método 1: game_data.premium (Booleano direto em muitas versões)
            if (game_data.premium) temPremium = true;
            
            // Método 2: game_data.player.premium
            if (game_data.player && game_data.player.premium) temPremium = true;

            // Método 3: game_data.features
            if (game_data.features) {
                const f = game_data.features;
                if ((f.Premium && f.Premium.active) || (f.premium && f.premium.active)) temPremium = true;
                if (f.AccountBenefits || f.account_benefits || f.Account_benefits) temPremium = true;
            }
        }
        
        // Método 4: DOM
        if (!temPremium) {
            const selectors = '.premium-indicator, .premium-active, .account-status-premium, .premium-label, #premium_account_status, .icon.header.premium';
            if (document.querySelector(selectors)) temPremium = true;
        }

        // Método 5: Tabela de construção (se houver mais de 2 itens, é porque tem premium ou pagou)
        if (!temPremium && itensNaFila > 2) temPremium = true;
        let limiteFila = temPremium ? 5 : 2;
        estadoAtual.temPremium = temPremium;
        atualizarPainel();

        if (itensNaFila >= limiteFila) {
            let s = lerMenorTimer(containerFila);
            setStatus(`Fila cheia (${itensNaFila}/${limiteFila}). Próxima vaga em ${formatarSegundos(s)}.`);
            if (s < 30) s = 30;
            agendarRefresh(s + 15);
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
                    let s = lerMenorTimer(containerFila);
                    setStatus(`Fila cheia (${itensNaFila} itens). Próxima vaga em ${formatarSegundos(s)}.`);
                    if (s < 30) s = 30;
                    agendarRefresh(s + 15);
                } else if (faltaRecursosReal) {
                    setStatus(`Sem recursos para ${nomeVisual}.`);
                    const rowSelecionada = document.getElementById('main_buildrow_' + edificioAConstruir);
                    console.log(`${LOG_PREFIX} [DEBUG MAIN] Calculando espera para ${nomeVisual}...`);
                    console.log(`${LOG_PREFIX} [DEBUG MAIN] rowSelecionada:`, rowSelecionada);
                    console.log(`${LOG_PREFIX} [DEBUG MAIN] game_data.village:`, game_data && game_data.village);
                    let esperaRecursos = calcularEsperaRecursos(rowSelecionada, game_data.village);
                    console.log(`${LOG_PREFIX} [DEBUG MAIN] esperaRecursos retornou:`, esperaRecursos);
                    if (AUTO_NEXT_VILLAGE && game_data && game_data.player && game_data.player.villages > 1) {
                        setStatus(`Sem recursos. A saltar para a próxima aldeia...`);
                        irParaProximaAldeia(humanizedDelay(4000, 0.3));
                    } else if (Number.isFinite(esperaRecursos) && esperaRecursos > 0) {
                        if (esperaRecursos > MAX_WAIT_SECONDS) {
                            console.warn(`${LOG_PREFIX} Espera de recursos anormal detectada: ${formatarSegundos(esperaRecursos)}. Limitando a ${formatarSegundos(MAX_WAIT_SECONDS)}.`);
                            esperaRecursos = MAX_WAIT_SECONDS;
                        }
                        setStatus(`Sem recursos para ${nomeVisual}. A aguardar ${formatarSegundos(esperaRecursos)}.`);
                        agendarRefresh(Math.max(60, esperaRecursos + 70));
                    } else {
                        // esperaRecursos é null, 0, ou inválido
                        console.warn(`${LOG_PREFIX} Erro ao calcular espera de recursos. Tentando novamente em 20 min.`);
                        agendarRefresh(20 * 60);
                    }
                } else {
                    // Requisitos não cumpridos (edifício dependente em falta)
                    setStatus(`Requisitos em falta para ${nomeVisual}.`);
                    agendarRefresh(10 * 60);
                }
            } else {
                setStatus(`A construir ${nomeVisual}...`);
                registarHistorico(`${nomeVisual} → nível ${alvoNivel}`);
                
                // Incrementar contador de sessao persistente
                let nAcoes = parseInt(localStorage.getItem('tw_autobuilder_session_actions') || '0', 10) + 1;
                localStorage.setItem('tw_autobuilder_session_actions', nAcoes);
                estadoAtual.acoes = nAcoes;
                const elAcoes = document.getElementById('twAcoesText');
                if (elAcoes) elAcoes.innerText = `${nAcoes} obras`;
                else atualizarPainel();

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
            const fila = lerFilaConstrucao(container);
            if (fila.length > 0) {
                // Tenta apanhar o tempo do primeiro item da fila (o que acaba primeiro)
                for (let item of fila) {
                    if (Number.isFinite(item.segundos) && item.segundos >= 5) {
                        console.log(`${LOG_PREFIX} Timer encontrado na fila: ${formatarSegundos(item.segundos)}`);
                        return item.segundos;
                    }
                }
            }
        } catch(e) {
            console.log(`${LOG_PREFIX} Erro ao ler timer da fila:`, e);
        }

        let menor = Infinity;
        try {
            const queueContainers = [
                document.getElementById('buildqueue'), document.getElementById('build_queue'),
                document.getElementById('queue'), document.querySelector('#buildings_queue'),
                document.querySelector('.build-queue-wrapper'), document.querySelector('.queue'),
                document.querySelector('.build-queue'), document.querySelector('.tw-buildqueue')
            ].filter(Boolean);
            
            queueContainers.forEach(container => {
                let matches = container.innerText.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g);
                if (matches) {
                    matches.forEach(tempoTxt => {
                        let partes = tempoTxt.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
                        if (partes) {
                            let total = (partes[1] ? parseInt(partes[1],10) : 0)*3600 + parseInt(partes[2],10)*60 + parseInt(partes[3],10);
                            if (total >= 5 && total <= MAX_PURGE_MATCH_SECONDS && total < menor) menor = total;
                        }
                    });
                }
            });
        } catch(e) { console.log(`${LOG_PREFIX} Erro fallback timer:`, e); }
        
        if (menor === Infinity || menor < 5) {
            console.warn(`${LOG_PREFIX} Nenhum timer válido encontrado. Usando padrão de 5 min.`);
            return 5 * 60;
        }
        return menor;
    }

})();
