# 🔧 CORREÇÕES APLICADAS - v8.2.1

## Problema Identificado
O script apresentava esperas anormais (ex: 24h ou saltos de minutos inexplicáveis), falha na detecção de conta premium, leitura imprecisa de timers da fila e o painel podia fechar o dropdown de estratégia por ser redesenhado a cada atualização.

## ✅ Correção Mais Recente (v8.2.1)

### 1. 🎛️ Painel com Atualizações Específicas
- **Problema:** Funções como `setStatus()`, `setTimerText()` e `setProximo()` chamavam `atualizarPainel()` e recriavam todo o HTML do painel.
- **Impacto:** O dropdown de estratégia podia fechar sozinho enquanto o utilizador tentava escolher outra estratégia, porque o elemento era destruído e criado novamente.
- **Solução:** Os campos principais passaram a ter IDs próprios (`twStatusText`, `twTimerText`, `twProximoText`, `twPopText`, `twArmText`, `twRecenteText`, `twAcoesText`) e são atualizados individualmente quando já existem no DOM.

## ✅ Correções Base (v8.1.5 - v8.2.0)

### 1. 🛡️ Correção de "Double Humanization" e Escala
- **Problema:** O bot sorteava o tempo aleatório duas vezes, e a "pausa de reflexão" adicionava 500 unidades fixas. Se o bot estivesse em segundos, adicionava 500 segundos (8 min) em vez de 500ms.
- **Solução:** Removida a redundância de sorteio e tornada a "pausa de reflexão" proporcional (15% do tempo base).

### 2. 💎 Detecção de Conta Premium Reforçada
- **Problema:** O bot limitava a fila a 2 construções mesmo com premium ativo.
- **Solução:** Adicionada detecção em 5 pontos diferentes (game_data, features, player, DOM e detecção dinâmica por itens na fila). O limite agora expande corretamente para 5 itens.

### 3. ⏱️ Timers Inteligentes de Fila
- **Problema:** Quando a fila estava cheia, o bot não sabia exatamente quanto tempo esperar.
- **Solução:** Nova lógica `lerMenorTimer()` que foca no primeiro item da fila. O status agora mostra: `Fila cheia (5/5). Próxima vaga em 10m 00s`.

### 4. 📈 Parsing de Produção Decimal
- **Problema:** Em alguns servidores, a produção vinha como decimal (ex: 0.008/s), fazendo o bot pensar que a produção era quase zero por hora.
- **Solução:** Adicionada detecção de escala. Se a produção for < 5/h, o bot converte automaticamente de "por segundo" para "por hora" (*3600).

### 5. 🖥️ Interface e Sessão
- **Mudança:** Removida info redundante "Anti-Bot" e adicionado rastreio de sessão.
- **Novidade:** Agora podes ver se a Conta Premium foi detectada e quantas obras foram feitas na sessão atual.

## 📊 Histórico de Logs Atualizado

### Exemplo de Fila Cheia Inteligente:
```
[Auto-Builder v8.2.1] Timer encontrado na fila: 08m 45s
[Auto-Builder v8.2.1] Status: Fila cheia (5/5). Próxima vaga em 08m 45s.
```

### Exemplo de Correção de Escala:
```
[Auto-Builder v8.2.1] [DEBUG] wood: custo=60, atual=0, falta=60
[Auto-Builder v8.2.1] [DEBUG] Producao detectada muito baixa (0.0083). Assumindo producao por segundo e convertendo para hora.
[Auto-Builder v8.2.1] [DEBUG] Produção confirmada: wood = 30/h
```

---

**Versão Final:** 8.2.1
**Data:** 2026-05-05
