# TW Auto-Builder

Userscript para Tampermonkey que automatiza a gestão de construções no Tribal Wars.

O projeto é composto principalmente pelo ficheiro `TW_AutoBuilder.user.js`, que corre diretamente no browser através do Tampermonkey e tenta escolher, agendar e executar construções com base numa ordem definida, no estado atual da aldeia e na estratégia selecionada.

## Resumo do projeto

O **TW Auto-Builder** é um gestor automático de construção para Tribal Wars. O script lê os dados disponíveis na página da aldeia, analisa recursos, população, edifícios existentes e fila de construção, e decide qual deve ser a próxima construção a iniciar.

Inclui um pequeno painel dentro do jogo com estado atual, temporizador, próxima ação, aldeia ativa e estratégia escolhida. Também guarda algumas preferências no `localStorage`, como a estratégia ativa e a versão instalada.

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
- Painel visual no jogo com estado, temporizador e próxima construção.
- Delays aleatórios e pequenas pausas para comportamento menos rígido.
- Metadados preparados para atualização automática pelo Tampermonkey via GitHub.

## Instalação

1. Instala a extensão [Tampermonkey](https://www.tampermonkey.net/) no browser.
2. Abre este link de instalação:

   `https://cdn.jsdelivr.net/gh/fil7rms-gif/filrms@main/TW_AutoBuilder.user.js`

3. O Tampermonkey deve abrir a página de instalação automaticamente.
4. Confirma a instalação.
5. Entra no Tribal Wars e abre a página principal da aldeia.

Se esse link não abrir, confirma primeiro que o repositório está público e que o ficheiro já foi enviado para o branch `main`.

Link alternativo direto pelo GitHub:

`https://raw.githubusercontent.com/fil7rms-gif/filrms/main/TW_AutoBuilder.user.js`

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

## Notas

Este projeto é experimental e deve ser usado com cuidado. Scripts de automação podem violar regras de alguns jogos ou servidores. Confirma sempre as regras aplicáveis antes de usar.
