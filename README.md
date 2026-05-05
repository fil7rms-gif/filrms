# TW Auto-Builder

Userscript para Tampermonkey que automatiza a gestão de construções no Tribal Wars.

O projeto é composto principalmente pelo ficheiro `TW_AutoBuilder.user.js`, que corre diretamente no browser através do Tampermonkey e tenta escolher, agendar e executar construções com base numa ordem definida, no estado atual da aldeia e na estratégia selecionada.

## Resumo do projeto

O **TW Auto-Builder** é um gestor automático de construção para Tribal Wars. O script lê os dados disponíveis na página da aldeia, analisa recursos, população, edifícios existentes e fila de construção, e decide qual deve ser a próxima construção a iniciar.

Inclui um pequeno painel dentro do jogo com estado atual, temporizador, próxima ação, aldeia ativa, estratégia escolhida, tipo de conta detetado e contador de obras da sessão. Também guarda algumas preferências no `localStorage`, como a estratégia ativa, a versão instalada e o contador persistente da sessão.

## Versão atual

**v8.2.2** corrige a renderização parcial do painel durante pausas: a percentagem do armazém passa a aparecer arredondada e a fila recente deixa de mostrar `[object Object]`.

A versão anterior já tinha corrigido a experiência do painel: os campos de status, timer, próxima construção, população, armazém e fila recente são atualizados individualmente sempre que possível. Isto evita recriar o painel inteiro a cada atualização e impede que o dropdown de estratégia feche enquanto está a ser usado.

Esta versão mantém as correções recentes de cálculo de espera, leitura de produção decimal, timers de fila cheia e deteção reforçada de Conta Premium.

## Funcionalidades

- Automatização da fila de construção na página principal da aldeia.
- Ordem de construção configurada diretamente no script.
- Estratégias disponíveis:
  - `agressivo`: maior foco em desenvolvimento militar.
  - `economico`: maior foco em recursos e economia.
  - `hibrido`: equilíbrio entre economia, requisitos e defesa.
- Deteção de recursos, armazém e população.
- Priorização automática de armazém ou fazenda quando necessário.
- Suporte a várias aldeias, com navegação para a próxima aldeia quando aplicável.
- Painel visual no jogo com estado, temporizador, próxima construção, Conta Premium/Normal e contador de obras da sessão.
- Atualização parcial do painel para não interromper a seleção de estratégia.
- Leitura inteligente do primeiro timer da fila quando a fila está cheia.
- Deteção reforçada de Conta Premium para permitir até 5 construções na fila quando aplicável.
- Cálculo de espera de recursos com parsing robusto de números e produção por segundo/por hora.
- Delays aleatórios e pequenas pausas para comportamento menos rígido.
- Metadados preparados para atualização automática pelo Tampermonkey via GitHub.

## Instalação

1. Instala a extensão [Tampermonkey](https://www.tampermonkey.net/) no browser.
2. Abre este link de instalação:

   `https://cdn.jsdelivr.net/gh/fil7rms-gif/filrms@main/TW_AutoBuilder.user.js`

3. O Tampermonkey deve abrir a página de instalação automaticamente.
4. Confirma a instalação.
5. Entra no Tribal Wars e abre a página principal da aldeia.

Se esse link não abrir ou aparecer `404`, confirma primeiro que o repositório está público e que o ficheiro já foi enviado para o branch `main`.

Link alternativo direto pelo GitHub:

`https://raw.githubusercontent.com/fil7rms-gif/filrms/main/TW_AutoBuilder.user.js`

### Erro 404 ou "não encontra"

Se o GitHub/jsDelivr não encontrar o ficheiro, normalmente é por uma destas razões:

- O repositório está privado.
- O ficheiro ainda não foi enviado para o GitHub.
- O branch não se chama `main`.
- O nome do ficheiro no GitHub é diferente de `TW_AutoBuilder.user.js`.

Para as atualizações automáticas do Tampermonkey funcionarem, o ficheiro precisa estar acessível publicamente. Se o repositório estiver privado, torna-o público em:

`GitHub -> Settings -> General -> Danger Zone -> Change repository visibility -> Public`

Enquanto o repositório estiver privado, instala manualmente pelo Tampermonkey copiando o conteúdo de `TW_AutoBuilder.user.js` para um novo script.

## Atualizações automáticas

O script está configurado com:

- `@installURL`
- `@updateURL`
- `@downloadURL`

Todos apontam para o ficheiro publicado pelo jsDelivr a partir do branch `main` deste repositório.

Para lançar uma nova versão:

1. Edita `TW_AutoBuilder.user.js`.
2. Aumenta o valor de `@version`.
3. Atualiza também a constante `VERSION_ATUAL`.
4. Faz commit e push para o GitHub.

O Tampermonkey só deteta uma atualização quando a versão remota é superior à versão instalada.

## Estrutura

```text
.
├── ANÁLISE.txt
├── CORREÇÕES_APLICADAS.md
├── DEBUG_CRÍTICO.txt
├── INSTRUÇÕES_DEBUG.md
├── LEIA-ME.txt
├── README.md
└── TW_AutoBuilder.user.js
```

## Configuração

As principais opções estão no início do script:

- `AUTO_NEXT_VILLAGE`: ativa ou desativa a passagem automática para a próxima aldeia.
- `STRATEGIES`: define os perfis `agressivo`, `economico` e `hibrido`.
- `buildOrder`: define a ordem e níveis desejados dos edifícios.
- `HORA_DORMIR` e `HORA_ACORDAR`: definem uma janela noturna de pausa.
- `CHANCE_MICRO_BREAK`: controla a probabilidade de ignorar temporariamente uma ação.

## Documentos de apoio

- `LEIA-ME.txt`: resumo rápido para confirmar a versão instalada e o comportamento esperado.
- `CORREÇÕES_APLICADAS.md`: lista técnica das correções recentes.
- `ANÁLISE.txt`: análise dos bugs de espera longa, escala de produção, fila e Conta Premium.
- `INSTRUÇÕES_DEBUG.md`: como abrir a consola e recolher logs úteis.
- `DEBUG_CRÍTICO.txt`: checklist de diagnóstico se o script voltar a comportar-se de forma estranha.

## Notas

Este projeto é experimental e deve ser usado com cuidado. Scripts de automação podem violar regras de alguns jogos ou servidores. Confirma sempre as regras aplicáveis antes de usar.
