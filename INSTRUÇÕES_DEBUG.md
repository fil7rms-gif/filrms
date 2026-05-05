# 🔍 INSTRUÇÕES DE DEBUG - v8.2.2

## O Que Mudou

O script agora possui logs reforçados para diagnosticar:
1.  **Cálculo de espera de recursos** (corrigido para escala decimal).
2.  **Detecção de Conta Premium** (agora multiplos métodos).
3.  **Leitura de Timers da Fila** (específico para o primeiro item).
4.  **Atualização parcial do painel** (para não fechar o dropdown de estratégia nem mostrar dados mal formatados).

## Como Ver os Logs

1.  **Abrir Dev Tools**: Pressiona `F12` no browser.
2.  **Ir para a aba "Console"**.
3.  **Filtrar**: Podes escrever `Auto-Builder` no filtro da console para ver apenas as mensagens do bot.

## Novos Logs para Monitorizar

### 💎 Conta Premium
Procure por:
- `[Auto-Builder v8.2.2] Premium detectado por [Método]`
- `[Auto-Builder v8.2.2] Limite de fila definido: [2 ou 5]`

### ⏱️ Fila Cheia
Procure por:
- `[Auto-Builder v8.2.2] Timer encontrado na fila: [Tempo]`
- Se o bot estiver a dizer "Usando padrão de 5 min", significa que ele não conseguiu ler o timer visualmente.

### 📉 Produção e Escala
Procure por:
- `[Auto-Builder v8.2.2] [DEBUG] Producao detectada muito baixa. Assumindo producao por segundo...`
- Isso confirma que o bot corrigiu automaticamente a leitura de 0.008 para 30/h.

### 🎛️ Dropdown de Estratégia
Teste rápido:
- Abre o seletor de estratégia no painel.
- Espera o timer/status atualizar.
- O seletor deve continuar aberto até escolheres uma opção ou clicares fora dele.

## O Que Enviar se Tiveres Erros

Se o bot fizer algo estranho:
1. Copia as linhas que dizem `[DEBUG]` ou `Timer encontrado`.
2. Se o timer de "Ação em" estiver muito diferente do status, envia-me as duas mensagens.

---

**Versão:** 8.2.2
**Suporte:** quesalhas
