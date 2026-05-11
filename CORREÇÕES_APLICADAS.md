# 🔧 CORREÇÕES APLICADAS - v8.2.4

## Problema Identificado
O script apresentava erros na contagem de níveis na fila, esperas anormais (ex: 24h ou saltos de minutos inexplicáveis), falha na detecção de conta premium, leitura imprecisa de timers da fila, fecho involuntário do dropdown de estratégia e dois erros visuais no painel durante pausas.

## ✅ Correção Mais Recente (v8.2.4)

### 1. 🏗️ Contagem Crítica de Níveis na Fila
- **Problema:** O script não detectava corretamente múltiplos níveis do mesmo edifício na fila (ex: Estábulo 9,10,11,12), levando a decisões incorretas sobre a próxima construção.
- **Solução:** Implementada lógica aprimorada para analisar a fila e contar níveis adequadamente. O painel agora mostra informação mais clara: "Próximo | Atual + Fila".

## ✅ Correção de Renderização Parcial (v8.2.2)

### 1. 🧾 Renderização Parcial do Painel em Pausa
- **Problema:** `setArmazem()` mostrava a percentagem crua, por exemplo `32.51302837290098%`.
- **Solução:** A percentagem passou a ser normalizada, limitada entre 0 e 100 e arredondada antes de aparecer no painel.
- **Problema:** `setObraRecente()` recebia um objeto `{ nome, tempo }`, mas imprimia o objeto diretamente.
- **Solução:** A fila recente agora renderiza `nome` e `tempo` separadamente, ou limpa o campo quando não há construção recente.

## ✅ Correção de Interface (v8.2.1)

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
[Auto-Builder v8.2.4] Timer encontrado na fila: 08m 45s
[Auto-Builder v8.2.4] Status: Fila cheia (5/5). Próxima vaga em 08m 45s.
```

### Exemplo de Correção de Escala:
```
[Auto-Builder v8.2.2] [DEBUG] wood: custo=60, atual=0, falta=60
[Auto-Builder v8.2.2] [DEBUG] Producao detectada muito baixa (0.0083). Assumindo producao por segundo e convertendo para hora.
[Auto-Builder v8.2.2] [DEBUG] Produção confirmada: wood = 30/h
```

---

**Versão Final:** 8.2.2
**Data:** 2026-05-05
